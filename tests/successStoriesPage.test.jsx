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
  globalThis.location = { pathname: '/success-stories/', search };
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
    expect(html).toContain(`href="/success-stories/${successStories[0].slug}/"`);
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
    expect(html).toContain(`href="/success-stories/${schools[0].slug}/"`);
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

  it('the category panel keeps the proportions of the design', () => {
    const css = readFileSync(new URL('../src/public/public.css', import.meta.url), 'utf8');
    // Measured off the design at 1586px: a 693px photo, a 506px column beside
    // it, and the three facts on one line.
    expect(css).toMatch(/\.project-feature \{[^}]*grid-template-columns: minmax\(0, 1\.37fr\) minmax\(0, 1fr\);/);
    expect(css).toMatch(/\.project-feature-media \.scene \{ height: 272px;/);
    expect(css).toMatch(/\.project-facts li \{[^}]*white-space: nowrap;/);
  });

  it('tiles are black and white until pointed at, only on devices with a pointer', () => {
    const css = readFileSync(new URL('../src/public/public.css', import.meta.url), 'utf8');
    expect(css).toMatch(/@media \(hover: hover\) \{\s*\.project-tile \.scene img, \.project-tile \.scene svg \{ filter: grayscale\(1\); \}/);
    expect(css).not.toMatch(/\.quote-panel|\.sort-select/);
  });
});

describe('the chapters of one story', () => {
  const css = readFileSync(new URL('../src/public/public.css', import.meta.url), 'utf8');
  const page = readFileSync(new URL('../src/public/pages/StoryDetailPage.jsx', import.meta.url), 'utf8');

  it('stays within reach on a narrow screen', () => {
    // Stacked above the story rather than beside it, the row of chapters
    // scrolled away with the first one and there was no way back to the
    // others without scrolling the whole story. It is pinned under the
    // header now, as it already was beside the story on a wide screen.
    const narrow = css.slice(css.indexOf('  .story-toc {', css.indexOf('@media (max-width: 1080px)')));
    expect(narrow.slice(0, 460)).toContain('position: sticky; top: var(--header-now);');
    // Under the header, never over it.
    expect(narrow.slice(0, 460)).toMatch(/z-index: 40/);
    expect(css).toMatch(/\.site-header \{ position: sticky; top: 0; z-index: 60/);
    // Something to sit on, so the story does not read through it.
    expect(narrow.slice(0, 460)).toContain('background: var(--surface)');
    // One line of the screen, not two: the label no longer wraps.
    expect(narrow).toContain('.story-toc > span { margin: 0 8px 0 0; white-space: nowrap; }');
  });

  it('follows the header down as it tightens', () => {
    // The header is 88px at rest and 72px once the page moves under it.
    // Pinned to the resting height, a strip of the story showed through the
    // gap between the two.
    expect(css).toContain('--header-now: var(--header-h);');
    expect(css).toContain('html.is-scrolled { --header-now: 72px; }');
    expect(css).toMatch(/html\.is-scrolled \.site-header \{ height: 72px/);
  });

  it('keeps the chapter being read in view along the row', () => {
    // The row is wider than a phone: by the fourth chapter the marked one was
    // off the right-hand end, so the row said you were on the first.
    expect(page).toContain('function useChapterInView(active)');
    expect(page).toContain("const marked = row?.querySelector('a.is-active');");
    // The row is scrolled, never the page.
    expect(page).toContain('row.scrollTo({ left: to');
    expect(page).not.toContain('.scrollIntoView(');
    // Beside the story there is nothing to scroll, so it does nothing there.
    expect(page).toContain('if (room < 4) return;');
    expect(page).toContain('<aside className="story-toc" ref={tocRef}>');
  });

  it('lands a chapter below the chrome rather than behind it', () => {
    expect(css).toContain('.narrative-block { scroll-margin-top: calc(var(--header-now) + 20px); }');
    const narrow = css.slice(css.indexOf('@media (max-width: 1080px)'));
    expect(narrow).toContain('.narrative-block { scroll-margin-top: calc(var(--header-now) + 72px); }');
  });
});
