import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import siteContent from '../src/data/siteContent.json';
import productData from '../src/data/productData.json';

/*
 * A category that does not look empty.
 *
 * Drinkware has one product and bags two. Their pictures were drawn at their
 * own size in the corner of a card twice as wide, the rest of the card was
 * white, and the row stopped a quarter of the way across the page. These hold
 * the fixes: the picture is the card, the row is always finished, and the
 * collection closes with the category menu.
 */

const css = readFileSync(new URL('../src/public/public.css', import.meta.url), 'utf8');
const source = readFileSync(new URL('../src/public/pages/ProductsPage.jsx', import.meta.url), 'utf8');

describe('a product card is filled by its product', () => {
  it('gives the picture the whole width of the card, as a square', () => {
    expect(css).toMatch(/\.product-card \.product-visual \{[^}]*width: 100%;[^}]*aspect-ratio: 1 \/ 1;/);
    // It was 168px tall whatever the card was, which left the picture adrift
    // in the corner of it.
    expect(css).toMatch(/\.product-card \.product-visual \{[^}]*height: auto;/);
  });

  it('shows the whole product rather than a crop of it', () => {
    expect(css).toMatch(/\.product-card \.product-visual img \{[^}]*object-fit: contain;/);
    // A catalogue photograph is shot on white, so the grey tile behind it read
    // as a frame; the drawn stand-ins keep the grey.
    expect(css).toMatch(/\.product-card \.product-visual\.has-photo \{ background: #fff; \}/);
  });
});

describe('the row of products is always finished', () => {
  it('measures what the last row has left at each width', () => {
    for (const columns of [4, 3, 2]) {
      expect(source, `fill${columns}`).toContain(`data-fill${columns}={${columns} - (visible.length % ${columns})}`);
    }
  });

  it('stretches the card that asks for what is not listed across the gap', () => {
    for (const span of [1, 2, 3, 4]) {
      expect(css, `span ${span}`).toContain(`.product-grid[data-fill4='${span}'] .product-ask { grid-column: span ${span}; }`);
    }
    // Three columns under 1080px, two under 620px: the same card, measured again.
    expect(css).toMatch(/@media \(max-width: 1080px\) \{[^@]*\.product-grid\[data-fill3='2'\] \.product-ask \{ grid-column: span 2; \}/);
    expect(css).toMatch(/@media \(max-width: 620px\) \{[^@]*\.product-grid\[data-fill2='2'\] \.product-ask \{ grid-column: span 2; \}/);
  });

  it('lays that card out as a band once it is wide, asking its own width', () => {
    expect(css).toMatch(/\.product-ask \{ container-type: inline-size; \}/);
    expect(css).toMatch(/@container \(min-width: 460px\) \{\s*\.product-ask-inner \{ flex-flow: row wrap;/);
  });

  it('says it in the words the site already uses for it', () => {
    expect(siteContent.headings.industryHeading).toBeTruthy();
    expect(siteContent.labels.heroSearchAskButton).toBeTruthy();
    expect(source).toContain("heading('industryHeading', \"Don't know what you need?\")");
    expect(source).toContain("label('heroSearchAskButton', 'Tell us about it')");
  });
});

describe('the sub-categories and the menu are the ones the header uses', () => {
  it('draws the apparel tabs as the category strip draws its pills', () => {
    const strip = css.match(/\.category-strip ul a \{([^}]*)\}/)[1];
    expect(strip).toContain('border-radius: 999px');
    expect(css).toMatch(/\.tab-list button \{[^}]*border-radius: 999px;/);
    // Dark green with white words, on hover and when chosen, as the strip does.
    expect(css).toMatch(/\.tab-list button:hover \{[^}]*background: var\(--green-dark\); color: #fff; \}/);
    expect(css).toMatch(/\.tab-list button\[aria-selected='true'\] \{[^}]*background: var\(--green-dark\); color: #fff; \}/);
  });

  it('closes every collection with the homepage tiles, the one being read marked', () => {
    expect(source).toContain("const TILE_TONES = ['soft', 'navy', 'green', 'blue', 'mint', 'lilac'];");
    expect(source).toMatch(/className=\{`home-tile tone-\$\{TILE_TONES\[index % TILE_TONES\.length\]\}\$\{item\.id === category \? ' is-active' : ''\}`\}/);
    expect(source).toMatch(/aria-current=\{item\.id === category \? 'page' : undefined\}/);
    // On a navy or green tile a green ring is invisible; the tile's own colour
    // is always legible against it.
    expect(css).toMatch(/\.collection-more \.home-tile\.is-active \{ box-shadow: inset 0 0 0 2px currentColor; \}/);
  });
});

describe('the catalogue behind the thin categories', () => {
  it('is what makes bags and drinkware short, not the page', () => {
    // If these fill out, the layout above still holds; this is here so the
    // count is visible in the suite rather than only on the page.
    const counted = {};
    for (const item of productData.catalogue) {
      if (item.public?.published === false) continue;
      counted[item.public.category] = (counted[item.public.category] ?? 0) + 1;
    }
    for (const category of siteContent.categories) {
      expect(counted[category.id] ?? 0, `${category.id} has no products at all`).toBeGreaterThan(0);
    }
  });
});
