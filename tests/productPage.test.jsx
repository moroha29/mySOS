import React from 'react';
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import productData from '../src/data/productData.json';
import siteConfig from '../src/data/siteConfig.json';
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
    for (const fact of siteContent.productFacts.default) expect(markup).toContain(fact.value);
    // The sections below are the questions the client already answers, in
    // their own words — not specifications we would be inventing for them.
    expect(siteContent.productInfoSections.map((section) => section.title)).toEqual(siteContent.faq.map((item) => item.question));
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
    expect(css).toMatch(/\.section-heading h2 \{ font-size: clamp\(\d+px, 3vw, \d+px\)/);
    expect(css).toMatch(/\.product-card, \.story-card, \.solution-card[\s\S]*?border-radius: 22px;/);
    // The kinds within a category are pills, as the category strip is.
    expect(css).toMatch(/\.type-row button \{[\s\S]{0,260}?border-radius: 14px;/);
    // The closing band is flat green with a navy button, as the concept has it.
    expect(css).toMatch(/\.page-cta, \.home-closing \{ background: #046b45; \}/);
    expect(css).toMatch(/\.page-cta \.btn, \.home-closing \.btn \{[^}]*background: var\(--navy\)/);
  });

  it('shares one strip of categories between the homepage and products', () => {
    // Literally the same component, so the pills and the spacing cannot drift
    // apart between the two pages.
    const home = render('/mySOS/');
    const products = render('/mySOS/products/', '?category=bags');
    for (const markup of [home, products]) expect(markup).toContain('class="category-strip"');
    for (const category of siteContent.categories) {
      expect(home).toContain(`/mySOS/products/?category=${category.id}`);
      expect(products).toContain(`?category=${category.id}`);
    }
    // Only the products page marks one, because only it is showing a category.
    expect(products).toMatch(/class="is-active" href="\?category=bags"/);
    const homeStrip = home.match(/<nav class="category-strip"[\s\S]*?<\/nav>/)[0];
    expect(homeStrip).not.toContain('is-active');
  });

  it('puts the arrow beside "View all products", not under it', () => {
    // The pill rules used to catch the trailing link as well, turning it into a
    // block and stacking its arrow below the words.
    expect(css).toMatch(/\.category-strip ul a \{ display: inline-block;/);
    expect(css).not.toMatch(/\.category-strip a \{ display: inline-block;/);
    expect(css).toMatch(/\.text-link > \.icon, \.btn > \.icon \{ display: block; align-self: center; \}/);
    expect(css).toMatch(/\.category-strip-inner > \.text-link \{ flex: none; white-space: nowrap; color: #fff; \}/);
  });

  it('scrolls the strip sideways on a phone, with the link out of the way', () => {
    const phone = css.slice(css.indexOf('@media (max-width: 860px)', css.indexOf('.category-strip {')));
    expect(phone).toMatch(/\.category-strip-inner > \.text-link \{ display: none; \}/);
    expect(css).toMatch(/\.category-strip ul \{ flex: 1; min-width: 0;[^}]*overflow-x: auto/);
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
      // Their own tagline, rather than a line of ours. (Apostrophes are
      // escaped in the markup, so the strip is read back out of it.)
      expect(siteContent.announcement).toBe(siteConfig.tagline);
      const words = markup.match(/<p class="site-announce"[^>]*>([\s\S]*?)<\/p>/)[1];
      expect(words.replaceAll('&#x27;', "'"), pathname).toBe(siteContent.announcement);
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

describe('the product page, as the client marked it up', () => {
  const source = readFileSync(new URL('../src/public/pages/ProductDetailPage.jsx', import.meta.url), 'utf8');
  const request = readFileSync(new URL('../src/public/pages/RequestPage.jsx', import.meta.url), 'utf8');
  const css = readFileSync(new URL('../src/public/public.css', import.meta.url), 'utf8');

  it('says what the product is under its picture, not a screen below it', () => {
    // The specifications were the first entry of an accordion at the foot of
    // the page, a screen and a half under the picture they described.
    expect(source).toContain('function ProductDetails({ product, onChart })');
    expect(source).toContain('<ProductDetails product={product}');
    expect(source).toContain('className="pdp-specs"');
    expect(siteContent.productSpecs.default.length).toBeGreaterThan(0);
    for (const kind of ['tshirts', 'totes']) {
      expect(siteContent.productSpecs[kind], kind).toBeTruthy();
    }
  });

  it('asks for sizes, and says it is fine not to know them', () => {
    expect(source).toContain("const [sizing, setSizing] = useState('later')");
    expect(source).toContain("word('sizesEnterLabel'");
    expect(source).toContain("word('sizesLaterLabel'");
    expect(source).toContain('className="pdp-size-run"');
    expect(siteContent.sizeRun.length).toBeGreaterThan(3);
    // And the breakdown reaches the quote rather than stopping at the page.
    expect(source).toContain("params.set('sizes', sizesLine)");
    expect(request).toContain("sizes: (params.get('sizes') ?? '')");
    expect(request).toContain('sizes: chosen.sizes');
  });

  it('draws a colour as the colour, with its name for anyone who cannot see it', () => {
    expect(source).toContain('const ink = swatchFor(option);');
    expect(source).toContain('title={option}');
    expect(source).toContain('aria-label={option}');
    // A name with no swatch is still offered, as a word.
    expect(source).toContain("ink ? 'is-swatch' : 'is-word'");
    expect(css).toContain('.pdp-colours button.is-swatch em');
    for (const name of ['Navy', 'Black', 'White', 'Red']) {
      expect(siteContent.colourSwatches[name], name).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it('leaves room on each method for a picture of it', () => {
    expect(source).toContain('className="pdp-method-shot"');
    expect(source).toContain('const methodIcon = (id)');
    // The band's own rule, not the shorter one a phone overrides it with.
    const at = css.indexOf('.pdp-method-shot { display: grid');
    expect(at, 'the picture band').toBeGreaterThan(-1);
    expect(css.slice(at, css.indexOf('}', at))).toContain('height: 54px');
  });

  it('leaves the foot of the page to the questions people ask', () => {
    // The specifications used to be repeated there as the first accordion row.
    expect(source).not.toContain("title: 'Product specifications'");
    expect(source).toContain('{sections.map((entry, index) =>');
  });

  it('opens the size chart in a window rather than another page', () => {
    expect(source).toContain('function SizeChart({ product, open, onClose })');
    expect(source).toContain('node.showModal()');
    expect(siteContent.sizeCharts.tshirts.rows.length).toBeGreaterThan(3);
    // On a phone it stacks, so no column hides off the side of it.
    const narrow = css.slice(css.indexOf('@media (max-width: 620px)', css.indexOf('.size-chart {')));
    expect(narrow).toContain('.size-chart-table td::before');
  });
});

describe('the rest of the category, as a rail', () => {
  const source = readFileSync(new URL('../src/public/pages/ProductDetailPage.jsx', import.meta.url), 'utf8');
  const css = readFileSync(new URL('../src/public/public.css', import.meta.url), 'utf8');

  it('offers the whole category rather than the first three of it', () => {
    expect(source).toContain('.slice(0, 12)');
    expect(source).toContain('className="pdp-thumbs" ref={railRef}');
    const rail = css.slice(css.indexOf('.pdp-thumbs {'), css.indexOf('}', css.indexOf('.pdp-thumbs {')));
    expect(rail).toContain('overflow-x: auto');
    expect(rail).toContain('scroll-snap-type: x proximity');
  });

  it('shows the way on only while there is something past the edge', () => {
    // Measured rather than counted: how many fit depends on the column width.
    expect(source).toContain('const room = rail.scrollWidth - rail.clientWidth;');
    expect(source).toContain('setReach({ prev: rail.scrollLeft > 4');
    expect(source).toContain('disabled={!reach.prev}');
    expect(source).toContain('disabled={!reach.next}');
    expect(css).toContain('.pdp-thumb-arrow:disabled { opacity: 0; pointer-events: none; }');
    // And the edge fades, so the rail says so without a scrollbar.
    expect(css).toContain('.pdp-thumb-rail.has-more::after');
  });

  it('fits four to a view, and a shade under three on a phone', () => {
    expect(css).toContain('.pdp-thumbs li { flex: 0 0 calc((100% - 36px) / 4); scroll-snap-align: start; }');
    expect(css).toMatch(/\.pdp-thumbs li \{ flex-basis: 37%; \}/);
  });
});

describe('the size guide, as the drawing has it', () => {
  const source = readFileSync(new URL('../src/public/pages/ProductDetailPage.jsx', import.meta.url), 'utf8');
  const visuals = readFileSync(new URL('../src/public/components/Visuals.jsx', import.meta.url), 'utf8');
  const css = readFileSync(new URL('../src/public/public.css', import.meta.url), 'utf8');

  it('answers the question three ways rather than one', () => {
    expect(source).toContain("['measure', word('measureTab'");
    expect(source).toContain("['cm', word('chartCmTab'");
    expect(source).toContain("['inch', word('chartInchTab'");
    expect(css).toContain('.size-chart-tabs');
    // It opens on the guide, because a reader who needs the chart knows where
    // to hold the tape already.
    expect(source).toContain("const [tab, setTab] = useState('measure');");
  });

  it('shows where to hold the tape, with a letter on each line', () => {
    expect(visuals).toContain('export function MeasureGarment(');
    // Every line first, then every letter: drawn in turn, the line down the
    // body struck through the letter on the chest.
    const figure = visuals.slice(visuals.indexOf('export function MeasureGarment('));
    const lastLine = figure.lastIndexOf('{...ARROW}');
    const firstBadge = figure.indexOf('<Badge');
    expect(firstBadge).toBeGreaterThan(lastLine);
    for (const key of ['A', 'B', 'C', 'D']) {
      expect(figure, key).toContain(`letter="${key}"`);
    }
    expect(siteContent.sizeCharts.tshirts.measure).toHaveLength(4);
  });

  it('works the inches out rather than keeping a second set of numbers', () => {
    // Two sets could disagree; one set and a conversion cannot.
    expect(source).toContain('const asInches = (value)');
    expect(source).toContain('number / 2.54');
    // And the note carries the unit, so it changes with the tab.
    expect(source).toContain("tab === 'inch' ? chart.noteInch : chart.note");
    expect(siteContent.sizeCharts.tshirts.noteInch).toMatch(/inches/);
  });
});

describe('each kind is asked what the drawing asks it', () => {
  const source = readFileSync(new URL('../src/public/pages/ProductDetailPage.jsx', import.meta.url), 'utf8');

  it("follows the client's own list where there is one", () => {
    expect(source).toContain('const stepsFor = (product)');
    expect(source).toContain('function DrawnStep(');
    // A kind with no list keeps the general steps.
    expect(source).toContain('{drawn');
    for (const kind of ['totes', 'lanyards', 'gift-sets']) {
      expect(siteContent.productSteps[kind], kind).toBeTruthy();
    }
  });

  it('asks a bag for its dimensions and a set only for a logo', () => {
    const types = (kind) => siteContent.productSteps[kind].map((step) => step.type);
    expect(types('totes')).toContain('dimensions');
    expect(types('gift-sets')).toEqual(['upload', 'notes']);
    // A set is counted in sets, and says who handles the branding.
    expect(siteContent.productUnit['gift-sets']).toBe('sets');
    expect(siteContent.productAssurance['gift-sets'].title).toMatch(/\S/);
    expect(siteContent.productIncludes.executive_gift_set.items.length).toBeGreaterThan(2);
  });

  it('lets a lanyard add-on open a panel of its own', () => {
    const addons = siteContent.productSteps.lanyards.find((step) => step.type === 'addons');
    const holder = addons.options.find((option) => option.fields);
    expect(holder.name).toBe('Badge holder');
    expect(holder.fields.length).toBe(4);
    // And it only opens once the add-on has been picked.
    expect(source).toContain('step.options.filter((option) => option.fields && chosen.includes(option.name))');
  });

  it('carries every answer into the quote as one readable line', () => {
    // The builder has a field for colour and printing and nothing for the
    // rest, so the rest travels as the row's note.
    expect(source).toContain('const drawnNote = useMemo(');
    expect(source).toContain("params.set('note', drawnNote.slice(0, 400))");
  });
});
