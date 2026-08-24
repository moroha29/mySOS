import productData from '../data/productData.json';
import successStories from '../data/successStories.json';
import siteConfig from '../data/siteConfig.json';

export function getPublicProducts({ category, subcategory, featured } = {}) {
  return productData.catalogue.filter((product) => product.public.visible
    && (!category || product.public.category === category)
    && (!subcategory || product.public.subcategory === subcategory)
    && (featured === undefined || product.public.featured === featured));
}

export function getPublicProduct(productId) {
  return productData.catalogue.find((product) => product.id === productId && product.public.visible);
}

export function getDisplayPrice(product) {
  const display = product?.public?.displayPricing;
  if (!display?.show) return null;
  return `${display.prefix ? `${display.prefix} ` : ''}$${Number(display.amount).toFixed(2)}`;
}

export function getQuoteHref(productId) {
  const product = productId ? productData.catalogue.find((item) => item.id === productId) : null;
  const query = product?.quotation.enabled ? `?product=${encodeURIComponent(product.public.slug)}` : '';
  return `${siteConfig.quotationPath}${query}`;
}

export function getQuotationPreset(productId) {
  const product = productData.catalogue.find((item) => (item.id === productId || item.public.slug === productId) && item.quotation.enabled);
  if (!product) return null;
  const quoteProductId = product.quotation.productId;
  const productOptions = quoteProductId === 'tee' || quoteProductId === 'polo'
    ? { garment: product.id }
    : quoteProductId === 'cap'
      ? { capType: product.id }
      : quoteProductId === 'jersey_sublimation'
        ? { fabric: 'polyester_dri_fit', collar: 'round_neck', sleeve: 'short' }
        : quoteProductId === 'custom_cutsew'
          ? { complexity: 'basic' }
          : {};
  const prints = quoteProductId === 'jersey_sublimation'
    ? [{ method: 'sublimation', option: 'full' }, { method: 'none' }]
    : [{ method: 'none' }, { method: 'none' }];
  return { productId: quoteProductId, productOptions, prints };
}

export function getStories({ category = 'all', sort = 'latest' } = {}) {
  return successStories
    .filter((story) => category === 'all' || story.category === category)
    .slice()
    .sort((a, b) => sort === 'oldest' ? a.year - b.year : b.year - a.year);
}

export function getStoryBySlug(slug) {
  return successStories.find((story) => story.slug === slug) ?? null;
}
