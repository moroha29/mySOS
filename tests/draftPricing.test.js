import { afterEach, describe, expect, it } from 'vitest';
import productData from '../src/data/productData.json';
import { applyDraftPricing } from '../src/utils/draftPricing';
import { calculateQuotation } from '../src/engines/quotationEngine';

/*
 * Inside the website manager's preview the quotation engine prices with the
 * draft's price lists, so a price changed in the manager shows in the form
 * before it is published.
 */

const order = () => ({ items: [{ id: 'a', quantity: '50', productId: 'tee', productOptions: { garment: 'premium_cotton_tee' }, prints: [{ method: 'none' }, { method: 'none' }], sizes: {} }], addons: {}, shippingCost: '0' });
const published = structuredClone(productData);

afterEach(() => applyDraftPricing(null));

describe('draft prices in the manager preview', () => {
  it('prices with the draft, and goes back to the published prices without one', () => {
    const before = calculateQuotation(order()).sellingPrice;
    const draft = { productData: structuredClone(published) };
    draft.productData.catalogue.find((item) => item.id === 'premium_cotton_tee').quotation.baseCost *= 2;
    applyDraftPricing(draft);
    expect(calculateQuotation(order()).sellingPrice).toBeCloseTo(before * 2);
    applyDraftPricing(null);
    expect(calculateQuotation(order()).sellingPrice).toBeCloseTo(before);
  });

  it('a product added in the draft can be quoted', () => {
    const draft = { productData: structuredClone(published) };
    draft.productData.catalogue.push({ ...structuredClone(published.catalogue[0]), id: 'oversized_tee', public: { ...published.catalogue[0].public, name: 'Oversized Tee', slug: 'oversized-tee' } });
    applyDraftPricing(draft);
    const value = order();
    value.items[0].productOptions.garment = 'oversized_tee';
    expect(calculateQuotation(value).items[0].costKnown).toBe(true);
  });
});
