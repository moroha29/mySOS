import React from 'react';
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import productData from '../src/data/productData.json';
import siteContent from '../src/data/siteContent.json';
import PublicApp, { resolvePublicRoute } from '../src/public/PublicApp';
import { makeLine } from '../src/utils/solutionRequest';

/*
 * A product's own page: the picture, and everything needed to ask for that
 * product. What is chosen here is carried into the request page, so nobody
 * answers the same question twice.
 */

const originalLocation = globalThis.location;
afterEach(() => {
  if (originalLocation === undefined) delete globalThis.location;
  else globalThis.location = originalLocation;
});

const render = (pathname, search = '') => {
  globalThis.location = { pathname, search };
  return renderToStaticMarkup(<PublicApp />);
};

const visible = productData.catalogue.filter((product) => product.public.visible);
const tee = visible.find((product) => product.public.slug === 'premium-cotton-tee');

describe('a product has a page of its own', () => {
  it('routes to it by slug, and only for products the site shows', () => {
    expect(resolvePublicRoute('/mySOS/products/premium-cotton-tee/')).toEqual({ page: 'product', slug: 'premium-cotton-tee' });
    expect(resolvePublicRoute('/mySOS/products/not-a-product/')).toEqual({ page: 'not-found' });
    const hidden = productData.catalogue.find((product) => !product.public.visible);
    if (hidden) expect(resolvePublicRoute(`/mySOS/products/${hidden.public.slug}/`)).toEqual({ page: 'not-found' });
    // The listing page keeps its own address.
    expect(resolvePublicRoute('/mySOS/products/')).toEqual({ page: 'products' });
  });

  it('is prerendered for every product the site shows', () => {
    const prerender = readFileSync(new URL('../scripts/prerender.mjs', import.meta.url), 'utf8');
    expect(prerender).toContain('...products.map((product) => `/products/${product.public.slug}/`)');
    expect(prerender).toContain("productData.catalogue.filter((item) => item.public.visible)");
  });

  it('shows the product, what it is and how it can be customised', () => {
    const markup = render(`/mySOS/products/${tee.public.slug}/`);
    expect(markup).toContain(tee.public.name);
    expect(markup).toContain(tee.public.description);
    // Its own printing methods, each with what it is best for.
    for (const id of tee.printingMethods) {
      const method = siteContent.printingMethods?.[id];
      if (method?.bestFor) expect(markup).toContain(method.bestFor);
    }
    // The quantity presets and the facts panel.
    for (const preset of siteContent.quantityPresets) expect(markup).toContain(`>${preset}<`);
    for (const fact of siteContent.productFacts.tshirts) expect(markup).toContain(fact.value);
    expect(markup).toContain('Home');
    expect(markup).toContain('Apparel');
  });

  it('hands the choices to the request page instead of asking again', () => {
    const markup = render(`/mySOS/products/${tee.public.slug}/`);
    expect(markup).toMatch(/href="\/mySOS\/request\/\?product=premium_cotton_tee&amp;qty=\d+"/);
    // The request page reads them back, keeping only fields that product has.
    const line = makeLine({ productId: 'premium_cotton_tee', quantity: '80', details: { colour: 'Navy', printing: 'Silkscreen', nonsense: 'x' } });
    expect(line.quantity).toBe(80);
    expect(line.details).toEqual({ colour: 'Navy', printing: 'Silkscreen' });
  });

  it('calls a published price a guide, and says so where there is none', () => {
    const markup = render(`/mySOS/products/${tee.public.slug}/`);
    expect(markup).toContain('Indicative price');
    expect(markup).toContain(siteContent.pages.product.estimateNote);
    // What MySOS pays never appears as a price on the page: that stays in the
    // agents' engine. (A bare "4.5" also matches SVG path numbers, so this
    // looks for it written as money.)
    const asMoney = new RegExp(`\\$\\s?${tee.quotation.baseCost.toFixed(2)}`);
    expect(asMoney.test('costs $4.50 each'), 'the guard itself works').toBe(true);
    expect(markup).not.toMatch(asMoney);
    expect(markup).not.toMatch(/base ?cost/i);
  });

  it('never sends anyone to the quotation engine', () => {
    for (const product of visible.slice(0, 8)) {
      const markup = render(`/mySOS/products/${product.public.slug}/`);
      expect(markup, product.public.slug).not.toMatch(/quotation_engine|quotation-engine/i);
    }
  });
});

describe('one look across the pages', () => {
  const css = readFileSync(new URL('../src/public/public.css', import.meta.url), 'utf8');

  it('puts every page on the same background, not a coloured banner each time', () => {
    expect(css).toMatch(/main:not\(\.home-page\) \{ background: var\(--paper\); \}/);
    expect(css).toMatch(/\.hero:not\(\.has-background\) \{ background: var\(--paper\); color: var\(--ink\); \}/);
    // A banner picture chosen in the manager keeps its scrim and white type.
    expect(css).toMatch(/\.hero\.has-background::before \{[^}]*rgba\(9,23,54,\.78\)/);
  });

  it('gives the sections, cards and bands one set of shapes', () => {
    expect(css).toMatch(/\.section-heading h2 \{ font-size: clamp\(28px, 3vw, 42px\)/);
    expect(css).toMatch(/\.product-card, \.story-card, \.solution-card[\s\S]*?border-radius: 22px;/);
    // The printing methods band matches the homepage's navy one.
    expect(css).toMatch(/\.capabilities \{ background: var\(--navy\); \}/);
    expect(css).toMatch(/\.page-cta \{ background: linear-gradient\(120deg, #046b45/);
  });

  it('shares one strip of categories between the homepage and products', () => {
    const home = render('/mySOS/');
    const products = render('/mySOS/products/');
    expect(home).toContain('class="home-quicknav"');
    expect(products).toContain('class="category-strip"');
    for (const category of siteContent.categories) {
      expect(home).toContain(`/mySOS/products/?category=${category.id}`);
      expect(products).toContain(`?category=${category.id}`);
    }
  });
});

describe('the line across the top of every page', () => {
  const css = readFileSync(new URL('../src/public/public.css', import.meta.url), 'utf8');
  const shell = readFileSync(new URL('../src/public/components/SiteShell.jsx', import.meta.url), 'utf8');

  it('sits above the header, on every page, from the content', () => {
    for (const pathname of ['/mySOS/', '/mySOS/products/', '/mySOS/request/', '/mySOS/why-mysos/', `/mySOS/products/${tee.public.slug}/`]) {
      const markup = render(pathname);
      const strip = markup.indexOf('class="site-announce"');
      expect(strip, pathname).toBeGreaterThan(-1);
      expect(strip, pathname).toBeLessThan(markup.indexOf('class="site-header"'));
      expect(markup, pathname).toContain(siteContent.announcement);
    }
  });

  it('runs the full width of the screen, whatever the page column does', () => {
    // It is a sibling of the page column, not a child: inside it, the strip
    // stopped at the column's edge and looked cut off on a wide screen. A
    // 100vw trick would instead overflow by the width of the scrollbar.
    expect(shell).toMatch(/<Announcement \/>\s*<div className="site-app">/);
    expect(css).toMatch(/\.site-announce \{ padding: 11px 24px; background: var\(--navy-deep\)/);
    expect(css).not.toMatch(/\.site-announce \{[^}]*100vw/);
  });
});
