import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import productData from '../src/data/productData.json';
import siteContent from '../src/data/siteContent.json';
import { ProductShot } from '../src/public/components/Ui';
import { productImage } from '../src/public/cms';
import { getImage } from '../src/utils/imageRegistry';

const products = productData.catalogue;
const pathOf = (slug) => JSON.stringify(['homepage', 'productImages', slug, 'image']).replaceAll('"', '&quot;');
const withPhoto = products.find((item) => getImage(`products/${item.public.slug}`));
const drawn = products.find((item) => !getImage(`products/${item.public.slug}`));

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
    expect(html).toContain(`<img src="${getImage(`products/${withPhoto.public.slug}`)}"`);
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
    expect(siteContent.productImages[withPhoto.public.slug].image).toBe('');
    expect(productImage(withPhoto.public.slug)).toBe(getImage(`products/${withPhoto.public.slug}`));
  });
});
