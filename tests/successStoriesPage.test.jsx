import React from 'react';
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import siteContent from '../src/data/siteContent.json';
import successStories from '../src/data/successStories.json';
import StoriesPage from '../src/public/pages/StoriesPage';

const originalLocation = globalThis.location;
afterEach(() => {
  if (originalLocation === undefined) delete globalThis.location;
  else globalThis.location = originalLocation;
});

const render = (search = '') => {
  globalThis.location = { pathname: '/mySOS/success-stories/', search };
  return renderToStaticMarkup(<StoriesPage />);
};

describe('Success Stories: All Projects', () => {
  it('shows one large project and four smaller ones', () => {
    const tiles = [...render().matchAll(/class="project-tile( is-large)?"/g)];
    expect(tiles).toHaveLength(Math.min(5, successStories.length));
    expect(tiles[0][1]).toBe(' is-large');
    expect(tiles.slice(1).every((tile) => !tile[1])).toBe(true);
  });

  it('badges each tile with its category and links it to the story', () => {
    const html = render();
    expect(html.match(/class="project-badge"/g)).toHaveLength(Math.min(5, successStories.length));
    expect(html).toContain(`href="/mySOS/success-stories/${successStories[0].slug}/"`);
  });

  it('pages through the projects', () => {
    const html = render();
    const pages = Math.ceil(successStories.length / 5);
    expect(html).toContain(`Showing 1–${Math.min(5, successStories.length)} of ${successStories.length} projects`);
    expect((html.match(/aria-label="Page \d+"/g) ?? []).length).toBe(pages > 1 ? pages : 0);
    expect(html).toMatch(/<button class="projects-prev" type="button" disabled=""/);
    expect(html).toMatch(/<button class="projects-next" type="button"(?! disabled)/);
  });

  it('keeps the category pills and drops the sort dropdown and quote panel', () => {
    const html = render();
    expect(html).toContain('All Projects');
    expect(html).not.toContain('sort-select');
    expect(html).not.toContain('quote-panel');
  });
});

describe('Success Stories: a category tab', () => {
  const schools = successStories.filter((story) => story.category === 'schools');

  it('features the first project with its facts and a link to the full story', () => {
    const html = render('?category=schools');
    expect(html).toContain('class="project-feature"');
    expect(html).toContain(schools[0].title);
    expect(html).toContain(schools[0].summary);
    for (const fact of schools[0].highlights) expect(html).toContain(fact.text);
    expect(html).toContain('Read Full Story');
    expect(html).toContain(`href="/mySOS/success-stories/${schools[0].slug}/"`);
    expect(html).not.toContain('project-tile');
  });

  it('lists every project in the category to pick from, first one selected', () => {
    const html = render('?category=schools');
    const items = [...html.matchAll(/class="project-picker-item( is-active)?"/g)];
    expect(items).toHaveLength(schools.length);
    expect(items[0][1]).toBe(' is-active');
    expect(html).toContain('Select a project');
  });
});

describe('project facts come from each story', () => {
  it('every story leads with its quantity', () => {
    for (const story of successStories) {
      expect(story.highlights[0].icon, story.slug).toBe('shirt');
      expect(story.highlights[0].text, story.slug).toMatch(new RegExp(`^${story.quantity} `));
    }
  });

  it('claims design support and on-time delivery only where the story shows it', () => {
    for (const story of successStories) {
      const texts = story.highlights.map((fact) => fact.text);
      expect(texts.includes('Design support'), story.slug).toBe(story.process.some((step) => /design|artwork/i.test(step)));
      expect(texts.includes('Delivered on time'), story.slug).toBe(story.outcomes.some((outcome) => /on[- ]time|before/i.test(outcome)));
    }
  });
});

describe('page wording and styling', () => {
  it('new wording is editable and the retired wording is gone', () => {
    const page = siteContent.pages.stories;
    for (const key of ['reviewsOnGoogleLabel', 'reviewsViewAllLabel', 'showingLabel', 'previousPageLabel', 'readFullStoryLabel', 'selectProjectLabel']) {
      expect(page[key], key).toBeTruthy();
    }
    for (const key of ['sortLatestLabel', 'sortOldestLabel', 'sortFieldLabel']) expect(page).not.toHaveProperty(key);
    expect(siteContent.scenes).not.toHaveProperty('testimonialImage');
  });

  it('tiles are black and white until pointed at, only on devices with a pointer', () => {
    const css = readFileSync(new URL('../src/public/public.css', import.meta.url), 'utf8');
    expect(css).toMatch(/@media \(hover: hover\) \{\s*\.project-tile \.scene img, \.project-tile \.scene svg \{ filter: grayscale\(1\); \}/);
    expect(css).not.toMatch(/\.quote-panel|\.sort-select/);
  });
});
