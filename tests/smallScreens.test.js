import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/*
 * From an audit of every page at 360, 390, 768 and 1024px wide. Nothing
 * scrolled sideways, but tap targets were tiny and some columns were too
 * narrow to read. These hold the fixes in place.
 */
const css = readFileSync(new URL('../src/public/public.css', import.meta.url), 'utf8');
const block = (query) => {
  const start = css.lastIndexOf(`@media (${query}) {`);
  if (start < 0) return '';
  let depth = 0;
  for (let i = css.indexOf('{', start); i < css.length; i += 1) {
    if (css[i] === '{') depth += 1;
    if (css[i] === '}') { depth -= 1; if (depth === 0) return css.slice(start, i + 1); }
  }
  return '';
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
