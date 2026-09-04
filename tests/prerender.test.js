import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { resolveAssetUrls } from '../scripts/prerenderAssets.mjs';

const BASE = '/mySOS';

// A stand-in for the client build's manifest.
const assetUrls = new Map([
  ['/src/assets/images/logos/ntu.png', '/mySOS/assets/ntu-DblzqJoq.png'],
  ['/src/assets/images/scenes/band-industry.jpg', '/mySOS/assets/band-industry-BmV3vzjb.jpg'],
]);

describe('prerendered asset URLs', () => {
  it('rewrites src attributes to the hashed build output', () => {
    const { html, unresolved } = resolveAssetUrls('<img src="/mySOS/src/assets/images/logos/ntu.png">', assetUrls, BASE);
    expect(html).toContain('src="/mySOS/assets/ntu-DblzqJoq.png"');
    expect(unresolved).toEqual([]);
  });

  it('rewrites url() inside an inline CSS custom property', () => {
    // Background images are set through a custom property, not src/href. An
    // attribute-only rewrite left these pointing at paths that 404 in dist.
    const input = '<section style="--band-bg:url(/mySOS/src/assets/images/scenes/band-industry.jpg)">';
    const { html, unresolved } = resolveAssetUrls(input, assetUrls, BASE);
    expect(html).toContain('url(/mySOS/assets/band-industry-BmV3vzjb.jpg)');
    expect(unresolved).toEqual([]);
  });

  it('consumes the base prefix instead of doubling it', () => {
    const { html } = resolveAssetUrls('<img src="/mySOS/src/assets/images/logos/ntu.png">', assetUrls, BASE);
    expect(html).not.toContain('/mySOS/mySOS/');
  });

  it('matches paths containing the letter s', () => {
    // `\s` written inside a template literal collapses to a bare "s", which
    // silently truncated every match at ".../image|s/...".
    const { html } = resolveAssetUrls('<img src="/src/assets/images/logos/ntu.png">', assetUrls, BASE);
    expect(html).toContain('/mySOS/assets/ntu-DblzqJoq.png');
  });

  it('reports anything the manifest does not cover', () => {
    const { unresolved } = resolveAssetUrls('<img src="/mySOS/src/assets/images/logos/missing.png">', assetUrls, BASE);
    expect(unresolved).toHaveLength(1);
    expect(unresolved[0]).toContain('missing.png');
  });
});

describe('the built output', () => {
  const pages = ['index.html', 'products/index.html', 'success-stories/ntu-cca-jerseys-2024/index.html'];
  const built = pages.every((page) => existsSync(new URL(`../dist/${page}`, import.meta.url)));

  it.runIf(built)('ships no unresolved source asset paths', () => {
    for (const page of pages) {
      const html = readFileSync(new URL(`../dist/${page}`, import.meta.url), 'utf8');
      expect(html, `${page} still points at source assets`).not.toMatch(/\/src\/assets\//);
      expect(html, `${page} has a doubled base prefix`).not.toContain('/mySOS/mySOS/');
    }
  });

  it.runIf(built)('prerenders real markup rather than an empty shell', () => {
    const html = readFileSync(new URL('../dist/index.html', import.meta.url), 'utf8');
    expect(html).not.toContain('<div id="root"></div>');
    expect(html.length).toBeGreaterThan(20_000);
  });
});
