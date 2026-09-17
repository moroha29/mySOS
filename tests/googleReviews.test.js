import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import siteContent from '../src/data/siteContent.json';
import {
  buildPlacesPayload,
  buildReviewsPayload,
  formatReviewDate,
  GOOGLE_REVIEWS_URL,
  HEARTBEAT_DAYS,
  initials,
  isFresh,
  MAX_DISPLAYED_REVIEWS,
  MAX_PLACES_REVIEWS,
  MAX_STORED_AGE_DAYS,
  normalizePlacesReview,
  normalizeReview,
  preferReviews,
  sameReviews,
  shouldWriteReviews,
  starsFromEnum,
} from '../src/utils/googleReviews';

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.parse('2026-09-14T00:00:00Z');
const DATA_FILE = new URL('../src/data/googleReviews.json', import.meta.url);

// The shape reviews.list returns.
const apiReview = (id, overrides = {}) => ({
  reviewId: id,
  reviewer: { displayName: `Reviewer ${id}`, profilePhotoUrl: `https://lh3.googleusercontent.com/${id}`, isAnonymous: false },
  starRating: 'FIVE',
  comment: `Review ${id}`,
  createTime: '2026-01-01T00:00:00Z',
  ...overrides,
});

describe('reading the Business Profile API', () => {
  it('maps Google star ratings to numbers', () => {
    expect(['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE'].map(starsFromEnum)).toEqual([1, 2, 3, 4, 5]);
    expect(starsFromEnum('STAR_RATING_UNSPECIFIED')).toBe(0);
  });

  it('credits an anonymous reviewer without a name or photo', () => {
    const review = normalizeReview(apiReview('a', { reviewer: { displayName: 'Hidden', profilePhotoUrl: 'https://x/y', isAnonymous: true } }));
    expect(review.author).toBe('A Google user');
    expect(review.photoUrl).toBe('');
  });

  it("keeps the reviewer's words exactly, trimming only the ends", () => {
    const review = normalizeReview(apiReview('w', { comment: '  Great shirts.\n\n  Fast delivery!  ' }));
    expect(review.text).toBe('Great shirts.\n\n  Fast delivery!');
  });
});

describe('what the site stores', () => {
  it('keeps reviews with written text, newest first, up to the cap', () => {
    const reviews = [
      apiReview('old', { createTime: '2025-01-01T00:00:00Z' }),
      apiReview('new', { createTime: '2026-06-01T00:00:00Z' }),
      apiReview('stars-only', { comment: '' }),
      apiReview('unrated', { starRating: 'STAR_RATING_UNSPECIFIED' }),
      ...Array.from({ length: MAX_DISPLAYED_REVIEWS + 5 }, (_, i) => apiReview(`bulk-${i}`)),
    ];
    const payload = buildReviewsPayload({ reviews, averageRating: 4.8, totalReviewCount: 40 }, '2026-09-14T00:00:00Z');
    expect(payload.reviews).toHaveLength(MAX_DISPLAYED_REVIEWS);
    expect(payload.reviews[0].id).toBe('new');
    expect(payload.reviews.some((review) => review.id === 'stars-only' || review.id === 'unrated')).toBe(false);
  });

  it('never drops a review for being a low rating', () => {
    const payload = buildReviewsPayload({ reviews: [apiReview('low', { starRating: 'ONE', comment: 'Late delivery.' })] }, 'now');
    expect(payload.reviews.map((review) => [review.id, review.rating])).toEqual([['low', 1]]);
  });

  it("uses Google's own rating and count, rounded to one decimal", () => {
    const payload = buildReviewsPayload({ reviews: [], averageRating: 4.8667, totalReviewCount: 57 }, 'now');
    expect(payload.averageRating).toBe(4.9);
    expect(payload.totalReviewCount).toBe(57);
    expect(buildReviewsPayload({}, 'now')).toMatchObject({ averageRating: null, totalReviewCount: null, reviews: [] });
  });
});

// The shape places.get returns.
const placeReview = (id, overrides = {}) => ({
  name: `places/p/reviews/${id}`,
  rating: 5,
  text: { text: `Review ${id}`, languageCode: 'en' },
  authorAttribution: { displayName: `Reviewer ${id}`, photoUri: `https://lh3.googleusercontent.com/${id}`, uri: 'https://maps.google.com/' },
  publishTime: '2026-01-01T00:00:00Z',
  ...overrides,
});

