import { isVisible, resolveOptions } from './quotationForm';
import { answerPath, readAnswer, presentedOptions } from './formBindings';
import { calculateQuotation, validateQuotation } from '../engines/quotationEngine';

function activeAnswers(schema, value) {
  return schema.sections.flatMap(section => (section.repeatsPerItem ? value.items : [null]).flatMap((item, index) => {
    const context = { ...value, ...item, printMethods: (item?.prints || []).map(print => print.method) };
    if (!isVisible(section, context)) return [];
    return section.fields.filter(field => isVisible(field, context)).flatMap(field => {
      const slots = field.bind?.includes('*') ? (item?.prints || []).map((print, i) => section.showWhen?.includesAny?.includes(print.method) ? i : -1).filter(i => i >= 0) : [0];
      return slots.map(slot => ({ section, field, context, index, answer: readAnswer(value, answerPath(field, section.id, index, slot, section.repeatsPerItem ? item.id : 0)) }));
    });
  }));
}
const answered = answer => answer !== undefined && answer !== null && answer !== false && (typeof answer === 'string' ? Boolean(answer.trim()) : Array.isArray(answer) ? answer.length > 0 : true);

export function validateSchemaQuotation(value, schema) {
  const errors = validateQuotation(value);
  // Contact requirements follow the form, while pricing prerequisites remain enforced.
  for (const key of ['customerName', 'customerType', 'orderDate', 'orderReference']) delete errors[key];
  activeAnswers(schema, value).forEach(({ section, field, answer, context, index }) => {
    const key = `${section.id}.${index}.${field.key}`;
    if (field.required && !answered(answer)) errors[key] = `${field.label} is required.`;
    if (answered(answer) && ['select', 'multiselect'].includes(field.type)) {
      const options = presentedOptions(field, resolveOptions(field, context));
      const selected = Array.isArray(answer) ? answer : [answer];
      if (selected.some(id => !options.some(option => option.id === id))) errors[key] = `Choose an available answer for ${field.label}.`;
    }
  });
  return errors;
}

/** An answer as the form shows it: choice names as offered, yes or no for a switch. */
function answerText(field, answer, context) {
  if (field.type === 'toggle') return answer ? 'Yes' : 'No';
  if (!['select', 'multiselect', 'addonList'].includes(field.type)) return String(answer ?? '');
  const options = presentedOptions(field, resolveOptions(field, context));
  const label = (id) => options.find((option) => option.id === id)?.name || String(id);
  return Array.isArray(answer) ? answer.map(label).join(', ') : label(answer);
}

/*
 * Workbook choices the form offers under a new name keep that name on the
 * quote. Every workbook choice name is matched, longest first, so renaming
 * "Polo" leaves "Polo Collar" alone.
 */
function workbookRenames(schema) {
  const names = new Map();
  schema.sections.forEach((section) => (section.fields || []).forEach((field) => {
    if (!field.optionsFrom) return;
    resolveOptions(field, {}).forEach((option) => {
      const to = field.optionLabels?.[option.id];
      if (!names.has(option.name) || (to && to !== option.name)) names.set(option.name, to && to.trim() ? to : option.name);
    });
  }));
  const renamed = [...names].filter(([from, to]) => from !== to);
  if (!renamed.length) return (text) => text;
  const escape = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp([...names.keys()].sort((a, b) => b.length - a.length).map(escape).join('|'), 'g');
  return (text) => (typeof text === 'string' ? text.replace(pattern, (match) => names.get(match) ?? match) : text);
}

export function calculateSchemaQuotation(value, schema) {
  const quote = calculateQuotation(value);
  const extras = [];
  // What the Excel quote shows besides prices: the customer details and the
  // answers to questions added in the form, each under its question's name.
  const customer = [];
  const answers = [];
  activeAnswers(schema, value).forEach(({ section, field, answer, context, index }) => {
    if (field.bind?.startsWith('customer.')) {
      customer.push({ key: field.bind, type: field.type, label: field.label, value: field.type === 'date' || !answered(answer) ? (answer ?? '') : answerText(field, answer, context) });
      return;
    }
    if (field.bind || !answered(answer)) return;
    answers.push({ step: section.title, item: section.repeatsPerItem && value.items.length > 1 ? index + 1 : null, label: field.label, value: answerText(field, answer, context) });
    // A choice question charges what its chosen answers add; any other question its own amount.
    const chosen = Array.isArray(answer) ? answer : [answer];
    const amount = ['select', 'multiselect'].includes(field.type) && field.priceRule !== 'multiplier'
      ? chosen.reduce((sum, id) => sum + (Number((field.options || []).find(option => option.id === id)?.price) || 0), 0)
      : Number(field.priceAmount);
    if (!Number.isFinite(amount) || amount <= 0 || !['flat', 'perPiece', 'multiplier'].includes(field.priceRule)) return;
    const quantity = field.priceRule === 'perPiece' ? (section.repeatsPerItem ? Number(value.items[index].quantity) || 0 : quote.totalQuantity) : 1;
    const total = field.priceRule === 'multiplier' ? quote.sellingPrice * Math.max(0, amount - 1) : amount * quantity;
    extras.push({ id: `${section.id}-${field.key}-${index}`, name: field.label, quantity, quotedUnitPrice: quantity ? total / quantity : 0, quotedTotal: total, totalCost: 0, totalSell: total });
  });
  const rename = workbookRenames(schema);
  const items = quote.items.map((item) => ({ ...item, product: item.product && { ...item.product, name: rename(item.product.name) }, description: rename(item.description) }));
  const extraTotal = extras.reduce((sum, extra) => sum + extra.quotedTotal, 0);
  const sellingPrice = quote.sellingPrice + extraTotal;
  return {
    ...quote,
    items,
    form: { customer, answers },
    addons: { ...quote.addons, items: [...quote.addons.items.map((addon) => ({ ...addon, name: rename(addon.name) })), ...extras], quotedTotal: quote.addons.quotedTotal + extraTotal },
    sellingPrice,
    profit: sellingPrice - quote.adjustedCost,
    profitMargin: !quote.hasUnknownCosts && sellingPrice > 0 ? (sellingPrice - quote.adjustedCost) / sellingPrice : 0,
    unitSellingPrice: quote.totalQuantity ? sellingPrice / quote.totalQuantity : 0,
  };
}
