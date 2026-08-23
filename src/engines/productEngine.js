import productData from '../data/productData.json';

const findById = (items, id) => items.find((item) => item.id === id);

export function getProduct(productId) {
  return findById(productData.products, productId);
}

export function calculateProductCost(productId, options = {}) {
  if (productId === 'jersey_sublimation') {
    const fabric = findById(productData.jersey.fabrics, options.fabric);
    const collar = findById(productData.jersey.collars, options.collar);
    const sleeve = findById(productData.jersey.sleeves, options.sleeve);
    const unitCost = (fabric?.cost ?? 0) + (collar?.cost ?? 0) + (sleeve?.cost ?? 0)
      + (options.customName ? productData.jersey.customNameCost : 0)
      + (options.customNumber ? productData.jersey.customNumberCost : 0)
      + (options.teamSet ? productData.jersey.teamSetDiscount : 0);
    return { unitCost, description: [fabric?.name, collar?.name, sleeve?.name].filter(Boolean).join(' · ') };
  }

  if (productId === 'tee' || productId === 'polo') {
    const garment = findById(productData.garments, options.garment);
    return { unitCost: garment?.cost ?? 0, description: garment?.name ?? '' };
  }

  if (productId === 'cap') {
    const cap = findById(productData.caps, options.capType);
    return { unitCost: cap?.cost ?? 0, description: cap?.name ?? '' };
  }

  if (productId === 'custom_cutsew') {
    const config = productData.customCutSew;
    const sewingCost = config.sewing[options.complexity] ?? 0;
    const unitCost = config.fabricPerMetre * config.metresPerGarment + config.cutting + sewingCost + config.finishing;
    return { unitCost, description: `${options.complexity === 'complex' ? 'Complex' : 'Basic'} construction` };
  }

  return { unitCost: 0, description: '' };
}

export { productData };
