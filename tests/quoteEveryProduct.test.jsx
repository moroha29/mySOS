import { afterEach, describe, expect, it } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import productData from '../src/data/productData.json';
import tierData from '../src/data/tierData.json';
import schema from '../src/data/quotationForm.json';
import SchemaQuotationForm, { itemForProduct } from '../src/components/SchemaQuotationForm';
import { createInitialValue } from '../src/App';
import { calculateQuotation, validateQuotation } from '../src/engines/quotationEngine';
import { resolveOptions, visibleSections } from '../src/utils/quotationForm';
import { validateSchemaQuotation } from '../src/utils/schemaQuotation';
import { applyDraftPricing } from '../src/utils/draftPricing';

/*
 * An agent quotes any product in the Data tab that is switched on for quotes,
 * by choosing the product itself, and the quote is priced from that product's
 * own figures.
 */

const published = structuredClone(productData);
afterEach(() => applyDraftPricing(null));

const quotable = () => productData.catalogue.filter((item) => item.quotation.enabled);
const productList = () => resolveOptions({ optionsFrom: 'catalogue.quotable' });
const tierFor = (quantity) => tierData.find((tier) => quantity >= tier.minQty && quantity <= tier.maxQty);

function orderFor(catalogueId, quantity = '50') {
  const value = createInitialValue('');
  Object.assign(value, { customerName: 'Test', customerType: 'corporate', orderReference: 'Q-1' });
  value.items[0] = itemForProduct({ ...value.items[0], quantity }, catalogueId);
  return value;
}

// What the form checks a step's "Appears" rule against, as it does for an order item.
const shownFor = (value, form = schema) => visibleSections({ ...value, ...value.items[0], printMethods: value.items[0].prints.map((print) => print.method) }, form).map((section) => section.id);

const withDtf = (value) => {
  value.items[0].prints = [{ method: 'dtf', option: 'front_left_chest' }, { method: 'none' }];
  return value;
};

describe('the Product list', () => {
  it('lists every Data tab product switched on for quotes, then Other / Blank', () => {
    const ids = productList().map((option) => option.id);
    expect(ids.slice(0, -1)).toEqual(expect.arrayContaining(quotable().map((item) => item.id)));
    expect(ids).toHaveLength(quotable().length + 1);
    expect(ids.at(-1)).toBe('custom_product');
  });

  it('includes the cut & sew products that had no picker before', () => {
    const ids = productList().map((option) => option.id);
    for (const id of ['pullover_hoodie', 'windbreaker_jacket', 'bomber_jacket']) expect(ids).toContain(id);
  });

  it('leaves out a product switched off for quotes', () => {
    const draft = structuredClone(published);
    draft.catalogue.find((item) => item.id === 'windbreaker_jacket').quotation.enabled = false;
    applyDraftPricing({ productData: draft });
    expect(productList().map((option) => option.id)).not.toContain('windbreaker_jacket');
  });

  it('shows the products grouped by kind in the form', () => {
    const html = renderToStaticMarkup(<SchemaQuotationForm schema={schema} value={createInitialValue('')} onChange={() => {}} />);
    for (const kind of ['T-shirts', 'Polos', 'Caps', 'Jackets', 'Other']) expect(html).toContain(`<optgroup label="${kind}">`);
    expect(html).toContain('Windbreaker Jacket');
    expect(html).toContain('Other / Blank Product');
  });
});

