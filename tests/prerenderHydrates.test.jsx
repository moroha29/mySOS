import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { renderToStaticMarkup, renderToString } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import PublicApp from '../src/public/PublicApp';

/*
 * The markup the build writes has to be markup the browser can pick up.
 *
 * Every page on the live site threw "Minified React error #418" — the server
 * HTML did not match what the client built — because the prerender used
 * renderToStaticMarkup, which is for markup nobody hydrates: it leaves out the
 * comment markers hydration reads, and it does not hoist a <link rel=preload>
 * out of the body the way the browser does. React answered by throwing the
 * whole page away and rendering it again from scratch, so the prerendered HTML
 * bought a first paint and nothing else, and anything the visitor had already
 * typed or scrolled to went with it.
 *
 * renderToString writes the same markup with those markers in it.
 */

const originalLocation = globalThis.location;

function markupAt(pathname, render) {
  globalThis.location = { pathname, search: '' };
  return render(React.createElement(PublicApp));
}

afterEach(() => {
  if (originalLocation === undefined) delete globalThis.location;
  else globalThis.location = originalLocation;
});

describe('the prerendered markup can be picked up by the browser', () => {
  it('is written for hydration, not as a picture of a page', () => {
    const page = '/products/canvas-tote-bag/';
    const hydratable = markupAt(page, renderToString);
    const static_ = markupAt(page, renderToStaticMarkup);
    // The same page, both ways: the markers are the difference.
    expect(hydratable).toContain('Canvas Tote Bag');
    expect(static_).toContain('Canvas Tote Bag');
    expect(hydratable).toContain('<!-- -->');
    expect(static_).not.toContain('<!-- -->');
  });

  it('is what the build actually calls', () => {
    const prerender = readFileSync(new URL('../scripts/prerender.mjs', import.meta.url), 'utf8');
    expect(prerender).toContain("import { renderToString } from 'react-dom/server';");
    expect(prerender).toContain('renderToString(React.createElement(PublicApp))');
    expect(prerender).not.toContain('renderToStaticMarkup');
  });

  it('hydrates the prerendered markup rather than replacing it', () => {
    // The other half of the contract: main.jsx only hydrates when there is
    // markup to hydrate, and client-renders the 404 deep-link fallback.
    const main = readFileSync(new URL('../src/public/main.jsx', import.meta.url), 'utf8');
    expect(main).toContain('if (container.hasChildNodes() && !route) ReactDOM.hydrateRoot(container, tree);');
  });
});
