import React from 'react';
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import printData from '../src/data/printData.json';
import productData from '../src/data/productData.json';
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

const render = (Page, pathname, search = '') => {
  globalThis.location = { pathname, search };
  return renderToStaticMarkup(<Page />);
};

/*
 * Every size that carries words someone reads. The badge and the numbered step
 * marker are shapes with a character in them, so they are left out.
 */
const CHROME = /\.badge|pdp-step-number/;

function readingSizes(css) {
  let selector = '';
  const found = [];
  for (const line of css.split(/\r?\n/)) {
    const brace = line.indexOf('{');
    if (brace >= 0) {
      const head = line.slice(0, brace).trim();
      if (head && !head.startsWith('@')) selector = head;
    }
    if (CHROME.test(selector)) continue;
    for (const [, size] of line.matchAll(/font-size: ([\d.]+)px/g)) found.push(Number(size));
  }
  return found;
}

const visibleMethods = printData.methods.filter((method) => method.public?.visible);

describe('page order: reviews sit directly under the banner', () => {
  it('home: the logos sit right under the banner, then the reviews', () => {
    const markup = render(HomePage, '/mySOS/');
    const banner = markup.indexOf('class="home-hero"');
    const logos = markup.indexOf('class="trust-strip"');
    const reviews = markup.indexOf('class="home-reviews"');
    expect(banner).toBeGreaterThan(-1);
    expect(logos).toBeGreaterThan(banner);
    expect(reviews).toBeGreaterThan(logos);
    // The reviews themselves, not only a rating: the slider the site has
    // always carried, with the rating above it and the way to all of them.
    expect(markup.match(/class="review-card"/g).length).toBeGreaterThan(1);
    expect(markup).toContain('class="review-rail"');
    expect(markup).toContain('Read all reviews on Google');
    expect(markup.match(/class="section reviews"/g)).toHaveLength(1);
  });

  it('why mysos: directly under the banner, above the reasons', () => {
    const markup = render(WhyPage, '/mySOS/why-mysos/');
    const banner = markup.indexOf('class="hero hero-compact"');
    const reviews = markup.indexOf('class="section reviews"');
    const reasons = markup.indexOf('class="why-choose"');
    expect(banner).toBeGreaterThan(-1);
    expect(reviews).toBeGreaterThan(banner);
    expect(reviews).toBeLessThan(reasons);
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

describe('the products page, as the design has it', () => {
  const css = readFileSync(new URL('../src/public/public.css', import.meta.url), 'utf8');
  const markup = (category) => render(ProductsPage, '/mySOS/products/', category ? `?category=${category}` : '');
  const source = readFileSync(new URL('../src/public/pages/ProductsPage.jsx', import.meta.url), 'utf8');

  it('leads with the category and a search that narrows the shelf', () => {
    const html = markup();
    expect(html).toContain('class="hero-search collection-search"');
    expect(html).toMatch(/<h1[^>]*>\s*<span[^>]*>Custom<\/span> <span[^>]*>Apparel<\/span>/);
    expect(source).toContain('.toLowerCase().includes(asked)');
  });

  it('says the search worked, because the shelf it filters is a screen away', () => {
    // Nothing happened on screen when someone typed: the grid that changed
    // was below the fold, so a search that worked looked like one that broke.
    expect(source).toContain("className={products.length ? 'collection-found' : 'collection-found is-none'}");
    expect(source).toContain("role=\"status\"");
    expect(source).toContain('aria-live="polite"');
    // And it offers the way down, as does pressing enter.
    expect(source).toContain('const goToResults = () => collectionRef.current?.scrollIntoView');
    expect(source).toContain('onSubmit={(event) => { event.preventDefault(); goToResults(); }}');
    expect(source).toContain('onClick={goToResults}');
    // It is not shown until there is something to say.
    expect(source).toContain('{query.trim() && <p');
    expect(markup()).not.toContain('collection-found');
    expect(css).toContain('.collection-found {');
    for (const key of ['searchFound', 'searchFoundOne', 'searchFoundNone']) {
      expect(siteContent.pages.products[key], key).toBeTruthy();
    }
    expect(siteContent.pages.products.searchFound).toContain('{count}');
  });

  it('lets the manager edit a product’s own name and picture', () => {
    const html = markup();
    const index = productData.catalogue.findIndex((item) => item.public.slug === 'premium-cotton-tee');
    // The catalogue is not part of the homepage content: the manager loads it
    // under pricingData for the prices editor and writes it back on publish,
    // so that is where a product's words and pictures are addressed.
    const path = (...rest) => JSON.stringify(['pricingData', 'productData', 'catalogue', index, 'public', ...rest]).replace(/"/g, '&quot;');
    expect(html).toContain(`data-cms-path="${path('name')}"`);
    expect(html).toContain(`data-cms-path="${path('image')}"`);
    // Every product carries both fields, so none of them is the one that
    // cannot be given a picture.
    for (const item of productData.catalogue) {
      expect(typeof item.public.image, item.id).toBe('string');
      expect(typeof item.public.imageFit, item.id).toBe('string');
    }
  });

  it('opens the picture field on a product drawn rather than photographed', () => {
    // Marked as a background, so clicking it offers a picture instead of
    // writing a file name over the artwork.
    const source = readFileSync(new URL('../src/public/components/Ui.jsx', import.meta.url), 'utf8');
    expect(source).toContain("'data-cms-background': 'true'");
    expect(source).toContain('const src = picture(image, slug && `products/${slug}`);');
    // And how the picture sits in its frame is a choice, not a constant.
    expect(css).toContain('.product-visual.has-photo[data-fit="cover"] img { object-fit: cover; }');
    expect(css).toContain('.product-visual.has-photo[data-fit="contain"] img { object-fit: contain; }');
  });

  it('puts the kinds within a category in a row of their own', () => {
    const html = markup();
    expect(html).toContain('class="type-row"');
    // The heading is three content values in a row, so it is read as text.
    const words = (markup) => markup.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
    expect(words(html)).toContain('Browse apparel types');
    expect(html).toContain('Explore all');
    // The row is the category's shape, not a report on what the catalogue
    // happens to hold: drinkware has one product and still offers the six
    // kinds MySOS makes.
    expect(words(markup('bags'))).toContain('Browse bag types');
    expect(markup('drinkware')).toContain('class="type-row"');
    expect(words(markup('drinkware'))).toContain('Water Bottles');
  });

  it('reads the kinds from the catalogue, not from a list kept by hand', () => {
    // The apparel filter named five kinds while the catalogue held seven, so
    // six caps could be reached only by searching for them.
    expect(markup()).toContain('Caps');
    expect(siteContent).not.toHaveProperty('apparelTabs');
    expect(Object.keys(siteContent.subcategoryNames).length).toBeGreaterThan(15);
  });

  it('no longer names the ways of printing on the banner', () => {
    // They belong to a product, not to a category page.
    expect(markup()).not.toContain('hero-ways');
    expect(css).not.toContain('hero-ways');
    expect(siteContent.pages.products).not.toHaveProperty('waysLabel');
  });
});

describe('the home banner and the sections under it', () => {
  const css = readFileSync(new URL('../src/public/public.css', import.meta.url), 'utf8');
  const home = readFileSync(new URL('../src/public/pages/HomePage.jsx', import.meta.url), 'utf8');

  it('carries the concept the client designed, word for word', () => {
    const markup = render(HomePage, '/mySOS/');
    // The concept page is the client's own design, so its wording is theirs.
    expect(markup).toContain(siteContent.headings.heroEyebrow);
    expect(markup).toContain(siteContent.headings.heroTitleLead);
    expect(markup).toContain(siteContent.headings.heroTitleAccentLong.replaceAll("'", '&#x27;'));
    expect(markup).toContain(siteContent.headings.heroSearchLead);
    expect(markup).toContain('class="hero-search"');
    // The suggestions open with a plus. There is no upload chip beside them:
    // it opened the quote page with a flag nothing there ever read.
    for (const chip of siteContent.heroSearchChips) expect(markup).toContain(chip);
    expect(markup).not.toContain('upload=1');
    expect(siteContent.labels).not.toHaveProperty('uploadPhotoChip');
    expect(home).toMatch(/<span aria-hidden="true">\+<\/span>/);
  });

  it('turns the banner picture card over, starting on one the server drew', () => {
    const markup = render(HomePage, '/mySOS/');
    const slides = [...markup.matchAll(/class="hero-card-slide( is-active)?"/g)];
    expect(slides.length).toBeGreaterThan(1);
    expect(slides.filter(([, active]) => active)).toHaveLength(1);
    expect(home).toMatch(/setShown\(\(current\) => \(current \+ 1\) % slides\.length\);/);
    expect(home).toMatch(/prefers-reduced-motion: reduce/);
    expect(css).toMatch(/\.hero-card-slide \{[^}]*opacity: 0; transition: opacity/);
    // No drawn products anywhere on it: the photograph carries the banner.
    expect(markup).not.toMatch(/class="[^"]*ha-[1-5]/);
  });

  it('lets the manager choose the slideshow pictures', () => {
    expect(siteContent.scenes.homeHeroSlides).toBeInstanceOf(Array);
    expect(render(HomePage, '/mySOS/')).toContain('data-cms-path="[&quot;homepage&quot;,&quot;scenes&quot;,&quot;homeHeroSlides&quot;,0]"');
  });

  it('measures the logo marquee against the width the stylesheet uses', () => {
    // The track slides exactly -50%, so a card width that disagrees with the
    // CSS makes the marquee drift or race. The marks themselves are pictures,
    // not the organisations' names set as text.
    const width = Number(css.match(/\.trust-logo \{[^}]*width: (\d+)px/)[1]);
    expect(Number(home.match(/const CARD_WIDTH = (\d+);/)[1])).toBe(width);
    expect(render(HomePage, '/mySOS/')).toMatch(/class="crest-img" src="[^"]+" alt="Nanyang Technological University"/);
  });

  it('gives every category a tile, one for one, each in its own wash', () => {
    const markup = render(HomePage, '/mySOS/');
    const tiles = [...markup.matchAll(/class="home-tile tone-(\w+)"/g)].map(([, tone]) => tone);
    expect(tiles).toHaveLength(siteContent.categories.length);
    expect(new Set(tiles).size).toBe(siteContent.categories.length);
    for (const category of siteContent.categories) expect(markup).toContain(category.description.replaceAll('&', '&amp;'));
    expect(css).toMatch(/\.home-tile-grid \{ display: grid; grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/);
    const phone = css.slice(css.indexOf('@media (max-width: 620px)', css.indexOf('20. homepage')));
    expect(phone).toMatch(/\.home-tile-grid \{ grid-template-columns: minmax\(0, 1fr\)/);
  });

  it('titles every section as the concept does', () => {
    const markup = render(HomePage, '/mySOS/');
    for (const key of ['homeTilesEyebrow', 'categoriesHeading', 'homeWhyEyebrow', 'homeWhyHeading',
      'homeWorkEyebrow', 'homeWorkHeading', 'homeProcessEyebrow', 'homeProcessHeading', 'homeClosingTitle']) {
      expect(markup, key).toContain(siteContent.headings[key].replaceAll("'", '&#x27;'));
    }
    // The four facts it leads with: a figure, then three plain ones.
    expect(siteContent.homeFigure.value).toBe('∞');
    expect(siteContent.homeStats.map((stat) => stat.value)).toEqual(['Quality assured', 'Within 1 day', 'Free']);
  });

  it('sets the banner the way the concept sets it: small line, huge headline', () => {
    const size = (pattern) => Number(css.match(pattern)[1]);
    // Measured off the concept at 1440px: eyebrow 12.5, headline 78.
    expect(size(/\.home-hero-copy \.eyebrow \{[^}]*font-size: ([\d.]+)px/)).toBeLessThanOrEqual(15);
    expect(size(/\.home-hero h1 \{ font-size: clamp\([\d.]+px, [\d.]+vw, (\d+)px\)/)).toBeGreaterThanOrEqual(74);
    expect(size(/\.hero-search input \{[^}]*font-size: ([\d.]+)px/)).toBeGreaterThanOrEqual(16);
    expect(size(/\.hero-search \.btn \{[^}]*height: (\d+)px/)).toBeGreaterThanOrEqual(54);
    // Section headings at the same scale as the concept's.
    expect(size(/\.home-tiles-head h2 \{[^}]*clamp\([\d.]+px, [\d.]+vw, (\d+)px\)/)).toBeGreaterThanOrEqual(58);
  });

  it('sets the page in the typeface the concept uses', () => {
    // The headlines read differently in Inter; DM Sans is what the design uses.
    expect(css).toMatch(/fonts\.googleapis\.com\/css2\?family=DM\+Sans/);
    expect(css).toMatch(/font-family: 'DM Sans', Inter,/);
  });

  it('opens the promises with a figure that counts up, then each with its mark', () => {
    const markup = render(HomePage, '/mySOS/');
    // The figure the server draws is the mark itself, so a reader with no
    // JavaScript — or one who asked for less motion — sees it, not a zero.
    expect(markup).toContain(`>${siteContent.homeFigure.value}</strong>`);
    expect(markup).toContain(siteContent.homeFigure.label);
    expect(home).toMatch(/setShown\(String\(Math\.round\(eased \* 99\)\)\)/);
    expect(home).toMatch(/\(prefers-reduced-motion: reduce\)'\)\.matches\) return undefined;/);
    // Each promise keeps its own mark, and the row is a plain divided row now.
    expect([...markup.matchAll(/class="home-stat-list"/g)]).toHaveLength(1);
    for (const stat of siteContent.homeStats) {
      expect(stat.icon, stat.value).toBeTruthy();
      expect(markup).toContain(stat.value.replaceAll('&', '&amp;'));
    }
  });

  it('writes the figure at the size of the promises beside it', () => {
    // "∞ Products" is one line of type with "Quality assured", not a small
    // number over a large word; it used to be set at 22px and then scaled up
    // as it landed, which left it in neither size for most of the count.
    const rule = css.match(/\.home-figure-value,\s*\r?\n\.home-figure-label \{([^}]*)\}/)[1];
    const promise = css.match(/\.home-stat-list strong \{([^}]*)\}/)[1];
    for (const property of ['font-size', 'font-weight', 'letter-spacing', 'line-height']) {
      const of = (text) => text.match(new RegExp(`${property}: ([^;]+);`))[1];
      expect(of(rule), property).toBe(of(promise));
    }
    expect(css).not.toMatch(/\.home-figure-value\.is-settled/);
  });

  it('brings sections in as they are reached, and never leaves them hidden', () => {
    const reveal = readFileSync(new URL('../src/public/reveal.js', import.meta.url), 'utf8');
    // The hidden state hangs off a class the script adds, so a page whose
    // JavaScript never runs shows everything.
    expect(css).toMatch(/html\.has-reveal \[data-reveal\] \{ opacity: 0; transform: translateY\(18px\); \}/);
    expect(reveal).toMatch(/classList\.add\(HIDE_CLASS\)/);
    expect(reveal).toMatch(/\(prefers-reduced-motion: reduce\)'\)\.matches\) return \(\) => \{\};/);
    // And where the observer never reports, everything is shown anyway.
    expect(reveal).toMatch(/const safety = setTimeout\(\(\) => \{/);
    expect(reveal).toMatch(/for \(const node of root\.querySelectorAll\('\[data-reveal\]'\)\) node\.classList\.add\(SEEN\);/);
    expect(render(HomePage, '/mySOS/')).toMatch(/data-reveal/);
  });

  it('sets the category strip in navy, with green under the cursor', () => {
    // On white it read as part of the banner under it, and a reader could not
    // see it was the menu of categories.
    expect(css).toMatch(/\.category-strip \{ background: var\(--navy\);/);
    expect(css).toMatch(/\.category-strip ul a \{[^}]*color: #fff; \}/);
    expect(css).toMatch(/\.category-strip ul a:hover \{ background: var\(--green\); color: #fff; \}/);
    expect(css).toMatch(/\.category-strip ul a\.is-active \{ background: var\(--green\); color: #fff; \}/);
  });

  it('sets the reviews at a size people can read', () => {
    const size = (pattern) => Number(css.match(pattern)[1]);
    expect(size(/\.review-card p \{[^}]*font-size: ([\d.]+)px/)).toBeGreaterThanOrEqual(16);
    expect(size(/\.review-summary \.rating-value \{ font-size: ([\d.]+)px/)).toBeGreaterThanOrEqual(26);
  });

  it('carries the stats, the reasons, the budget bands and the work', () => {
    const markup = render(HomePage, '/mySOS/');
    for (const stat of siteContent.homeStats) expect(markup).toContain(stat.note);
    for (const band of siteContent.budgetBands) expect(markup).toContain(band.label);
    // Four reasons in the navy band, numbered.
    expect([...markup.matchAll(/class="home-why-number"/g)]).toHaveLength(4);
    // The budget section suggests, and never prices: MySOS's own numbers stay
    // in the agents' quotation engine.
    expect(markup).not.toMatch(/\$\d+\.\d\d/);
    expect(markup).toContain('class="home-work-card');
    // The process is told with the same journey the Why MySOS page uses.
    expect(markup).toContain('class="journey-card"');
    expect(markup).toContain('class="journey-steps"');
  });
});

describe('the type scale: titles carry the page', () => {
  const css = readFileSync(new URL('../src/public/public.css', import.meta.url), 'utf8');
  const sizeOf = (pattern) => Number(css.match(pattern)[1]);

  it('sets titles above the text around them', () => {
    expect(sizeOf(/\.hero h1 \{ font-size: ([\d.]+)px/)).toBeGreaterThanOrEqual(50);
    expect(sizeOf(/\.section-heading h2 \{ font-size: ([\d.]+)px/)).toBeGreaterThanOrEqual(34);
    // The lead sits under the headline but is still a comfortable read: the
    // whole point of the last pass was that 16px was a squint.
    expect(sizeOf(/\.hero-lead \{[^}]*font-size: ([\d.]+)px/)).toBeGreaterThanOrEqual(19);
    expect(sizeOf(/\.hero-lead \{[^}]*font-size: ([\d.]+)px/))
      .toBeLessThan(Number(css.match(/\.hero-compact h1 \{ font-size: clamp\((\d+)px/)[1]));
    expect(sizeOf(/\.section-heading p \{[^}]*font-size: ([\d.]+)px/))
      .toBeLessThan(sizeOf(/\.section-heading h2 \{ font-size: ([\d.]+)px/));
  });

  it('never drops readable text below 13.5px, however small the scale gets', () => {
    expect(Math.min(...readingSizes(css))).toBeGreaterThanOrEqual(13.5);
  });

  it('runs the page wide, so it is not a column adrift on a large screen', () => {
    // 1180 → 1340 → 1520 → 1760: on a 1920px monitor the page used to keep
    // 200px of margin either side, which read as a column down the middle.
    expect(sizeOf(/--content: (\d+)px;/)).toBeGreaterThanOrEqual(1760);
    expect(sizeOf(/\.site-app \{ width: min\(100%, (\d+)px\)/)).toBeGreaterThanOrEqual(1920);
  });
});

describe('the bar at the top of every page', () => {
  const css = readFileSync(new URL('../src/public/public.css', import.meta.url), 'utf8');

  it('is one height, and everything that has to clear it follows', () => {
    // The height was written out in five places; a taller bar left the mobile
    // menu overlapping it and anchors landing underneath it.
    expect(css).toMatch(/--header-h: 88px;/);
    expect(css).toMatch(/\.site-header \{[^}]*height: var\(--header-h\)/);
    expect(css).not.toMatch(/top: 72px|scroll-(margin|padding)-top: 72px/);
    for (const rule of [/\.primary-nav \{[\s\S]{0,200}?top: var\(--header-h\)/, /scroll-padding-top: var\(--header-h\)/, /scroll-margin-top: (?:var|calc)\(var?\(?--header-h/]) {
      expect(css).toMatch(rule);
    }
  });

  it('carries bigger wording and controls than the text under it', () => {
    const size = (pattern) => Number(css.match(pattern)[1]);
    expect(size(/\.nav-link \{[^}]*font-size: ([\d.]+)px/)).toBeGreaterThanOrEqual(17);
    expect(size(/\.wordmark \{ height: (\d+)px/)).toBeGreaterThanOrEqual(44);
    // Header buttons match the WhatsApp circle beside them.
    expect(size(/\.site-header \.btn-sm \{ height: (\d+)px/)).toBe(size(/\.wa-circle \{ width: (\d+)px/));
  });
});

describe('how a product should be printed', () => {
  const builder = readFileSync(new URL('../src/public/components/RequestBuilder.jsx', import.meta.url), 'utf8');

  it('is a dropdown, whatever the field is set up as', () => {
    // There are more printing methods than fit a row of buttons, and the list
    // differs per product kind.
    expect(builder).toMatch(/\{isPrinting && <select/);
    expect(builder).toMatch(/className="request-printing-select"/);
    expect(builder).toMatch(/<option value="">\{word\('printingPlaceholder'/);
    expect(builder).toMatch(/field\.recommended === option \? `\$\{option\} \(recommended\)` : option/);
    // The other kinds of field are left to the row of buttons as before.
    for (const kind of ['choice', 'select', 'text']) {
      expect(builder).toContain(`{!isPrinting && field.type === '${kind}'`);
    }
  });
});

describe('the page is comfortable to read', () => {
  const css = readFileSync(new URL('../src/public/public.css', import.meta.url), 'utf8');
  const sizes = readingSizes(css);

  it('sets no text below 13.5px, and the leads at 17px or more', () => {
    // The type pass had trimmed body text about 6%, which left whole sections
    // hard to read at arm's length.
    expect(Math.min(...sizes)).toBeGreaterThanOrEqual(13.5);
    for (const lead of [/\.home-hero-lead \{[^}]*font-size: ([\d.]+)px/, /\.pdp-lead \{[^}]*font-size: ([\d.]+)px/, /\.section-heading p \{[^}]*font-size: ([\d.]+)px/]) {
      expect(Number(css.match(lead)[1]), String(lead)).toBeGreaterThanOrEqual(17);
    }
  });

  it('keeps titles clearly above the text they sit over', () => {
    const size = (pattern) => Number(css.match(pattern)[1]);
    expect(size(/\.home-tiles-head h2 \{[^}]*clamp\(\d+px, [\d.]+vw, (\d+)px\)/))
      .toBeGreaterThan(size(/\.home-tiles-head p \{ font-size: ([\d.]+)px/));
  });
});

describe('the page moves as you read it', () => {
  const css = readFileSync(new URL('../src/public/public.css', import.meta.url), 'utf8');
  const chrome = readFileSync(new URL('../src/public/chrome.js', import.meta.url), 'utf8');
  const ui = readFileSync(new URL('../src/public/components/Ui.jsx', import.meta.url), 'utf8');

  it('fills a line across the top and tightens the header once you scroll', () => {
    expect(chrome).toMatch(/bar\?\.style\.setProperty\('--scrolled', along\)/);
    expect(chrome).toMatch(/page\.classList\.toggle\('is-scrolled', near\)/);
    expect(chrome).toMatch(/addEventListener\('scroll', onScroll, \{ passive: true \}\)/);
    expect(css).toMatch(/\.site-announce::after \{[\s\S]*?transform: scaleX\(var\(--scrolled, 0\)\)/);
    expect(css).toMatch(/html\.is-scrolled \.site-header \{ height: 72px;/);
  });

  it('writes how far down the page you are where only the bar sees it', () => {
    // On <html> the value is inherited by the whole document, so every element
    // had its style worked out again on every frame of every scroll: 10ms a
    // frame on the home page, out of the 16ms a frame has. On the bar itself
    // the same write costs a seventh of a millisecond.
    expect(chrome).toContain("const bar = root.querySelector('.site-announce');");
    expect(chrome).not.toMatch(/page\.style\.setProperty\('--scrolled'/);
    // And nothing is written at all unless the bar would be drawn differently.
    expect(chrome).toContain("if (along !== last) {");
    expect(chrome).toContain('if (near !== tight) {');
    // A width is laid out again on every frame; a scale is not.
    expect(css).not.toContain('width: calc(var(--scrolled, 0) * 100%)');
    expect(css).toMatch(/\.site-announce::after \{[\s\S]*?transition: transform \.12s linear/);
  });

  it('counts the review total up to itself, from the number the server drew', () => {
    expect(ui).toMatch(/export function CountUp\(\{ value, ms = \d+ \}\)/);
    expect(ui).toMatch(/const \[shown, setShown\] = useState\(target\);/);
    expect(ui).toMatch(/<CountUp value=\{data\.totalReviewCount\} \/>/);
  });

  it('leaves every one of these out for a reader who asked for less motion', () => {
    for (const source of [chrome, readFileSync(new URL('../src/public/reveal.js', import.meta.url), 'utf8')]) {
      expect(source).toMatch(/prefers-reduced-motion: reduce/);
    }
    // Every block of motion has its own opt-out; together they name each one.
    const quiet = css.split('@media (prefers-reduced-motion: reduce)').slice(1).join(' ');
    for (const stopped of ['.site-announce::after', '.hero-card-slide', '.wa-bubble::after',
      '.nav-link::after', '.request-row', '.hero-results li', '[data-reveal]']) {
      expect(quiet, stopped).toContain(stopped);
    }
  });
});

describe('the review total is a figure, and it counts', () => {
  const ui = readFileSync(new URL('../src/public/components/Ui.jsx', import.meta.url), 'utf8');
  const css = readFileSync(new URL('../src/public/public.css', import.meta.url), 'utf8');

  it('writes the number as a figure beside the score', () => {
    // It always counted from nothing, but it was set as small grey text, so
    // nobody saw it happen. Every site that leads with a score writes the
    // count as a number you can read across the room.
    expect(ui).toContain('<strong><CountUp value={data.totalReviewCount} /></strong>');
    const figure = css.match(/\.review-summary \.review-count strong \{([^}]*)\}/)[1];
    const score = css.match(/\.review-summary \.rating-value \{([^}]*)\}/)[1];
    expect(figure.match(/font-size: ([\d.]+)px/)[1]).toBe(score.match(/font-size: ([\d.]+)px/)[1]);
    // Digits of one width, so the line does not twitch as it counts.
    expect(figure).toContain('font-variant-numeric: tabular-nums');
  });

  it('starts as the line is reached, and takes long enough to be seen', () => {
    expect(ui).toMatch(/export function CountUp\(\{ value, ms = (\d+) \}\)/);
    expect(Number(ui.match(/export function CountUp\(\{ value, ms = (\d+) \}\)/)[1])).toBeGreaterThanOrEqual(1400);
    expect(ui).toMatch(/\}, \{ threshold: 0\.3 \}\);/);
    // And it is off for a reader who asked for less motion.
    expect(ui).toMatch(/\(prefers-reduced-motion: reduce\)'\)\.matches\) return undefined;/);
  });
});

describe('the banner picture is one card, not a slideshow', () => {
  const css = readFileSync(new URL('../src/public/public.css', import.meta.url), 'utf8');
  const home = readFileSync(new URL('../src/public/pages/HomePage.jsx', import.meta.url), 'utf8');

  it('carries the light across the glass only while the picture is changing', () => {
    expect(css).toMatch(/@keyframes hero-sheen \{/);
    // Nothing at all on a picture that is simply sitting there.
    expect(css).not.toMatch(/\.hero-card::before \{[^}]*animation:/);
    expect(css).toMatch(/\.hero-card::before \{[^}]*opacity: 0;/);
    expect(css).toMatch(/\.hero-card\.is-turning::before \{ animation: hero-sheen [\d.]+s/);
    // The class is held for as long as the light takes to cross, and no longer.
    expect(home).toMatch(/const SHEEN_MS = \d+;/);
    expect(home).toMatch(/settle = setTimeout\(\(\) => setTurning\(false\), SHEEN_MS\);/);
    expect(home).toContain("turning ? 'hero-card is-turning' : 'hero-card'");
  });

  it('dissolves slowly and never stops moving, so nothing switches', () => {
    // A second-long fade between still pictures is what read as a carousel.
    const fade = Number(css.match(/\.hero-card-slide \{ transition: opacity ([\d.]+)s/)[1]);
    expect(fade).toBeGreaterThanOrEqual(2);
    expect(css).toMatch(/\.hero-card-slide\.is-active \{ animation: hero-drift [\d.]+s ease-in-out infinite alternate; \}/);
    expect(css).not.toMatch(/hero-pan/);
    expect(Number(home.match(/const SLIDE_SECONDS = (\d+);/)[1])).toBeGreaterThanOrEqual(9);
  });

  it('has no dots under it any more', () => {
    expect(home).not.toContain('hero-card-dots');
    expect(css).not.toContain('hero-card-dots');
  });

  it('holds still for a reader who asked for less motion', () => {
    const quiet = css.split('@media (prefers-reduced-motion: reduce)').slice(1).join(' ');
    expect(quiet).toContain('.hero-card.is-turning::before');
    expect(quiet).toContain('.hero-card-slide.is-active');
  });
});

describe('how it works is told the same way on both pages', () => {
  const css = readFileSync(new URL('../src/public/public.css', import.meta.url), 'utf8');
  const home = readFileSync(new URL('../src/public/pages/HomePage.jsx', import.meta.url), 'utf8');
  const journey = readFileSync(new URL('../src/public/components/ProcessJourney.jsx', import.meta.url), 'utf8');

  it('gives the homepage the Why MySOS journey, not a row of its own', () => {
    const markup = render(HomePage, '/mySOS/');
    expect([...markup.matchAll(/class="journey-card"/g)]).toHaveLength(siteContent.process.length);
    expect(markup).toContain('class="journey-steps"');
    expect(markup).toContain('class="process-band"');
    // Both pages draw it from the one component.
    expect(home).toContain("import ProcessJourney from '../components/ProcessJourney';");
    expect(readFileSync(new URL('../src/public/pages/WhyPage.jsx', import.meta.url), 'utf8'))
      .toContain("import ProcessJourney from '../components/ProcessJourney';");
  });

  it('lines the row up on the card being read, so the last step is reachable', () => {
    // The homepage row measured from the left, as if each card had to sit at
    // the edge: five of six were on screen at once, the row had a few hundred
    // pixels to scroll, and steps three onwards could not be reached at all.
    expect(journey).toMatch(/useScrollSteps\(steps\.length, \{ axis: 'x' \}\)/);
    expect(journey).not.toContain("align: 'start'");
    for (const gone of ['home-process-rail', 'home-process-step', 'home-process-track', 'home-process-card']) {
      expect(css, gone).not.toContain(gone);
      expect(home, gone).not.toContain(gone);
    }
  });
});

describe('one column, every page', () => {
  const css = readFileSync(new URL('../src/public/public.css', import.meta.url), 'utf8');

  it('measures every page from the same content width', () => {
    // The quote builder was centred in 1320px, a solution's uses in 1440 and
    // the stories grid in 1314, while their own banners started at the page
    // gutter: at 1920 the column jumped between 80px, 240px and 303px from the
    // left as you moved down or across the site.
    for (const [selector, gone] of [
      ['.request-layout', '1320px'],
      ['.use-cases', '1440px'],
      ['.stories-section', '1314px'],
      ['.use-case-foot', '1260px'],
    ]) {
      const at = css.indexOf(`${selector} {`);
      expect(at, selector).toBeGreaterThan(-1);
      expect(css.slice(at, css.indexOf('}', at)), selector).not.toContain(gone);
    }
  });

  it("fills the rail with a solution's cards rather than centring four of them", () => {
    // Four 290px cards in a 1760px rail left a third of the row empty.
    expect(css).toContain('.use-case-track li { flex: 1 0 290px;');
    // Opened out it is a grid: wrapped, a growing flex row stretched whatever
    // was left on the last line across the whole width.
    expect(css).toMatch(/\.use-case-rail\.is-all \.use-case-track \{[^}]*grid-template-columns: repeat\(auto-fill, minmax\(290px, 1fr\)\)/);
  });
});

describe('the rest of the site moves too, not only the homepage', () => {
  const css = readFileSync(new URL('../src/public/public.css', import.meta.url), 'utf8');
  const products = readFileSync(new URL('../src/public/pages/ProductsPage.jsx', import.meta.url), 'utf8');
  const hub = readFileSync(new URL('../src/public/pages/ResourcesPage.jsx', import.meta.url), 'utf8');
  const stories = readFileSync(new URL('../src/public/pages/StoriesPage.jsx', import.meta.url), 'utf8');

  it('never lets the banner picture sit perfectly still', () => {
    // The homepage card has drifted since it was built; every other page's
    // band was a photograph nailed to the wall.
    expect(css).toMatch(/@keyframes band-drift \{/);
    expect(css).toMatch(/\.hero-scene > \.scene,[\s\S]{0,160}animation: band-drift [\d.]+s/);
    // On its own frame, not on the picture: the arrival already animates the
    // picture and the two would fight over the same property.
    expect(css).not.toMatch(/\.hero-scene \.scene img \{[^}]*animation: band-drift/);
    // And the frame clips it, so nothing grows past the band.
    expect(css).toMatch(/\.hero-scene, \.story-hero-bg, \.solution-collage-tile \{ overflow: hidden; \}/);
    // Four pictures at once start at four points in the drift.
    for (const tile of ['tile-2', 'tile-3', 'tile-4']) {
      const at = css.indexOf(`.solution-collage-tile.${tile} > .scene {`);
      expect(at, tile).toBeGreaterThan(-1);
      expect(css.slice(at, css.indexOf('}', at)), tile).toContain('animation-delay: -');
    }
  });

  it('deals the cards again when you change what they are showing', () => {
    // Filtering used to swap the cards in place, which read as the page
    // twitching. A new key remounts the list, so it arrives as it first did.
    expect(products).toContain('key={`${activeCategory.id}-${subcategory}-${sort}-${showAll}`}');
    // Not the search box, though: re-dealing on every letter is a flicker.
    expect(products).not.toMatch(/key=\{`[^`]*\$\{query\}/);
    expect(hub).toContain('key={`lead-${topic}`}');
    expect(hub).toContain('key={`grid-${topic}`}');
    expect(stories).toContain('key={`page-${current}`}');
  });

  it('lets the closing band catch the light, and gives under a finger', () => {
    expect(css).toMatch(/@keyframes band-sheen \{/);
    expect(css).toMatch(/\.page-cta::after, \.home-closing::after \{/);
    // It rests for most of its cycle rather than sweeping continuously.
    expect(css).toMatch(/0%, 6\d% \{ left: -40%; opacity: 0; \}/);
    expect(css).toMatch(/\.btn:active, [\s\S]{0,200}transform: translateY\(1px\) scale\(\.985\)/);
  });

  it('holds all of it still for a reader who asked for less motion', () => {
    const quiet = css.split('@media (prefers-reduced-motion: reduce)').slice(1).join(' ');
    for (const stopped of ['band-drift', 'band-sheen', '.btn:active', '.benefit-grid article:hover .icon']) {
      expect(quiet, stopped).toContain(stopped);
    }
  });
});

describe('the footer the client drew', () => {
  const shell = readFileSync(new URL('../src/public/components/SiteShell.jsx', import.meta.url), 'utf8');
  const css = readFileSync(new URL('../src/public/public.css', import.meta.url), 'utf8');

  it('stands on the page’s own paper rather than a navy slab', () => {
    // Not the `.site-app > .site-footer` clip rule earlier in the file.
    const at = css.indexOf('.site-footer { background');
    const rule = css.slice(at, css.indexOf('}', at));
    expect(rule).toContain('background: var(--paper)');
    expect(rule).toContain('border-top: 1px solid var(--line)');
  });

  it('gathers every way to reach MySOS in the last column', () => {
    expect(shell).toContain('className="footer-reach"');
    expect(shell).toContain('href={`tel:');
    expect(shell).toContain('href={`mailto:${siteConfig.email}`}');
    expect(shell).toContain('className="btn btn-primary footer-whatsapp"');
    // Written against `.footer-grid a`, which makes every footer link a block:
    // unscoped, the marks sat on one line and their words on the next.
    expect(css).toContain('.footer-grid .footer-contact {');
    expect(css).toContain('.footer-grid .footer-whatsapp {');
  });

  it('drops the three links that all went to the home page', () => {
    // Privacy Policy, Terms & Conditions and Refund Policy each pointed at
    // "/mySOS/", so all three were dead. The design has no room for them.
    expect(shell).not.toContain('legalLinks');
    expect(JSON.stringify(siteContent.footer)).not.toContain('legalLinks');
  });

  it('says what MySOS is under the wordmark', () => {
    expect(shell).toContain("footerText('tagline'");
    expect(shell).toContain("footerText('taglineNote'");
    expect(siteContent.footer.tagline).toMatch(/\S/);
    expect(siteContent.footer.taglineNote).toMatch(/\S/);
  });
});
