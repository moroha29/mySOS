import React from 'react';
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
  it('shows the whole catalogue by category, not only the featured few', () => {
    globalThis.location = { pathname: '/mySOS/request/', search: '' };
    const html = renderToStaticMarkup(<PublicApp />);
    expect(html).toContain('Browse all products');
    for (const category of browseCategories()) expect(html).toContain(`${category.name} <span>${category.products.length}</span>`);
    // Products that are not featured used to be reachable only by search.
    const plain = visible.filter((item) => !item.public.featured);
    expect(plain.length).toBeGreaterThan(20);
    for (const product of plain) expect(html).toContain(product.public.name.replace(/&/g, '&amp;'));
  });
});