describe('the Places API fallback', () => {
  it('stores a Places review in the same shape as a Business Profile one', () => {
    const review = normalizePlacesReview(placeReview('a'));
    expect(review).toEqual({
      id: 'places/p/reviews/a',
      author: 'Reviewer a',
      photoUrl: 'https://lh3.googleusercontent.com/a',
      rating: 5,
      text: 'Review a',
      createTime: '2026-01-01T00:00:00Z',
    });
    expect(Object.keys(review)).toEqual(Object.keys(normalizeReview(apiReview('a'))));
  });

  it("shows what the reviewer wrote, not Google's translation of it", () => {
    const review = normalizePlacesReview(placeReview('t', { text: { text: 'Very good' }, originalText: { text: 'Sangat bagus' } }));
    expect(review.text).toBe('Sangat bagus');
  });

  it('credits a reviewer Google gives no name for', () => {
    const review = normalizePlacesReview(placeReview('n', { authorAttribution: { photoUri: 'https://x/y' } }));
    expect(review.author).toBe('A Google user');
    expect(review.photoUrl).toBe('');
  });

  it("uses the listing's rating and count, and marks where the reviews came from", () => {
    const payload = buildPlacesPayload({
      reviews: [placeReview('new', { publishTime: '2026-06-01T00:00:00Z' }), placeReview('old'), placeReview('empty', { text: { text: '' }, originalText: { text: '' } })],
      rating: 4.8667,
      userRatingCount: 57,
    }, 'now');
    expect(payload.source).toBe('google-places');
    expect(payload.averageRating).toBe(4.9);
    expect(payload.totalReviewCount).toBe(57);
    expect(payload.reviews.map((review) => review.id)).toEqual(['places/p/reviews/new', 'places/p/reviews/old']);
    // Google never returns more than five, so the 30 cap never bites here.
    expect(MAX_PLACES_REVIEWS).toBeLessThan(MAX_DISPLAYED_REVIEWS);
  });
});

describe('choosing between the two sources', () => {
  const profile = buildReviewsPayload({ reviews: [apiReview('p')], averageRating: 5, totalReviewCount: 9 }, 'now');
  const empty = buildReviewsPayload({ reviews: [], averageRating: 5, totalReviewCount: 9 }, 'now');
  const places = buildPlacesPayload({ reviews: [placeReview('x')], rating: 5, userRatingCount: 9 }, 'now');

  it('keeps the Business Profile when it has reviews', () => {
    expect(preferReviews(profile, places).source).toBe('google-business-profile');
  });

  it('falls back to Places when the Business Profile is empty or failed', () => {
    expect(preferReviews(empty, places).source).toBe('google-places');
    expect(preferReviews(undefined, places).source).toBe('google-places');
  });

  it('keeps refreshing the rating when neither source has reviews to show', () => {
    expect(preferReviews(empty, undefined)).toBe(empty);
    expect(preferReviews(undefined, undefined)).toBe(null);
  });
});

describe("Google's 30-day storage rule", () => {
  const payload = (text, fetchedAt) => ({ _note: 'n', ...buildReviewsPayload({ reviews: [apiReview('r', { comment: text })], averageRating: 5, totalReviewCount: 1 }, fetchedAt) });

  it('writes when the reviews changed, and otherwise at least weekly', () => {
    const next = payload('Same', new Date(NOW).toISOString());
    expect(shouldWriteReviews(null, next, NOW)).toBe(true);
    expect(shouldWriteReviews(payload('Different', new Date(NOW - DAY).toISOString()), next, NOW)).toBe(true);
    expect(shouldWriteReviews(payload('Same', new Date(NOW - 2 * DAY).toISOString()), next, NOW)).toBe(false);
    expect(shouldWriteReviews(payload('Same', new Date(NOW - HEARTBEAT_DAYS * DAY).toISOString()), next, NOW)).toBe(true);
  });

  it('compares reviews, not the note or the fetch time', () => {
    expect(sameReviews({ ...payload('Same', 'a'), _note: 'x' }, { ...payload('Same', 'b'), _note: 'y' })).toBe(true);
  });

  it('stops treating a stored copy as showable after 30 days', () => {
    expect(isFresh({ fetchedAt: new Date(NOW - (MAX_STORED_AGE_DAYS - 1) * DAY).toISOString() }, NOW)).toBe(true);
    expect(isFresh({ fetchedAt: new Date(NOW - (MAX_STORED_AGE_DAYS + 1) * DAY).toISOString() }, NOW)).toBe(false);
    expect(isFresh({ fetchedAt: null }, NOW)).toBe(false);
  });
});

describe('display helpers', () => {
  it('prints a date the same way on the server and in the browser', () => {
    expect(formatReviewDate('2026-03-05T10:00:00Z')).toBe('Mar 2026');
    expect(formatReviewDate('not a date')).toBe('');
  });

  it('falls back to initials when a reviewer has no photo', () => {
    expect(initials('Jamie Lee Tan')).toBe('JL');
    expect(initials('A Google user')).toBe('AG');
    expect(initials('')).toBe('G');
  });
});

describe('no hand-typed reviews', () => {
  it('site content holds no reviews, rating, count or review link', () => {
    // The three testimonials were placeholders with invented names. Reviews now
    // come only from Google, so the manager has nothing it could edit or republish.
    expect(siteContent).not.toHaveProperty('testimonials');
    expect(siteContent).not.toHaveProperty('reviewSummary');
    expect(siteContent).not.toHaveProperty('_reviewsNote');
  });

  it('keeps the wording around the reviews editable', () => {
    expect(siteContent.headings.reviewsHeading).toBeTruthy();
    for (const key of ['readReviewsOnGoogleLabel', 'reviewsFallbackLabel', 'reviewsCountPrefix', 'reviewsCountSuffix']) {
      expect(siteContent.labels[key], key).toBeTruthy();
    }
  });

  it('links to the MySOS listing on Google from code, not content', () => {
    expect(GOOGLE_REVIEWS_URL).toMatch(/^https:\/\/www\.google\.com\/search\?/);
    expect(GOOGLE_REVIEWS_URL).toContain('ludocid=15290863019161496116');
  });
});

