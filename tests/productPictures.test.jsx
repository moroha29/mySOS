import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import productData from '../src/data/productData.json';
import siteContent from '../src/data/siteContent.json';
import { ProductShot } from '../src/public/components/Ui';
import { productImage } from '../src/public/cms';
import { getImage } from '../src/utils/imageRegistry';

/*
 * These check what the field does, never what is currently in it.
 *
 * Two of them used to read the live content and expect it untouched — that a
 * particular product's picture was still the file shipped beside the others,
 * and that the field holding a chosen one was still empty. The first time
 * MySOS chose a picture and published, those two failed, the publish could not
 * merge itself, and four photographs sat in an unmerged pull request for ten
 * days while the website showed the old ones. A test that breaks when the
 * feature is used is worse than no test.
 */
const products = productData.catalogue;
const pathOf = (slug) => JSON.stringify(['homepage', 'productImages', slug, 'image']).replaceAll('"', '&quot;');
const chosen = (item) => siteContent.productImages?.[item.public.slug]?.image || '';
const supplied = (item) => getImage(`products/${item.public.slug}`);

const withPhoto = products.find((item) => supplied(item));
const drawn = products.find((item) => !supplied(item));
// A product still showing the file it was shipped with, and one showing a
// picture chosen in the manager. Either may be absent, depending on what
// MySOS has chosen so far, so each test says what it needs.
const onItsFile = products.find((item) => supplied(item) && !chosen(item));
const onAChoice = products.find((item) => chosen(item));

describe('a product has a picture the manager can change', () => {
  it('has an entry for every product, so none is left without a field', () => {
    for (const item of products) {
      const entry = siteContent.productImages?.[item.public.slug];
      expect(entry, item.public.slug).toBeTruthy();
      expect(typeof entry.image, item.public.slug).toBe('string');
      // A picture that is not square can say how it sits in its frame.
      if ('fit' in entry) expect(['', 'cover', 'contain'], item.public.slug).toContain(entry.fit);
      expect(Object.keys(entry).every((key) => key === 'image' || key === 'fit'), item.public.slug).toBe(true);
    }
  });

  it('marks a photograph with where the picture lives', () => {
    const html = renderToStaticMarkup(<ProductShot slug={withPhoto.public.slug} imageStyle={withPhoto.public.imageStyle} />);
    // Whichever picture won, that is the one drawn, and it carries its field.
    expect(html).toContain(`<img src="${productImage(withPhoto.public.slug)}"`);
    expect(html).toContain(`data-cms-path="${pathOf(withPhoto.public.slug)}"`);
    expect(html).not.toContain('data-cms-background');
  });

  it('marks the drawn stand-in too, as a box a picture can be painted over', () => {
    const html = renderToStaticMarkup(<ProductShot slug={drawn.public.slug} imageStyle={drawn.public.imageStyle} />);
    expect(html).toMatch(/^<div class="product-visual"/);
    expect(html).toContain(`data-cms-path="${pathOf(drawn.public.slug)}"`);
    expect(html).toContain('data-cms-background="true"');
  });

  it('leaves a product with no entry unmarked rather than pointing at nothing', () => {
    const html = renderToStaticMarkup(<ProductShot slug="not-a-product" imageStyle="tee-navy" />);
    expect(html).not.toContain('data-cms-path');
  });

  it('falls back to the supplied file while nothing is chosen', () => {
    if (!onItsFile) return;
    expect(chosen(onItsFile)).toBe('');
    expect(productImage(onItsFile.public.slug)).toBe(supplied(onItsFile));
  });

  it('shows the picture chosen in the manager instead of the supplied file', () => {
    // The whole point of the field, and the thing no test covered: a chosen
    // picture has to beat the file shipped beside it.
    if (!onAChoice) return;
    expect(productImage(onAChoice.public.slug)).toBe(chosen(onAChoice));
    if (supplied(onAChoice)) expect(productImage(onAChoice.public.slug)).not.toBe(supplied(onAChoice));
    const html = renderToStaticMarkup(<ProductShot slug={onAChoice.public.slug} imageStyle={onAChoice.public.imageStyle} />);
    expect(html).toContain(`<img src="${chosen(onAChoice)}"`);
  });

  it('is covered whichever way the content happens to be', () => {
    // One of the two above is skipped when every product is on the same
    // footing. This is what stops both being skipped and nothing being read.
    expect(Boolean(onItsFile) || Boolean(onAChoice)).toBe(true);
  });
});
