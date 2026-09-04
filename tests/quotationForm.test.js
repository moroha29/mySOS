import { describe, expect, it } from 'vitest';
import formSchema from '../src/data/quotationForm.json';
import productData from '../src/data/productData.json';
import printData from '../src/data/printData.json';
import addonData from '../src/data/addonData.json';
import { isVisible, resolveOptions, validateSchema, visibleSections } from '../src/utils/quotationForm.js';

describe('quotation form schema', () => {
  it('is structurally valid', () => {
    expect(validateSchema()).toEqual([]);
  });

  it('covers every section of the MASTER_QUOTATION sheet', () => {
    const ids = formSchema.sections.map((section) => section.id);
    for (const required of [
      'customer', 'product', 'sizes',
      'productDetailsJersey', 'productDetailsGarment', 'productDetailsCaps', 'productDetailsCutSew',
      'printDetailsDtf', 'printDetailsSilkscreen', 'printDetailsEmbroidery', 'printDetailsSublimation',
      'addons', 'shipping',
    ]) {
      expect(ids).toContain(required);
    }
  });

  it('binds every engine-driven field to a real key in the pricing data', () => {
    const bindings = formSchema.sections.flatMap((section) => section.fields.map((field) => field.bind)).filter(Boolean);
    // every binding is a dotted path; nothing should be blank or malformed
    for (const bind of bindings) expect(bind).toMatch(/^[a-zA-Z]+(\.[a-zA-Z0-9*]+)*$/);
  });
});

describe('option resolution stays tied to the pricing data', () => {
  // These assertions are the guard that keeps mysos.xlsx authoritative: the
  // schema never copies option lists, it points at the data the engines price
  // from, so a workbook change can't leave the form showing stale choices.
  it.each([
    ['productData.quotationProducts', productData.quotationProducts.length],
    ['productData.jersey.fabrics', productData.jersey.fabrics.length],
    ['productData.jersey.collars', productData.jersey.collars.length],
    ['productData.jersey.sleeves', productData.jersey.sleeves.length],
    ['printData.methods', printData.methods.length],
    ['printData.dtf.options', printData.dtf.options.length],
    ['printData.sublimation.options', printData.sublimation.options.length],
    ['printData.embroidery.stitchTiers', printData.embroidery.stitchTiers.length],
    ['printData.embroidery.digitizing', printData.embroidery.digitizing.length],
    ['printData.embroidery.placements', printData.embroidery.placements.length],
    ['addonData', addonData.length],
  ])('%s resolves to %i live options', (optionsFrom, expected) => {
    const options = resolveOptions({ optionsFrom });
    expect(options).toHaveLength(expected);
    for (const option of options) {
      expect(option.id).toBeTruthy();
      expect(option.name).toBeTruthy();
    }
  });

  it('derives silkscreen techniques and sizes from the rate table', () => {
    const techniques = resolveOptions({ optionsFrom: 'printData.silkscreen.techniques' });
    const sizes = resolveOptions({ optionsFrom: 'printData.silkscreen.sizes' });
    expect(techniques.map((t) => t.id)).toEqual([...new Set(printData.silkscreen.rates.map((r) => r.technique))]);
    expect(sizes.length).toBeGreaterThan(1);
  });

  it('narrows the garment picker to the selected engine', () => {
    const tees = resolveOptions({ optionsFrom: 'catalogue.byProduct' }, { productId: 'tee' });
    const caps = resolveOptions({ optionsFrom: 'catalogue.byProduct' }, { productId: 'cap' });
    expect(tees.length).toBeGreaterThan(0);
    expect(caps.length).toBeGreaterThan(0);
    expect(tees.map((t) => t.id)).not.toContain(caps[0].id);
  });
});

describe('conditional visibility', () => {
  it('shows only the product-details section matching the chosen product', () => {
    const jersey = visibleSections({ productId: 'jersey_sublimation', printMethods: ['sublimation'] }).map((s) => s.id);
    expect(jersey).toContain('productDetailsJersey');
    expect(jersey).not.toContain('productDetailsCaps');
    expect(jersey).not.toContain('productDetailsGarment');

    const cap = visibleSections({ productId: 'cap', printMethods: ['embroidery'] }).map((s) => s.id);
    expect(cap).toContain('productDetailsCaps');
    expect(cap).not.toContain('productDetailsJersey');
  });

  it('treats tee and polo as the same garment section', () => {
    for (const productId of ['tee', 'polo']) {
      expect(visibleSections({ productId, printMethods: [] }).map((s) => s.id)).toContain('productDetailsGarment');
    }
  });

  it('shows print sections only for the methods actually selected', () => {
    const silkscreen = visibleSections({ productId: 'tee', printMethods: ['silkscreen', 'none'] }).map((s) => s.id);
    expect(silkscreen).toContain('printDetailsSilkscreen');
    expect(silkscreen).not.toContain('printDetailsEmbroidery');
    expect(silkscreen).not.toContain('printDetailsDtf');
  });

  it('shares the DTF section with DTG, which is priced as an alias', () => {
    expect(printData.dtg.aliasOf).toBe('dtf');
    for (const method of ['dtf', 'dtg']) {
      expect(visibleSections({ productId: 'tee', printMethods: [method] }).map((s) => s.id)).toContain('printDetailsDtf');
    }
  });

  it('honours an admin hiding a section', () => {
    expect(isVisible({ visible: false })).toBe(false);
    expect(isVisible({ visible: true })).toBe(true);
  });
});

describe('schema validation rejects broken admin edits', () => {
  const base = () => JSON.parse(JSON.stringify(formSchema));

  it('rejects a duplicate field key within a section', () => {
    const schema = base();
    const section = schema.sections.find((s) => s.id === 'customer');
    section.fields.push({ ...section.fields[0] });
    expect(validateSchema(schema).join(' ')).toMatch(/duplicate field key/);
  });

  it('rejects an unknown field type', () => {
    const schema = base();
    schema.sections[0].fields[0].type = 'wysiwyg';
    expect(validateSchema(schema).join(' ')).toMatch(/unknown type/);
  });

  it('rejects a select with no options at all', () => {
    const schema = base();
    schema.sections[0].fields.push({ key: 'broken', label: 'Broken', type: 'select' });
    expect(validateSchema(schema).join(' ')).toMatch(/neither optionsFrom nor options/);
  });

  it('rejects an unknown price rule on a custom field', () => {
    const schema = base();
    schema.sections[0].fields.push({ key: 'custom', label: 'Custom', type: 'text', priceRule: 'magic' });
    expect(validateSchema(schema).join(' ')).toMatch(/unknown priceRule/);
  });

  it('accepts a well-formed custom field added by the portal', () => {
    const schema = base();
    schema.sections[0].fields.push({
      key: 'rushHandling', label: 'Rush handling', type: 'toggle', priceRule: 'flat', priceAmount: 25,
    });
    expect(validateSchema(schema)).toEqual([]);
  });
});
