import addonData from '../data/addonData.json';

export function calculateAddons(selections = {}, orderQuantity = 0) {
  const items = addonData
    .filter((addon) => selections[addon.id]?.selected)
    .map((addon) => {
      const requestedQty = Number(selections[addon.id]?.quantity);
      const quantity = addon.type === 'perPiece' ? (requestedQty > 0 ? requestedQty : Number(orderQuantity)) : 1;
      return {
        ...addon,
        quantity,
        totalCost: addon.baseCost * quantity,
        totalSell: addon.sellPrice * quantity,
      };
    });

  return {
    items,
    totalCost: items.reduce((sum, item) => sum + item.totalCost, 0),
    totalSell: items.reduce((sum, item) => sum + item.totalSell, 0),
  };
}

export { addonData };
