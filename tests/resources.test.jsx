import React from 'react';
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import resources from '../src/data/resources.json';
import siteContent from '../src/data/siteContent.json';
import siteConfig from '../src/data/siteConfig.json';
import PublicApp, { resolvePublicRoute } from '../src/public/PublicApp';

/*
 * The knowledge hub: a page of guides, and a page for each guide.
 *
 * The writing is MySOS's to change, so everything on both pages is content
 * with a path behind it rather than words in a component.
 */

const originalLocation = globalThis.location;
afterEach(() => {
  if (originalLocation === undefined) delete globalThis.location;
  else globalThis.location = originalLocation;
});

const renderAt = (pathname) => {
  globalThis.location = { pathname, search: '' };
  return renderToStaticMarkup(<PublicApp />);
};

const text = (markup) => markup.replace(/<[^>]*>/g, ' ').replace(/&#x27;/g, "'").replace(/&amp;/g, '&');

describe('the guides themselves', () => {
  it('each belong to a topic the hub offers', () => {
    const topics = new Set(resources.topics.map((topic) => topic.id));
    expect(resources.articles.length).toBeGreaterThan(3);
    for (const article of resources.articles) {
      expect(topics, article.slug).toContain(article.topic);
      expect(article.slug, article.title).toMatch(/^[a-z0-9-]+$/);
      expect(article.summary.length, article.slug).toBeGreaterThan(30);
      expect(article.sections.length, article.slug).toBeGreaterThan(1);
      for (const section of article.sections) {
        expect(section.heading, article.slug).toMatch(/\S/);
        expect(section.body.length, `${article.slug}: ${section.heading}`).toBeGreaterThan(0);
      }
    }
  });

  it('name no prices: a guide explains, the quote engine quotes', () => {
    const written = JSON.stringify(resources);
    expect(written).not.toMatch(/\$\s?\d|S\$|\bSGD\b/);
  });

  it('keep to what MySOS already says elsewhere on the site', () => {
    // The lead time and the artwork answer are the FAQ's, word for word where
    // they are quoted, so the two cannot drift apart.
    const guides = JSON.stringify(resources.articles);
    expect(guides).toContain('two to four weeks after artwork and sample approval');
    const faq = siteContent.faq.map((entry) => entry.answer).join(' ');
    expect(faq).toContain('two to four weeks after artwork and sample approval');
  });
});

describe('the hub', () => {
  const markup = () => renderAt('/mySOS/resources/');

  it('has a route, and every guide has one under it', () => {
    expect(resolvePublicRoute('/mySOS/resources/')).toEqual({ page: 'resources' });
    for (const article of resources.articles) {
      expect(resolvePublicRoute(`/mySOS/resources/${article.slug}/`)).toEqual({ page: 'guide', slug: article.slug });
    }
    expect(resolvePublicRoute('/mySOS/resources/not-a-guide/')).toEqual({ page: 'not-found' });
  });

  it('opens with the search and the topics, and lists the guides', () => {
    const html = markup();
    expect(html).toContain('class="resources-hero"');
    expect(html).toContain('class="resources-search"');
    expect(html).toContain('class="topic-row"');
    for (const topic of resources.topics) expect(text(html)).toContain(topic.name);
    for (const article of resources.articles.slice(0, 6)) expect(text(html)).toContain(article.title);
  });

  it('is what the header and the footer point at', () => {
    const nav = siteConfig.navigation.find((item) => item.label === 'Resources');
    expect(nav.href).toBe('/mySOS/resources/');
    const links = siteContent.footer.resourceLinks.map((link) => link.href);
    expect(links).toContain('/mySOS/resources/');
    // Every other one lands on a guide that exists.
    for (const href of links.filter((link) => link !== '/mySOS/resources/')) {
      const slug = href.replace('/mySOS/resources/', '').replace(/\/$/, '');
      expect(resources.articles.some((article) => article.slug === slug), href).toBe(true);
    }
  });

  it('is prerendered, hub and guides alike', () => {
    const prerender = readFileSync(new URL('../scripts/prerender.mjs', import.meta.url), 'utf8');
    expect(prerender).toContain("'/resources/',");
    expect(prerender).toContain('...resources.articles.map((article) => `/resources/${article.slug}/`)');
  });
});

describe('one guide', () => {
  const first = resources.articles[0];
  const markup = () => renderAt(`/mySOS/resources/${first.slug}/`);

  it('carries its own words, and the contents beside them', () => {
    const html = markup();
    const plain = text(html);
    expect(plain).toContain(first.title);
    expect(plain).toContain(first.lead);
    expect(plain).toContain(first.quickAnswer);
    for (const section of first.sections) {
      expect(plain).toContain(section.heading);
      for (const paragraph of section.body) expect(plain).toContain(paragraph);
    }
    // The contents list is built from those headings, and each one is a target.
    expect(html).toContain('class="article-toc"');
    expect(html).toContain('id="how-each-method-works"');
    expect(html).toContain('href="#how-each-method-works"');
  });

  it('offers the guide before it and the one after', () => {
    const middle = resources.articles[1];
    globalThis.location = { pathname: `/mySOS/resources/${middle.slug}/`, search: '' };
    const html = renderToStaticMarkup(<PublicApp />);
    expect(html).toContain(`href="/mySOS/resources/${resources.articles[0].slug}/"`);
    expect(html).toContain(`href="/mySOS/resources/${resources.articles[2].slug}/"`);
  });

  it('is editable: every line of it has a content path', () => {
    const html = markup();
    for (const path of ['&quot;title&quot;', '&quot;lead&quot;', '&quot;quickAnswer&quot;', '&quot;sections&quot;', '&quot;imageCaption&quot;']) {
      expect(html, path).toContain(path);
    }
  });
});
