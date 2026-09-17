import React from 'react';
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import printData from '../src/data/printData.json';
import siteContent from '../src/data/siteContent.json';
import HomePage from '../src/public/pages/HomePage';
import ProductsPage from '../src/public/pages/ProductsPage';
import StoriesPage from '../src/public/pages/StoriesPage';
import WhyPage from '../src/public/pages/WhyPage';

const originalLocation = globalThis.location;
afterEach(() => {
  if (originalLocation === undefined) delete globalThis.location;
  else globalThis.location = originalLocation;
});

const render = (Page, pathname) => {
  globalThis.location = { pathname, search: '' };
  return renderToStaticMarkup(<Page />);
};

const visibleMethods = printData.methods.filter((method) => method.public?.visible);

describe('page order: where the reviews sit', () => {
  it('home: above the client logos, below the banner', () => {
    const markup = render(HomePage, '/mySOS/');
    const banner = markup.indexOf('Custom Merchandise,');
    const reviews = markup.indexOf('class="section reviews"');
    const logos = markup.indexOf('class="trust-strip"');
    expect(banner).toBeGreaterThan(-1);
    expect(reviews).toBeGreaterThan(banner);
    expect(reviews).toBeLessThan(logos);
    expect(markup.match(/class="section reviews"/g)).toHaveLength(1);
  });

  it('why mysos: after why clients come back, just before the closing band, as its design has it', () => {
    const markup = render(WhyPage, '/mySOS/why-mysos/');
    const loyalty = markup.indexOf('class="section why-loyalty"');
    const reviews = markup.indexOf('class="section reviews"');
    const closingCta = markup.indexOf('class="page-cta');
    expect(loyalty).toBeGreaterThan(-1);
    expect(reviews).toBeGreaterThan(loyalty);
    expect(reviews).toBeLessThan(closingCta);
    expect(markup.match(/class="section reviews"/g)).toHaveLength(1);
  });

  it('success stories: the reviews row opens the page', () => {
    const markup = render(StoriesPage, '/mySOS/success-stories/');
    const reviews = markup.indexOf('class="stories-reviews');
    const pills = markup.indexOf('class="filter-row"');
    const panel = markup.indexOf('class="projects-panel"');
    expect(reviews).toBeGreaterThan(-1);
    expect(reviews).toBeLessThan(pills);
    expect(pills).toBeLessThan(panel);
  });
});

describe('printing methods: "Our capabilities"', () => {
  const markup = () => render(ProductsPage, '/mySOS/products/');

  it('shows the eyebrow and heading from the reference design', () => {
    const html = markup();
    expect(html).toContain('Our capabilities');
    expect(html).toContain('How we bring your brand to life');
    // The footer's "Printing Guides" link still lands on this section.
    expect(html).toContain('id="printing"');
  });

  it('lists every visible method as a tab, first one selected', () => {
    // Scoped to this section: the apparel filter above is a tab list too.
    const html = markup().match(/<section class="capabilities".*?<\/section>/s)?.[0] ?? '';
    const tabs = [...html.matchAll(/<button[^>]*role="tab"[^>]*aria-selected="(true|false)"[^>]*>([^<]+)<\/button>/g)];
    expect(tabs.map((tab) => tab[2])).toEqual(visibleMethods.map((method) => method.name));
    expect(tabs.map((tab) => tab[1])).toEqual(visibleMethods.map((_, index) => String(index === 0)));
    expect(html).toContain('role="tablist"');
    expect(html).toContain('role="tabpanel"');
  });

  it("shows the selected method's details, best-for chip and photo", () => {
    const html = markup();
    const first = visibleMethods[0];
    const copy = siteContent.printingMethods[first.id];
    expect(html).toContain(`<h3>${first.name}</h3>`);
    expect(html).toContain(copy.description);
    expect(html).toContain('Best for');
    expect(html).toContain(copy.bestFor);
    expect(html).toContain('class="capabilities-photo"');
  });

  it('every method has editable wording, filled from real data', () => {
    for (const method of visibleMethods) {
      const copy = siteContent.printingMethods[method.id];
      expect(copy, method.id).toBeTruthy();
      expect(copy.description, method.id).toBe(method.public.description);
      expect(copy.bestFor, method.id).toMatch(/\S/);
      expect(copy).toHaveProperty('image');
    }
  });

  it('the old icon grid and its "Learn more" link are gone', () => {
    const html = markup();
    expect(html).not.toContain('method-grid');
    expect(siteContent.pages.products).not.toHaveProperty('printingGuideLabel');
    expect(siteContent.headings).not.toHaveProperty('printingMethodsHeading');
  });

  it('arrow keys move between methods', () => {
    const source = readFileSync(new URL('../src/public/pages/ProductsPage.jsx', import.meta.url), 'utf8');
    expect(source).toMatch(/\{ ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 \}\[event\.key\]/);
    expect(source).toContain('tabRefs.current[next.id]?.focus();');
  });
});