describe('the daily refresh', () => {
  const run = (script, env) => spawnSync(process.execPath, [script], {
    cwd: new URL('..', import.meta.url),
    encoding: 'utf8',
    env: { ...process.env, GOOGLE_CLIENT_ID: '', GOOGLE_CLIENT_SECRET: '', GOOGLE_REFRESH_TOKEN: '', ...env },
  });

  it('does nothing without the owner key, and leaves the review file untouched', () => {
    const before = readFileSync(DATA_FILE, 'utf8');
    const result = run('scripts/fetch-google-reviews.mjs');
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain('skipped');
    expect(readFileSync(DATA_FILE, 'utf8')).toBe(before);
  });

  it('says which source it skipped', () => {
    const result = run('scripts/fetch-google-reviews.mjs', { GOOGLE_PLACES_API_KEY: '', GOOGLE_PLACE_ID: '' });
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain('Business Profile not used: no Business Profile secrets');
    expect(result.stdout).toContain('Places not used: no Places key');
  });

  // The key alone is enough: the script finds MySOS's own listing by search.
  const stubbed = (env) => spawnSync(process.execPath, ['--import', './tests/fixtures/stubGooglePlaces.mjs', 'scripts/fetch-google-reviews.mjs', '--dry-run'], {
    cwd: new URL('..', import.meta.url),
    encoding: 'utf8',
    env: { ...process.env, GOOGLE_CLIENT_ID: '', GOOGLE_CLIENT_SECRET: '', GOOGLE_REFRESH_TOKEN: '', GOOGLE_PLACE_ID: '', GOOGLE_PLACES_API_KEY: 'test-key', ...env },
  });

  it('with only an API key, finds MySOS’s own listing and reads its reviews', () => {
    const result = stubbed({ STUB_PLACES: 'own' });
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain('STUB search My Source of Solutions Singapore');
    // The look-alike listed first is passed over for the one with MySOS's cid.
    expect(result.stdout).toContain('Place id ChIJ-mysos — save it as the GOOGLE_PLACE_ID variable');
    expect(result.stdout).toContain('STUB details ChIJ-mysos');
    expect(result.stdout).toContain('Saving 1 review from google-places.');
  });

  it('never reads reviews from a listing that is not MySOS’s', () => {
    const result = stubbed({ STUB_PLACES: 'lookalike' });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Could not find MySOS's own Google listing");
    expect(result.stderr).toContain('Source Solutions Pte Ltd');
    expect(result.stdout).not.toContain('STUB details');
  });

  it('a saved place id skips the search', () => {
    const result = stubbed({ STUB_PLACES: 'own', GOOGLE_PLACE_ID: 'ChIJ-saved' });
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).not.toContain('STUB search');
    expect(result.stdout).toContain('STUB details ChIJ-saved');
  });

  it('the owner sign-in script explains what it needs before starting', () => {
    const result = run('scripts/google-reviews-authorize.mjs');
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('GOOGLE_CLIENT_ID');
  });

  it('the workflow runs daily, commits only the review file, then deploys', () => {
    const workflow = readFileSync(new URL('../.github/workflows/refresh-google-reviews.yml', import.meta.url), 'utf8');
    expect(workflow).toMatch(/cron: '17 19 \* \* \*'/);
    expect(workflow).toContain('workflow_dispatch:');
    for (const secret of ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REFRESH_TOKEN', 'GOOGLE_PLACES_API_KEY']) {
      expect(workflow).toContain(`secrets.${secret}`);
    }
    expect(workflow).toContain('vars.GOOGLE_PLACE_ID');
    expect(workflow).toContain('git add src/data/googleReviews.json');
    // A push made with GITHUB_TOKEN never starts the deploy's on: push, so the
    // deploy has to be dispatched explicitly, which needs actions: write.
    expect(workflow).toContain('gh workflow run deploy.yml');
    expect(workflow).toMatch(/actions: write/);
  });
});

describe("finding MySOS's own listing", () => {
  it("matches on the listing's Maps number, not its name", async () => {
    const { findOwnListing, GOOGLE_LISTING_CID } = await import('../src/utils/googleReviews');
    expect(GOOGLE_REVIEWS_URL).toContain(`ludocid=${GOOGLE_LISTING_CID}`);
    const own = { id: 'a', displayName: { text: 'Anything' }, googleMapsUri: `https://maps.google.com/?cid=${GOOGLE_LISTING_CID}` };
    expect(findOwnListing([{ id: 'b', displayName: { text: 'My Source of Solutions' }, googleMapsUri: 'https://maps.google.com/?cid=1' }, own])).toBe(own);
    expect(findOwnListing([{ id: 'c', googleMapsUri: 'not a url' }, {}])).toBe(null);
    expect(findOwnListing()).toBe(null);
  });
});
