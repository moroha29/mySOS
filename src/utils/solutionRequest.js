/*
 * A customer's request from a solution page: which products, how many, any
 * details, when they are needed, and notes. It is turned into one message the
 * customer sends to MySOS.
 *
 * This is not a quotation. It carries no prices, and nothing here touches the
 * agents' quotation engine.
 */
import printData from '../data/printData.json';
import productData from '../data/productData.json';
import siteContent from '../data/siteContent.json';
import { messageHref } from './catalogue';

const catalogue = new Map(productData.catalogue.filter((item) => item.public?.visible).map((item) => [item.id, item]));

export const productFor = (productId) => (productId ? catalogue.get(productId) ?? null : null);

let lineCounter = 0;
const nextKey = (prefix) => `${prefix}-${(lineCounter += 1)}`;

/*
 * One row of the request. `details` holds only what the customer set — either
 * here, when they arrive from a product's own page having chosen a colour and a
 * printing method, or in the row's own panel.
 */
export function makeLine({ productId = '', name = '', note = '', quantity = 1, details = {} } = {}, prefix = 'line') {
  const product = productFor(productId);
  const known = new Set(detailFieldsFor(productId).map((field) => field.id));
  return {
    key: nextKey(prefix),
    productId: product ? productId : '',
    name: String(name || product?.public?.name || '').trim(),
    catalogueName: product?.public?.name ?? '',
    note: String(note || ''),
    quantity: clampQuantity(quantity),
    details: Object.fromEntries(Object.entries(details)
      .filter(([id, value]) => known.has(id) && String(value ?? '').trim())),
    detailNotes: '',
    files: [],
  };
}

export const clampQuantity = (value) => {
  const number = Math.round(Number(value));
  return Number.isFinite(number) ? Math.min(99999, Math.max(1, number)) : 1;
};

/** The use case's recommended package, as editable rows. Unknown products are skipped. */
export function packageLines(useCase) {
  return (useCase?.items ?? [])
    .filter((item) => !item.productId || productFor(item.productId))
    .filter((item) => item.productId || String(item.name || '').trim())
    .map((item, index) => makeLine(item, `${useCase.id}-${index}`));
}

/*
 * Suggested extras that exist and are not already in the request. With no use
 * case — the blank request page — MySOS's featured products stand in, so the
 * page still offers somewhere to start.
 */
export function suggestionsFor(useCase, lines) {
  const chosen = new Set(lines.map((line) => line.productId).filter(Boolean));
  const suggested = useCase?.suggestions?.length
    ? useCase.suggestions.map(productFor)
    : [...catalogue.values()].filter((product) => product.public?.featured);
  return suggested.filter((product) => product && !chosen.has(product.id));
}

/*
 * Everything a customer can ask for, under the products page's categories, so
 * nothing is only found by knowing its name. Featured products lead each
 * category; anything already in the request is left out, and a category left
 * empty is not shown.
 */
export function browseCategories(lines = [], categories = siteContent.categories ?? []) {
  const chosen = new Set(lines.map((line) => line.productId).filter(Boolean));
  const products = [...catalogue.values()].filter((product) => !chosen.has(product.id));
  const known = categories.map((category) => category.id);
  const ids = [...new Set([...known, ...products.map((product) => product.public.category)])];
  return ids
    .map((id) => {
      const inCategory = products.filter((product) => product.public.category === id);
      return {
        id,
        name: categories.find((category) => category.id === id)?.name ?? id.replace(/-/g, ' ').replace(/^./, (letter) => letter.toUpperCase()),
        products: [...inCategory.filter((product) => product.public.featured), ...inCategory.filter((product) => !product.public.featured)],
      };
    })
    .filter((category) => category.products.length > 0);
}

/*
 * Anything in the catalogue, by name, kind or category — so a customer is never
 * held to what MySOS recommended for their use case. Matching is on whole words
 * from the query, in any order, and the list is short enough to read at a
 * glance.
 */
export const MAX_SEARCH_RESULTS = 8;

export function searchProducts(query, { exclude = [] } = {}) {
  const words = String(query ?? '').toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const skip = new Set(exclude);
  return [...catalogue.values()]
    .filter((product) => !skip.has(product.id))
    .filter((product) => {
      const haystack = [product.public.name, product.public.category, product.public.subcategory, product.public.description]
        .filter(Boolean).join(' ').toLowerCase();
      return words.every((word) => haystack.includes(word));
    })
    .slice(0, MAX_SEARCH_RESULTS);
}

/*
 * How a product can be printed or decorated. Most subcategories carry their own
 * field, edited in the manager; anything that does not — a custom item the
 * customer typed in, say — falls back to the methods MySOS shows on the
 * products page, so every row can be asked the question.
 */
