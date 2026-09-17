#!/usr/bin/env node
/*
 * Daily refresh of the site's Google reviews.
 *
 * Reads the business's own reviews and writes them to
 * src/data/googleReviews.json. Run by
 * .github/workflows/refresh-google-reviews.yml; setup in docs/GOOGLE_REVIEWS.md.
 *
 * Two sources, either or both configured. The Business Profile API is used
 * when it returns reviews; otherwise the Places API's five stand in.
 *
 *   Business Profile (all reviews, needs Google's approval)
 *     GOOGLE_CLIENT_ID       OAuth client ID
 *     GOOGLE_CLIENT_SECRET   OAuth client secret
 *     GOOGLE_REFRESH_TOKEN   from the owner's one-time sign-in
 *     GBP_LOCATION           optional, "accounts/{a}/locations/{l}"; only
 *                            needed when the account manages several locations
 *
 *   Places fallback (five reviews, an API key is all it takes)
 *     GOOGLE_PLACES_API_KEY  key with the Places API (New) enabled
 *     GOOGLE_PLACE_ID        optional: the listing's place id, "ChIJ…". Without
 *                            it the script finds MySOS's own listing by search
 *                            and prints the id to save.
 *
 *   --dry-run              fetch and report, but do not write the file
 *
 * With neither configured it does nothing and exits cleanly, so the workflow
 * stays green until the owner's key has been added.
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildPlacesPayload, buildReviewsPayload, findOwnListing, GOOGLE_LISTING_CID, GOOGLE_LISTING_SEARCH, GOOGLE_REVIEWS_NOTE, hasGoogleReviews, preferReviews, shouldWriteReviews } from '../src/utils/googleReviews.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const count = (number, noun) => `${number} ${noun}${number === 1 ? '' : 's'}`;
const DATA_FILE = path.join(root, 'src/data/googleReviews.json');
const MAX_PAGES = 40; // 50 reviews a page

async function googleJson(url, accessToken) {
  const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  const body = await response.json().catch(() => ({}));
  if (response.ok) return body;
  const detail = body?.error?.message || `HTTP ${response.status}`;
  if (response.status === 429 || response.status === 403) {
    throw new Error(`Google refused ${url.pathname ?? url}: ${detail}. If Business Profile API access is not approved yet, this is expected — see step 4 of docs/GOOGLE_REVIEWS.md.`);
  }
  throw new Error(`Google request failed (${response.status}): ${detail}`);
}

async function accessToken({ clientId, clientSecret, refreshToken }) {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      ...(clientSecret ? { client_secret: clientSecret } : {}),
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  const body = await response.json().catch(() => ({}));
  if (response.ok && body.access_token) return body.access_token;
  if (body.error === 'invalid_grant') {
    throw new Error('invalid_grant: the refresh token no longer works. It was revoked, left unused for 6 months, or issued while the consent screen was in Testing. Repeat step 7 of docs/GOOGLE_REVIEWS.md and update GOOGLE_REFRESH_TOKEN.');
  }
  throw new Error(`Google refused the token refresh: ${body.error_description || body.error || response.status}`);
}

async function findLocations(token) {
  const found = [];
  const { accounts = [] } = await googleJson(new URL('https://mybusinessaccountmanagement.googleapis.com/v1/accounts'), token);
  for (const account of accounts) {
    let pageToken = '';
    do {
      const url = new URL(`https://mybusinessbusinessinformation.googleapis.com/v1/${account.name}/locations`);
      url.searchParams.set('readMask', 'name,title');
      url.searchParams.set('pageSize', '100');
      if (pageToken) url.searchParams.set('pageToken', pageToken);
      const page = await googleJson(url, token);
      // locations.list names a location "locations/{id}"; reviews.list wants it
      // under its account, "accounts/{a}/locations/{l}".
      for (const location of page.locations ?? []) found.push({ path: `${account.name}/${location.name}`, title: location.title });
      pageToken = page.nextPageToken ?? '';
    } while (pageToken);
  }
  return found;
}

async function resolveLocation(token, configured) {
  if (configured) {
    if (!/^accounts\/[^/]+\/locations\/[^/]+$/.test(configured)) {
      throw new Error(`GBP_LOCATION must look like accounts/123/locations/456, got "${configured}".`);
    }
    return configured;
  }
  const locations = await findLocations(token);
  if (locations.length === 1) return locations[0].path;
  if (!locations.length) throw new Error('This Google account manages no Business Profile locations. Sign in with the account that owns the profile.');
  throw new Error(`This account manages several locations. Set the GitHub variable GBP_LOCATION to one of:\n${locations.map((location) => `  ${location.path}  ${location.title}`).join('\n')}`);
}

async function fetchReviews(token, location) {
  const reviews = [];
  let averageRating;
  let totalReviewCount;
  let pageToken = '';
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const url = new URL(`https://mybusiness.googleapis.com/v4/${location}/reviews`);
    url.searchParams.set('pageSize', '50');
    if (pageToken) url.searchParams.set('pageToken', pageToken);
    const body = await googleJson(url, token);
    averageRating ??= body.averageRating;
    totalReviewCount ??= body.totalReviewCount;
    reviews.push(...(body.reviews ?? []));
    pageToken = body.nextPageToken ?? '';
    if (!pageToken) break;
  }
  return { reviews, averageRating, totalReviewCount };
}

/*
 * The Places API (New) returns the five reviews Google shows on the listing.
 * The field mask is required: without it the call is rejected, and asking for
 * only these four fields keeps the call on the cheaper SKU.
 */
