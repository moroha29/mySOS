import productData from '../data/productData.json';
import printData from '../data/printData.json';
import tierData from '../data/tierData.json';
import addonData from '../data/addonData.json';

/*
 * Inside the website manager's preview, the quotation engine prices with the
 * draft's price lists, so a price changed in the manager's Data tab shows in
 * the form (and its Excel quote) before it is published.
 *
 * The engines read these four lists each time they calculate, so the lists
 * are refilled in place. The published values are kept, and come back when a
 * draft carries no price lists. Outside the manager nothing calls this.
 */
const lists = { productData, printData, tierData, addonData };
const published = structuredClone(lists);

export function applyDraftPricing(draft) {
  for (const [key, target] of Object.entries(lists)) {
    const next = structuredClone(draft?.[key] ?? published[key]);
    if (Array.isArray(target)) {
      if (!Array.isArray(next)) continue;
      target.splice(0, target.length, ...next);
    } else if (next && typeof next === 'object' && !Array.isArray(next)) {
      for (const name of Object.keys(target)) delete target[name];
      Object.assign(target, next);
    }
  }
}
