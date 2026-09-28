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

  it('leaves the collection to the products, with no second menu under them', () => {
    // The strip at the top of the page is the category menu; a second one at
    // the foot of every collection was one too many.
    expect(source).not.toContain('collection-more');
    expect(css).not.toContain('collection-more');
    // Nor the category's subtitle beside the collection title.
    expect(source).not.toContain('descriptionPath={categoryPath(activeCategory');
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

describe('the banner and the ask card keep the height they need', () => {
  it('gives the banner picture a shape of its own', () => {
    // A square photograph made the picture 636px tall beside 464px of words,
    // and the banner carried the difference as empty space.
    expect(css).toMatch(/\.hero-scene \{[\s\S]{0,400}?aspect-ratio: 4 \/ 3; min-height: 0; height: auto;/);
    expect(css).not.toMatch(/\.hero-scene \{[^}]*min-height: 500px/);
  });

});

describe('the collection opens like a shelf', () => {
  const source = readFileSync(new URL('../src/public/pages/ProductsPage.jsx', import.meta.url), 'utf8');
  const ui = readFileSync(new URL('../src/public/components/Ui.jsx', import.meta.url), 'utf8');

  it('names the shelf and offers an order, rather than the category again', () => {
    // The banner above already says "Apparel"; the section under it used to
    // say "Apparel collection" and then show a wall of white cards.
    expect(source).toContain('<div className="collection-bar">');
    expect(source).toContain("pageText('products', 'sortLabel', 'Sort by')");
    expect(source).not.toContain('collectionSuffix');
    expect(siteContent.pages.products).not.toHaveProperty('collectionSuffix');
    expect(siteContent.pages.products.sortFeatured).toBeTruthy();
    // The shelf is named on the left and ordered from the right; the filter
    // has a row of its own above it.
    const bar = source.slice(source.indexOf('<div className="collection-bar">'), source.indexOf('id="product-collection-grid"'));
    expect(bar).toContain('className="collection-title"');
    expect(bar).toContain('className="collection-sort"');
    expect(bar.indexOf('className="collection-title"')).toBeLessThan(bar.indexOf('className="collection-sort"'));
    expect(css).toMatch(/\.collection-bar \{[^}]*border-bottom: 1px solid var\(--line\);/);
  });

  it('keeps the card to the product and its name', () => {
    // The design the client chose puts nothing else on it: the price and what
    // is asked for most are on the product's own page.
    expect(ui).toContain('<span className="product-card-shot">');
    expect(ui).not.toContain("label('featuredBadge'");
    expect(ui).not.toContain('className="price"');
    expect(css).toMatch(/\.product-card \{ border-color: transparent; background: transparent;/);
  });

  it('fits a fifth column on a wide screen', () => {
    const wide = css.slice(css.indexOf('@media (min-width: 1700px)'));
    expect(wide).toContain('.product-grid { grid-template-columns: repeat(5, minmax(0, 1fr)); }');
  });

  it('does not let a minimum height stretch the banner picture sideways', () => {
    // 4:3 with a 300px floor came out 400px wide on a 390px screen.
    expect(css).toMatch(/\.hero-scene \{[\s\S]{0,400}?min-height: 0;/);
  });
});

describe('the card for what is not on the shelf', () => {
  it('is outlined, not filled', () => {
    // Filled green it was a slab among the white product cards, and the wider
    // it stretched the heavier it looked.
    const card = css.match(/\.product-ask \{([^}]*)\}/)[1];
    expect(card).toContain('border: 1.5px dashed');
    expect(card).toContain('background: #fff');
    expect(card).not.toContain('#d9efe2');
    expect(css).toMatch(/\.product-ask:hover \{[^}]*border-color: var\(--green-dark\);/);
  });
});

describe('asking for what is not listed', () => {
  const source = readFileSync(new URL('../src/public/pages/ProductsPage.jsx', import.meta.url), 'utf8');

  it('sits under the products rather than among them', () => {
    expect(source).toMatch(/<\/div>\}\s*\n\s*\{\/\* Not everything MySOS can make is listed/);
    expect(source).not.toMatch(/data-fill\d/);
  });

  it('opens a message instead of the quote page', () => {
    // It is a question, not an order, and it names what the reader was looking at.
    expect(source).toContain('const askHref = useMemo(() => messageHref(');
    expect(source).toContain('{...enquiryLinkProps(askHref)}');
    expect(source).not.toContain('href={REQUEST_PATH}');
  });
});
