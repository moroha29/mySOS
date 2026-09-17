/*
 * Google reviews, shared by the daily refresh (scripts/fetch-google-reviews.mjs)
 * and the review slider. Plain functions over plain data, so Node, the browser
 * and the tests all use the same rules.
 *
 * Two sources, one stored shape:
 *
 *  - the Google Business Profile API, reviews.list — every review the business
 *    has. Each looks like { reviewId, reviewer: { displayName,
 *    profilePhotoUrl, isAnonymous }, starRating: "ONE" … "FIVE", comment,
 *    createTime, updateTime }
 *  - the Places API (New), places.get — the five reviews Google shows on the
 *    listing, with no access approval to wait for. Each looks like { name,
 *    rating, text: { text }, authorAttribution: { displayName, photoUri },
 *    publishTime }
 *
 * The Business Profile is preferred; Places is the fallback when it has no
 * reviews to show (see preferReviews).
 */

export const GOOGLE_REVIEWS_NOTE = "Written by scripts/fetch-google-reviews.mjs from Google. Do not edit by hand: the daily refresh overwrites it, and Google's terms do not allow changing review content. The 'source' field says which API it came from.";

/*
 * Where "Read all reviews on Google" goes: MySOS's listing reviews on Google
 * Search. It lives in code rather than content, so the website manager cannot
 * point it anywhere else.
 */
export const GOOGLE_REVIEWS_URL = 'https://www.google.com/search?q=mysourceofsolutions&ludocid=15290863019161496116#lrd=0x165bd792f59b5b9:0xd4340ee6c6472a34,1,,,,';

/*
 * The listing's own number on Google Maps (the ludocid above). A place search
 * can return look-alikes, so the Places lookup keeps only the result whose
 * Maps link carries this number.
 */
export const GOOGLE_LISTING_CID = '15290863019161496116';
// Names the listing might be found under, tried in turn. The site's own Google
// link searches for the one-word name.
export const GOOGLE_LISTING_SEARCHES = ['mysourceofsolutions', 'My Source of Solutions Singapore', 'My Source of Solutions', 'MySOS custom merchandise Singapore'];

/** Picks MySOS's own listing out of a Places text search, or null. */
export function findOwnListing(places = [], cid = GOOGLE_LISTING_CID) {
  return places.find((place) => {
    try {
      return new URL(place?.googleMapsUri ?? '').searchParams.get('cid') === cid;
    } catch {
      return false;
    }
  }) ?? null;
}

/** How many reviews the slider carries. The rest stay one click away on Google. */
export const MAX_DISPLAYED_REVIEWS = 30;

/** All the Places API ever returns for a listing, however many reviews it has. */
export const MAX_PLACES_REVIEWS = 5;

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

/** A Places API review, in the same shape as a Business Profile one. */
export function normalizePlacesReview(review = {}) {
  const author = review.authorAttribution ?? {};
  const name = String(author.displayName ?? '').trim();
  const rating = Number(review.rating);
  return {
    id: String(review.name ?? ''),
    author: name || 'A Google user',
    photoUrl: name ? String(author.photoUri ?? '') : '',
    rating: Number.isFinite(rating) ? Math.round(rating) : 0,
    // originalText is the review as the reviewer wrote it; text can be
    // Google's translation of it.
    text: String(review.originalText?.text ?? review.text?.text ?? '').trim(),
    createTime: String(review.publishTime ?? ''),
  };
}

/*
 * What the site stores. Reviews without written text still count toward
 * Google's average rating and total, which come from the API as-is, but have
 * nothing to show on a card. Nothing is ever dropped for being a low rating.
 */
function payloadFrom(source, normalized, averageRating, totalReviewCount, fetchedAt) {
  const shown = normalized
    .filter((review) => review.id && review.text && review.rating >= 1)
    .sort((left, right) => timeOf(right.createTime) - timeOf(left.createTime))
    .slice(0, MAX_DISPLAYED_REVIEWS);
  const rating = Number(averageRating);
  const count = Number(totalReviewCount);
  return {
    source,
    fetchedAt,
    averageRating: Number.isFinite(rating) && rating > 0 ? Math.round(rating * 10) / 10 : null,
    totalReviewCount: Number.isInteger(count) && count >= 0 ? count : null,
    reviews: shown,
  };
}

export function buildReviewsPayload({ reviews = [], averageRating, totalReviewCount } = {}, fetchedAt) {
  return payloadFrom('google-business-profile', reviews.map(normalizeReview), averageRating, totalReviewCount, fetchedAt);
}

/** The same, from the Places API, whose fields are named rating and userRatingCount. */
export function buildPlacesPayload({ reviews = [], rating, userRatingCount } = {}, fetchedAt) {
  return payloadFrom('google-places', reviews.map(normalizePlacesReview), rating, userRatingCount, fetchedAt);
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

/** A rating as the design prints it: always one decimal, "5.0", "4.9". */
export const formatRating = (value) => (Number.isFinite(Number(value)) && Number(value) > 0 ? Number(value).toFixed(1) : '');

export const hasGoogleReviews = (data) => Array.isArray(data?.reviews) && data.reviews.length > 0;

/*
 * Which of the two sources to keep. The Business Profile is the better one —
 * every review rather than five, and the listing's own rating and count — so it
 * wins whenever it has reviews to show. Places steps in when it has none: API
 * access not approved yet, the profile not verified, or the day's call failed.
 * If neither has reviews, whichever payload exists is kept, so the rating and
 * the fetch time still refresh.
 */
export function preferReviews(businessProfile, places) {
  if (hasGoogleReviews(businessProfile)) return businessProfile;
  if (hasGoogleReviews(places)) return places;
  return businessProfile ?? places ?? null;
}

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
