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
    ['/mySOS/', 'Custom Merchandise'],
    ['/mySOS/products/', 'Apparel collection'],
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

  it('shows Products in the header as a plain link, not a dropdown', () => {
    const header = renderAt('/mySOS/').match(/<header[\s\S]*?<\/header>/)[0];
    const products = header.match(/<a class="nav-link" href="\/mySOS\/products\/"[^>]*>([\s\S]*?)<\/a>/);
    expect(products[1]).toBe('Products');
    expect(header).not.toMatch(/nav-dropdown">(?:(?!<\/div>)[\s\S])*\?category=/);
    // Solutions still opens its list of industries.
    expect(header).toContain('href="/mySOS/solutions/schools/"');
  });

  it('renders data-driven product and solution filters', () => {
    const apparel = renderAt('/mySOS/products/');
    // Each product card asks for a quote on WhatsApp, naming the product.
    expect(apparel).toContain('quote%20for%20Premium%20Cotton%20Tee');
    expect(renderAt('/mySOS/products/', '?category=bags')).toContain('Canvas Tote Bag');
    const schools = renderAt('/mySOS/solutions/', '?industry=schools');
    expect(schools).toContain('Recommended for Schools');
    expect(schools).toContain('Sublimation Jersey');
    expect(schools).toContain('quote%20for%20Sublimation%20Jersey');
    const stories = renderAt('/mySOS/success-stories/');
    expect(stories).toContain('/mySOS/success-stories/ntu-cca-jerseys-2024/');
    expect(renderAt('/mySOS/success-stories/ntu-cca-jerseys-2024/')).toContain('Need something similar?');
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
    '/mySOS/', '/mySOS/products/', '/mySOS/solutions/', '/mySOS/why-mysos/', '/mySOS/success-stories/',
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
    expect(selected).toContain('<option value="premium_cotton_tee" selected="">Premium Cotton Tee</option>');
    globalThis.location = { pathname: '/mySOS/quotation_engine/', search: '?product=invalid-product' };
    const invalid = renderToStaticMarkup(React.createElement(QuotationApp));
    expect(invalid).not.toContain('value="invalid-product"');
    expect(invalid).toContain('Choose a product');
    expect(selected).toContain('Download Excel quotation');
  });
});
