import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';

import productData from '../src/data/productData.json';
import solutions from '../src/data/solutions.json';
import successStories from '../src/data/successStories.json';
import resources from '../src/data/resources.json';
import siteContent from '../src/data/siteContent.json';
import { sitePages } from '../scripts/sitePages.mjs';
import { PRIVATE_PATHS, SITE_ORIGIN, SITE_SHARE_IMAGE, headTags, leadImage, pageMeta, robotsTxt, sitemapXml } from '../scripts/pageMeta.mjs';

/*
 * What a page says about itself to a search engine and to a shared link.
 *
 * All 73 prerendered pages carried one title — "MySOS | Custom Merchandise,
 * Made Simple" — three descriptions between them, no canonical address and no
 * share card, so a product and a success story were the same result in Google,
 * and a link pasted into WhatsApp arrived as a bare URL.
 */

const content = { productData, solutions, successStories, resources, siteContent };
const pages = sitePages(content);
const meta = pages.map((page) => pageMeta(page, content));
const at = (path) => meta.find((item) => item.route === path);

// Whichever ones the site happens to hold: nothing here names a product or a
// story, so renaming one in the portal cannot fail this check.
const product = productData.catalogue.find((item) => item.public.visible);
const story = successStories[0];
const solution = solutions[0];
const article = resources.articles[0];

describe('what each page says about itself', () => {
  it('gives every page a title of its own, which is the name it already has', () => {
    const titles = meta.map((item) => item.title);
    expect(new Set(titles).size).toBe(titles.length);
    expect(at('/').title).toBe('MySOS | Custom Merchandise, Made Simple');
    // Read from the content, not written out here: a page renamed in the
    // portal must not fail this check, or the rename cannot be published.
    for (const page of pages.filter((item) => item.path)) {
      expect(at(`/${page.path}`).title, page.path).toBe(`${page.label} | MySOS`);
    }
    expect(at(`/success-stories/${story.slug}/`).title).toBe(`${story.title} | MySOS`);
  });

  it('describes a page in its own words, not the site\'s', () => {
    // Each one is a line the page already shows, so renaming a product in the
    // portal moves its search result with it.
    expect(at(`/products/${product.public.slug}/`).description).toBe(product.public.description);
    expect(at(`/success-stories/${story.slug}/`).description).toBe(story.summary);
    expect(at(`/solutions/${solution.id}/`).description).toBe(solution.description);
    expect(at(`/resources/${article.slug}/`).description).toBe(article.summary);
    expect(at('/why-mysos/').description).toBe(siteContent.pages.why.heroLead);
    expect(at('/').description).toBe(siteContent.headings.heroLead);
    // And no page is left with nothing to say.
    expect(meta.filter((item) => !item.description)).toEqual([]);
  });

  it('keeps a description to one readable line', () => {
    const long = { ...content, siteContent: { ...siteContent, pages: { ...siteContent.pages, why: { heroLead: `${'word '.repeat(60)}end` } } } };
    const cut = pageMeta(pages.find((page) => page.path === 'why-mysos/'), long).description;
    expect(cut.length).toBeLessThanOrEqual(160);
    // Cut between words, not through one, and not left on a comma.
    expect(cut.endsWith('…')).toBe(true);
    expect(cut).not.toMatch(/[ ,;:]…$/);
    for (const item of meta) {
      expect(item.description, item.route).not.toMatch(/[\n\r]|\s{2}/);
      expect(item.description.length, item.route).toBeLessThanOrEqual(160);
    }
  });

  it('gives every page its own address, and says which kind of thing it is', () => {
    for (const item of meta) expect(item.canonical).toBe(`${SITE_ORIGIN}${item.route}`);
    expect(new Set(meta.map((item) => item.canonical)).size).toBe(meta.length);
    // A guide and a story are pieces of writing; a product is a page.
    expect(at(`/resources/${article.slug}/`).type).toBe('article');
    expect(at(`/success-stories/${story.slug}/`).type).toBe('article');
    expect(at(`/products/${product.public.slug}/`).type).toBe('website');
    expect(at('/success-stories/').type).toBe('website');
  });
});

