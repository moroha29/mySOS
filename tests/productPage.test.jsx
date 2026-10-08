import React from 'react';
import { readdirSync, readFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import productData from '../src/data/productData.json';
import siteConfig from '../src/data/siteConfig.json';
import siteContent from '../src/data/siteContent.json';
import PublicApp, { resolvePublicRoute } from '../src/public/PublicApp';
import iconLibrary from '../src/data/iconLibrary.json';
import { detailFieldsFor, makeLine, printingFieldFor } from '../src/utils/solutionRequest';

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
    // The quantity is the bar alone now: the row of set amounts under it was
    // a second way of doing what the bar already does.
    expect(markup).not.toContain('class="pdp-presets"');
    expect(markup).toContain('id="pdp-quantity"');
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

  it('ends with the last category, not a link that promises everything', () => {
    // "View all products" went to the products page, and the products page
    // opens on apparel: the one link that offered all of them delivered one.
    const strip = readFileSync(new URL('../src/public/components/CategoryStrip.jsx', import.meta.url), 'utf8');
    expect(strip).not.toContain('text-link');
    expect(strip).not.toContain('quickNavAllLabel');
    expect(css).not.toContain('.category-strip-inner > .text-link');
    expect(render('/mySOS/products/')).not.toContain('View all products');
  });

  it('wraps the strip on a screen and scrolls it on a phone', () => {
    // Eight categories are wider than a laptop, and the eighth was cut off
    // against the edge of a row that gave no sign it carried on.
    expect(css).toMatch(/\.category-strip ul \{ flex: 1; min-width: 0;[^}]*flex-wrap: wrap/);
    expect(css).not.toMatch(/\.category-strip ul \{ flex: 1;[^}]*overflow-x: auto/);
    // Wrapped, the two lines sit against each other: the pills carry the gap.
    expect(css).toMatch(/\.category-strip ul \{[^}]*gap: 0 10px/);
    // Four rows of pills is no menu, so a phone keeps the sideways scroller.
    const nowrap = css.indexOf('.category-strip ul { flex-wrap: nowrap; overflow-x: auto;');
    expect(nowrap).toBeGreaterThan(0);
    expect(css.lastIndexOf('@media', nowrap)).toBe(css.lastIndexOf('@media (max-width: 860px)', nowrap));
    expect(css).toMatch(/\.category-strip ul a \{ display: inline-block;/);
  });

  it('gives every card the same slot, whatever page it is on', () => {
    // Four to a row everywhere: counting the cards to choose the columns made
    // the same product bigger on a short category than on a full one.
    expect(css).toContain('.product-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr));');
    expect(css).not.toContain('@media (min-width: 1700px)');
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
    // One component, used by the drawn steps and the general ones alike.
    expect(source).toContain('function ColourChoice(');
    expect(source).toContain('const ink = swatchFor(name);');
    expect(source).toContain('title={name}');
    expect(source).toContain('aria-label={name}');
    expect(source.match(/const ink = swatchFor\(/g)).toHaveLength(1);
    expect(css).toContain('.pdp-colours button.is-swatch em');
    for (const name of ['Navy', 'Black', 'White', 'Red']) {
      expect(siteContent.colourSwatches[name], name).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it('offers a real range of colours, every one with ink of its own', () => {
    // Three swatches on a canvas tote was a shorter list than the bag is made
    // in. A colour with no ink falls back to a word in a pill among a row of
    // circles, so every one offered anywhere has to be drawable.
    const lists = Object.values(siteContent.requestOptions)
      .flat()
      .filter((field) => /colour/i.test(field.id));
    expect(lists.length).toBeGreaterThan(8);
    for (const field of lists) {
      for (const name of field.options) {
        if (/^Other/.test(name) || /^All three/.test(name)) continue;
        expect(siteContent.colourSwatches[name], name).toMatch(/^#[0-9a-f]{6}$/i);
      }
    }
    const of = (kind) => siteContent.requestOptions[kind].find((field) => /colour/i.test(field.id)).options;
    expect(of('totes').length).toBeGreaterThan(12);
    expect(of('tshirts').length).toBeGreaterThan(16);
    // "Other" stays last, because it is the answer for anything not above it.
    for (const field of lists) {
      if (field.options.some((name) => /^Other/.test(name))) expect(field.options.at(-1)).toMatch(/^Other/);
    }
  });

  it('keeps "Other" in the row of colours rather than on a line of its own', () => {
    // It is still a colour answer; a pill under a row of circles reads as
    // something else. The full name stays on the button for a screen reader.
    expect(source).toContain('const OTHER_COLOUR =');
    expect(source).toContain("other ? 'is-other' : ''");
    expect(css).toContain('.pdp-colours button.is-other em');
    expect(css).toMatch(/\.pdp-colours button\.is-other em \{[^}]*conic-gradient/);
    const other = siteContent.requestOptions.lanyards.find((field) => field.id === 'colour').options.at(-1);
    expect(other).toMatch(/^Other/);
    expect(siteContent.colourSwatches[other]).toBeUndefined();
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

describe('the other views of this product, as a rail', () => {
  const source = readFileSync(new URL('../src/public/pages/ProductDetailPage.jsx', import.meta.url), 'utf8');
  const css = readFileSync(new URL('../src/public/public.css', import.meta.url), 'utf8');

  it('shows other views of this product, not other products', () => {
    // products/<slug>-2.jpg and so on, beside the main photograph.
    expect(source).toContain('`products/${product.public.slug}-${n}`');
    expect(source).toContain('className="pdp-thumbs" ref={railRef}');
    // The rest of the category is a different question, answered at the foot
    // of the page; the rail no longer links away.
    const gallery = source.slice(source.indexOf('function Gallery('), source.indexOf('function ProductInfo('));
    expect(gallery).not.toContain('/mySOS/products/${');
    const rail = css.slice(css.indexOf('.pdp-thumbs {'), css.indexOf('}', css.indexOf('.pdp-thumbs {')));
    expect(rail).toContain('overflow-x: auto');
    expect(rail).toContain('scroll-snap-type: x proximity');
  });

  it('brings a view up rather than opening a page', () => {
    expect(source).toContain('onClick={() => setShown(index)}');
    expect(source).toContain('aria-pressed={index === shown}');
    expect(source).toContain('views[Math.min(shown, views.length - 1)]');
    expect(css).toContain('.pdp-thumbs button.is-chosen');
  });

  it('holds a place open for a photograph that has not arrived', () => {
    expect(source).toContain('const VIEW_SLOTS = 4;');
    expect(source).toContain('Math.max(0, VIEW_SLOTS - views.length)');
    // Plainly empty, rather than looking like a picture that failed to load.
    expect(css).toContain('.pdp-thumbs li.is-empty span');
    expect(css).toMatch(/\.pdp-thumbs li\.is-empty span \{[^}]*dashed/);
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

  it('fits the picture and the views on a short screen together', () => {
    // A smaller monitor at 100% could only show part of the picture, with the
    // row of views below the fold.
    expect(css).toContain('.pdp-gallery { max-width: min(100%, 560px); }');
    expect(css).toMatch(/max-height: 940px\).*\.pdp-gallery \{ max-width: min\(100%, 48vh\); \}/);
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

  /** One drawing on its own, up to wherever the next one begins. */
  const drawing = (name) => {
    const start = visuals.indexOf(`function ${name}(`);
    expect(start, name).toBeGreaterThan(-1);
    const end = visuals.indexOf('function ', start + 12);
    return visuals.slice(start, end === -1 ? undefined : end);
  };

  it('shows where to hold the tape, with a letter on each line', () => {
    // Every line first, then every letter: drawn in turn, the line down the
    // body struck through the letter on the chest.
    for (const [name, keys] of [
      ['MeasureGarment', ['A', 'B', 'C', 'D']],
      ['MeasureTote', ['A', 'B', 'C', 'D']],
      ['MeasureDrawstring', ['A', 'B', 'C']],
    ]) {
      const figure = drawing(name);
      expect(figure.indexOf('<Badge'), name).toBeGreaterThan(figure.lastIndexOf('{...ARROW}'));
      for (const key of keys) {
        expect(figure, `${name} ${key}`).toContain(`letter="${key}"`);
      }
    }
    expect(siteContent.sizeCharts.tshirts.measure).toHaveLength(4);
  });

  it('measures a bag as well as a garment', () => {
    // A bag has a depth and a handle; a tee has neither, so the guide cannot
    // be one drawing with the words swapped.
    expect(visuals).toContain('export function MeasureFigure(');
    expect(visuals).toContain("const measureFigures = { tote: MeasureTote,");
    expect(source).toContain("<MeasureFigure type={chart.diagram ?? 'tee'} />");
    for (const kind of ['totes', 'drawstring']) {
      const chart = siteContent.sizeCharts[kind];
      expect(chart, kind).toBeTruthy();
      // The legend and the table answer for the same measurements.
      expect(chart.measure.length, kind).toBe(chart.columns.length - 1);
      expect(chart.rows.every((row) => row.length === chart.columns.length), kind).toBe(true);
      expect(chart.noteInch, kind).toMatch(/inches/);
    }
    expect(siteContent.sizeCharts.totes.diagram).toBe('tote');
    expect(siteContent.sizeCharts.totes.columns).toContain('Depth');
    // The bags the panel offers and the rows of the guide are the same bags,
    // named the same way, measured the same way.
    const dimensions = siteContent.productSteps.totes.find((step) => step.type === 'dimensions');
    const chart = siteContent.sizeCharts.totes;
    expect(chart.rows.map((row) => row[0])).toEqual(dimensions.standardSizes.map((size) => size.name));
    for (const size of dimensions.standardSizes) {
      const row = chart.rows.find((item) => item[0] === size.name);
      const parts = dimensions.fields
        .map((field) => row[chart.columns.indexOf(field.column)])
        .filter((value) => value && value !== '-');
      expect(size.dims, size.name).toBe(`${parts.join(' × ')} cm`);
    }
    // And the one it opens on is one of them.
    expect(dimensions.standardSizes.map((size) => size.name)).toContain(dimensions.defaultSize);
  });

  it('puts the guide beside the question it answers', () => {
    // The bag asks for its dimensions in the panel: the way to the guide
    // belongs there, not only in the specifications table further up.
    expect(source).toContain('onChart={chartFor(product) ? onChart : null}');
    const step = source.slice(source.indexOf("if (step.type === 'dimensions')"));
    expect(step.slice(0, step.indexOf("if (step.type === 'cards')"))).toContain('className="pdp-chart-link"');
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

describe("the client's own marks, and the medal's own questions", () => {
  const source = readFileSync(new URL('../src/public/pages/ProductDetailPage.jsx', import.meta.url), 'utf8');
  const marks = readFileSync(new URL('../src/public/components/BrandMarks.jsx', import.meta.url), 'utf8');
  const css = readFileSync(new URL('../src/public/public.css', import.meta.url), 'utf8');

  it("keeps the client's artwork as the client drew it", () => {
    // Two colours, filled: not the single stroke the rest of the icons are,
    // so it is a component of its own rather than a entry in Icons.jsx.
    expect(marks).toContain("const NAVY = '#21348c';");
    expect(marks).toContain("const GREEN = '#006451';");
    expect(marks).toContain('viewBox="0 0 98.561 98.919"');
    for (const name of ['mockup', 'guidance', 'quantities']) {
      expect(marks, name).toContain(`${name}: <>`);
    }
    // Decoration beside a word that already says it: nothing to read aloud.
    expect(marks).toContain('aria-hidden="true"');
    expect(css).toContain('.brand-mark {');
  });

  it('gives a promise its mark by name, so a reworded one keeps the tick', () => {
    const promises = siteContent.pages.product.promises;
    const promiseMarks = siteContent.pages.product.promiseMarks;
    expect(promises.every((promise) => promiseMarks[promise]), 'every promise marked').toBe(true);
    // Keyed by the promise rather than its place in the list: reorder the
    // promises and each keeps its own mark.
    expect(Object.keys(promiseMarks)).toEqual(promises);
    expect(source).toContain('siteContent.pages?.product?.promiseMarks?.[promise]');
    expect(source).toContain('<Icon name="check" size={18} />');
  });

  it('asks a medal what a medal needs', () => {
    const steps = siteContent.productSteps.medals;
    expect(steps.map((step) => step.question)).toEqual([
      'Medal size', 'Finish', 'Ribbon', 'Branding', 'Upload your artwork', 'Add any other notes',
    ]);
    // Its finish is its colour, so it arrives in a field of its own rather
    // than buried in the note.
    const field = detailFieldsFor('custom_medal').find((item) => item.id === 'colour');
    expect(field.label).toBe('Finish');
    expect(steps[1].type).toBe('colour');
    for (const finish of ['Gold', 'Silver', 'Bronze']) {
      expect(siteContent.colourSwatches[finish], finish).toMatch(/^#[0-9a-f]{6}$/i);
      expect(field.options, finish).toContain(finish);
    }
    // One ribbon is the usual one and says so.
    const ribbon = steps.find((step) => step.id === 'ribbon');
    expect(ribbon.options.filter((option) => option.tag)).toHaveLength(1);
  });
});

describe('the bottle chooses its capacity and its cap', () => {
  const source = readFileSync(new URL('../src/public/pages/ProductDetailPage.jsx', import.meta.url), 'utf8');
  const request = readFileSync(new URL('../src/public/pages/RequestPage.jsx', import.meta.url), 'utf8');
  const css = readFileSync(new URL('../src/public/public.css', import.meta.url), 'utf8');
  const steps = siteContent.productSteps.bottles;
  const stepFor = (id) => steps.find((step) => step.id === id);

  it('asks what the drawing asks, in that order', () => {
    expect(steps.map((step) => step.id)).toEqual(['capacity', 'cap', 'colour', 'decoration', 'packaging', 'artwork', 'notes']);
    expect(steps.filter((step) => step.optional).map((step) => step.id)).toEqual(['packaging', 'artwork', 'notes']);
  });

  it('offers the capacities it stocks and a way to ask for another', () => {
    const capacity = stepFor('capacity');
    expect(capacity.type).toBe('select');
    expect(capacity.allowCustom).toBe(true);
    expect(capacity.options.length).toBeGreaterThan(2);
    expect(capacity.note).toMatch(/custom capacity/i);
    // One list and one typed answer, both under the same name, so the request
    // carries whichever was given without having to know which.
    expect(source).toContain("if (step.type === 'select') {");
    expect(source).toContain('answers[`${step.id}Mode`]');
    expect(css).toContain('.pdp-field {');
  });

  it('names the cap most people take rather than leaving it to the order', () => {
    const cap = stepFor('cap');
    expect(cap.options.map((option) => option.name)).toEqual(['Screw cap', 'Straw lid', 'Carry handle cap']);
    expect(cap.options.filter((option) => option.tag)).toHaveLength(1);
    expect(cap.options[0].tag).toBe('Standard');
    expect(source).toContain('className="pdp-method-tag"');
    expect(css).toContain('.pdp-method-tag {');
    // Each cap has a mark of its own, not the same one three times.
    const icons = cap.options.map((option) => option.icon);
    expect(new Set(icons).size).toBe(3);
    const drawn = new Set(iconLibrary.icons.map((item) => item.name));
    for (const icon of icons) expect(drawn.has(icon), icon).toBe(true);
  });

  it('sends the customisation under the name this product gives it', () => {
    // A bottle calls its printing choice "decoration". Sent as "printing" it
    // would be filtered out of the row and lost.
    const decoration = stepFor('decoration');
    expect(decoration.asPrinting).toBe(true);
    expect(decoration.id).toBe(printingFieldFor('insulated_bottle').id);
    expect(request).toContain('const printingField = (wanted && printingFieldFor(wanted)?.id)');
    expect(request).toContain('[printingField]: chosen.printing');
    // And every card's answer is one the field will accept.
    const accepted = printingFieldFor('insulated_bottle').options;
    for (const option of decoration.options) {
      expect(accepted, option.name).toContain(option.value ?? option.name);
    }
  });

  it('keeps two answers given in quick succession', () => {
    // Added to whatever has been answered rather than to a copy taken when
    // the step was drawn, or the second click drops the first.
    expect(source).toContain('onAnswer((said) => ({ ...said, [key]: value }))');
  });
});

describe('the sizes a bag is made in', () => {
  const source = readFileSync(new URL('../src/public/pages/ProductDetailPage.jsx', import.meta.url), 'utf8');
  const css = readFileSync(new URL('../src/public/public.css', import.meta.url), 'utf8');

  it('offers the standard sizes from the chart, and a size of your own', () => {
    expect(source).toContain('function sizeOptionsFor(step, product)');
    expect(source).toContain('function sizePick(step, product, answers)');
    expect(css).toContain('.pdp-sizing.is-sizes {');
    for (const kind of ['totes', 'drawstring']) {
      const step = siteContent.productSteps[kind].find((item) => item.type === 'dimensions');
      const chart = siteContent.sizeCharts[kind];
      expect(step.sizesFromChart, kind).toBe(true);
      // Every field reads a column the chart actually has, so a size can
      // never come back blank.
      for (const field of step.fields) {
        expect(chart.columns.indexOf(field.column), `${kind} ${field.id}`).toBeGreaterThan(0);
      }
      // And the size it opens on is one of the chart's own rows.
      expect(chart.rows.map((row) => row[0]), kind).toContain(step.defaultSize);
    }
  });

  it('leaves a kind with no chart the one standard it had', () => {
    // The lanyard has a standard size and no chart behind it; it keeps the
    // two buttons rather than losing them to an empty list.
    const step = siteContent.productSteps.lanyards.find((item) => item.type === 'dimensions');
    expect(step.sizesFromChart).toBeUndefined();
    expect(siteContent.sizeCharts.lanyards).toBeUndefined();
    expect(source).toContain("if (!step?.sizesFromChart) return [];");
    expect(source).toContain("step.standardLabel ?? word('standardLabel'");
  });

  it('sends the size that was asked for, name and numbers alike', () => {
    // The name is what MySOS reads; the numbers are what gets made.
    expect(source).toContain("const head = custom ? '' : `${picked} - `;");
    expect(source).toContain('if (!custom && !sizes.length) continue;');
  });
});

describe('the gift sets in the catalogue', () => {
  const sets = productData.catalogue.filter((item) => item.public.subcategory === 'gift-sets');

  it('offers the navy set beside the executive one', () => {
    expect(sets.map((item) => item.id)).toEqual(['executive_gift_set', 'navy_gift_set']);
    const navy = sets.find((item) => item.id === 'navy_gift_set');
    expect(navy.public.slug).toBe('navy-gift-set');
    expect(navy.public.visible).toBe(true);
    expect(navy.public.category).toBe('corporate-gifts');
    // Both are sets, so both are asked the set's questions and counted in sets.
    expect(siteContent.productUnit['gift-sets']).toBe('sets');
    expect(siteContent.productIncludes[navy.id]).toBeTruthy();
    expect(siteContent.productIncludes[navy.id].items.length).toBeGreaterThan(2);
  });

  it('counts a set in sets where it says what the price buys', () => {
    expect(readFileSync(new URL('../src/public/pages/ProductDetailPage.jsx', import.meta.url), 'utf8'))
      .toContain("${unitFor(product) || 'pieces'}");
  });

  it('is photographed, from its box down to the parts inside it', () => {
    const files = readdirSync(new URL('../src/assets/images/products/', import.meta.url));
    // The set itself, five more views of it, and one of each thing in the box.
    expect(files).toContain('navy-gift-set.jpg');
    for (let n = 2; n <= 6; n += 1) expect(files).toContain(`navy-gift-set-${n}.jpg`);
    const parts = siteContent.productIncludes.navy_gift_set.items;
    for (let n = 1; n <= parts.length; n += 1) expect(files).toContain(`navy-gift-set-part-${n}.jpg`);
    // Landscape in a square frame: whole, rather than cut down the sides.
    const navy = sets.find((item) => item.id === 'navy_gift_set');
    expect(navy.public.imageFit).toBe('contain');
    // And no price, because nobody has quoted one.
    expect(navy.public.displayPricing.show).toBe(false);
  });
});

describe('the pictures a product is given', () => {
  const source = readFileSync(new URL('../src/public/pages/ProductDetailPage.jsx', import.meta.url), 'utf8');
  const css = readFileSync(new URL('../src/public/public.css', import.meta.url), 'utf8');

  it('shows the one chosen in the manager, not only the one dropped in', () => {
    // The main shot carried the content path of product.public.image, so the
    // manager offered to change it — and the gallery then read the file on
    // disk and nothing else, so choosing a picture did nothing at all.
    expect(source).toContain('const found = [picture(product.public.image, `products/${product.public.slug}`)];');
  });

  it('photographs the parts of a set where there is a photograph', () => {
    expect(source).toContain('function IncludedShot({ product, item, index })');
    expect(source).toContain('picture(item.image, `products/${product.public.slug}-part-${index + 1}`)');
    // No photograph, and the drawing stands in exactly as it did before.
    expect(source).toContain('if (!shot) return <Product type={item.visual} color="navy" mark=""');
    expect(source).toContain('<IncludedShot product={product} item={item} index={index} />');
    // Whole rather than cropped: these are objects on a tile, not scenes.
    expect(css).toContain('.pdp-includes-shot { flex: none; width: 56px; height: 56px;');
    expect(css).toMatch(/\.pdp-includes-shot \{[^}]*object-fit: contain/);
    // Every part can be given one, and the manager can change each.
    for (const set of Object.values(siteContent.productIncludes)) {
      for (const item of set.items) expect(item).toHaveProperty('image');
    }
  });
});

describe('each kind is asked what the drawing asks it', () => {
  const source = readFileSync(new URL('../src/public/pages/ProductDetailPage.jsx', import.meta.url), 'utf8');
  const css = readFileSync(new URL('../src/public/public.css', import.meta.url), 'utf8');

  it('shows a material in its own colour rather than a mark standing in', () => {
    const material = siteContent.productSteps.lanyards.find((step) => step.id === 'material');
    const swatched = material.options.filter((option) => option.swatch);
    expect(swatched.map((option) => option.name)).toEqual(['Polyester', 'Nylon', 'Recycled PET']);
    for (const option of swatched) expect(option.swatch, option.name).toMatch(/^#[0-9a-f]{6}$/i);
    // "Help me decide" is not a material and has no colour to show.
    expect(material.options.at(-1).swatch).toBeUndefined();
    expect(source).toContain("option.swatch ? ' is-swatch' : ''");
    expect(css).toContain('.pdp-method-shot.is-swatch');
  });

  it('puts the choices side by side, each mark at the same height', () => {
    // A button centres its own contents, so cards of different heights put
    // their marks at different heights until told otherwise.
    expect(css).toMatch(/\.pdp-methods button \{[^}]*align-content: start/);
    expect(css).toContain('.pdp-methods.is-row {');
    expect(source).toContain('className="pdp-methods is-row"');
  });

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
