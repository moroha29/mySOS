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

describe('page order: reviews sit directly under the banner', () => {
  it('home: under the client logos, which sit right below the banner', () => {
    const markup = render(HomePage, '/mySOS/');
    const banner = markup.indexOf('Custom Merchandise,');
    const reviews = markup.indexOf('class="section reviews"');
    const logos = markup.indexOf('class="trust-strip"');
    expect(banner).toBeGreaterThan(-1);
    expect(logos).toBeGreaterThan(banner);
    expect(reviews).toBeGreaterThan(logos);
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

describe('the home banner and the grids under it', () => {
  const css = readFileSync(new URL('../src/public/public.css', import.meta.url), 'utf8');
  const home = readFileSync(new URL('../src/public/pages/HomePage.jsx', import.meta.url), 'utf8');

  it('runs a slideshow behind the banner, starting on a picture the server drew', () => {
    const markup = render(HomePage, '/mySOS/');
    const slides = [...markup.matchAll(/class="hero-slide( is-active)?"/g)];
    expect(slides.length).toBeGreaterThan(1);
    expect(slides.filter(([, active]) => active)).toHaveLength(1);
    // The scrim goes over it, as with any banner picture, so white text reads.
    expect(markup).toMatch(/class="hero hero-home has-background"/);
    expect(home).toMatch(/setInterval\(\(\) => setShown\(\(current\) => \(current \+ 1\) % slides\.length\)/);
    expect(home).toMatch(/prefers-reduced-motion: reduce/);
    expect(css).toMatch(/\.hero-slide \{[^}]*opacity: 0; transition: opacity/);
    expect(css).toMatch(/\.hero-home \.hero-inner \{ min-height: 560px;/);
  });

  it('leaves the photograph to carry the banner, with no drawn products on it', () => {
    // The tote, jerseys and bottle were drawn over what is now a photograph.
    const markup = render(HomePage, '/mySOS/');
    expect(markup).not.toContain('class="hero-art"');
    expect(markup).not.toMatch(/class="[^"]*ha-[1-5]/);
    expect(markup).toContain('hero-inner hero-inner-wide');
    // A picture uploaded in the manager still shows beside the words.
    expect(readFileSync(new URL('../src/public/pages/HomePage.jsx', import.meta.url), 'utf8'))
      .toMatch(/\{heroShot && <div className="hero-art"/);
  });

  it('lets the manager choose the slideshow pictures', () => {
    expect(siteContent.scenes.homeHeroSlides).toBeInstanceOf(Array);
    const markup = render(HomePage, '/mySOS/');
    expect(markup).toContain('data-cms-path="[&quot;homepage&quot;,&quot;scenes&quot;,&quot;homeHeroSlides&quot;,0]"');
  });

  it('measures the logo marquee against the width the stylesheet uses', () => {
    // The track slides exactly -50%, so a card width that disagrees with the
    // CSS makes the marquee drift or race.
    const width = Number(css.match(/\.trust-logo \{[^}]*width: (\d+)px/)[1]);
    expect(Number(home.match(/const CARD_WIDTH = (\d+);/)[1])).toBe(width);
  });

  it('gives "What can we make for you?" three across, two on a phone', () => {
    expect(css).toMatch(/\.category-grid \{ display: grid; grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/);
    const phone = css.slice(css.indexOf('@media (max-width: 620px)'));
    expect(phone).toMatch(/\.category-grid \{ grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
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

  it('never drops text below 12.5px, however small the scale gets', () => {
    const sizes = [...css.matchAll(/font-size: ([\d.]+)px/g)].map(([, size]) => Number(size));
    expect(Math.min(...sizes)).toBeGreaterThanOrEqual(12.5);
  });

  it('runs the page wider than it used to, halving the side margins', () => {
    expect(sizeOf(/--content: (\d+)px;/)).toBe(1340);
    expect(sizeOf(/\.site-app \{ width: min\(100%, (\d+)px\)/)).toBe(1700);
  });
});
