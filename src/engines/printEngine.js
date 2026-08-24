import printData from '../data/printData.json';

const byId = (items, id) => items.find((item) => item.id === id);

export function calculatePrintCost(print = {}, quantity = 0) {
  const method = print.method ?? 'none';
  if (method === 'none') return { unitCost: 0, setupFee: 0, description: 'No printing' };

  if (method === 'dtf' || method === 'dtg') {
    const option = byId(printData.dtf.options, print.option);
    return {
      unitCost: option?.baseCost ?? 0,
      setupFee: 0,
      description: `${method.toUpperCase()} — ${option?.name ?? ''}`,
    };
  }

  if (method === 'silkscreen') {
    const rate = printData.silkscreen.rates.find((item) => item.technique === print.technique && item.size === print.size);
    const colors = Number(print.colors) || 0;
    const qty = Number(quantity) || 0;
    let perColor = 0;
    if (rate && qty > 0) {
      if (qty <= 50) perColor = rate.flat1To50 / qty;
      else if (qty <= 100) perColor = rate.flat51To100 / qty;
      else if (qty <= 500) perColor = rate.perPiece101To500;
      else perColor = rate.perPiece501Plus;
    }
    return { unitCost: perColor * colors, setupFee: 0, description: `Silkscreen — ${print.technique}, ${print.size}, ${colors} colour${colors === 1 ? '' : 's'}` };
  }

  if (method === 'embroidery') {
    const stitch = byId(printData.embroidery.stitchTiers, print.stitchTier);
    const digitizing = byId(printData.embroidery.digitizing, print.digitizing);
    const placement = byId(printData.embroidery.placements, print.placement);
    return {
      unitCost: (stitch?.baseCost ?? 0) * (placement?.multiplier ?? 1),
      setupFee: digitizing?.fee ?? 0,
      description: `Embroidery — ${stitch?.name ?? ''}, ${placement?.name ?? ''}`,
    };
  }

  if (method === 'sublimation') {
    const option = byId(printData.sublimation.options, print.option);
    return { unitCost: option?.baseCost ?? 0, setupFee: 0, description: `Sublimation — ${option?.name ?? ''}` };
  }

  return { unitCost: 0, setupFee: 0, description: '' };
}

export { printData };
