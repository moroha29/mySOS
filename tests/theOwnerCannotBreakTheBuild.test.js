import { describe, expect, it } from 'vitest';

import productData from '../src/data/productData.json';
import solutions from '../src/data/solutions.json';
import successStories from '../src/data/successStories.json';
import resources from '../src/data/resources.json';
import siteContent from '../src/data/siteContent.json';
import { sitePages } from '../scripts/sitePages.mjs';
import { headTags, pageMeta, sitemapXml } from '../scripts/pageMeta.mjs';

/*
 * Nothing the owner can type may stop his website from being published.
 *
 * This one is written from four days of the same message. He edits the website
 * through the portal; pressing Publish puts his content on a branch and runs
 * this test suite against it; a red test means nothing is published and all he
 * sees is "the check on your website found a problem, so nothing was published
 * and your website has not changed". It has happened again and again, and not
 * once because of anything wrong with his content:
 *
 *   - three tests held the exact wording of his four homepage promises, so
 *     rewording one meant he could publish nothing at all;
 *   - the count of those promises was written out here too, so removing one
 *     did the same;
 *   - every page had to have a title no other page had, and he renamed two
 *     caps to "CP28 Polyester Baseball Cap" -- a slip of one line, which cost
 *     him a day's work on the catalogue and, from where he sat, looked like
 *     the website refusing him.
 *
 * Each of those was found by him, in the only way he can find things: being
 * stopped. So the point of this file is to be the thing that is stopped
 * instead. It takes the real content and changes it the way the portal lets
 * him change it -- rewording, renaming, repeating a name, emptying a line,
 * writing far too much, adding a product, removing the last one -- and asks
 * only that the pages still come out. It makes no claim about what he should
 * write. Anything it finds is ours to fix before he meets it.
 *
 * A check that reads his content and expects particular words, particular
 * counts, or no repetition among them belongs here, rewritten, or nowhere.
 */

const real = { productData, solutions, successStories, resources, siteContent };

/** Build every page of a site and return what each one says about itself. */
function pagesOf(content) {
  return sitePages(content).map((page) => pageMeta(page, content));
}

/*
 * The pages come out, each with a title, something to say, and an address of
 * its own -- the three things the build and the sitemap need from a page. A
 * repeated title is allowed: the portal tells him about those, and a website
 * that will not build tells him nothing.
 */
function expectASite(content, what) {
  const meta = pagesOf(content);
  expect(meta.length, `${what}: no pages at all`).toBeGreaterThan(0);
  for (const item of meta) {
    expect(item.title, `${what}: ${item.route} has no title`).toBeTruthy();
    expect(item.description, `${what}: ${item.route} has nothing to say`).toBeTruthy();
    expect(item.description.length, `${what}: ${item.route} runs long`).toBeLessThanOrEqual(160);
    expect(item.description, `${what}: ${item.route} is not one line`).not.toMatch(/[\n\r]|\s{2}/);
    expect(() => headTags(item, { image: '/assets/x-hash.jpg' }), `${what}: ${item.route}`).not.toThrow();
  }
  // Addresses are the one thing that must not repeat: two pages at one address
  // means one of them is not written. Slugs are the portal's to keep apart,
  // and it does -- a product added twice becomes -2, never the same path.
  const routes = meta.map((item) => item.route);
  expect(new Set(routes).size, `${what}: two pages share an address`).toBe(routes.length);
  expect([...sitemapXml(routes).matchAll(/<url>/g)].length).toBeGreaterThan(0);
  return meta;
}

/** The real content with one branch of it replaced. */
const withProducts = (catalogue) => ({ ...real, productData: { ...productData, catalogue } });
const withSite = (patch) => ({ ...real, siteContent: { ...siteContent, ...patch } });

const visible = productData.catalogue.filter((item) => item.public.visible);
const rename = (item, name) => ({ ...item, public: { ...item.public, name } });

