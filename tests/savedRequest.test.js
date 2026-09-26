import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import siteContent from '../src/data/siteContent.json';
import {
  clearSavedRequest, MAX_SAVED_DAYS, mergeArrival, readSavedRequest,
  SAVED_REQUEST_KEY, savedLineCount, writeSavedRequest,
} from '../src/utils/savedRequest';

/*
 * A request someone starts is theirs to come back to.
 *
 * Before this, leaving the page lost everything: a customer who put three
 * products in, went to read a success story and came back found an empty page.
 */

const originalStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
const originalDispatch = globalThis.dispatchEvent;

function fakeStorage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: (key) => data.delete(key),
    get size() { return data.size; },
  };
}

const install = (storage) => Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true, writable: true });

beforeEach(() => {
  install(fakeStorage());
  globalThis.dispatchEvent = () => true;
});

afterEach(() => {
  if (originalStorage) Object.defineProperty(globalThis, 'localStorage', originalStorage);
  else delete globalThis.localStorage;
  globalThis.dispatchEvent = originalDispatch;
});

const lines = [
  { productId: 'premium_cotton_tee', name: 'Premium Cotton Tee', quantity: 50, details: { colour: 'Navy', printing: 'Silkscreen' }, detailNotes: 'Left chest' },
  { productId: 'canvas_tote_bag', name: 'Canvas Tote Bag', quantity: 100, details: {}, detailNotes: '' },
];

describe('a request is kept between visits', () => {
  it('comes back with its products, quantities and choices', () => {
    writeSavedRequest({ lines, neededBy: '2026-12-01', notes: 'For the camp' });
    const saved = readSavedRequest();
    expect(saved.lines).toHaveLength(2);
    expect(saved.lines[0]).toMatchObject({ productId: 'premium_cotton_tee', quantity: 50, detailNotes: 'Left chest' });
    expect(saved.lines[0].details).toEqual({ colour: 'Navy', printing: 'Silkscreen' });
    expect(saved.neededBy).toBe('2026-12-01');
    expect(saved.notes).toBe('For the camp');
    expect(savedLineCount(saved)).toBe(2);
  });

  it('is cleared by emptying it, and by starting again', () => {
    writeSavedRequest({ lines });
    writeSavedRequest({ lines: [] });
    expect(readSavedRequest()).toBe(null);
    writeSavedRequest({ lines });
    clearSavedRequest();
    expect(readSavedRequest()).toBe(null);
    expect(savedLineCount(null)).toBe(0);
  });

  it('forgets one nobody has touched for a month', () => {
    const old = new Date(Date.now() - (MAX_SAVED_DAYS + 1) * 24 * 60 * 60 * 1000).toISOString();
    install(fakeStorage({ [SAVED_REQUEST_KEY]: JSON.stringify({ lines, savedAt: old }) }));
    expect(readSavedRequest()).toBe(null);
  });

  it('shrugs off storage that is blocked, full or holds nonsense', () => {
    install(fakeStorage({ [SAVED_REQUEST_KEY]: 'not json' }));
    expect(readSavedRequest()).toBe(null);

    const blocked = {
      getItem: () => { throw new Error('blocked'); },
      setItem: () => { throw new Error('full'); },
      removeItem: () => { throw new Error('blocked'); },
    };
    install(blocked);
    expect(readSavedRequest()).toBe(null);
    expect(writeSavedRequest({ lines })).toBe(false);
    expect(() => clearSavedRequest()).not.toThrow();

    delete globalThis.localStorage;
    expect(readSavedRequest()).toBe(null);
    expect(writeSavedRequest({ lines })).toBe(false);
  });

  it('keeps only what a row needs, and nothing enormous', () => {
    writeSavedRequest({ lines: [{ ...lines[0], detailNotes: 'x'.repeat(500), files: ['logo.png'], key: 'line-1' }] });
    const [row] = readSavedRequest().lines;
    expect(row.detailNotes).toHaveLength(300);
    // Files cannot be stored, and the row's key belongs to the page it was on.
    expect(row).not.toHaveProperty('files');
    expect(row).not.toHaveProperty('key');
  });
});

