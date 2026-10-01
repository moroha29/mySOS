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
    for (const item of products) expect(siteContent.productImages?.[item.public.slug], item.public.slug).toEqual({ image: expect.any(String) });
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