export const PRINTING_FIELD_IDS = ['printing', 'decoration'];
export const LET_MYSOS_CHOOSE = 'Let MySOS recommend';
/*
 * Only on the fallback list below, where MySOS has said nothing about how this
 * kind of thing is printed. The lists written in the manager are deliberate —
 * those products are printed the ways they name.
 */
export const OTHER_PRINTING = 'Other (tell us in the notes)';

const printingFallback = {
  id: 'printing',
  label: 'Printing method',
  type: 'choice',
  options: [
    LET_MYSOS_CHOOSE,
    ...printData.methods.filter((method) => method.public?.visible).map((method) => method.name),
    OTHER_PRINTING,
  ],
};

/** The detail fields a product offers, by its catalogue subcategory. */
export function detailFieldsFor(productId, options = siteContent.requestOptions ?? {}) {
  const subcategory = productFor(productId)?.public?.subcategory;
  const fields = options[subcategory] ?? options.default ?? [];
  if (fields.some((field) => PRINTING_FIELD_IDS.includes(field.id))) return fields;
  return [printingFallback, ...fields];
}

/** The printing field on a row, or null where the product has none. */
export const printingFieldFor = (productId) => detailFieldsFor(productId).find((field) => PRINTING_FIELD_IDS.includes(field.id)) ?? null;

/*
 * A row still waiting for the customer to say how it should be printed.
 *
 * A row MySOS already recommended a method for ("Printing: …" in its note) is
 * not asked again: the recommendation stands unless the customer changes it.
 */
export function needsPrintingChoice(line) {
  const field = printingFieldFor(line?.productId);
  if (!field || /^printing:/i.test(String(line?.note ?? '').trim())) return false;
  return !String(line?.details?.[field.id] ?? '').trim();
}

/** Opening a product's details selects each field's recommended choice. */
export function recommendedDetails(fields) {
  return Object.fromEntries(fields.filter((field) => field.recommended).map((field) => [field.id, field.recommended]));
}

const neededByFormat = new Intl.DateTimeFormat('en-SG', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

export function formatNeededBy(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return '';
  const time = Date.parse(`${value}T00:00:00Z`);
  // JavaScript rolls 30 February into March; only a real calendar date counts.
  if (!Number.isFinite(time) || new Date(time).toISOString().slice(0, 10) !== value) return '';
  return neededByFormat.format(time);
}

/*
 * The message the customer sends. Details appear only where the customer set
 * them; everything else is left for MySOS to confirm in the chat. Files are
 * named, because a chat link cannot carry them.
 */
export function buildRequestMessage({ solutionName = '', useCaseName = '', lines = [], neededBy = '', notes = '', fileNames = [], fields = detailFieldsFor } = {}) {
  const topic = [solutionName, useCaseName].filter(Boolean).join(' – ');
  const out = [`Hi MySOS, I'd like to request a quote${topic ? ` for ${topic}` : ''}.`, ''];
  lines.forEach((line, index) => {
    const kind = line.catalogueName && line.catalogueName !== line.name ? ` (${line.catalogueName})` : '';
    out.push(`${index + 1}. ${line.name}${kind} × ${line.quantity}`);
    const labels = Object.fromEntries(fields(line.productId).map((field) => [field.id, field.label]));
    const chosen = Object.entries(line.details ?? {})
      .filter(([, value]) => String(value ?? '').trim())
      .map(([id, value]) => `${labels[id] ?? id}: ${String(value).trim()}`);
    // What MySOS recommended for the row, unless the customer chose details instead.
    if (chosen.length) out.push(`   ${chosen.join(' · ')}`);
    else if (String(line.note ?? '').trim()) out.push(`   ${line.note.trim()}`);
    if (String(line.detailNotes ?? '').trim()) out.push(`   Notes: ${line.detailNotes.trim()}`);
    if (line.files?.length) out.push(`   Reference: ${line.files.join(', ')}`);
  });
  const date = formatNeededBy(neededBy);
  if (date || String(notes).trim() || fileNames.length) out.push('');
  if (date) out.push(`Needed by: ${date}`);
  if (String(notes).trim()) out.push(`Notes: ${String(notes).trim()}`);
  if (fileNames.length) out.push(`Files: ${fileNames.join(', ')}`);
  return out.join('\n');
}

export function requestHref(message, solutionName = '') {
  return messageHref(message, `Request: ${solutionName || 'MySOS'}`);
}

/** Every file name in a request, row references first, without repeats. */
export function allFileNames(lines, generalFiles = []) {
  return [...new Set([...lines.flatMap((line) => line.files ?? []), ...generalFiles])];
}