describe('the head a page carries', () => {
  const tags = headTags(at(`/products/${product.public.slug}/`), { image: '/assets/tote-abc123.jpg' });

  it('carries the title, the description, the address and the share card', () => {
    expect(tags).toContain(`<title>${product.public.name} | MySOS</title>`);
    expect(tags).toContain(`<link rel="canonical" href="${SITE_ORIGIN}/products/${product.public.slug}/" />`);
    expect(tags).toContain(`<meta property="og:title" content="${product.public.name} | MySOS" />`);
    expect(tags).toContain('<meta property="og:image" content="https://mysourceofsolutions.com/assets/tote-abc123.jpg" />');
    expect(tags).toContain('<meta name="twitter:card" content="summary_large_image" />');
    // A share card is fetched by a server with no page to resolve a path
    // against, so the picture is given whole.
    expect(tags).not.toMatch(/content="\/assets/);
  });

  it('asks for the small card when there is no picture, rather than an empty one', () => {
    const without = headTags(at('/request/'));
    expect(without).toContain('<meta name="twitter:card" content="summary" />');
    expect(without).not.toContain('og:image');
  });

  it('escapes what it writes', () => {
    const quoted = headTags({ ...at('/'), title: 'A "quoted" & <tagged> name' });
    expect(quoted).toContain('content="A &quot;quoted&quot; &amp; &lt;tagged&gt; name"');
    expect(quoted).not.toContain('<tagged>');
  });
});

describe('the picture a shared link shows', () => {
  // Read before the build renames the files, because hashed, every picture is
  // just a .png and the folder is the only thing that says what it is for.
  const resolve = (source) => `/assets/${source.split('/').pop().replace('.jpg', '-hash.jpg').replace('.png', '-hash.png')}`;

  it('takes the page\'s own photograph, over the logo above it', () => {
    const markup = '<img src="/src/assets/images/brand/wordmark.png"/><img src="/src/assets/images/logos/ntu.png"/>'
      + '<img src="/src/assets/images/products/canvas-tote-bag.jpg"/>';
    expect(leadImage(markup, resolve)).toBe('/assets/canvas-tote-bag-hash.jpg');
  });

  it('falls back to the website\'s own picture when a page is drawn rather than photographed', () => {
    // The stories and the products still waiting for a photo.
    const drawn = '<img src="/src/assets/images/brand/wordmark.png"/><svg></svg>';
    expect(leadImage(drawn, resolve)).toBe('/assets/why-hero-hash.jpg');
    expect(SITE_SHARE_IMAGE).toMatch(/^\/src\/assets\/images\/scenes\//);
  });

  it('gives nothing rather than a broken address when the build has no such file', () => {
    expect(leadImage('<img src="/src/assets/images/brand/wordmark.png"/>', () => undefined)).toBe('');
  });
});

describe('somewhere for a search engine to start', () => {
  const routes = pages.map((page) => `/${page.path}`);
  const xml = sitemapXml(routes);
  const robots = robotsTxt();

  it('lists every page of the website', () => {
    for (const route of routes) expect(xml).toContain(`<loc>${SITE_ORIGIN}${route}</loc>`);
    expect([...xml.matchAll(/<url>/g)]).toHaveLength(routes.length);
    expect(xml).toMatch(/^<\?xml version="1\.0" encoding="UTF-8"\?>/);
    expect(xml).toContain('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"');
  });

  it('keeps the quotation tools out of it', () => {
    // They are working pages for the business, and already say noindex.
    for (const path of PRIVATE_PATHS) {
      expect(xml).not.toContain(path);
      expect(robots).toContain(`Disallow: ${path}`);
    }
    expect(robots).toContain(`Sitemap: ${SITE_ORIGIN}/sitemap.xml`);
  });

  it('is written by the build, into the site', async () => {
    const prerender = await readFile(new URL('../scripts/prerender.mjs', import.meta.url), 'utf8');
    expect(prerender).toContain("writeFile(path.join(dist, 'sitemap.xml')");
    expect(prerender).toContain("writeFile(path.join(dist, 'robots.txt')");
    // The template's own title and description are replaced, not added to:
    // two of each in a page and a search engine picks whichever it likes.
    expect(prerender).toMatch(/const shell = template\.replace\(HEAD_MARKER/);
    expect(prerender).toContain('{{head}}');
    // Two pages that would share a title stop the build.
    expect(prerender).toContain('would both be titled');
  });
});
