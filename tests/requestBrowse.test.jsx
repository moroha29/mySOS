import React from 'react';
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import productData from '../src/data/productData.json';
import siteContent from '../src/data/siteContent.json';
import PublicApp from '../src/public/PublicApp';
import { browseCategories, makeLine } from '../src/utils/solutionRequest';

/*
 * A customer who doesn't know a product's name can still find it: the request
 * page lists the whole catalogue under the products page's categories.
 */

const originalLocation = globalThis.location;
afterEach(() => {
  if (originalLocation === undefined) delete globalThis.location;
  else globalThis.location = originalLocation;
});

const visible = productData.catalogue.filter((item) => item.public.visible);
const listed = (categories) => categories.flatMap((category) => category.products.map((product) => product.id));

describe('browsing every product', () => {
  it('lists every product shown on the website exactly once', () => {
    const ids = listed(browseCategories());
    expect(ids).toHaveLength(visible.length);
    expect(new Set(ids)).toEqual(new Set(visible.map((item) => item.id)));
  });

  it('never lists a product hidden from the website', () => {
    const hidden = productData.catalogue.filter((item) => !item.public.visible).map((item) => item.id);
    expect(hidden.length).toBeGreaterThan(0);
    for (const id of hidden) expect(listed(browseCategories())).not.toContain(id);
  });

  it('follows the products page categories, by their names, and drops empty ones', () => {
    const categories = browseCategories();
    const order = siteContent.categories.map((category) => category.id).filter((id) => categories.some((category) => category.id === id));
    expect(categories.map((category) => category.id)).toEqual(order);
    for (const category of categories) {
      expect(category.name).toBe(siteContent.categories.find((entry) => entry.id === category.id).name);
      expect(category.products.length).toBeGreaterThan(0);
    }
  });

  it('puts featured products first in their category', () => {
    for (const { products } of browseCategories()) {
      const firstPlain = products.findIndex((product) => !product.public.featured);
      if (firstPlain >= 0) expect(products.slice(firstPlain).some((product) => product.public.featured)).toBe(false);
    }
  });

  it('leaves out what is already in the request', () => {
    const ids = listed(browseCategories([makeLine({ productId: 'windbreaker_jacket' }), makeLine({ productId: 'canvas_tote_bag' })]));
    expect(ids).not.toContain('windbreaker_jacket');
    expect(ids).not.toContain('canvas_tote_bag');
    expect(ids).toHaveLength(visible.length - 2);
  });

  it('names a category the products page does not know from its id', () => {
    const [category] = browseCategories([], []).filter((entry) => entry.id === 'corporate-gifts');
    expect(category.name).toBe('Corporate gifts');
  });
});

describe('the Get a Quote page', () => {
  it('holds the whole catalogue in the window that adds a product', () => {
    globalThis.location = { pathname: '/mySOS/request/', search: '' };
    const html = renderToStaticMarkup(<PublicApp />);
    // The catalogue used to sit open under the request, an accordion of every
    // category beneath the rows already chosen.
    expect(html).toContain('class="add-product"');
    expect(html).not.toContain('class="request-browse"');
    for (const category of browseCategories()) expect(html).toContain(category.name);
    // Products that are not featured used to be reachable only by search.
    const plain = visible.filter((item) => !item.public.featured);
    expect(plain.length).toBeGreaterThan(20);
    for (const product of plain) expect(html).toContain(product.public.name.replace(/&/g, '&amp;'));
  });

  it('opens that window on a button, and it is shut until then', () => {
    globalThis.location = { pathname: '/mySOS/request/', search: '' };
    const html = renderToStaticMarkup(<PublicApp />);
    expect(html).toContain('class="btn btn-outline request-add-open"');
    // A <dialog> without the open attribute is closed, and closed is how the
    // page is drawn.
    expect(html).not.toMatch(/<dialog[^>]*\sopen/);
  });
});

describe('the window that adds a product', () => {
  const dialog = readFileSync(new URL('../src/public/components/AddProductDialog.jsx', import.meta.url), 'utf8');
  const css = readFileSync(new URL('../src/public/public.css', import.meta.url), 'utf8');

  it('is a real dialog, so Escape and the backdrop close it', () => {
    expect(dialog).toContain('<dialog className="add-product"');
    expect(dialog).toContain('dialog.showModal()');
    expect(dialog).toMatch(/dialog\.addEventListener\('close', closed\)/);
  });

  it('searches the catalogue, and steps through it by category', () => {
    expect(dialog).toContain('searchProducts(query, { exclude: chosen })');
    expect(dialog).toContain('browseCategories(lines)');
    // While a search is running the categories stand aside, so what is on
    // screen is what was searched for.
    expect(dialog).toContain('{!asked && <div className="add-product-filters"');
  });

  it('cannot grow wider than the screen it opens on', () => {
    // Without minmax(0, 1fr) the one grid track took the widest thing inside
    // it and the whole sheet slid off the side of a phone.
    expect(css).toMatch(/\.add-product\[open\] \{ display: grid; grid-template-columns: minmax\(0, 1fr\);/);
    expect(css).toMatch(/\.add-product \{ inset: auto 0 0 0;/);
  });
});

describe('the request itself', () => {
  const builder = readFileSync(new URL('../src/public/components/RequestBuilder.jsx', import.meta.url), 'utf8');

  it('lists no products under the button that opens the catalogue', () => {
    // A list of suggestions under it put the catalogue back beneath the
    // request it had just been taken out of.
    expect(builder).not.toContain('suggestionsFor');
    expect(builder).not.toContain('request-more-list');
  });
});
