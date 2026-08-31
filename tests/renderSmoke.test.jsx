import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import PublicApp from '../src/public/PublicApp';
import QuotationApp from '../src/App';

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
    expect(markup).toContain('/mySOS/quotation_engine/');
    // Case-sensitive and word-bounded on purpose: a loose /NaN/i also matches
    // real copy such as "Nanyang Technological University" in logo alt text.
    expect(markup).not.toMatch(/\bundefined\b|\bNaN\b|\[object Object\]|Contact details can be set/);
    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it('renders data-driven product and solution filters', () => {
    const apparel = renderAt('/mySOS/products/');
    expect(apparel).toContain('product=premium-cotton-tee');
    expect(renderAt('/mySOS/products/', '?category=bags')).toContain('Canvas Tote Bag');
    const schools = renderAt('/mySOS/solutions/', '?industry=schools');
    expect(schools).toContain('Recommended for Schools');
    expect(schools).toContain('Sublimation Jersey');
    expect(schools).toContain('product=sublimation-jersey');
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
