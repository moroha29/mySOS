/*
 * Google reviews, shared by the daily refresh (scripts/fetch-google-reviews.mjs)
 * and the review slider. Plain functions over plain data, so Node, the browser
 * and the tests all use the same rules.
 *
 * Source: the Google Business Profile API, reviews.list. Each review looks like
 *   { reviewId, reviewer: { displayName, profilePhotoUrl, isAnonymous },
 *     starRating: "ONE" … "FIVE", comment, createTime, updateTime }
 */

export const GOOGLE_REVIEWS_NOTE = "Written by scripts/fetch-google-reviews.mjs from the Google Business Profile API. Do not edit by hand: the daily refresh overwrites it, and Google's terms do not allow changing review content.";

/*
 * Where "Read all reviews on Google" goes: MySOS's listing reviews on Google
 * Search. It lives in code rather than content, so the website manager cannot
 * point it anywhere else.
 */
export const GOOGLE_REVIEWS_URL = 'https://www.google.com/search?q=mysourceofsolutions&ludocid=15290863019161496116#lrd=0x165bd792f59b5b9:0xd4340ee6c6472a34,1,,,,';

/** How many reviews the slider carries. The rest stay one click away on Google. */
export const MAX_DISPLAYED_REVIEWS = 30;

/** Business Profile API policy: stored content may be kept for at most 30 calendar days. */
export const MAX_STORED_AGE_DAYS = 30;

/** An unchanged file is still rewritten this often, so it never approaches the limit. */
export const HEARTBEAT_DAYS = 7;

const DAY_MS = 24 * 60 * 60 * 1000;
const STARS = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 };

const timeOf = (value) => {
  const time = Date.parse(value);
  return Number.isFinite(time) ? time : 0;
};

export const starsFromEnum = (value) => STARS[value] ?? 0;

export function normalizeReview(review = {}) {
  const reviewer = review.reviewer ?? {};
  const name = String(reviewer.displayName ?? '').trim();
  const anonymous = Boolean(reviewer.isAnonymous) || !name;
  return {
    id: String(review.reviewId ?? review.name ?? ''),
    author: anonymous ? 'A Google user' : name,
    photoUrl: anonymous ? '' : String(reviewer.profilePhotoUrl ?? ''),
    rating: starsFromEnum(review.starRating),
    // Only the ends are trimmed. The reviewer's words, line breaks included,
    // are shown exactly as written.
    text: String(review.comment ?? '').trim(),
    createTime: String(review.createTime ?? ''),
  };
}

/*
 * What the site stores. Reviews without written text still count toward
 * Google's average rating and total, which come from the API as-is, but have
 * nothing to show on a card. Nothing is ever dropped for being a low rating.
 */
export function buildReviewsPayload({ reviews = [], averageRating, totalReviewCount } = {}, fetchedAt) {
  const shown = reviews
    .map(normalizeReview)
    .filter((review) => review.id && review.text && review.rating >= 1)
    .sort((left, right) => timeOf(right.createTime) - timeOf(left.createTime))
    .slice(0, MAX_DISPLAYED_REVIEWS);
  const rating = Number(averageRating);
  const count = Number(totalReviewCount);
  return {
    source: 'google-business-profile',
    fetchedAt,
    averageRating: Number.isFinite(rating) && rating > 0 ? Math.round(rating * 10) / 10 : null,
    totalReviewCount: Number.isInteger(count) && count >= 0 ? count : null,
    reviews: shown,
  };
}

const comparable = ({ _note, fetchedAt, ...rest } = {}) => JSON.stringify(rest);

export const sameReviews = (left, right) => comparable(left) === comparable(right);

/**
 * Write when the reviews changed, or when the saved copy is a week old. The
 * second keeps the stored data refreshed inside Google's 30 days without a
 * commit every single day.
 */
export function shouldWriteReviews(existing, next, now = Date.now()) {
  if (!existing || !sameReviews(existing, next)) return true;
  const fetched = Date.parse(existing.fetchedAt);
  return !Number.isFinite(fetched) || now - fetched >= HEARTBEAT_DAYS * DAY_MS;
}

/** Whether a stored copy may still be shown under the 30-day rule. */
export function isFresh(data, now = Date.now()) {
  const fetched = Date.parse(data?.fetchedAt);
  return Number.isFinite(fetched) && now - fetched <= MAX_STORED_AGE_DAYS * DAY_MS;
}

export const hasGoogleReviews = (data) => Array.isArray(data?.reviews) && data.reviews.length > 0;

// A fixed locale and time zone, so the prerendered page and the browser print
// the same date and hydration never sees a difference. "Mar 2026", not
// "3 weeks ago", for the same reason.
const monthYear = new Intl.DateTimeFormat('en-SG', { month: 'short', year: 'numeric', timeZone: 'UTC' });

export function formatReviewDate(value) {
  const time = Date.parse(value);
  return Number.isFinite(time) ? monthYear.format(time) : '';
}

export function initials(name) {
  return String(name ?? '').split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join('') || 'G';
}
