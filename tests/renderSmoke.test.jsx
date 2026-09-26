import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import PublicApp from '../src/public/PublicApp';
import QuotationApp from '../src/App';
import siteConfig from '../src/data/siteConfig.json';
import successStories from '../src/data/successStories.json';
import solutions from '../src/data/solutions.json';

const originalLocation = globalThis.location;

function renderAt(pathname, search = '') {
  globalThis.location = { pathname, search };
  return renderToStaticMarkup(React.createElement(PublicApp));
}

afterEach(() => {
  if (originalLocation === undefined) delete globalThis.location;
  else globalThis.location = originalLocation;
});

describe('production route rendering', () => {
  it.each([
    ['/mySOS/', 'Custom Merchandise,'],
    ['/mySOS/products/', 'Apparel collection'],
    ['/mySOS/request/', 'Build Your Request'],
    ['/mySOS/solutions/', 'Solutions Designed'],
    ['/mySOS/why-mysos/', 'Why MySOS'],
    ['/mySOS/success-stories/', 'Success Stories'],
    ['/mySOS/success-stories/ntu-cca-jerseys-2024/', 'NTU CCA Jerseys 2024'],
  ])('renders %s without placeholder values', (pathname, expected) => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const markup = renderAt(pathname);
    expect(markup).toContain(expected);
    // The quotation engine is for MySOS's agents: no public page links to it.
    expect(markup).not.toMatch(/quotation_engine/);
    expect(markup).toContain(`https://wa.me/${siteConfig.whatsapp.number}`);
    // Case-sensitive and word-bounded on purpose: a loose /NaN/i also matches
    // real copy such as "Nanyang Technological University" in logo alt text.
    expect(markup).not.toMatch(/\bundefined\b|\bNaN\b|\[object Object\]|Contact details can be set/);
    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it('renders data-driven product and solution filters', () => {
    const apparel = renderAt('/mySOS/products/');
    // A product card opens that product's own page.
    expect(apparel).toContain('href="/mySOS/products/premium-cotton-tee/"');
    expect(renderAt('/mySOS/products/', '?category=bags')).toContain('Canvas Tote Bag');
    const schools = renderAt('/mySOS/solutions/', '?industry=schools');
    expect(schools).toContain('Recommended for Schools');
    expect(schools).toContain('Sublimation Jersey');
    expect(schools).toContain('href="/mySOS/products/sublimation-jersey/"');
    const stories = renderAt('/mySOS/success-stories/');
    expect(stories).toContain('/mySOS/success-stories/ntu-cca-jerseys-2024/');
    expect(renderAt('/mySOS/success-stories/ntu-cca-jerseys-2024/')).toContain('Need something similar?');
  });

  it('sends every "Get a Quote" to the request page, not straight into a chat', () => {
    // The customer builds what they want first; WhatsApp carries the finished
    // request. The agents' quotation engine is a different thing entirely.
    for (const pathname of ['/mySOS/', '/mySOS/products/', '/mySOS/solutions/']) {
      const markup = renderAt(pathname);
      const quoteButtons = [...markup.matchAll(/<a class="btn[^"]*" href="([^"]+)"[^>]*>(?:(?!<\/a>)[\s\S])*?Get a Quote/g)];
      expect(quoteButtons.length, pathname).toBeGreaterThan(0);
      for (const [, href] of quoteButtons) expect(href, pathname).toBe('/mySOS/request/');
    }
  });

  it('opens the request page empty, or on the product the visitor came from', () => {
    const blank = renderAt('/mySOS/request/');
    expect(blank).toContain('Search all products');
    expect(blank).toContain('0 products selected');
    const withProduct = renderAt('/mySOS/request/', '?product=canvas_tote_bag');
    expect(withProduct).toContain('Canvas Tote Bag');
    expect(withProduct).toContain('1 products selected');
    // An address that names nothing real simply starts empty.
    expect(renderAt('/mySOS/request/', '?product=not_a_product')).toContain('0 products selected');
    // No prices anywhere: this is a request, not a quotation.
    expect(withProduct).not.toMatch(/\$\d/);
  });

  it('renders the WhatsApp number and accessible navigation controls', () => {
    const markup = renderAt('/mySOS/');
    expect(markup).toContain('https://wa.me/6588547109');
    expect(markup).toContain('+65 8854 7109');
    expect(markup).toContain('aria-controls="primary-navigation"');
    expect(markup).toContain('aria-expanded="false"');
  });

  it('keeps every root-relative public link inside the case-sensitive GitHub Pages base', () => {
    const markup = renderAt('/mySOS/');
    // Anchors only: React also emits <link rel="preload"> hints for images whose
    // URLs come from the bundler, and those carry Vite's `base` in a real build
    // but not under the test transform.
    const hrefs = [...markup.matchAll(/<a [^>]*href="([^"]+)"/g)].map((match) => match[1]);
    const rootRelative = hrefs.filter((href) => href.startsWith('/'));
    expect(rootRelative.length).toBeGreaterThan(10);
    expect(rootRelative.every((href) => href.startsWith('/mySOS/'))).toBe(true);
  });
});

describe('the quotation engine is not reachable from the public site', () => {
  const pages = [
    '/mySOS/', '/mySOS/products/', '/mySOS/request/', '/mySOS/solutions/', '/mySOS/why-mysos/', '/mySOS/success-stories/',
    ...successStories.map((story) => `/mySOS/success-stories/${story.slug}/`),
    ...solutions.map((solution) => `/mySOS/solutions/${solution.id}/`),
  ];

  it.each(pages)('%s has no link to it, whatever the category', (pathname) => {
    const views = [renderAt(pathname)];
    if (pathname === '/mySOS/products/' || pathname === '/mySOS/solutions/') {
      for (const search of ['?category=apparel', '?category=bags', '?category=drinkware', '?category=corporate-gifts', '?category=stationery', '?category=event-essentials', '?industry=schools', '?industry=businesses']) {
        views.push(renderAt(pathname, search));
      }
    }
    for (const markup of views) {
      expect(markup).not.toMatch(/quotation_engine|quotation-engine/i);
      const hrefs = [...markup.matchAll(/<a [^>]*href="([^"]+)"/g)].map((match) => match[1]);
      expect(hrefs.some((href) => /quot/i.test(href) && !href.startsWith('https://wa.me/'))).toBe(false);
    }
  });

  it('keeps the engine page out of search results', async () => {
    const { readFileSync } = await import('node:fs');
    const html = readFileSync(new URL('../quotation_engine/index.html', import.meta.url), 'utf8');
    expect(html).toContain('<meta name="robots" content="noindex, nofollow" />');
  });
});

describe('quotation preselection rendering', () => {
  it('preselects a public product slug and safely ignores invalid slugs', () => {
    globalThis.location = { pathname: '/mySOS/quotation_engine/', search: '?product=premium-cotton-tee' };
    const selected = renderToStaticMarkup(React.createElement(QuotationApp));
    // Named as the catalogue names it now; the name is edited from the website manager.
    expect(selected).toMatch(/<option value="premium_cotton_tee" selected="">[^<]+<\/option>/);
    globalThis.location = { pathname: '/mySOS/quotation_engine/', search: '?product=invalid-product' };
    const invalid = renderToStaticMarkup(React.createElement(QuotationApp));
    expect(invalid).not.toContain('value="invalid-product"');
    expect(invalid).toContain('Choose a product');
    expect(selected).toContain('Download Excel quotation');
  });
});
