import React from 'react';
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import PublicApp from '../src/public/PublicApp';

const source = readFileSync(new URL('../src/public/components/RequestBuilder.jsx', import.meta.url), 'utf8');

/*
 * Small wrongnesses on the page a customer sends their request from.
 *
 * Found by working through the live site as a visitor:
 *
 *   "1 products selected"   — the count is written into the words, so one
 *                             product read as a plural.
 *   Needed By: 22 October   — the floor under the date was the day the site was
 *                             built. Prerendered HTML carries it, and hydration
 *                             does not correct an attribute that only the clock
 *                             changes, so the day after a release a customer
 *                             could ask for yesterday.
 *   logo.png · 0.0 MB       — every file under half a megabyte.
 *   React error #418        — arriving from "Add to my request" on a product
 *                             page, because the first render read the address
 *                             bar, which the prerendered page could not know.
 *                             React threw the page away and built it again.
 */

const originalLocation = globalThis.location;
afterEach(() => {
  if (originalLocation === undefined) delete globalThis.location;
  else globalThis.location = originalLocation;
});

const renderAt = (pathname, search = '') => {
  globalThis.location = { pathname, search };
  return renderToString(React.createElement(PublicApp));
};

describe('the quote page', () => {
  it('counts one product as one product', () => {
    // The count is filled into a label the portal holds, so the singular is a
    // second label rather than a plural guessed from the stored words.
    expect(source).toContain("const one = word('summaryCountLabelOne', label.split('products').join('product'));");
    expect(source).toContain('return fill(count === 1 ? one : label, { count });');
    expect(renderAt('/request/')).toContain('0 products selected');
  });

  it('puts no floor under Needed By until the page is running', () => {
    /*
     * Rendered with no `min` at all: whatever date the build machine had is
     * not the date the visitor has, and the attribute would stick.
     */
    expect(renderAt('/request/')).not.toMatch(/type="date"[^>]*min=/);
    expect(source).toContain('<input id="needed-by" type="date" min={today || undefined}');
    // Read after mounting, from the visitor's own clock, in their own timezone —
    // toISOString is UTC, which offered yesterday all morning in Singapore.
    const today = source.slice(source.indexOf('function todayHere()'));
    expect(today.slice(0, 420)).toMatch(/useEffect\(\(\) => \{/);
    expect(today.slice(0, 420)).toContain('now.getFullYear()');
    expect(today.slice(0, 420)).not.toContain('toISOString');
  });

  it('measures a small file in kilobytes', () => {
    const fileSize = new Function(`${source.slice(source.indexOf('const fileSize ='), source.indexOf('/*', source.indexOf('const fileSize =')))}; return fileSize;`)();
    expect(fileSize(45_000)).toBe('44 KB');
    expect(fileSize(900)).toBe('1 KB');
    expect(fileSize(1024 * 1024)).toBe('1.0 MB');
    expect(fileSize(5.5 * 1024 * 1024)).toBe('5.5 MB');
  });

  it('reads the address bar after mounting, never while rendering', () => {
    // The whole point: the first render cannot depend on something the page
    // was drawn without, or the browser throws the drawn page away.
    expect(source).toContain('const [lines, setLines] = useState(() => (useCase ? packageLines(useCase) : []));');
    expect(source).toContain("const [notes, setNotes] = useState('');");
    const effect = source.slice(source.indexOf('if (!remember || restored) return;'));
    expect(effect.slice(0, 600)).toContain('const arrivals = startWith.filter((item) => productFor(item.productId));');
    expect(effect.slice(0, 600)).toContain('if (startNotes) setNotes(startNotes);');
  });
});
