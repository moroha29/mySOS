import React from 'react';
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

// Stand-in for src/data/googleReviews.json, filled per test, so these checks
// hold whatever the daily refresh has committed to the real file.
const reviewsFile = vi.hoisted(() => ({}));
vi.mock('../src/data/googleReviews.json', () => ({ default: reviewsFile }));

import StoriesPage from '../src/public/pages/StoriesPage';
import { Testimonials } from '../src/public/components/Ui';
import { GOOGLE_REVIEWS_URL } from '../src/utils/googleReviews';

const EMPTY = { source: 'google-business-profile', fetchedAt: null, averageRating: null, totalReviewCount: null, reviews: [] };
const WITH_REVIEWS = {
  source: 'google-business-profile',
  averageRating: 4.8,
  totalReviewCount: 123,
  reviews: [
    { id: 'r1', author: 'Jamie Tan', photoUrl: 'https://lh3.googleusercontent.com/a/photo', rating: 5, text: 'Great shirts, fast turnaround.', createTime: '2026-03-05T10:00:00Z' },
    { id: 'r2', author: 'A Google user', photoUrl: '', rating: 2, text: 'Delivery was late.', createTime: '2026-02-01T10:00:00Z' },
  ],
};

function useReviewsFile(data) {
  for (const key of Object.keys(reviewsFile)) delete reviewsFile[key];
  Object.assign(reviewsFile, structuredClone(data));
}

const googleLink = GOOGLE_REVIEWS_URL.replaceAll('&', '&amp;');
const render = (element) => renderToStaticMarkup(element);

afterEach(() => useReviewsFile(EMPTY));

describe('before Google approves API access', () => {
  it('the review section shows the heading and a Google link, nothing else', () => {
    useReviewsFile(EMPTY);
    const markup = render(<Testimonials />);
    expect(markup).toContain('What our clients say');
    expect(markup).toContain(`href="${googleLink}"`);
    expect(markup).toContain('Read all reviews on Google');
    expect(markup).not.toContain('review-card');
    expect(markup).not.toContain('review-rail');
    expect(markup).not.toContain('rating-value');
  });

  it('the stories reviews row shows the heading and a Google link, nothing else', () => {
    useReviewsFile(EMPTY);
    const markup = render(<StoriesPage />);
    expect(markup).toContain('class="stories-reviews is-empty"');
    expect(markup).toContain(`href="${googleLink}"`);
    expect(markup).toContain('View all Google reviews');
    expect(markup).not.toContain('class="stories-review"');
    expect(markup).not.toContain('stories-reviews-rating');
    expect(markup).not.toContain('stories-reviews-arrows');
    expect(markup).not.toMatch(/\bundefined\b/);
  });
});

describe('with reviews from Google', () => {
  it('shows each review with its reviewer, stars, date and a link to Google', () => {
    useReviewsFile({ ...WITH_REVIEWS, fetchedAt: new Date().toISOString() });
    const markup = render(<Testimonials />);
    expect(markup).toContain('Great shirts, fast turnaround.');
    expect(markup).toContain('Jamie Tan');
    expect(markup).toContain('src="https://lh3.googleusercontent.com/a/photo"');
    expect(markup).toMatch(/referrerpolicy="no-referrer"/i);
    expect(markup).toContain('Mar 2026');
    expect(markup).toContain('>AG<');
    expect(markup).toContain('4.8');
    expect(markup).toContain('123');
    // A two-star review is shown like any other.
    expect(markup).toContain('Delivery was late.');
    expect(markup.split(`href="${googleLink}"`).length - 1).toBeGreaterThanOrEqual(3);
  });

  it('nothing showing a review, the rating or the count is editable in the manager', () => {
    useReviewsFile({ ...WITH_REVIEWS, fetchedAt: new Date().toISOString() });
    const markup = render(<Testimonials />);
    const editablePaths = [...markup.matchAll(/data-cms-paths?="([^"]*)"/g)].map((match) => match[1]);
    expect(editablePaths.join(' ')).not.toMatch(/testimonials|reviewSummary|googleReviews/);
    // Only the surrounding wording is: the heading and the labels.
    expect(editablePaths.every((path) => /headings|labels/.test(path))).toBe(true);
    expect(markup).not.toMatch(/data-cms-path="[^"]*"[^>]*>Great shirts/);
  });

  it('the stories reviews row shows the Google rating and the review cards', () => {
    useReviewsFile({ ...WITH_REVIEWS, fetchedAt: new Date().toISOString() });
    const markup = render(<StoriesPage />);
    expect(markup).toContain('Great shirts, fast turnaround.');
    expect(markup).toContain('Jamie Tan');
    expect(markup).toContain('class="stories-reviews-score">4.8<');
    expect(markup).toContain('on Google');
    expect(markup.match(/class="stories-review"/g)).toHaveLength(2);
    // Two cards fit side by side, so the arrows only appear when there are more.
    expect(markup).not.toContain('stories-reviews-arrows');
  });
});

describe("Google's 30-day storage rule on the page", () => {
  it('drops a stale copy after hydration, not during render', () => {
    // The prerendered page and the first browser render must match, so the
    // age check cannot run during render. It hides the reviews from an effect.
    const ui = readFileSync(new URL('../src/public/components/Ui.jsx', import.meta.url), 'utf8');
    expect(ui).toMatch(/useEffect\(\(\) => \{\s*if \(available && !isFresh\(googleReviews\)\) setExpired\(true\);\s*\}, \[available\]\);/);
    expect(ui).toContain('return available && !expired ? googleReviews : null;');
  });
});
