import { describe, expect, it } from 'vitest';
import productData from '../src/data/productData.json';
import printData from '../src/data/printData.json';
import solutions from '../src/data/solutions.json';
import successStories from '../src/data/successStories.json';
import { calculateProductCost, getProduct } from '../src/engines/productEngine';
import { createInitialValue } from '../src/App';
import { getDisplayPrice, getPublicProducts, getQuoteHref, getQuotationPreset, getStories, getStoryBySlug } from '../src/utils/catalogue';
import { resolvePublicRoute } from '../src/public/PublicApp';

describe('shared catalogue', () => {
  it('has unique, internally consistent product and content references', () => {
    const productIds = productData.catalogue.map((product) => product.id);
    const slugs = productData.catalogue.map((product) => product.public.slug);
    const methodIds = new Set(printData.methods.map((method) => method.id));
    expect(new Set(productIds).size).toBe(productIds.length);
    expect(new Set(slugs).size).toBe(slugs.length);
    productData.catalogue.forEach((product) => {
      expect(product.printingMethods.every((method) => methodIds.has(method))).toBe(true);
      expect(Number.isFinite(product.public.displayPricing.amount)).toBe(true);
      expect(product.public.displayPricing.amount).toBeGreaterThanOrEqual(0);
      if (product.quotation.enabled && product.quotation.pricingModel === 'tiered') {
        expect(Number.isFinite(product.quotation.baseCost)).toBe(true);
      }
    });
    solutions.forEach((solution) => expect(solution.recommendedProducts.every((id) => productIds.includes(id))).toBe(true));
    successStories.forEach((story) => expect(story.products.every((id) => productIds.includes(id))).toBe(true));
    expect(new Set(successStories.map((story) => story.slug)).size).toBe(successStories.length);
  });

  it('provides public copy for every visible printing method', () => {
    const visibleMethods = printData.methods.filter((method) => method.public?.visible);
    expect(visibleMethods.map((method) => method.id)).toEqual(['silkscreen', 'dtf', 'dtg', 'embroidery', 'sublimation', 'uv_printing']);
    expect(visibleMethods.every((method) => method.public.description?.length > 10)).toBe(true);
    expect(printData.methods.find((method) => method.id === 'uv_printing').quotationEnabled).toBe(false);
  });

  it('keeps hidden products off the public catalogue', () => {
    const products = getPublicProducts();
    expect(products.some((product) => product.id === 'cotton_v_neck_tee')).toBe(false);
  });

  it('uses the public display price from master product data', () => {
    const product = productData.catalogue.find((item) => item.id === 'premium_cotton_tee');
    expect(getDisplayPrice(product)).toBe('From $12.90');
  });

  it('filters public products by subcategory', () => {
    const polos = getPublicProducts({ subcategory: 'polos' });
    expect(polos.length).toBeGreaterThan(0);
    expect(polos.every((product) => product.public.subcategory === 'polos')).toBe(true);
  });

  it('reads quotation base cost from the same catalogue record', () => {
    const product = productData.catalogue.find((item) => item.id === 'premium_cotton_tee');
    const original = product.quotation.baseCost;
    try {
      product.quotation.baseCost = 5.25;
      expect(calculateProductCost('tee', { garment: product.id }).unitCost).toBe(5.25);
    } finally {
      product.quotation.baseCost = original;
    }
  });

  it('derives quotation printing compatibility from catalogue records', () => {
    expect(getProduct('tee').allowedPrintMethods).toEqual(['dtf', 'dtg', 'silkscreen', 'embroidery']);
    expect(getProduct('jersey_sublimation').allowedPrintMethods).toEqual(['sublimation']);
    expect(getProduct('cap').allowedPrintMethods).not.toContain('uv_printing');
  });
});

describe('public and quotation integration', () => {
  it('builds the quotation link and preset from catalogue data', () => {
    expect(getQuoteHref('premium_cotton_tee')).toBe('/mySOS/quotation_engine/?product=premium-cotton-tee');
    expect(getQuotationPreset('premium_cotton_tee')).toMatchObject({ productId: 'tee', productOptions: { garment: 'premium_cotton_tee' } });
    expect(createInitialValue('?product=premium-cotton-tee').items[0]).toMatchObject({ productId: 'tee', productOptions: { garment: 'premium_cotton_tee' } });
    expect(createInitialValue('?product=does-not-exist').items[0]).toMatchObject({ productId: '', productOptions: {} });
    expect(getQuoteHref('canvas_tote_bag')).toBe('/mySOS/quotation_engine/');
  });

  it('resolves static public routes and story slugs', () => {
    expect([
      ['/mySOS/', 'home'],
      ['/mySOS/products/', 'products'],
      ['/mySOS/solutions/', 'solutions'],
      ['/mySOS/why-mysos/', 'why'],
      ['/mySOS/success-stories/', 'stories'],
    ].map(([path, page]) => resolvePublicRoute(path).page === page)).toEqual([true, true, true, true, true]);
    expect(resolvePublicRoute('/mySOS/success-stories/ntu-cca-jerseys-2024/')).toEqual({ page: 'story', slug: 'ntu-cca-jerseys-2024' });
    expect(resolvePublicRoute('/mySOS/not-a-page/')).toEqual({ page: 'not-found' });
    expect(getStoryBySlug('ntu-cca-jerseys-2024')?.quantity).toBe(320);
  });

  it('filters stories by category', () => {
    const schools = getStories({ category: 'schools' });
    expect(schools.length).toBeGreaterThan(0);
    expect(schools.every((story) => story.category === 'schools')).toBe(true);
  });
});