describe('a product priced at its own Data tab cost', () => {
  it.each(quotable().filter((item) => item.quotation.pricingModel !== 'component').map((item) => [item.id]))('%s quotes its cost × the tier', (id) => {
    const entry = productData.catalogue.find((item) => item.id === id);
    const quote = calculateQuotation(orderFor(id));
    const [line] = quote.items;
    expect(line.product.name).toBe(entry.public.name);
    expect(line.productCost.unitCost).toBe(entry.quotation.baseCost);
    expect(line.suggestedSellingPrice).toBeCloseTo(entry.quotation.baseCost * 50 * tierFor(50).sellMultiplier, 6);
  });

  it('prices the windbreaker at its own cost, not the generic cut & sew build-up', () => {
    const value = withDtf(orderFor('windbreaker_jacket'));
    expect(validateQuotation(value)).toEqual({});
    const [line] = calculateQuotation(value).items;
    expect(line.productCost.unitCost).toBe(12.5);
    expect(line.product.name).toBe('Windbreaker Jacket');
    expect(line.description).not.toMatch(/construction/);
  });

  it('follows a cost changed in the Data tab', () => {
    const before = calculateQuotation(withDtf(orderFor('windbreaker_jacket'))).sellingPrice;
    const draft = structuredClone(published);
    draft.catalogue.find((item) => item.id === 'windbreaker_jacket').quotation.baseCost = 20;
    applyDraftPricing({ productData: draft });
    const after = calculateQuotation(withDtf(orderFor('windbreaker_jacket')));
    expect(after.items[0].productCost.unitCost).toBe(20);
    expect(after.sellingPrice).toBeGreaterThan(before);
  });

  it('only offers the printing methods that product takes', () => {
    const value = orderFor('bomber_jacket');
    value.items[0].prints = [{ method: 'silkscreen', technique: 'Spot', size: 'A4', colors: '1' }, { method: 'none' }];
    expect(validateQuotation(value)['item0.print0']).toMatch(/not compatible with Bomber Jacket/);
  });

  it('asks for no garment, cap or sewing details', () => {
    for (const id of ['premium_cotton_tee', 'snapback', 'windbreaker_jacket']) {
      const value = orderFor(id);
      const shown = shownFor(value);
      expect(shown).not.toContain('productDetailsGarment');
      expect(shown).not.toContain('productDetailsCaps');
      expect(shown).not.toContain('productDetailsCutSew');
      expect(shown).not.toContain('productDetailsCustom');
      expect(validateSchemaQuotation(withDtf(value), schema)).toEqual({});
    }
  });

  it('keeps a question the team added for a pricing type, such as Only for Tee', () => {
    const form = structuredClone(schema);
    form.sections.push({ id: 'teeExtras', title: 'Tee extras', repeatsPerItem: true, showWhen: { field: 'productId', in: ['tee'] }, fields: [{ key: 'fold', label: 'Folded', type: 'toggle' }] });
    expect(shownFor(orderFor('premium_cotton_tee'), form)).toContain('teeExtras');
    expect(shownFor(orderFor('windbreaker_jacket'), form)).not.toContain('teeExtras');
  });

  it('refuses a product switched off for quotes after it was chosen', () => {
    const value = withDtf(orderFor('windbreaker_jacket'));
    const draft = structuredClone(published);
    draft.catalogue.find((item) => item.id === 'windbreaker_jacket').quotation.enabled = false;
    applyDraftPricing({ productData: draft });
    expect(validateQuotation(value)['item0.productId']).toMatch(/can no longer be quoted/);
  });
});

describe('products built up from their components', () => {
  it('still asks the jersey for its fabric, collar and sleeve', () => {
    const value = orderFor('jersey-sublimation');
    const shown = shownFor(value);
    expect(shown).toContain('productDetailsJersey');
    expect(value.items[0].prints[0].method).toBe('sublimation');
  });

  it('still asks generic cut & sew for its sewing complexity', () => {
    const value = orderFor('custom_cutsew');
    const shown = shownFor(value);
    expect(shown).toContain('productDetailsCutSew');
    expect(calculateQuotation(value).items[0].description).toMatch(/construction/);
  });
});

describe('Other / Blank', () => {
  it('stays a hand-priced line for anything not in the Data tab', () => {
    const value = orderFor('custom_product');
    const shown = shownFor(value);
    expect(shown).toContain('productDetailsCustom');
    expect(validateQuotation(value)['item0.quotedUnitPrice']).toBeTruthy();
    value.items[0].productOptions = { customName: 'Umbrella', customDescription: 'Golf umbrella, one colour logo' };
    value.items[0].quotedUnitPrice = '9';
    expect(validateQuotation(value)).toEqual({});
    expect(calculateQuotation(value).items[0].product.name).toBe('Umbrella');
  });
});
