import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/*
 * From an audit of every page at 360, 390, 768 and 1024px wide. Nothing
 * scrolled sideways, but tap targets were tiny and some columns were too
 * narrow to read. These hold the fixes in place.
 */
const css = readFileSync(new URL('../src/public/public.css', import.meta.url), 'utf8');
// Everything written at a width, however many blocks it is written in: a
// feature keeps its own rules together rather than reaching back up the file.
const block = (query) => {
  const marker = `@media (${query}) {`;
  const found = [];
  for (let start = css.indexOf(marker); start > -1; start = css.indexOf(marker, start + 1)) {
    let depth = 0;
    for (let i = css.indexOf('{', start); i < css.length; i += 1) {
      if (css[i] === '{') depth += 1;
      if (css[i] === '}') { depth -= 1; if (depth === 0) { found.push(css.slice(start, i + 1)); break; } }
    }
  }
  return found.join(' ');
};

describe('phones', () => {
  it('stack the stories reviews row instead of squeezing the heading beside the link', () => {
    const phone = block('max-width: 720px');
    expect(phone).toMatch(/\.stories-reviews \{ grid-template-columns: minmax\(0, 1fr\);/);
    expect(phone).toMatch(/\.stories-reviews-actions \{ grid-column: 1; grid-row: 3;/);
    expect(phone).toMatch(/\.stories-reviews-summary h2 \{ white-space: normal;/);
  });

  it('let the apparel filter scroll sideways, each tab keeping its width', () => {
    expect(css).toMatch(/\.tab-list button \{ flex: none; min-width: 44px;[^}]*white-space: nowrap; \}/);
    expect(block('max-width: 720px')).toMatch(/\.tab-list \{ justify-content: flex-start;[^}]*overflow-x: auto;/);
  });

  it('show one review at a time with the next peeking in', () => {
    const phone = block('max-width: 620px');
    expect(phone).toMatch(/\.review-card \{ flex-basis: 86%; \}/);
    expect(phone).toMatch(/\.story-meta \{ display: grid; grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);/);
  });

  it('give story, solution and reason cards the full width', () => {
    const narrow = block('max-width: 480px');
    expect(narrow).toMatch(/\.story-grid, \.story-grid-3, \.solution-grid \{ grid-template-columns: minmax\(0, 1fr\); \}/);
    expect(narrow).toMatch(/\.benefit-grid \{ grid-template-columns: minmax\(0, 1fr\); \}/);
  });
});

describe('touch targets', () => {
  it('grow without moving anything', () => {
    expect(css).toMatch(/\.text-link, \.stories-reviews-link \{ padding-block: 8px; margin-block: -8px; \}/);
    expect(css).toMatch(/\.breadcrumb a \{ padding-block: 10px; margin-block: -10px; \}/);
    expect(css).toMatch(/\.story-card-body h3 a, \.footer-legal a \{ display: inline-block; padding-block: 7px; margin-block: -7px; \}/);
    expect(css).toMatch(/\.review-source \{ width: 36px; height: 36px; margin: -10px; \}/);
  });

  it('reach past the small carousel dots', () => {
    expect(css).toMatch(/\.projects-dots button::before, \.use-case-dots button::before \{ content: ""; position: absolute; inset: -14px; \}/);
  });

  it('space the footer links on phones and on any touch screen', () => {
    expect(block('max-width: 860px), (pointer: coarse')).toMatch(/\.footer-grid a \{ padding: 9px 0; \}/);
  });
});

describe('the solution pages breadcrumb', () => {
  it('is styled inside its banner only, leaving the story pages’ breadcrumb alone', () => {
    expect(css).not.toMatch(/^\.breadcrumb \{ display: flex; align-items: center; gap: 8px; margin-bottom: 30px;/m);
    expect(css).toMatch(/^\.solution-hero \.breadcrumb \{/m);
  });
});

describe('walked down every page at 390px', () => {
  it('gives a section head the whole width before its sentence', () => {
    // Held as two columns, "Four things customers should understand
    // immediately about working with MySOS." broke a word at a time down a
    // column a third of the screen wide.
    const phone = block('max-width: 860px');
    expect(phone).toMatch(/\.home-tiles-head, \.home-why-head \{ grid-template-columns: minmax\(0, 1fr\);/);
  });

  it('wraps the kinds within a category instead of running them off the edge', () => {
    expect(css).toMatch(/\.type-row \{[^}]*flex-wrap: wrap;/);
    expect(block('max-width: 860px')).toMatch(/\.type-row button \{[^}]*font-size: 16px; \}/);
  });

  it('keeps two product tiles to a row, as the client asked', () => {
    expect(block('max-width: 620px')).toMatch(/\.home-tile-grid \{ grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);/);
  });
});

describe('a second pass on a phone, at 320 as well as 390', () => {
  const article = readFileSync(new URL('../src/public/pages/ArticlePage.jsx', import.meta.url), 'utf8');

  it('stacks a guide’s table rather than hiding a column off the side of it', () => {
    // Three columns is 520px of table in a 342px column, so it scrolled inside
    // its own box with nothing to say so: the guide comparing DTF with
    // silkscreen showed DTF and hid silkscreen completely.
    expect(article).toContain('data-label={article.table.columns[cell_index]}');
    const narrow = block('max-width: 620px');
    expect(narrow).toContain('.article-table table { min-width: 0; }');
    expect(narrow).toMatch(/\.article-table thead \{[^}]*clip-path: inset\(50%\)/);
    expect(narrow).toMatch(/\.article-table td::before \{[\s\S]*?content: attr\(data-label\)/);
    // And it is still a table on a screen with room for one.
    expect(css).toContain('.article-table table { width: 100%; min-width: 520px;');
  });

  it('keeps the menu button a fingertip wide however narrow the screen is', () => {
    // The header's row shrank it: at 320px the one control every page depends
    // on measured 24px across.
    const rule = css.slice(css.indexOf('.menu-toggle {'), css.indexOf('}', css.indexOf('.menu-toggle {')));
    expect(rule).toContain('flex: none');
    expect(rule).toContain('width: 44px');
    expect(rule).toContain('height: 44px');
  });

  it('fits the words inside the button on a suggested product', () => {
    // In a 153px card "Add to quote" was 7px wider than the button holding it.
    const narrow = block('max-width: 620px');
    expect(narrow).toMatch(/\.hero-results li \.btn \{[^}]*padding-inline: 10px/);
  });
});
