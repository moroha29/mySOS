import { describe, expect, it } from 'vitest';
import { calculateQuotation, validateQuotation } from '../src/engines/quotationEngine';
import { getTier } from '../src/engines/tierEngine';
import { calculateAddons } from '../src/engines/addonEngine';

const base = {
  customerName: 'Test Client', customerType: 'Corporate', orderDate: '2026-08-23', orderReference: 'TEST-001',
  quantity: 50, productId: 'tee', productOptions: { garment: 'premium_cotton_tee' }, prints: [{ method: 'dtf', option: 'front_left_chest' }],
  addons: {}, sizes: {}, shippingCost: 0,
};

describe('workbook pricing parity', () => {
  it('prices a jersey sublimation quotation', () => {
    const quote = calculateQuotation({ ...base, productId: 'jersey_sublimation', productOptions: { fabric: 'polyester_dri_fit', collar: 'round_neck', sleeve: 'short' }, prints: [{ method: 'sublimation', option: 'full' }] });
    expect(quote.internalCost).toBe(650);
    expect(quote.adjustedCost).toBe(552.5);
    expect(quote.sellingPrice).toBe(1202.5);
    expect(quote.unitSellingPrice).toBe(24.05);
  });

  it('treats custom name and number as one jersey option and prices a knitted collar separately', () => {
    const quote = calculateQuotation({
      ...base,
      productId: 'jersey_sublimation',
      productOptions: {
        fabric: 'polyester_dri_fit', collar: 'round_neck', sleeve: 'short',
        customNameAndNumber: true, knittedCollar: true,
      },
      prints: [{ method: 'sublimation', option: 'full' }],
    });
    expect(quote.productCost.unitCost).toBe(8.7);
    expect(quote.productCost.description).toContain('Custom name & number');
    expect(quote.productCost.description).toContain('Knitted collar');
  });

  it('quotes an unlisted product from cost with an editable quotation price and no required printing', () => {
    const input = {
      ...base,
      quantity: 12,
      productId: 'custom_product',
      productOptions: {
        customName: 'Travel Pouch',
        customDescription: 'Recycled canvas pouch with zip',
        customUnitCost: '7.25',
      },
      quotedUnitPrice: '10',
      prints: [{ method: 'none' }, { method: 'none' }],
    };
    const quote = calculateQuotation(input);
    expect(validateQuotation(input)).toEqual({});
    expect(quote.product.name).toBe('Travel Pouch');
    expect(quote.productCost.description).toBe('Recycled canvas pouch with zip');
    expect(quote.items[0].pricingMode).toBe('override');
    expect(quote.items[0].suggestedUnitSellingPrice).toBeCloseTo(15.95);
    expect(quote.items[0].unitCost).toBeCloseTo(6.8875);
    expect(quote.sellingPrice).toBe(120);
    expect(quote.unitSellingPrice).toBe(10);
  });

  it('requires the blank product name, description, and a positive unit price', () => {
    const errors = validateQuotation({
      ...base,
      productId: 'custom_product',
      productOptions: { customName: '', customDescription: '', customUnitCost: '0' },
      prints: [{ method: 'none' }],
    });
    expect(errors.productOptions).toBe('Enter the custom product name and description.');
  });

  it('never produces a negative total from incomplete team-set or negative form values', () => {
    const incompleteTeamSet = calculateQuotation({
      ...base,
      productId: 'jersey_sublimation',
      productOptions: { teamSet: true },
      prints: [{ method: 'sublimation' }],
    });
    expect(incompleteTeamSet.productCost.unitCost).toBe(0);
    expect(incompleteTeamSet.sellingPrice).toBeGreaterThanOrEqual(0);

    const invalidNumbers = calculateQuotation({ ...base, quantity: -5, shippingCost: -20, quotedUnitPrice: -4 });
    expect(invalidNumbers.totalQuantity).toBe(0);
    expect(invalidNumbers.shippingCost).toBe(0);
    expect(invalidNumbers.sellingPrice).toBe(0);
  });

  it('rejects a negative manual quotation price', () => {
    const errors = validateQuotation({ ...base, quotedUnitPrice: '-0.01' });
    expect(errors.quotedUnitPrice).toBe('Quotation price cannot be negative.');
  });

  it('prices a tee with DTF', () => {
    const quote = calculateQuotation(base);
    expect(quote.internalCost).toBe(300);
    expect(quote.adjustedCost).toBe(255);
    expect(quote.sellingPrice).toBe(555);
    expect(quote.unitSellingPrice).toBe(11.1);
  });

  it('prices a tee with silkscreen minimum-charge logic', () => {
    const quote = calculateQuotation({ ...base, prints: [{ method: 'silkscreen', technique: 'Waterbase/Rubber', size: 'Within A4', colors: 2 }] });
    expect(quote.prints[0].unitCost).toBe(1.6);
    expect(quote.internalCost).toBe(305);
    expect(quote.adjustedCost).toBe(259.25);
    expect(quote.sellingPrice).toBe(564.25);
    expect(quote.unitSellingPrice).toBe(11.285);
  });

  it('prices a cap with embroidery and digitizing', () => {
    const quote = calculateQuotation({ ...base, quantity: 100, productId: 'cap', productOptions: { capType: 'snapback' }, prints: [{ method: 'embroidery', stitchTier: 'up_to_5000', digitizing: 'standard', placement: 'cap_front' }] });
    expect(quote.setupFees).toBe(25);
    expect(quote.internalCost).toBe(575);
    expect(quote.adjustedCost).toBe(460);
    expect(quote.sellingPrice).toBe(977.5);
    expect(quote.unitSellingPrice).toBe(9.775);
  });

  it('prices a custom cut and sew quotation', () => {
    const quote = calculateQuotation({ ...base, quantity: 30, productId: 'custom_cutsew', productOptions: { complexity: 'basic' }, prints: [{ method: 'dtf', option: 'sleeve' }] });
    expect(quote.productCost.unitCost).toBe(20.5);
    expect(quote.internalCost).toBe(640.5);
    expect(quote.adjustedCost).toBe(576.45);
    expect(quote.sellingPrice).toBe(1281);
    expect(quote.unitSellingPrice).toBe(42.7);
  });

  it('prices multiple add-ons with cost and sell totals', () => {
    const quote = calculateQuotation({ ...base, quantity: 20, addons: { packaging: { selected: true }, hang_tag: { selected: true }, design_fee: { selected: true } } });
    expect(quote.addons.totalCost).toBe(46);
    expect(quote.addons.totalSell).toBe(65);
    expect(quote.adjustedCost).toBeCloseTo(157.7);
    expect(quote.sellingPrice).toBeCloseTo(384.2);
    expect(quote.unitSellingPrice).toBeCloseTo(19.21);
  });

  it('selects all workbook quantity tiers at their boundaries', () => {
    const quantities = [1, 9, 10, 20, 21, 30, 31, 50, 51, 100, 101, 300, 301, 500, 501];
    expect(quantities.map((qty) => getTier(qty).label)).toEqual([
      '1–9', '1–9', '10–20', '10–20', '21–30', '21–30', '31–50', '31–50',
      '51–100', '51–100', '101–300', '101–300', '301–500', '301–500', '500+',
    ]);
    expect([1, 10, 21, 31, 51, 101, 301, 501].map((qty) => [getTier(qty).costMultiplier, getTier(qty).sellMultiplier])).toEqual([
      [1, 2.5], [.95, 2.2], [.9, 2], [.85, 1.85], [.8, 1.7], [.75, 1.55], [.7, 1.45], [.65, 1.35],
    ]);
  });

  it('keeps raw, adjusted, selling, add-on and shipping totals distinct', () => {
    const quote = calculateQuotation({
      ...base,
      addons: { packaging: { selected: true }, design_fee: { selected: true } },
      shippingMethod: 'Local Delivery',
      shippingCost: 12,
    });
    expect(quote.addons.totalCost).toBe(55);
    expect(quote.addons.totalSell).toBe(80);
    expect(quote.shippingCost).toBe(12);
    expect(quote.internalCost).toBe(367);
    expect(quote.adjustedCost).toBeCloseTo(311.95);
    expect(quote.sellingPrice).toBeCloseTo(715.95);
    expect(quote.unitSellingPrice).toBeCloseTo(14.319);
    expect(quote.profit).toBeCloseTo(404);
  });

  it('uses the DTF rate table for the documented DTG alias', () => {
    const dtf = calculateQuotation({ ...base, prints: [{ method: 'dtf', option: 'front_left_chest' }] });
    const dtg = calculateQuotation({ ...base, prints: [{ method: 'dtg', option: 'front_left_chest' }] });
    expect(dtg.internalCost).toBe(dtf.internalCost);
    expect(dtg.sellingPrice).toBe(dtf.sellingPrice);
  });

  it('combines independently tiered products in one quotation', () => {
    const quote = calculateQuotation({
      ...base,
      items: [
        { id: 'tee-line', quantity: 50, productId: 'tee', productOptions: { garment: 'premium_cotton_tee' }, prints: [{ method: 'dtf', option: 'front_left_chest' }], sizes: {} },
        { id: 'polo-line', quantity: 25, productId: 'polo', productOptions: { garment: 'polo_cotton_pique' }, prints: [{ method: 'dtf', option: 'sleeve' }], sizes: {} },
      ],
    });
    expect(quote.items.map((item) => item.tier.label)).toEqual(['31–50', '21–30']);
    expect(quote.items[0].sellingPrice).toBe(555);
    expect(quote.items[1].sellingPrice).toBe(342.5);
    expect(quote.totalQuantity).toBe(75);
    expect(quote.adjustedCost).toBe(409.125);
    expect(quote.sellingPrice).toBe(897.5);
  });

  it('rejects incompatible sublimation combinations', () => {
    const errors = validateQuotation({ ...base, prints: [{ method: 'sublimation', option: 'full' }] });
    expect(Object.values(errors)).toContain('Full sublimation printing is only available for jerseys.');
  });

  it('validates cap variants and add-on quantity behavior', () => {
    const invalidCap = validateQuotation({ ...base, productId: 'cap', productOptions: { capType: 'premium_cotton_tee' }, prints: [{ method: 'embroidery', stitchTier: 'up_to_5000', digitizing: 'standard', placement: 'cap_front' }] });
    expect(invalidCap.productOptions).toBe('Choose a valid cap type.');
    const addons = calculateAddons({ packaging: { selected: true, quantity: 3 }, design_fee: { selected: true, quantity: 99 } }, 20);
    expect(addons.items.map((item) => [item.id, item.quantity])).toEqual([['packaging', 3], ['design_fee', 1]]);
    expect(addons.totalCost).toBe(31.5);
    expect(addons.totalSell).toBe(33);
  });
});
