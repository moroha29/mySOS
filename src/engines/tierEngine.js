import tiers from '../data/tierData.json';

export function getTier(quantity) {
  const qty = Number(quantity);
  if (!Number.isFinite(qty) || qty < 1) return null;
  return tiers.find((tier) => qty >= tier.minQty && qty <= tier.maxQty) ?? tiers.at(-1);
}

export { tiers };
