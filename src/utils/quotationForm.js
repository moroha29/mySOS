/*
 * Quotation form schema.
 *
 * The form is described by `src/data/quotationForm.json` rather than hardcoded
 * JSX, so the admin portal can reorder, retitle, hide, require and add fields
 * without a code change.
 *
 * Two kinds of field exist, and the distinction matters:
 *
 *   Engine-bound  — carries `optionsFrom`. Its choices are resolved at render
 *                   time from the pricing data (which mirrors mysos.xlsx), so
 *                   they cannot drift from the workbook. The portal may change
 *                   presentation but not invent options.
 *
 *   Custom        — added in the portal, carries inline `options` and an
 *                   optional `priceRule`. Captured on the quotation and able to
 *                   add a flat or per-piece amount, but it cannot reach into the
 *                   pricing engines — those stay in code.
 */

import formSchema from '../data/quotationForm.json';
import productData from '../data/productData.json';
import printData from '../data/printData.json';
import addonData from '../data/addonData.json';

export const FIELD_TYPES = ['text', 'textarea', 'number', 'currency', 'date', 'select', 'toggle', 'sizeGrid', 'addonList'];
export const PRICE_RULES = ['none', 'perPiece', 'flat', 'multiplier'];

const asOption = (item) => ({ id: item.id, name: item.name ?? item.public?.name ?? item.id });

/** Resolves an `optionsFrom` path against the live pricing data. */
export function resolveOptions(field, context = {}) {
  if (!field?.optionsFrom) return field?.options ?? [];
  const { productId } = context;

  switch (field.optionsFrom) {
    case 'productData.quotationProducts':
      return productData.quotationProducts.map(asOption);
    case 'productData.jersey.fabrics':
      return productData.jersey.fabrics.map(asOption);
    case 'productData.jersey.collars':
      return productData.jersey.collars.map(asOption);
    case 'productData.jersey.sleeves':
      return productData.jersey.sleeves.map(asOption);
    case 'printData.methods':
      return printData.methods.map(asOption);
    case 'printData.dtf.options':
      return printData.dtf.options.map(asOption);
    case 'printData.sublimation.options':
      return printData.sublimation.options.map(asOption);
    case 'printData.embroidery.stitchTiers':
      return printData.embroidery.stitchTiers.map(asOption);
    case 'printData.embroidery.digitizing':
      return printData.embroidery.digitizing.map(asOption);
    case 'printData.embroidery.placements':
      return printData.embroidery.placements.map(asOption);
    case 'printData.silkscreen.techniques':
      return [...new Set(printData.silkscreen.rates.map((rate) => rate.technique))].map((name) => ({ id: name, name }));
    case 'printData.silkscreen.sizes':
      return [...new Set(printData.silkscreen.rates.map((rate) => rate.size))].map((name) => ({ id: name, name }));
    case 'addonData':
      return addonData.map(asOption);
    case 'catalogue.byProduct':
      // Garment and cap pickers list the catalogue entries priced by that engine.
      return productData.catalogue
        .filter((item) => item.quotation.enabled && (!productId || item.quotation.productId === productId))
        .map(asOption);
    default:
      return [];
  }
}

/** Evaluates a section's `showWhen` against the current answers. */
export function isVisible(node, values = {}) {
  if (node?.visible === false) return false;
  const rule = node?.showWhen;
  if (!rule) return true;

  const actual = rule.field === 'printMethod'
    ? (values.printMethods ?? [])
    : values[rule.field];

  if (rule.equals !== undefined) return actual === rule.equals;
  if (rule.in) return rule.in.includes(actual);
  if (rule.includesAny) {
    const list = Array.isArray(actual) ? actual : [actual];
    return rule.includesAny.some((wanted) => list.includes(wanted));
  }
  return true;
}

/** Sections that should render for the given answers, in schema order. */
export function visibleSections(values = {}, schema = formSchema) {
  return schema.sections
    .filter((section) => isVisible(section, values))
    .map((section) => ({ ...section, fields: section.fields.filter((field) => isVisible(field, values)) }))
    .filter((section) => section.fields.length > 0);
}

/**
 * Structural validation. Returns a list of human-readable problems — used by the
 * test suite and by the admin portal before it will publish a schema.
 */
export function validateSchema(schema = formSchema) {
  const problems = [];
  if (!Array.isArray(schema?.sections)) return ['schema.sections must be an array'];

  const sectionIds = new Set();
  for (const section of schema.sections) {
    if (!section.id) problems.push('a section is missing an id');
    if (sectionIds.has(section.id)) problems.push(`duplicate section id: ${section.id}`);
    sectionIds.add(section.id);
    if (!section.title) problems.push(`section ${section.id} is missing a title`);
    if (!Array.isArray(section.fields) || section.fields.length === 0) {
      problems.push(`section ${section.id} has no fields`);
      continue;
    }

    const fieldKeys = new Set();
    for (const field of section.fields) {
      const where = `${section.id}.${field.key ?? '(no key)'}`;
      if (!field.key) problems.push(`a field in ${section.id} is missing a key`);
      if (fieldKeys.has(field.key)) problems.push(`duplicate field key in ${section.id}: ${field.key}`);
      fieldKeys.add(field.key);
      if (!field.label) problems.push(`${where} is missing a label`);
      if (!FIELD_TYPES.includes(field.type)) problems.push(`${where} has unknown type: ${field.type}`);
      if (field.type === 'select' && !field.optionsFrom && !(field.options?.length)) {
        problems.push(`${where} is a select with neither optionsFrom nor options`);
      }
      if (field.optionsFrom && resolveOptions(field).length === 0 && field.optionsFrom !== 'catalogue.byProduct') {
        problems.push(`${where} optionsFrom "${field.optionsFrom}" resolved to nothing`);
      }
      if (field.priceRule && !PRICE_RULES.includes(field.priceRule)) {
        problems.push(`${where} has unknown priceRule: ${field.priceRule}`);
      }
    }
  }
  return problems;
}

export { formSchema };
export default formSchema;
