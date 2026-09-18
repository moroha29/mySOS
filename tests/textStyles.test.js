import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { stylesForPage } from '../src/public/textStyles';

/*
 * Text styles from the website manager reach the live site.
 *
 * They were published into siteContent.json and never read. The page a style
 * belongs to is matched here; applying them to the page is checked in a real
 * browser against the built site (see the website-manager repository).
 */

const hero = { page: 'homepage', selector: "[data-cms-path='[\"homepage\",\"headings\",\"heroTitle\"]']", fontScale: 1.25 };

describe('which page a style belongs to', () => {
  it('a style names its exact page when it has one', () => {
    const schools = { ...hero, page: 'solutions', route: '/mySOS/solutions/schools/' };
    expect(stylesForPage([schools], '/mySOS/solutions/schools/')).toEqual([schools]);
    expect(stylesForPage([schools], '/mySOS/solutions/schools')).toEqual([schools]);
    expect(stylesForPage([schools], '/mySOS/solutions/')).toEqual([]);
    expect(stylesForPage([schools], '/mySOS/solutions/churches/')).toEqual([]);
  });

  it('an older style without one belongs to its named page', () => {
    expect(stylesForPage([hero], '/mySOS/')).toEqual([hero]);
    expect(stylesForPage([hero], '/mySOS')).toEqual([hero]);
    expect(stylesForPage([hero], '/mySOS/products/')).toEqual([]);
    const why = { ...hero, page: 'why-mysos' };
    expect(stylesForPage([why], '/mySOS/why-mysos/')).toEqual([why]);
  });

  it('nothing set, nothing applied', () => {
    expect(stylesForPage(undefined, '/mySOS/')).toEqual([]);
    expect(stylesForPage([null, { page: 'homepage' }], '/mySOS/')).toEqual([]);
  });
});

describe('the site applies them', () => {
  const app = readFileSync(new URL('../src/public/PublicApp.jsx', import.meta.url), 'utf8');
  const module = readFileSync(new URL('../src/public/textStyles.js', import.meta.url), 'utf8');

  it('on every page', () => {
    expect(app).toMatch(/useEffect\(\(\) => watchTextStyles\(\), \[\]\);/);
  });

  it('only the choices the manager offers', () => {
    expect(module).toMatch(/const FONT_SCALES = new Set\(\[0\.9, 1\.1, 1\.25, 1\.5\]\);/);
    expect(module).toMatch(/const COLOUR = \/\^#\[0-9a-f\]\{6\}\$\/i;/);
  });

  it('but not inside the manager\'s preview, which shows the draft\'s own', () => {
    expect(module).toMatch(/root\.documentElement\.hasAttribute\('data-manager-preview'\)/);
  });
});
