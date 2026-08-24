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

export function calculateProductCost(productId, options = {}) {
  if (productId === 'jersey_sublimation') {
    const fabric = findById(productData.jersey.fabrics, options.fabric);
    const collar = findById(productData.jersey.collars, options.collar);
    const sleeve = findById(productData.jersey.sleeves, options.sleeve);
    const unitCost = (fabric?.baseCost ?? 0) + (collar?.baseCost ?? 0) + (sleeve?.baseCost ?? 0)
      + (options.customName ? productData.jersey.customNameBaseCost : 0)
      + (options.customNumber ? productData.jersey.customNumberBaseCost : 0)
      + (options.teamSet ? productData.jersey.teamSetBaseCostAdjustment : 0);
    return { unitCost, description: [fabric?.name, collar?.name, sleeve?.name].filter(Boolean).join(' · ') };
  }

  if (productId === 'tee' || productId === 'polo') {
    const garment = findById(productData.catalogue, options.garment);
    return { unitCost: garment?.quotation.baseCost ?? 0, description: garment?.public.name ?? '' };
  }

  if (productId === 'cap') {
    const cap = findById(productData.catalogue, options.capType);
    return { unitCost: cap?.quotation.baseCost ?? 0, description: cap?.public.name ?? '' };
  }

  if (productId === 'custom_cutsew') {
    const config = productData.customCutSew;
    const sewingCost = config.sewingBaseCost[options.complexity] ?? 0;
    const unitCost = config.fabricBaseCostPerMetre * config.metresPerGarment + config.cuttingBaseCost + sewingCost + config.finishingBaseCost;
    return { unitCost, description: `${options.complexity === 'complex' ? 'Complex' : 'Basic'} construction` };
  }

  return { unitCost: 0, description: '' };
}

export { productData };
