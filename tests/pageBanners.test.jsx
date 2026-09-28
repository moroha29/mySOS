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

const HOME_TITLE = 'clamp(44px, 5.4vw, 78px)';

describe('every page opens with the homepage banner', () => {
  it('writes the headline at the homepage size', () => {
    expect(lastRule('.home-hero h1')).toContain(HOME_TITLE);
    // The compact banner — products, solutions, stories, why, the quote page —
    // used to top out at 55px, which read as a subheading beside the homepage.
    expect(lastRule('.hero-compact h1')).toContain(HOME_TITLE);
    expect(lastRule('.hero-stories h1')).toContain(HOME_TITLE);
    expect(lastRule('.solution-hero-copy h1')).toContain(HOME_TITLE);
  });

  it('sets the picture in the same card as the homepage slideshow', () => {
    const shadow = rulesFor('.hero-card').match(/box-shadow: ([^;]+);/)[1];
    for (const picture of ['.hero-scene', '.story-hero-bg']) {
      expect(rulesFor(picture), picture).toContain(shadow);
    }
    // The deep corner is written once, for all the banner pictures together.
    const shared = '.hero-scene, .hero-stories .hero-collage, .solution-collage';
    expect(rulesFor(shared)).toContain('border-radius: 26px');
    expect(rulesFor('.story-hero-bg')).toContain('border-radius: 26px');
  });

  it('puts a story on paper rather than behind a navy scrim', () => {
    // It was the last banner with white type over a darkened photograph.
    expect(rulesFor('.story-hero')).toContain('background: var(--paper)');
    // And paper is written after the navy, so it is what a reader is given.
    expect(css.indexOf('background: var(--paper); color: var(--ink); overflow: visible;'))
      .toBeGreaterThan(css.indexOf('linear-gradient(103deg'));
    expect(rulesFor('.story-hero::after')).toContain('display: none');
    expect(rulesFor('.story-hero-inner')).toContain('order: 1');
    expect(rulesFor('.story-hero-bg')).toContain('order: 2');
  });

  it('reads the quote page breadcrumb on paper, where it had all but vanished', () => {
    expect(lastRule('.request-page .hero:not(.has-background) .breadcrumb')).toContain('color: var(--muted)');
  });

  it('drops the picture under the words on a narrow screen', () => {
    // The two-column banner outranked the old mobile rule, and a headline was
    // left a word wide on a phone.
    // The banners' own block, not whichever page added one last.
    const at = css.indexOf('@media (max-width: 980px)', css.indexOf('25. the same banner'));
    const block = css.slice(at, css.indexOf('\n}', at));
    for (const selector of ['.hero-compact .hero-inner', '.hero-stories .hero-inner', '.story-hero']) {
      expect(block, selector).toContain(selector);
    }
    expect(block).toContain('grid-template-columns: minmax(0, 1fr)');
  });

  it('holds the banner still for a reader who asked for less motion', () => {
    const quiet = css.split('@media (prefers-reduced-motion: reduce)').slice(1).join(' ');
    for (const drifting of ['.hero-scene', '.solution-collage', '.hero-stories .hero-collage']) {
      expect(quiet, drifting).toContain(drifting);
    }
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
   * of colour, Printful with a photograph, Custom Ink with a plain edge. Ours
   * takes a wash and a hairline.
   */
  // The four banners are washed by one rule; a selector spanning lines is
  // read off the file rather than rebuilt here.
  const ruleAfter = (marker) => {
    const at = css.indexOf(marker);
    expect(at, marker).toBeGreaterThan(-1);
    return css.slice(at, css.indexOf('}', at));
  };
  const wash = ruleAfter('.hero:not(.has-background),');

  it('washes every banner in colour that fades into the page', () => {
    expect(wash).toContain('radial-gradient');
    expect(wash).toMatch(/linear-gradient\(180deg, #[0-9a-f]{6} 0%, var\(--paper\)/);
  });

  it('marks where it stops, and lets the line fade out at both ends', () => {
    const edge = ruleAfter('.hero:not(.has-background)::before,');
    expect(edge).toContain('bottom: 0');
    expect(edge).toMatch(/linear-gradient\(90deg, transparent, var\(--line\)/);
  });
});
