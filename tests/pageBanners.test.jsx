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
    const narrow = css.slice(css.lastIndexOf('@media (max-width: 980px)'));
    const block = narrow.slice(0, narrow.indexOf('\n}'));
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
  const banners = [
    ['ProductsPage', 'browseCategoryHeading', 'exploreSolutionsLabel'],
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

  it('leaves the quote page without a second way to the quote it already is', () => {
    expect(page('RequestPage')).not.toContain('hero-actions');
  });
});
