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

/*
 * Where "Get a Quote" and every product card send a visitor: the site's own
 * request page, where they say what they want and send it to MySOS. The
 * quotation engine is MySOS's pricing tool for its agents; visitors never go
 * there, and the public site does not carry its address.
 */
export const REQUEST_PATH = '/request/';
export const requestPathFor = (productId) => (productId ? `${REQUEST_PATH}?product=${encodeURIComponent(productId)}` : REQUEST_PATH);

/*
 * A chat that opens with a quote message, naming the product when there is
 * one, or an email when WhatsApp is switched off. Used where a visitor asks to
 * talk to MySOS rather than to build a request.
 */
export function getEnquiryHref(productId) {
  const { whatsapp = {} } = siteConfig;
  const product = productId ? productData.catalogue.find((item) => item.id === productId) : null;
  const name = product?.public?.name;
  const message = name
    ? String(whatsapp.productQuoteMessage || 'Hi MySOS, I would like to get a quote for {product}.').replace('{product}', name)
    : whatsapp.quoteMessage || whatsapp.defaultMessage || '';
  return messageHref(message, name ? `Quote request: ${name}` : 'Quote request');
}

/**
 * A chat with MySOS that opens with `message`: WhatsApp when it is switched on,
 * otherwise an email with `subject`. Null when neither is set up.
 */
export function messageHref(message, subject = 'Enquiry') {
  const { whatsapp = {}, email } = siteConfig;
  if (whatsapp.enabled && whatsapp.number) return `https://wa.me/${whatsapp.number}?text=${encodeURIComponent(message)}`;
  if (email) return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
  return null;
}

/** Link attributes for an enquiry: a WhatsApp chat opens in a new tab. */
export const enquiryLinkProps = (href) => (/^https?:/.test(href || '') ? { target: '_blank', rel: 'noreferrer' } : {});

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
  return { catalogueId: product.id, productId: quoteProductId, productOptions, prints };
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

/*
 * The facts a story shows, kept honest by the story itself.
 *
 * Each fact is its own piece of content, written beside numbers and outcomes
 * that are written separately — so the two drift. A story rewritten from a 320
 * jersey project into a 20,000 piece one still led with "320 jerseys", two
 * lines above "Quantity: 20000 pcs"; another claimed "Delivered on time" when
 * its outcomes no longer said anything of the kind. Both were caught by the
 * website's checks at publish, which stopped the owner publishing anything at
 * all until they were reconciled by hand.
 *
 * The page now settles it: the leading number is the story's own quantity, and
 * a claim about the client's project is shown only where the story backs it up.
 * The index each fact is edited at is kept, so the portal still writes to the
 * fact that was clicked.
 */
const DESIGN_SUPPORT = 'Design support';
const ON_TIME = 'Delivered on time';

export function storyFacts(story) {
  const quantity = Number(story?.quantity);
  const backed = (fact) => {
    if (fact.text === DESIGN_SUPPORT) return (story?.process ?? []).some((step) => /design|artwork/i.test(step));
    if (fact.text === ON_TIME) return (story?.outcomes ?? []).some((outcome) => /on[- ]time|before/i.test(outcome));
    return true;
  };
  return (story?.highlights ?? [])
    .map((fact, index) => ({
      index,
      icon: fact?.icon,
      text: index === 0 && Number.isFinite(quantity) && quantity > 0
        ? String(fact?.text ?? '').replace(/^\s*[\d,]+/, String(quantity))
        : String(fact?.text ?? ''),
    }))
    .filter((fact) => fact.text && backed(fact));
}
