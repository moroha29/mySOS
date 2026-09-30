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
  it('lets the words set the height and the picture fill it', () => {
    // The picture used to carry a shape of its own, so a tall drawing decided
    // how deep the banner was: 1065px on the stories page against 508 on the
    // rest. It is placed over the band's own column instead.
    const at = css.indexOf('.hero-scene, .solution-collage, .story-hero-bg {');
    expect(at, 'the banner picture').toBeGreaterThan(-1);
    const picture = css.slice(at, css.indexOf('}', at));
    expect(picture).toContain('height: auto');
    expect(picture).toContain('aspect-ratio: auto');
    expect(css).toContain('.hero-scene > .scene, .story-hero-bg > .scene { position: absolute');
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

describe('the controls do what they look like', () => {
  const ui = readFileSync(new URL('../src/public/components/Ui.jsx', import.meta.url), 'utf8');

  it('draws something that acts on this page as a button, not a link to nowhere', () => {
    // "View All Apparel" and "Load more guides" were <a href="#">.
    expect(ui).toContain("if (!href) return <button type=\"button\"");
    for (const page of ['ProductsPage', 'ResourcesPage']) {
      const source = readFileSync(new URL(`../src/public/pages/${page}.jsx`, import.meta.url), 'utf8');
      expect(source, page).not.toContain('href="#"');
    }
  });
});

describe('one mark for a category, wherever it is named', () => {
  const ui = readFileSync(new URL('../src/public/components/Ui.jsx', import.meta.url), 'utf8');
  const home = readFileSync(new URL('../src/public/pages/HomePage.jsx', import.meta.url), 'utf8');
  const products = readFileSync(new URL('../src/public/pages/ProductsPage.jsx', import.meta.url), 'utf8');
  const visuals = readFileSync(new URL('../src/public/components/Visuals.jsx', import.meta.url), 'utf8');
  const css = readFileSync(new URL('../src/public/public.css', import.meta.url), 'utf8');

  it('draws the category rather than reaching for an outline glyph', () => {
    // The type row used the drawn products; the homepage tiles used thin
    // outline icons of the same six things, so a t-shirt was two drawings
    // depending on which page you were on.
    expect(ui).toContain('export function CategoryMark({ category, tone');
    expect(ui).toMatch(/return <Product type=\{category\.visual\} color=\{tone\} mark="" /);
    expect(home).toContain('<CategoryMark category={category}');
    expect(home).not.toContain('<Icon name={category.icon}');
    // Every category has something to draw.
    for (const category of siteContent.categories) expect(category.visual, category.id).toMatch(/\S/);
  });

  it('turns the mark white while the pill or tile under it is dark', () => {
    // A navy drawing on the navy pill it had just been selected on was no
    // drawing at all.
    // The type row carries the client's own outline marks now, so only the
    // fallback row - a category they did not draw - still tints a solid one.
    expect(products).toContain("color={subcategory === type.id ? 'white' : 'navy'}");
    expect(home).toContain("const DARK_TONES = new Set(['navy', 'green']);");
    expect(home).toMatch(/tone=\{DARK_TONES\.has\(TILE_TONES\[index % TILE_TONES\.length\]\) \? 'white' : 'navy'\}/);
  });

  it('leaves the lettering off a bag drawn at mark size', () => {
    // The tote was drawn with "YOUR BRAND HERE" across it whatever it was
    // asked for, so the words turned to mush inside a 36px icon.
    // The tote is now one of the drawings that is handed the mark, so an empty
    // one reaches it and it draws nothing.
    expect(visuals).toMatch(/const marked = \{[^}]*tote: Tote/);
    expect(visuals).toContain('<Marked color={color} mark={mark} />');
    expect(visuals).toContain('{mark ? <>');
  });

  it('draws every kind the catalogue sells', () => {
    // Towels, medals, mats, pens, name tents and stickers had no drawing, so a
    // whole type row fell back to the category's own mark: five identical gift
    // boxes in a row that was meant to tell them apart.
    const products = readFileSync(new URL('../src/public/pages/ProductsPage.jsx', import.meta.url), 'utf8');
    const map = products.slice(products.indexOf('const TYPE_VISUALS'), products.indexOf('};', products.indexOf('const TYPE_VISUALS')));
    for (const id of Object.keys(siteContent.subcategoryNames)) {
      expect(map, id).toContain(`${/^[a-z]+$/.test(id) ? id : `'${id}'`}: `);
    }
    for (const drawing of ['Towel', 'Medal', 'Mat', 'Pen', 'NameTent', 'Sticker']) {
      expect(visuals, drawing).toContain(`function ${drawing}({ color`);
    }
  });

  it('gives the mark a size in each place it sits', () => {
    expect(css).toContain('.type-row .category-mark { width: 36px; height: 36px; }');
    expect(css).toContain('.home-tile .category-mark { width: 52px; height: 52px; }');
  });
});