describe('nothing the owner can type stops his website being published', () => {
  it('builds the site as it stands', () => {
    const meta = expectASite(real, 'as it stands');
    expect(meta.length).toBe(sitePages(real).length);
  });

  it('builds when two products are given the same name', () => {
    // The one that happened: CP28 typed onto a second cap. Both pages are
    // written, each at its own address, each with its own description.
    const catalogue = productData.catalogue.map((item, index) => (
      item.public.visible && index <= 1 ? rename(item, 'CP28 Polyester Baseball Cap') : item
    ));
    const meta = expectASite(withProducts(catalogue), 'two products named alike');
    // At least the two renamed here -- and not exactly two, because he may
    // already have typed that name onto something, which is the whole point.
    const named = meta.filter((item) => item.title === 'CP28 Polyester Baseball Cap | MySOS');
    expect(named.length).toBeGreaterThanOrEqual(2);
    expect(new Set(named.map((item) => item.route)).size).toBe(named.length);
  });

  it('builds when every product is given the same name', () => {
    const catalogue = productData.catalogue.map((item) => rename(item, 'Cap'));
    expectASite(withProducts(catalogue), 'everything named alike');
  });

  it('builds when a product is renamed to something awkward', () => {
    for (const name of [
      'A "quoted" & <tagged> name',
      'Tee — 100% cotton · 11 colours',
      'CP28',
      '  spaced  out  ',
      'A'.repeat(300),
      '日本語のキャップ',
      'cap/with/slashes',
    ]) {
      const catalogue = [rename(visible[0], name), ...productData.catalogue.slice(1)];
      const meta = expectASite(withProducts(catalogue), `named ${JSON.stringify(name.slice(0, 20))}`);
      // The page keeps its address whatever he calls it: the slug is the
      // portal's, and renaming does not move a page that is already published.
      expect(meta.some((item) => item.route === `/products/${visible[0].public.slug}/`)).toBe(true);
    }
  });

  it('builds when a product is left with no description', () => {
    // Nothing to say about itself falls back to the line the site opens with,
    // rather than to a page with no description, which used to stop the build.
    const catalogue = [
      { ...visible[0], public: { ...visible[0].public, description: '' } },
      ...productData.catalogue.slice(1),
    ];
    const meta = expectASite(withProducts(catalogue), 'no description');
    expect(meta.find((item) => item.route === `/products/${visible[0].public.slug}/`).description)
      .toBe(siteContent.headings.heroLead);
  });

  it('builds when a description is far longer than a search result holds', () => {
    const catalogue = [
      { ...visible[0], public: { ...visible[0].public, description: `${'word '.repeat(400)}end` } },
      ...productData.catalogue.slice(1),
    ];
    expectASite(withProducts(catalogue), 'a very long description');
  });

  it('builds with one product, and with none', () => {
    expectASite(withProducts([visible[0]]), 'one product');
    const hidden = productData.catalogue.map((item) => ({ ...item, public: { ...item.public, visible: false } }));
    const meta = expectASite(withProducts(hidden), 'no products');
    expect(meta.some((item) => item.route.startsWith('/products/') && item.route !== '/products/')).toBe(false);
    // The products page itself stays: an empty shop is still a shop.
    expect(meta.some((item) => item.route === '/products/')).toBe(true);
  });

  it('builds when a product is added, the way the portal adds one', () => {
    // What the portal writes for a new product page: a copied picture and
    // printing, a slug of its own, and no advertised price.
    const added = {
      ...visible[0],
      id: 'cp28_new',
      public: {
        ...visible[0].public,
        slug: 'cp28-polyester-baseball-cap',
        name: 'CP28 Polyester Baseball Cap',
        description: 'Adjustable buckle strap · 100% Polyester',
        displayPricing: { show: false, prefix: 'From', amount: 0, unit: 'piece' },
      },
    };
    const meta = expectASite(withProducts([...productData.catalogue, added]), 'a product added');
    expect(meta.some((item) => item.route === '/products/cp28-polyester-baseball-cap/')).toBe(true);
  });

  it('builds when the homepage promises are reworded, repeated, or fewer', () => {
    const one = siteContent.homeStats[0];
    for (const [what, homeStats] of [
      ['reworded', siteContent.homeStats.map((stat) => ({ ...stat, value: `${stat.value} now` }))],
      ['repeated', siteContent.homeStats.map((stat) => ({ ...stat, value: one.value }))],
      ['fewer', [one]],
      ['more', [...siteContent.homeStats, { ...one, mark: 'extra' }]],
    ]) {
      expectASite(withSite({ homeStats }), `promises ${what}`);
    }
  });

  it('builds when the line the site opens with is reworded', () => {
    const headings = { ...siteContent.headings, heroLead: 'Something else entirely, in his words.' };
    const meta = expectASite(withSite({ headings }), 'a new opening line');
    expect(meta.find((item) => item.route === '/').description).toBe('Something else entirely, in his words.');
  });

  it('builds when two stories, or two guides, are given the same title', () => {
    const title = successStories[0].title;
    expectASite({ ...real, successStories: successStories.map((story) => ({ ...story, title })) }, 'stories named alike');
    const heading = resources.articles[0].title;
    const articles = resources.articles.map((article) => ({ ...article, title: heading }));
    expectASite({ ...real, resources: { ...resources, articles } }, 'guides named alike');
  });

  it('builds when a solution is renamed to a product\'s name', () => {
    const named = solutions.map((solution) => ({ ...solution, name: visible[0].public.name }));
    expectASite({ ...real, solutions: named }, 'a solution named after a product');
  });

  it('builds when a category is hidden, and when one more is shown', () => {
    const categories = siteContent.categories.map((category, index) => (
      index === 0 ? { ...category, visible: false } : category
    ));
    expectASite(withSite({ categories }), 'a category hidden');
    const extra = [...siteContent.categories, { ...siteContent.categories[0], id: 'ninth', visible: true }];
    expectASite(withSite({ categories: extra }), 'a ninth category');
  });
});
