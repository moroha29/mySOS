import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { sitePages, siteRoutes } from '../scripts/sitePages.mjs';
import productData from '../src/data/productData.json';
import solutions from '../src/data/solutions.json';
import successStories from '../src/data/successStories.json';
import resources from '../src/data/resources.json';

/*
 * One list of pages for the build and for the website manager.
 *
 * The manager used to carry its own hand-written list of five pages, so every
 * product, solution, story and guide added since was missing from it. It now
 * builds the same list from the same content (see the website-manager
 * repository), and the build prerenders exactly these pages.
 */

const content = { productData, solutions, successStories, resources };
const pages = sitePages(content);

describe('the pages this website has', () => {
  it('is what the build prerenders', () => {
    const prerender = readFileSync(new URL('../scripts/prerender.mjs', import.meta.url), 'utf8');
    expect(prerender).toMatch(/const routes = siteRoutes\(/);
    expect(siteRoutes(content)[0]).toBe('/');
    expect(siteRoutes(content)).toContain('/products/');
  });

  it('covers every product, solution, story and guide on the site', () => {
    const paths = new Set(pages.map((page) => page.path));
    for (const product of productData.catalogue.filter((item) => item.public.visible)) {
      expect(paths.has(`products/${product.public.slug}/`), product.public.name).toBe(true);
    }
    for (const solution of solutions) expect(paths.has(`solutions/${solution.id}/`), solution.id).toBe(true);
    for (const story of successStories) expect(paths.has(`success-stories/${story.slug}/`), story.slug).toBe(true);
    for (const article of resources.articles) expect(paths.has(`resources/${article.slug}/`), article.slug).toBe(true);
    // A product hidden from the website has no page of its own.
    for (const product of productData.catalogue.filter((item) => !item.public.visible)) {
      expect(paths.has(`products/${product.public.slug}/`), product.public.name).toBe(false);
    }
  });

  it('gives every page a name, a place and an identity of its own', () => {
    const ids = new Set();
    const paths = new Set();
    for (const page of pages) {
      expect(page.label, page.id).toMatch(/\S/);
      expect(ids.has(page.id), page.id).toBe(false);
      expect(paths.has(page.path), page.path).toBe(false);
      ids.add(page.id);
      paths.add(page.path);
      if (page.group) expect(pages.some((parent) => parent.id === page.group), page.group).toBe(true);
    }
    expect(pages.filter((page) => !page.group).map((page) => page.id)).toEqual([
      'homepage', 'products', 'request', 'solutions', 'why-mysos', 'success-stories', 'resources',
    ]);
  });

  it('follows the content: a new product is a new page', () => {
    const added = structuredClone(content);
    added.productData.catalogue.push({ id: 'qa_tee', public: { name: 'QA Tee', slug: 'qa-tee', visible: true } });
    const page = sitePages(added).find((item) => item.id === 'product-qa_tee');
    expect(page).toEqual({ id: 'product-qa_tee', label: 'QA Tee', path: 'products/qa-tee/', group: 'products' });
  });
});
