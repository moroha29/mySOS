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
    ['/', 'Tell us what you need.'],
    ['/products/', 'class="type-row"'],
    ['/request/', 'Build Your Request'],
    ['/solutions/', 'Solutions Designed'],
    ['/why-mysos/', 'Why MySOS'],
    ['/success-stories/', 'Success Stories'],
    // A story page shows its own story, whichever story that is: naming one
    // here meant renaming it in the portal failed the check and blocked the
    // publish.
    [`/success-stories/${successStories[0].slug}/`, successStories[0].title],
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
    const apparel = renderAt('/products/');
    // A product card opens that product's own page.
    expect(apparel).toContain('href="/products/premium-cotton-tee/"');
    expect(renderAt('/products/', '?category=bags')).toContain('Canvas Tote Bag');
    const schools = renderAt('/solutions/', '?industry=schools');
    expect(schools).toContain('Recommended for Schools');
    expect(schools).toContain('Sublimation Jersey');
    expect(schools).toContain('href="/products/sublimation-jersey/"');
    const stories = renderAt('/success-stories/');
    // Whichever stories the page chooses to show, each link it draws goes to a
    // story that exists; naming one story here made renaming it fail the check.
    const linked = [...stories.matchAll(/\/success-stories\/([^/"]+)\//g)].map((match) => match[1]);
    expect(linked.length).toBeGreaterThan(0);
    const slugs = new Set(successStories.map((story) => story.slug));
    for (const slug of new Set(linked)) expect(slugs.has(slug), slug).toBe(true);
    expect(renderAt(`/success-stories/${successStories[0].slug}/`)).toContain('Need something similar?');
  });

  it('sends every "Get a Quote" to the request page, not straight into a chat', () => {
    // The customer builds what they want first; WhatsApp carries the finished
    // request. The agents' quotation engine is a different thing entirely.
    for (const pathname of ['/', '/products/', '/solutions/']) {
      const markup = renderAt(pathname);
      const quoteButtons = [...markup.matchAll(/<a class="btn[^"]*" href="([^"]+)"[^>]*>(?:(?!<\/a>)[\s\S])*?Get a Quote/g)];
      expect(quoteButtons.length, pathname).toBeGreaterThan(0);
      for (const [, href] of quoteButtons) expect(href, pathname).toBe('/request/');
    }
  });

  it('opens the request page the same way, whatever the address says', () => {
    /*
     * The page is drawn ahead of time, on a machine with no address bar, so
     * nothing from the address may reach the first render — "Add to my
     * request" on a product page used to arrive at a page whose first render
     * disagreed with the one it had been sent, and React threw the whole page
     * away and built it again. The product the visitor came from is taken up
     * by the builder after it mounts (see theQuotePageArrivesCleanly).
     */
    const blank = renderAt('/request/');
    expect(blank).toContain('Add another product');
    expect(blank).toContain('0 products selected');
    for (const search of ['?product=canvas_tote_bag', '?product=canvas_tote_bag&qty=250', '?ask=500%20hoodies', '?product=not_a_product']) {
      expect(renderAt('/request/', search), search).toBe(blank);
    }
    // No prices anywhere: this is a request, not a quotation.
    expect(blank).not.toMatch(/\$\d/);
  });

  it('renders the WhatsApp number and accessible navigation controls', () => {
    const markup = renderAt('/');
    expect(markup).toContain('https://wa.me/6588547109');
    expect(markup).toContain('+65 8854 7109');
    expect(markup).toContain('aria-controls="primary-navigation"');
    expect(markup).toContain('aria-expanded="false"');
  });

  it('keeps every root-relative public link inside the case-sensitive GitHub Pages base', () => {
    const markup = renderAt('/');
    // Anchors only: React also emits <link rel="preload"> hints for images whose
    // URLs come from the bundler, and those carry Vite's `base` in a real build
    // but not under the test transform.
    const hrefs = [...markup.matchAll(/<a [^>]*href="([^"]+)"/g)].map((match) => match[1]);
    const rootRelative = hrefs.filter((href) => href.startsWith('/'));
    expect(rootRelative.length).toBeGreaterThan(10);
    expect(rootRelative.every((href) => href.startsWith('/'))).toBe(true);
  });
});

describe('the quotation engine is not reachable from the public site', () => {
  const pages = [
    '/', '/products/', '/request/', '/solutions/', '/why-mysos/', '/success-stories/',
    ...successStories.map((story) => `/success-stories/${story.slug}/`),
    ...solutions.map((solution) => `/solutions/${solution.id}/`),
  ];

  it.each(pages)('%s has no link to it, whatever the category', (pathname) => {
    const views = [renderAt(pathname)];
    if (pathname === '/products/' || pathname === '/solutions/') {
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
    globalThis.location = { pathname: '/quotation_engine/', search: '?product=premium-cotton-tee' };
    const selected = renderToStaticMarkup(React.createElement(QuotationApp));
    // Named as the catalogue names it now; the name is edited from the website manager.
    expect(selected).toMatch(/<option value="premium_cotton_tee" selected="">[^<]+<\/option>/);
    globalThis.location = { pathname: '/quotation_engine/', search: '?product=invalid-product' };
    const invalid = renderToStaticMarkup(React.createElement(QuotationApp));
    expect(invalid).not.toContain('value="invalid-product"');
    expect(invalid).toContain('Choose a product');
    expect(selected).toContain('Download Excel quotation');
  });
});
