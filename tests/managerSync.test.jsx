import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import PublicApp from '../src/public/PublicApp';
import siteConfig from '../src/data/siteConfig.json';
import siteContent from '../src/data/siteContent.json';
import solutions from '../src/data/solutions.json';
import successStories from '../src/data/successStories.json';
import resources from '../src/data/resources.json';
import quotationForm from '../src/data/quotationForm.json';
import productData from '../src/data/productData.json';
import printData from '../src/data/printData.json';
import tierData from '../src/data/tierData.json';
import addonData from '../src/data/addonData.json';

/*
 * Everything the site says can be edited, can be.
 *
 * Each editable thing carries the address of its value in the draft the
 * website manager loads. An address that leads nowhere is worse than no
 * address at all: the field is offered, opens empty, and whatever is typed is
 * written to a key the site never reads. The guides were in that state — every
 * heading and paragraph of every one of them addressed under `homepage`, where
 * no guide has ever been kept.
 *
 * The draft below is assembled exactly as website-manager's mysosSite adapter
 * assembles it. If the adapter learns to load another file, or stops loading
 * one, this is where the two fall out of step.
 */

// The adapter withholds the Google reviews: they come from the business's own
// profile and are not the manager's to edit.
const GOOGLE_REVIEW_KEYS = new Set(['testimonials', 'reviewSummary', '_reviewsNote']);
const withoutGoogleReviews = (content) =>
  Object.fromEntries(Object.entries(content).filter(([key]) => !GOOGLE_REVIEW_KEYS.has(key)));

const draft = {
  homepage: { siteConfig, ...withoutGoogleReviews(siteContent) },
  additionalContent: { solutions, successStories, resources },
  quotationForm,
  pricingData: { productData, printData, tierData, addonData },
};

const originalLocation = globalThis.location;
afterEach(() => {
  if (originalLocation === undefined) delete globalThis.location;
  else globalThis.location = originalLocation;
});

const render = (pathname, search = '') => {
  globalThis.location = { pathname, search };
  return renderToStaticMarkup(<PublicApp />);
};

const visible = productData.catalogue.filter((item) => item.public.visible);
const routes = [
  ['/', ''],
  ['/products/', ''],
  ['/request/', ''],
  ['/solutions/', ''],
  ['/why-mysos/', ''],
  ['/success-stories/', ''],
  ['/resources/', ''],
  ...siteContent.categories.filter((item) => item.visible !== false).map((item) => ['/products/', `?category=${item.id}`]),
  ...solutions.map((item) => [`/solutions/${item.id}/`, '']),
  ...successStories.map((item) => [`/success-stories/${item.slug}/`, '']),
  ...resources.articles.map((item) => [`/resources/${item.slug}/`, '']),
  ...visible.map((item) => [`/products/${item.public.slug}/`, '']),
];

const unescape = (value) => value
  .replace(/&quot;/g, '"').replace(/&#x27;/g, "'")
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

/** Every address the site puts on the page, with the first page that used it. */
function addressesAcrossTheSite() {
  const found = new Map();
  for (const [pathname, search] of routes) {
    const markup = render(pathname, search);
    const where = pathname + search;
    for (const [, raw] of markup.matchAll(/data-cms-path="([^"]*)"/g)) {
      if (!found.has(unescape(raw))) found.set(unescape(raw), where);
    }
    for (const [, raw] of markup.matchAll(/data-cms-paths="([^"]*)"/g)) {
      for (const address of JSON.parse(unescape(raw))) {
        const key = JSON.stringify(address);
        if (!found.has(key)) found.set(key, where);
      }
    }
  }
  return found;
}

const valueAt = (address) => {
  let node = draft;
  for (const step of address) {
    if (node === null || node === undefined) return undefined;
    node = node[step];
  }
  return node;
};

describe('what the site offers to the manager', () => {
  const addresses = addressesAcrossTheSite();

  it('puts an address on a great many things', () => {
    // A guard on the guard: if the markup ever stopped carrying addresses, the
    // check below would pass by finding nothing to check.
    expect(addresses.size).toBeGreaterThan(900);
  });

  it('leads every one of them to a value the manager holds', () => {
    const lost = [...addresses].filter(([key]) => valueAt(JSON.parse(key)) === undefined);
    expect(lost.map(([key, where]) => `${key} (first on ${where})`)).toEqual([]);
  });

  it('keeps the guides where the manager keeps them', () => {
    // resources.json is its own file, loaded beside the solutions and the
    // stories, so the guides are addressed under additionalContent.
    const guides = [...addresses.keys()].filter((key) => key.includes('"resources"'));
    expect(guides.length).toBeGreaterThan(50);
    for (const key of guides) expect(JSON.parse(key)[0]).toBe('additionalContent');
  });

  it('offers a value that can be typed into, not the list it sits in', () => {
    // Three "popular search" chips each carried the address of the whole list,
    // so clicking any one of them opened the same field, holding all three.
    const typed = [...addresses.keys()].filter((key) => {
      const value = valueAt(JSON.parse(key));
      return typeof value === 'string' || typeof value === 'number';
    });
    expect(typed.length).toBe(addresses.size);
  });

  it('never offers a field whose value the site invents instead of reading', () => {
    // A printing method's mark and the badge on a featured product were drawn
    // from a fallback in the code while their address pointed at a key that
    // did not exist, so the editor opened an empty box either way.
    for (const method of Object.values(siteContent.printingMethods)) expect(typeof method.icon).toBe('string');
    expect(typeof siteContent.labels.featuredBadge).toBe('string');
  });
});
