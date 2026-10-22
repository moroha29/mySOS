/*
 * Prerenders every public route to static HTML after `vite build`.
 *
 * Two problems this solves:
 *
 *  1. GitHub Pages was serving a 716-byte shell (`<div id="root">` plus a
 *     module script), so the page was empty until JavaScript ran — bad for
 *     search engines and slow to first paint on a marketing site.
 *
 *  2. The website manager previews a site by fetching its HTML into a srcdoc
 *     iframe, which inherits the manager's `script-src 'self'` CSP. A remote
 *     module script is blocked there, so a client-rendered shell previews as a
 *     blank page. Real HTML renders with no JavaScript at all.
 *
 * The client still boots normally on top of the markup; this only changes what
 * arrives before JavaScript does.
 */

import { createServer } from 'vite';
import { resolveAssetUrls } from './prerenderAssets.mjs';
import { sitePages } from './sitePages.mjs';
import { headTags, leadImage, pageMeta, robotsTxt, sitemapXml } from './pageMeta.mjs';
import { renderToString } from 'react-dom/server';
import React from 'react';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const BASE = '';

const stories = JSON.parse(await readFile(path.join(root, 'src/data/successStories.json'), 'utf8'));
const solutions = JSON.parse(await readFile(path.join(root, 'src/data/solutions.json'), 'utf8'));
const productData = JSON.parse(await readFile(path.join(root, 'src/data/productData.json'), 'utf8'));
const resources = JSON.parse(await readFile(path.join(root, 'src/data/resources.json'), 'utf8'));
const siteContent = JSON.parse(await readFile(path.join(root, 'src/data/siteContent.json'), 'utf8'));
// One list of pages, shared with the website manager (see sitePages.mjs).
const pages = sitePages({ productData, solutions, successStories: stories, resources });
const content = { productData, solutions, successStories: stories, resources, siteContent };

/*
 * Vite's dev SSR pipeline resolves `import.meta.glob(..., '?url')` to source
 * paths (/src/assets/images/logos/ntu.png), not the hashed build output. Those
 * paths 404 in dist, so every prerendered <img> has to be rewritten through the
 * client build's own manifest before the HTML is written.
 */
const manifest = JSON.parse(await readFile(path.join(dist, '.vite/manifest.json'), 'utf8'));
const assetUrls = new Map();
for (const [source, entry] of Object.entries(manifest)) {
  if (entry?.file) assetUrls.set(`/${source}`, `${BASE}/${entry.file}`);
}

const template = await readFile(path.join(dist, 'index.html'), 'utf8');
const ROOT_MARKER = '<div id="root"></div>';
if (!template.includes(ROOT_MARKER)) {
  throw new Error('dist/index.html has no <div id="root"></div> to fill — did the build output change?');
}
/*
 * The head is written per page, so the one in the template is replaced rather
 * than added to: leaving it would put two titles and two descriptions in every
 * page, and a search engine picks whichever it likes.
 */
const HEAD_MARKER = /\s*<meta name="description"[^>]*>\s*|\s*<title>[\s\S]*?<\/title>\s*/g;
if (!/<title>/.test(template)) throw new Error('dist/index.html has no <title> to replace');
const shell = template.replace(HEAD_MARKER, '\n    ').replace('</head>', '  {{head}}\n  </head>');

// Vite's SSR pipeline resolves the CSS and image imports the components use;
// a bare node import of PublicApp would fail on the first `import './x.css'`.
const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'warn' });
let written = 0;
try {
  const { default: PublicApp } = await vite.ssrLoadModule('/src/public/PublicApp.jsx');
  const originalLocation = globalThis.location;

  const titles = new Map();
  for (const page of pages) {
    const route = `/${page.path}`;
    // PublicApp reads globalThis.location to resolve its route, exactly as the
    // SSR smoke tests do.
    globalThis.location = { pathname: `${BASE}${route}`, search: '' };
    const markup = renderToString(React.createElement(PublicApp));
    if (!markup || markup.length < 200) throw new Error(`${route} rendered suspiciously little markup (${markup.length} chars)`);

    const resolved = resolveAssetUrls(markup, assetUrls, BASE);
    if (resolved.unresolved.length) {
      throw new Error(`${route}: ${resolved.unresolved.length} asset(s) not in the build manifest, e.g. ${resolved.unresolved[0]}`);
    }
    /*
     * Two pages sharing a title is what this is here to end, and a page with
     * nothing to say about itself is no better than the one line they all used
     * to share. Both stop the build rather than reaching the website.
     */
    const meta = pageMeta(page, content);
    if (titles.has(meta.title)) throw new Error(`${route} and ${titles.get(meta.title)} would both be titled "${meta.title}"`);
    if (!meta.description) throw new Error(`${route} has no description to give a search result`);
    titles.set(meta.title, route);

    const html = shell
      .replace(ROOT_MARKER, `<div id="root">${resolved.html}</div>`)
      .replace('{{head}}', headTags(meta, { image: leadImage(markup, (source) => assetUrls.get(source)) }));
    const outDir = path.join(dist, route === '/' ? '.' : route);
    await mkdir(outDir, { recursive: true });
    await writeFile(path.join(outDir, 'index.html'), html, 'utf8');
    written += 1;
    process.stdout.write(`  ${route.padEnd(42)} ${(html.length / 1024).toFixed(1)} kB\n`);
  }

  // Somewhere for a search engine to start, and the working pages kept out of it.
  await writeFile(path.join(dist, 'sitemap.xml'), sitemapXml(pages.map((page) => `/${page.path}`)), 'utf8');
  await writeFile(path.join(dist, 'robots.txt'), robotsTxt(), 'utf8');

  if (originalLocation === undefined) delete globalThis.location;
  else globalThis.location = originalLocation;
} finally {
  await vite.close();
}

console.log(`\nprerendered ${written} routes`);