describe('arriving from a product page', () => {
  it('adds the product to what is already there', () => {
    const arrival = { productId: 'insulated_bottle', quantity: 20 };
    expect(mergeArrival(lines, arrival).map((line) => line.productId))
      .toEqual(['premium_cotton_tee', 'canvas_tote_bag', 'insulated_bottle']);
  });

  it('updates the one already in the request instead of listing it twice', () => {
    const again = { productId: 'premium_cotton_tee', quantity: 250, details: { colour: 'Black' } };
    const merged = mergeArrival(lines, again);
    expect(merged).toHaveLength(2);
    expect(merged[0].quantity).toBe(250);
    // The new choice wins; the ones they made earlier are kept.
    expect(merged[0].details).toEqual({ colour: 'Black', printing: 'Silkscreen' });
  });

  it('leaves the request alone when nothing arrived with them', () => {
    expect(mergeArrival(lines, null)).toBe(lines);
    expect(mergeArrival(lines, {})).toBe(lines);
  });
});

describe('the way back into it', () => {
  const ui = readFileSync(new URL('../src/public/components/Ui.jsx', import.meta.url), 'utf8');
  const shell = readFileSync(new URL('../src/public/components/SiteShell.jsx', import.meta.url), 'utf8');
  const builder = readFileSync(new URL('../src/public/components/RequestBuilder.jsx', import.meta.url), 'utf8');
  const hook = readFileSync(new URL('../src/public/useSavedRequest.js', import.meta.url), 'utf8');
  const page = readFileSync(new URL('../src/public/pages/RequestPage.jsx', import.meta.url), 'utf8');

  it('says "Get a Quote" until there is one, then offers the way back', () => {
    for (const source of [ui, shell]) {
      expect(source).toMatch(/const waiting = useSavedRequest\(\);/);
      expect(source).toMatch(/waiting \? 'returnToQuoteButton' : '(hero|header)QuoteButton'/);
    }
    expect(siteContent.labels.returnToQuoteButton).toBe('Return to quote');
    expect(siteContent.labels.headerQuoteButton).toMatch(/\S/);
    // No count on the button: it made it wider than everything beside it.
    for (const source of [ui, shell]) expect(source).not.toMatch(/quote-count/);
    expect(readFileSync(new URL('../src/public/public.css', import.meta.url), 'utf8')).not.toMatch(/\.quote-count/);
  });

  it('lets a recommended package join the quote, or take its place', () => {
    // Someone may already be building a quote when they open a solution page.
    expect(builder).toMatch(/const addToQuote = \(how\) => \{/);
    expect(builder).toMatch(/const existing = how === 'replace' \? \[\] : readSavedRequest\(\)\?\.lines \?\? \[\];/);
    expect(builder).toMatch(/rows\.reduce\(\(kept, row\) => mergeArrival\(kept, row\), existing\)/);
    expect(builder).toMatch(/globalThis\.location\?\.assign\?\.\(REQUEST_PATH\)/);
    // Both offered only where there is something to replace.
    expect(builder).toMatch(/\{waiting > 0 && <button type="button" className="btn btn-outline"/);
    // And only on a page that recommends a package, not on the quote itself.
    expect(builder).toMatch(/\{!remember && lines\.length > 0 && <div className="request-to-quote">/);
    for (const key of ['addToQuoteButton', 'replaceQuoteButton', 'quoteHasItemsNote']) {
      expect(siteContent.pages.solutionPage[key], key).toMatch(/\S/);
    }
    expect(siteContent.pages.solutionPage.quoteHasItemsNote).toContain('{count}');
  });

  it('counts only after the page has loaded, so the drawn page matches', () => {
    // These pages are rendered ahead of time where there is no storage, so a
    // count read during render would disagree with what the server drew.
    expect(hook).toMatch(/useEffect\(\(\) => \{/);
    expect(hook).not.toMatch(/useState\(savedLineCount/);
    for (const event of ['SAVED_REQUEST_EVENT', "'storage'", "'pageshow'"]) expect(hook).toContain(event);
  });

  it('remembers on the quote page, and not on a solution page', () => {
    expect(page).toMatch(/<RequestBuilder\s+remember/);
    expect(builder).toMatch(/if \(!remember \|\| restored\) return;/);
    expect(builder).toMatch(/writeSavedRequest\(\{ lines, neededBy, notes \}\)/);
    // A solution page is a recommendation to start from, so it keeps nothing.
    const solution = readFileSync(new URL('../src/public/pages/SolutionDetailPage.jsx', import.meta.url), 'utf8');
    expect(solution).not.toMatch(/remember/);
  });

  it('tells them it is kept, and offers a way to start again', () => {
    expect(builder).toMatch(/className="request-kept"/);
    expect(builder).toMatch(/clearSavedRequest\(\); setLines\(\[\]\)/);
    expect(siteContent.pages.solutionPage.keptNote).toMatch(/\S/);
    expect(siteContent.pages.solutionPage.startOverButton).toMatch(/\S/);
  });
});
