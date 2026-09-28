import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/*
 * Every page opens with the same banner.
 *
 * The homepage was rebuilt from the client's concept — a small spaced line, a
 * very large headline whose second half is green, one sentence, somewhere to
 * go, and the picture beside it as a tall rounded card. The other pages kept
 * an older, flatter banner, and the site read as several designers' work.
 * These tests hold the one banner in place.
 */

const css = readFileSync(new URL('../src/public/public.css', import.meta.url), 'utf8');
const page = (name) => readFileSync(new URL(`../src/public/pages/${name}.jsx`, import.meta.url), 'utf8');

// What a reader actually gets: where two rules have the same weight the later
// one wins, so the last block written for a selector is the one to check.
const lastRule = (selector) => {
  const marker = `${selector} {`;
  const at = css.lastIndexOf(marker);
  expect(at, `no rule for ${selector}`).toBeGreaterThan(-1);
  return css.slice(at + marker.length, css.indexOf('}', at));
};

// Everything written for a selector, wherever it sits — a rule inside a media
// query is still that selector's.
const rulesFor = (selector) => {
  const marker = `${selector} {`;
  const found = [];
  for (let at = css.indexOf(marker); at > -1; at = css.indexOf(marker, at + 1)) {
    found.push(css.slice(at + marker.length, css.indexOf('}', at)));
  }
  expect(found.length, `no rule for ${selector}`).toBeGreaterThan(0);
  return found.join(' ');
};

// A rule written across several selector lines, found from the first of them.
const ruleFrom = (selector) => {
  const band = css.indexOf('One band, every page');
  const at = css.indexOf(selector, band);
  expect(at, selector).toBeGreaterThan(-1);
  return css.slice(at, css.indexOf('}', at));
};

const HOME_TITLE = 'clamp(44px, 5.4vw, 78px)';

describe('one band at the top of every page', () => {
  it('writes the headline at the same size everywhere', () => {
    expect(lastRule('.home-hero h1')).toContain(HOME_TITLE);
    // Products, solutions, stories, why and the quote page used to top out at
    // 55px, which read as a subheading beside the homepage.
    expect(lastRule('.hero-compact h1')).toContain(HOME_TITLE);
    expect(lastRule('.hero-stories h1')).toContain(HOME_TITLE);
    expect(lastRule('.solution-hero-copy h1')).toContain(HOME_TITLE);
  });

  it('draws one band, in one colour, on every page but the homepage', () => {
    // The homepage keeps the client's own banner — a wash on paper with the
    // picture beside it as a card. Everything else is the band from the
    // category design: flat blue, the picture off the right edge.
    expect(ruleFrom('.hero:not(.has-background),')).toContain('background: #dcebfa');
    expect(rulesFor('.story-hero')).toContain('background: #dcebfa');
    expect(rulesFor('.home-hero')).toContain('radial-gradient');
  });

  it('measures the words from the band, so they line up with the sections', () => {
    // The category banner padded its own column, which is a share of the band
    // rather than the band: the words started 24px in where every other page
    // started at 104px.
    expect(css).toMatch(/--gutter: max\(24px, calc\(\(100% - var\(--content\)\) \/ 2 \+ 24px\)\);/);
    const inner = ruleFrom('.hero:not(.has-background) .hero-inner,');
    expect(inner).toContain('padding: 0 0 0 var(--gutter)');
    expect(rulesFor('.story-hero')).toContain('padding: 0 0 0 var(--gutter)');
  });

  it('lets the words decide how tall the band is, and the picture fill it', () => {
    // Left in the flow, a tall drawing decided for itself: the stories banner
    // came out 1065px high against 508 for the others.
    const picture = rulesFor('.hero-scene, .solution-collage, .story-hero-bg');
    expect(picture).toContain('position: relative');
    expect(picture).toContain('height: auto');
    expect(rulesFor('.hero-scene > .scene, .story-hero-bg > .scene')).toContain('position: absolute');
    // And no band is thinner than another by much.
    const inner = ruleFrom('.hero:not(.has-background) .hero-inner,');
    expect(inner).toContain('min-height: 440px');
  });

  it('reads the quote page breadcrumb on the band', () => {
    expect(lastRule('.request-page .hero:not(.has-background) .breadcrumb')).toContain('color: var(--muted)');
  });

  it('drops the picture under the words on a narrow screen', () => {
    const at = css.indexOf('@media (max-width: 980px)', css.indexOf('The band on a narrow screen'));
    const block = css.slice(at, css.indexOf('\n}', at));
    for (const selector of ['.hero:not(.has-background) .hero-inner', '.solution-hero-inner', '.story-hero']) {
      expect(block, selector).toContain(selector);
    }
    expect(block).toContain('grid-template-columns: minmax(0, 1fr)');
    // The picture needs a height of its own once nothing sits beside it.
    expect(block).toMatch(/\.hero-scene, \.solution-collage, \.story-hero-bg \{ min-height: \d+px; \}/);
  });
});


