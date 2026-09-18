// The public form and manager preview use the same schema and workbook engine.
const aliases = { 'customer.name': 'customerName', 'customer.type': 'customerType', 'customer.orderDate': 'orderDate', 'customer.reference': 'orderReference', 'shipping.method': 'shippingMethod', 'shipping.cost': 'shippingCost' };
export function answerPath(field, sectionId, itemIndex = 0, printIndex = 0, itemKey = itemIndex) {
  if (!field.bind) return ['customAnswers', sectionId, itemKey, field.key];
  const binding = aliases[field.bind] || field.bind;
  const parts = binding.split('.').map(part => part === '*' ? printIndex : part === 'colours' ? 'colors' : part);
  return parts[0] === 'item' ? ['items', itemIndex, ...parts.slice(1)] : parts;
}
export const readAnswer = (value, path) => path.reduce((current, key) => current?.[key], value);
export function writeAnswer(value, path, answer) {
  const next = structuredClone(value);
  let current = next;
  path.slice(0, -1).forEach((key, index) => {
    current[key] ??= /^\d+$/.test(String(path[index + 1])) ? [] : {};
    current = current[key];
  });
  current[path.at(-1)] = answer;
  return next;
}

export function presentedOptions(field, options) {
  return options.filter(option => !field.hiddenOptions?.includes(option.id))
    .map(option => ({ ...option, name: field.optionLabels?.[option.id] || option.name }));
}
