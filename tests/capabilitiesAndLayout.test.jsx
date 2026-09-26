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
      // The wording is the site's own (edited on the Products page), so it is
      // only required to be there, not to match the price list's copy.
      expect(copy.description, method.id).toMatch(/\S/);
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

describe('the home banner and the sections under it', () => {
  const css = readFileSync(new URL('../src/public/public.css', import.meta.url), 'utf8');
  const home = readFileSync(new URL('../src/public/pages/HomePage.jsx', import.meta.url), 'utf8');

  it('keeps the wording the client chose, and sends the answer to the request page', () => {
    const markup = render(HomePage, '/mySOS/');
    // The banner is their own headline and lead, not the concept's stand-in
    // copy, and the search suggestions are their own popular solutions.
    expect(markup).toContain(siteContent.headings.heroTitle);
    expect(markup).toContain(siteContent.headings.heroTitleAccent);
    expect(markup).toContain(siteContent.headings.heroLead);
    expect(markup).not.toContain('Tell us what you need.');
    expect(markup).toContain('class="hero-search"');
    for (const chip of siteContent.heroSearchChips) {
      expect(siteContent.popularSolutions.some((item) => item.name === chip), chip).toBe(true);
      expect(markup).toContain(`/mySOS/request/?ask=${encodeURIComponent(chip)}`);
    }
    expect(markup).toMatch(/class="btn btn-primary" href="\/mySOS\/request\/"/);
    expect(home).toMatch(/const askHref = \(text\) => `\$\{REQUEST_PATH\}\?ask=\$\{encodeURIComponent\(text\)\}`/);
  });

  it('runs the banner picture card as a slideshow, starting on one the server drew', () => {
    const markup = render(HomePage, '/mySOS/');
    const slides = [...markup.matchAll(/class="hero-card-slide( is-active)?"/g)];
    expect(slides.length).toBeGreaterThan(1);
    expect(slides.filter(([, active]) => active)).toHaveLength(1);
    expect(home).toMatch(/setInterval\(\(\) => setShown\(\(current\) => \(current \+ 1\) % slides\.length\)/);
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

  it('titles every section with the heading the client already wrote', () => {
    const markup = render(HomePage, '/mySOS/');
    for (const key of ['categoriesHeading', 'benefitsHeading', 'storiesHeading', 'processHeading', 'closingCtaTitle']) {
      expect(markup, key).toContain(siteContent.headings[key]);
    }
    // The concept's own headings are gone from the content altogether.
    for (const key of ['homeWhyHeading', 'homeWorkHeading', 'homeProcessHeading', 'heroTitleLead']) {
      expect(siteContent.headings, key).not.toHaveProperty(key);
    }
    // The four promises are the ones they list, nothing invented about them.
    expect(siteContent.homeStats.map((stat) => stat.value)).toEqual(siteContent.heroPromises);
  });

  it('sets the page in the typeface the concept uses', () => {
    // The headlines read differently in Inter; DM Sans is what the design uses.
    expect(css).toMatch(/fonts\.googleapis\.com\/css2\?family=DM\+Sans/);
    expect(css).toMatch(/font-family: 'DM Sans', Inter,/);
  });

  it('gives each promise a mark of its own, not a stray glyph', () => {
    // The row opened with a drawn infinity sign, which read as a typo.
    const markup = render(HomePage, '/mySOS/');
    expect(markup).not.toContain('∞');
    expect([...markup.matchAll(/class="home-stat-icon"/g)]).toHaveLength(siteContent.homeStats.length);
    for (const stat of siteContent.homeStats) expect(stat.icon, stat.value).toBeTruthy();
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
    expect(markup).toContain('class="home-process-step"');
  });
});

describe('the type scale: titles carry the page', () => {
  const css = readFileSync(new URL('../src/public/public.css', import.meta.url), 'utf8');
  const sizeOf = (pattern) => Number(css.match(pattern)[1]);

  it('sets titles above the text around them', () => {
    expect(sizeOf(/\.hero h1 \{ font-size: ([\d.]+)px/)).toBeGreaterThanOrEqual(50);
    expect(sizeOf(/\.section-heading h2 \{ font-size: ([\d.]+)px/)).toBeGreaterThanOrEqual(34);
    expect(sizeOf(/\.hero-lead \{[^}]*font-size: ([\d.]+)px/)).toBeLessThanOrEqual(16);
    expect(sizeOf(/\.section-heading p \{[^}]*font-size: ([\d.]+)px/))
      .toBeLessThan(sizeOf(/\.section-heading h2 \{ font-size: ([\d.]+)px/));
  });

  it('never drops readable text below 13.5px, however small the scale gets', () => {
    expect(Math.min(...readingSizes(css))).toBeGreaterThanOrEqual(13.5);
  });

  it('runs the page wider than it used to, halving the side margins', () => {
    expect(sizeOf(/--content: (\d+)px;/)).toBe(1340);
    expect(sizeOf(/\.site-app \{ width: min\(100%, (\d+)px\)/)).toBe(1700);
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
    for (const rule of [/\.primary-nav \{[\s\S]{0,200}?top: var\(--header-h\)/, /scroll-padding-top: var\(--header-h\)/, /scroll-margin-top: var\(--header-h\)/]) {
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