describe('every banner says the same things in the same order', () => {
  // The products banner leads with the category being shown, so the line above
  // its title is the client's own page headline rather than a heading key; it
  // has a test of its own.
  const banners = [
    ['SolutionsPage', 'heroEyebrow', 'heroExploreButton'],
    ['StoriesPage', 'heroEyebrow', 'heroExploreButton'],
    ['WhyPage', 'heroEyebrow', 'viewAllStoriesButton'],
  ];

  it.each(banners)('%s: a line above the title, then the way on', (name, eyebrow, onward) => {
    const source = page(name);
    expect(source).toContain(`className="eyebrow" data-reveal data-cms-path={cms(headingPath('${eyebrow}'))}`);
    expect(source).toContain('<div className="hero-actions" data-reveal');
    expect(source).toContain('<QuoteButton showArrow />');
    expect(source).toContain(`label('${onward}'`);
  });

  it('ProductsPage: the category leads, with the page headline above it', () => {
    const source = page('ProductsPage');
    // The category is the title, so the page says what was chosen in the strip.
    expect(source).toContain("<span data-cms-path={cms(categoryPath(activeCategory, 'name'))}>{activeCategory.name}</span>");
    expect(source).toContain("label('categoryTitlePrefix', 'Custom')");
    expect(source).toContain('<nav className="breadcrumb" aria-label="Breadcrumb" data-reveal>');
    expect(source).toContain('<div className="hero-actions" data-reveal');
    expect(source).toContain('<QuoteButton showArrow />');
    expect(source).toContain("label('exploreSolutionsLabel'");
  });

  it('leaves the quote page without a second way to the quote it already is', () => {
    expect(page('RequestPage')).not.toContain('hero-actions');
  });
});

describe('a banner you can see is a banner', () => {
  /*
   * The banner carried the same paper as the page under it, so nothing said
   * where it ended. Sites that lead with one separate it — Stripe with a wash
   * of colour, Printful with a photograph, Custom Ink with a plain edge. The
   * homepage takes a wash and a hairline; every other page takes the flat band,
   * which is its own edge.
   */
  // The homepage's own banner, read from the comment that introduces it: the
  // plain `.home-hero { background: var(--paper) }` written earlier is the one
  // this replaces.
  const ruleAfter = (marker) => {
    const from = css.indexOf("The homepage keeps the client's own banner");
    expect(from, 'the homepage banner').toBeGreaterThan(-1);
    const at = css.indexOf(marker, from);
    expect(at, marker).toBeGreaterThan(-1);
    return css.slice(at, css.indexOf('}', at));
  };

  it('washes the homepage banner in colour that fades into the page', () => {
    const wash = ruleAfter('.home-hero {');
    expect(wash).toContain('radial-gradient');
    expect(wash).toMatch(/linear-gradient\(180deg, #[0-9a-f]{6} 0%, var\(--paper\)/);
  });

  it('marks where it stops, and lets the line fade out at both ends', () => {
    const edge = ruleAfter('.home-hero::before {');
    expect(edge).toContain('bottom: 0');
    expect(edge).toMatch(/linear-gradient\(90deg, transparent, var\(--line\)/);
  });

  it('leaves the wash and the hairline to the homepage alone', () => {
    // The inner pages' band is a solid colour against the paper below it, so a
    // second wash over it only muddied the edge.
    expect(css).not.toContain('.hero:not(.has-background),\r\n.home-hero,');
    expect(css).not.toContain('.hero:not(.has-background)::before,\r\n.home-hero::before,');
  });
});
