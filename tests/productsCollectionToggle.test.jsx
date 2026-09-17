import React from 'react';
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import siteContent from '../src/data/siteContent.json';
import ProductsPage from '../src/public/pages/ProductsPage';
import { getPublicProducts } from '../src/utils/catalogue';

const originalLocation = globalThis.location;
afterEach(() => {
  if (originalLocation === undefined) delete globalThis.location;
  else globalThis.location = originalLocation;
});

const source = readFileSync(new URL('../src/public/pages/ProductsPage.jsx', import.meta.url), 'utf8');

describe('the product collection View All / Show Less toggle', () => {
  it('starts collapsed, with a button that says what it controls', () => {
    globalThis.location = { pathname: '/mySOS/products/', search: '' };
    expect(getPublicProducts({ category: 'apparel' }).length, 'apparel has more than one screen of products').toBeGreaterThan(8);
    const markup = renderToStaticMarkup(<ProductsPage />);
    expect(markup).toContain('id="product-collection-grid"');
    expect(markup).toMatch(/aria-expanded="false"[^>]*aria-controls="product-collection-grid"/);
    expect(markup).toContain('View All');
    expect(markup).not.toContain('Show Less');
  });

  it('keeps the button once expanded, so the list can be collapsed again', () => {
    // It used to render only while collapsed (`!showAll`), so expanding removed
    // the one control that could undo it.
    expect(source).not.toMatch(/products\.length > 8 && !showAll/);
    expect(source).toMatch(/products\.length > 8 && <div className="center-action">/);
    expect(source).toMatch(/showAll\s*\?\s*<><span data-cms-path=\{cms\(pagePath\('products', 'showLessLabel'\)\)\}>/);
  });

  it('collapsing returns to the top of the collection, not the section below', () => {
    expect(source).toMatch(/const scrolledPast = Boolean\(section\) && section\.getBoundingClientRect\(\)\.top < 0;/);
    // The shorter list is on screen before the jump, so it lands on the final layout.
    expect(source).toMatch(/flushSync\(\(\) => setShowAll\(false\)\);\s*if \(scrolledPast\) section\.scrollIntoView\(\{ block: 'start', behavior: 'instant' \}\);/);
    const css = readFileSync(new URL('../src/public/public.css', import.meta.url), 'utf8');
    expect(css).toMatch(/\.products-collection \{ scroll-margin-top: 96px; \}/);
  });

  it('the Show Less wording is editable content', () => {
    expect(siteContent.pages.products.showLessLabel).toBe('Show Less');
  });
});

describe('category tabs', () => {
  it('are plain links, with no dropdown arrow beside the name', async () => {
    const { renderToStaticMarkup } = await import('react-dom/server');
    const { default: ProductsPage } = await import('../src/public/pages/ProductsPage');
    const React = (await import('react')).default;
    const saved = globalThis.location;
    globalThis.location = { pathname: '/mySOS/products/', search: '' };
    try {
      const html = renderToStaticMarkup(React.createElement(ProductsPage));
      const row = html.match(/<div class="browse-row">.*?<\/div>/s)?.[0] ?? '';
      expect(row).toContain('class="browse-label"');
      // The chevron glyph's path, which the tabs used to carry.
      expect(row).not.toContain('m6.5 9.5 5.5 5.5 5.5-5.5');
    } finally {
      if (saved === undefined) delete globalThis.location;
      else globalThis.location = saved;
    }
  });
});
