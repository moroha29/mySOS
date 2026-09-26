import React from 'react';
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import Icon, { iconGlyphs, isIconPicture } from '../src/public/components/Icons';
import { buildIconLibrary, iconLibraryJson } from '../scripts/iconLibrary.mjs';
import siteContent from '../src/data/siteContent.json';
import solutions from '../src/data/solutions.json';
import successStories from '../src/data/successStories.json';
import HomePage from '../src/public/pages/HomePage';
import WhyPage from '../src/public/pages/WhyPage';

/*
 * Icons the website manager can change.
 *
 * The manager offers the icons in src/data/iconLibrary.json as choices, so the
 * file must list exactly what Icons.jsx draws, and every icon on the page must
 * carry the content path of the field that names it.
 */

const source = readFileSync(new URL('../src/public/components/Icons.jsx', import.meta.url), 'utf8');
const committed = readFileSync(new URL('../src/data/iconLibrary.json', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const render = (glyph) => renderToStaticMarkup(<svg>{glyph}</svg>).replace(/^<svg>|<\/svg>$/g, '');
const library = JSON.parse(committed);
const offered = new Set(library.icons.map((icon) => icon.name));

const originalLocation = globalThis.location;
afterEach(() => {
  if (originalLocation === undefined) delete globalThis.location;
  else globalThis.location = originalLocation;
});
const renderAt = (pathname, Page) => {
  globalThis.location = { pathname, search: '' };
  return renderToStaticMarkup(<Page />);
};

describe('the icon library', () => {
  it('matches Icons.jsx (run `npm run icons` after changing an icon)', () => {
    expect(iconLibraryJson(buildIconLibrary({ glyphs: iconGlyphs, source, render }))).toBe(committed);
  });

  it('offers every icon the content uses', () => {
    const used = [
      ...siteContent.benefits.flatMap((item) => [item.icon, item.cardIcon]),
      ...siteContent.categories.map((item) => item.icon),
      ...(siteContent.loyalty ?? []).map((item) => item.icon),
      ...siteContent.process.flatMap((step) => (step.points ?? []).map((point) => point.icon)),
      ...solutions.flatMap((solution) => [solution.icon, ...solution.useCases.map((useCase) => useCase.icon)]),
      ...successStories.flatMap((story) => (story.highlights ?? []).map((fact) => fact.icon)),
    ].filter(Boolean);
    // A picture uploaded in the manager stands in for an icon; every icon named must exist.
    for (const name of used.filter((value) => !isIconPicture(value))) expect(offered.has(name), name).toBe(true);
  });

  it('leaves out arrows, controls and other companies\' marks', () => {
    for (const name of ['arrowRight', 'chevronDown', 'close', 'whatsapp', 'google', 'facebook']) {
      expect(offered.has(name), name).toBe(false);
    }
  });
});

describe('a solution has an icon of its own', () => {
  it('is one the library offers, or a picture uploaded in its place', () => {
    for (const solution of solutions) expect(offered.has(solution.icon) || isIconPicture(solution.icon), solution.id).toBe(true);
  });
});

describe('an uploaded picture can stand in for an icon', () => {
  it('is drawn as a picture, fitted to the icon\'s size', () => {
    const html = renderToStaticMarkup(<Icon name="/mySOS/assets/uploads/award-3f9c2a11.png" size={30} cmsPath={['homepage', 'benefits', 0, 'icon']} />);
    expect(html).toMatch(/^<img class="icon icon-picture" src="\/mySOS\/assets\/uploads\/award-3f9c2a11.png" width="30" height="30" alt=""/);
    expect(html).toContain('data-cms-icon="true"');
  });

  it('tells a picture from an icon name', () => {
    expect(isIconPicture('school')).toBe(false);
    expect(isIconPicture('/mySOS/assets/uploads/a.png')).toBe(true);
    expect(isIconPicture('https://example.com/a.webp')).toBe(true);
  });
});

describe('icons on the page carry their content path', () => {
  it('on the home page', () => {
    const html = renderAt('/mySOS/', HomePage);
    // The reasons in the navy band, and the icon on every product tile.
    expect(html).toMatch(/data-cms-path="\[&quot;homepage&quot;,&quot;benefits&quot;,0,&quot;(?:cardIcon|icon)&quot;\]" data-cms-icon="true"/);
    expect(html).toContain('data-cms-path="[&quot;homepage&quot;,&quot;categories&quot;,0,&quot;icon&quot;]" data-cms-icon="true"');
  });

  it('on the Why MySOS page', () => {
    const html = renderAt('/mySOS/why-mysos/', WhyPage);
    expect(html).toMatch(/data-cms-path="\[&quot;homepage&quot;,&quot;benefits&quot;,0,&quot;(?:cardIcon|icon)&quot;\]" data-cms-icon="true"/);
    expect(html).toContain('data-cms-path="[&quot;homepage&quot;,&quot;process&quot;,0,&quot;points&quot;,0,&quot;icon&quot;]" data-cms-icon="true"');
  });

  it('only where asked: interface icons stay unmarked', () => {
    expect(renderToStaticMarkup(<Icon name="arrowRight" />)).not.toContain('data-cms-icon');
  });
});
