import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync(new URL('../src/public/public.css', import.meta.url), 'utf8');

const mediaBlock = (query) => {
  const start = css.indexOf(`@media (${query}) {`);
  if (start < 0) return '';
  let depth = 0;
  for (let i = css.indexOf('{', start); i < css.length; i += 1) {
    if (css[i] === '{') depth += 1;
    if (css[i] === '}') { depth -= 1; if (depth === 0) return css.slice(start, i + 1); }
  }
  return '';
};

describe('header layout', () => {
  it('never lets the logo shrink', () => {
    // Measured before the fix: 142px wide at 1024px, 18px at 900px, 0px at 861px.
    expect(css).toMatch(/\.site-logo \{[^}]*flex: none;/);
  });

  it('folds the menu into the ☰ button below 1080px, before the links can crowd the logo', () => {
    const tablet = css.slice(css.indexOf('/* The menu folds into the ☰ button below 1080px.'));
    const block = tablet.slice(0, tablet.indexOf('@media (max-width: 860px)'));
    expect(block).toMatch(/\.menu-toggle \{ display: flex;/);
    expect(block).toMatch(/\.primary-nav \{[^}]*position: absolute;[^}]*display: none;/);
    expect(block).toMatch(/\.primary-nav\.is-open \{ display: flex; \}/);
    // The quote buttons stay visible until phone width.
    expect(block).not.toMatch(/\.header-actions \{ display: none; \}/);
  });

  it('moves the quote buttons into the menu only on phones', () => {
    const phone = mediaBlock('max-width: 860px');
    expect(phone).toMatch(/\.header-actions \{ display: none; \}/);
    expect(phone).toMatch(/\.mobile-quote \{ display: inline-flex;/);
    expect(phone).not.toMatch(/\.primary-nav \{/);
  });
});
