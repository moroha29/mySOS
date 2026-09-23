import productData from '../data/productData.json';

const findById = (items, id) => items.find((item) => item.id === id);

export function getProduct(productId) {
  const product = findById(productData.quotationProducts, productId);
  if (!product) return undefined;
  const allowedPrintMethods = [...new Set(productData.catalogue
    .filter((item) => item.quotation.enabled && item.quotation.productId === productId)
    .flatMap((item) => item.printingMethods))];
  return { ...product, allowedPrintMethods };
}

/*
 * The Data tab product an order item quotes, if it may be quoted. The form
 * names it directly (`catalogueId`); a quote built with the older form names
 * it through the garment or cap picker instead.
 */
export function catalogueItemFor(item = {}) {
  const { productId, productOptions = {} } = item;
  const picked = productId === 'tee' || productId === 'polo' ? productOptions.garment : productId === 'cap' ? productOptions.capType : undefined;
  const entry = findById(productData.catalogue, item.catalogueId || picked);
  if (!entry?.quotation?.enabled || !findById(productData.quotationProducts, entry.quotation.productId)) return undefined;
  // A garment picked under the older form must belong to the engine it was picked for.
  return item.catalogueId || entry.quotation.productId === productId ? entry : undefined;
}

/*
 * Most products are priced from their own "Your cost per piece" in the Data
 * tab. The jersey and generic cut & sew are built up from their components.
 */
export const pricedByOwnCost = (entry) => Boolean(entry)
  && entry.quotation.pricingModel !== 'component'
  && Number.isFinite(entry.quotation.baseCost);

/* Other / Blank: an item that is not in the Data tab, priced by hand. */
export const isManualItem = (item = {}) => item.productId === 'custom_product' && !catalogueItemFor(item);

/*
 * An order item as the engines read it. A product chosen from the list decides
 * its own pricing model and garment, whatever the item carried before.
 */
export function resolveOrderItem(item = {}) {
  if (!item.catalogueId || item.catalogueId === 'custom_product') return item;
  const entry = catalogueItemFor(item);
  if (!entry) return item;
  const productId = entry.quotation.productId;
  const productOptions = { ...item.productOptions };
  if (productId === 'tee' || productId === 'polo') productOptions.garment = entry.id;
  if (productId === 'cap') productOptions.capType = entry.id;
  return { ...item, productId, productOptions };
}

/* The printing methods an item's product takes, from its Data tab entry. */
export function allowedPrintMethodsFor(item = {}) {
  const entry = catalogueItemFor(item);
  if (entry) return entry.printingMethods ?? [];
  return getProduct(item.productId)?.allowedPrintMethods ?? [];
}

export function calculateProductCost(productId, options = {}, entry = undefined) {
  if (pricedByOwnCost(entry)) {
    return { unitCost: entry.quotation.baseCost, costKnown: true, description: entry.public.name };
  }

  if (productId === 'jersey_sublimation') {
    const fabric = findById(productData.jersey.fabrics, options.fabric);
    const collar = findById(productData.jersey.collars, options.collar);
    const sleeve = findById(productData.jersey.sleeves, options.sleeve);
    const hasCustomNameAndNumber = options.customNameAndNumber || options.customName || options.customNumber;
    const unitCost = (fabric?.baseCost ?? 0) + (collar?.baseCost ?? 0) + (sleeve?.baseCost ?? 0)
      + (hasCustomNameAndNumber ? productData.jersey.customNameAndNumberBaseCost : 0)
      + (options.teamSet ? productData.jersey.teamSetBaseCostAdjustment : 0);
    const extras = [
      hasCustomNameAndNumber && 'Custom name & number',
      options.teamSet && 'Team set',
    ].filter(Boolean);
    return { unitCost: Math.max(0, unitCost), costKnown: true, description: [fabric?.name, collar?.name, sleeve?.name, ...extras].filter(Boolean).join(' · ') };
  }

  if (productId === 'tee' || productId === 'polo') {
    const garment = findById(productData.catalogue, options.garment);
    return { unitCost: garment?.quotation.baseCost ?? 0, costKnown: true, description: garment?.public.name ?? '' };
  }

  if (productId === 'cap') {
    const cap = findById(productData.catalogue, options.capType);
    return { unitCost: cap?.quotation.baseCost ?? 0, costKnown: true, description: cap?.public.name ?? '' };
  }

  if (productId === 'custom_cutsew') {
    const config = productData.customCutSew;
    const sewingCost = config.sewingBaseCost[options.complexity] ?? 0;
    const unitCost = config.fabricBaseCostPerMetre * config.metresPerGarment + config.cuttingBaseCost + sewingCost + config.finishingBaseCost;
    return { unitCost, costKnown: true, description: `${options.complexity === 'complex' ? 'Complex' : 'Basic'} construction` };
  }

  if (productId === 'custom_product') {
    return {
      unitCost: 0,
      costKnown: false,
      description: options.customDescription?.trim() ?? '',
    };
  }

  return { unitCost: 0, costKnown: false, description: '' };
}

export { productData };