async function fetchPlace(key, placeId) {
  const url = new URL(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`);
  url.searchParams.set('languageCode', 'en');
  const response = await fetch(url, {
    headers: {
      'X-Goog-Api-Key': key,
      'X-Goog-FieldMask': 'displayName,rating,userRatingCount,reviews',
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = body?.error?.message || `HTTP ${response.status}`;
    throw new Error(`Places API refused the request: ${detail}. Check GOOGLE_PLACE_ID and that the key has the Places API (New) enabled — see docs/GOOGLE_REVIEWS.md.`);
  }
  return body;
}

/*
 * Reports rather than throws: a failure here must not fail the run when the
 * other source worked, and must not fail the workflow when neither did more
 * than it did yesterday.
 */
async function tryBusinessProfile(now) {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim() ?? '';
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN?.trim();
  if (!clientId || !refreshToken) return { skipped: 'no Business Profile secrets' };
  try {
    const token = await accessToken({ clientId, clientSecret, refreshToken });
    const location = await resolveLocation(token, process.env.GBP_LOCATION?.trim());
    const fetched = await fetchReviews(token, location);
    const payload = buildReviewsPayload(fetched, now);
    console.log(`Business Profile ${location}: ${count(fetched.reviews.length, 'review')}, ${payload.reviews.length} with written text; rating ${payload.averageRating ?? '—'} from ${payload.totalReviewCount ?? '—'}.`);
    return { payload };
  } catch (error) {
    return { error };
  }
}

/*
 * Finds MySOS's place id from the API key alone: a text search for the
 * business, keeping only the result whose Maps link is MySOS's own listing.
 * Saving the id as GOOGLE_PLACE_ID skips this call.
 */
async function lookUpPlaceId(key) {
  const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': key,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.googleMapsUri',
    },
    body: JSON.stringify({ textQuery: process.env.GOOGLE_PLACE_SEARCH?.trim() || GOOGLE_LISTING_SEARCH, regionCode: 'SG' }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`Places API refused the search: ${body?.error?.message || `HTTP ${response.status}`}. Check that the key has the Places API (New) enabled and billing is on — see docs/GOOGLE_REVIEWS.md.`);
  }
  const own = findOwnListing(body.places);
  if (!own) {
    const seen = (body.places ?? []).map((place) => `  ${place.displayName?.text} — ${place.formattedAddress} (${place.id})`).join('\n') || '  (no results)';
    throw new Error(`Could not find MySOS's own Google listing (cid ${GOOGLE_LISTING_CID}) in the search results. It may not be public on Google Maps yet. Results were:\n${seen}\nIf one of these is MySOS, save its id as the GOOGLE_PLACE_ID variable.`);
  }
  console.log(`Found the listing: ${own.displayName?.text}, ${own.formattedAddress}. Place id ${own.id} — save it as the GOOGLE_PLACE_ID variable to skip this lookup.`);
  return own.id;
}

async function tryPlaces(now) {
  const key = process.env.GOOGLE_PLACES_API_KEY?.trim();
  if (!key) return { skipped: 'no Places key' };
  try {
    const placeId = process.env.GOOGLE_PLACE_ID?.trim() || await lookUpPlaceId(key);
    const place = await fetchPlace(key, placeId);
    const payload = buildPlacesPayload(place, now);
    console.log(`Places ${place.displayName?.text ?? placeId}: ${count(place.reviews?.length ?? 0, 'review')}, ${payload.reviews.length} with written text; rating ${payload.averageRating ?? '—'} from ${payload.totalReviewCount ?? '—'}.`);
    return { payload };
  } catch (error) {
    return { error };
  }
}

async function readExisting() {
  try {
    return JSON.parse(await readFile(DATA_FILE, 'utf8'));
  } catch {
    return null;
  }
}

async function main() {
  const now = new Date().toISOString();
  const profile = await tryBusinessProfile(now);

  // The fallback only runs when the Business Profile gave nothing to show, so
  // a working profile costs no Places calls.
  const needsFallback = !hasGoogleReviews(profile.payload);
  const places = needsFallback ? await tryPlaces(now) : { skipped: 'Business Profile returned reviews' };

  for (const [name, result] of [['Business Profile', profile], ['Places', places]]) {
    if (result.error) console.warn(`${name} unavailable: ${result.error.message}`);
    else if (result.skipped) console.log(`${name} not used: ${result.skipped}.`);
  }

  const payload = preferReviews(profile.payload, places.payload);
  if (!payload) {
    if (profile.error || places.error) throw new Error('Neither source returned reviews. The review file was left as it is.');
    console.log('skipped: no Google review credentials are set (see docs/GOOGLE_REVIEWS.md). The review file was left as it is.');
    return;
  }

  console.log(`Saving ${count(payload.reviews.length, 'review')} from ${payload.source}.`);
  if (process.argv.includes('--dry-run')) return;

  if (!shouldWriteReviews(await readExisting(), payload)) {
    console.log('Reviews unchanged and saved within the last week; file left as it is.');
    return;
  }
  await writeFile(DATA_FILE, `${JSON.stringify({ _note: GOOGLE_REVIEWS_NOTE, ...payload }, null, 2)}\n`);
  console.log('Saved src/data/googleReviews.json.');
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
