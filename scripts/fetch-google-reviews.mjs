#!/usr/bin/env node
/*
 * Daily refresh of the site's Google reviews.
 *
 * Reads the business's own reviews from the Google Business Profile API and
 * writes them to src/data/googleReviews.json. Run by
 * .github/workflows/refresh-google-reviews.yml; setup in docs/GOOGLE_REVIEWS.md.
 *
 *   GOOGLE_CLIENT_ID       OAuth client ID
 *   GOOGLE_CLIENT_SECRET   OAuth client secret
 *   GOOGLE_REFRESH_TOKEN   from the owner's one-time sign-in
 *   GBP_LOCATION           optional, "accounts/{a}/locations/{l}"; only needed
 *                          when the owner's account manages several locations
 *
 *   --dry-run              fetch and report, but do not write the file
 *
 * Without the credentials it does nothing and exits cleanly, so the workflow
 * stays green until the owner's key has been added.
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildReviewsPayload, GOOGLE_REVIEWS_NOTE, shouldWriteReviews } from '../src/utils/googleReviews.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
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

async function readExisting() {
  try {
    return JSON.parse(await readFile(DATA_FILE, 'utf8'));
  } catch {
    return null;
  }
}

async function main() {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim() ?? '';
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN?.trim();
  if (!clientId || !refreshToken) {
    console.log('skipped: Google review secrets are not set (see docs/GOOGLE_REVIEWS.md). The review file was left as it is.');
    return;
  }

  const token = await accessToken({ clientId, clientSecret, refreshToken });
  const location = await resolveLocation(token, process.env.GBP_LOCATION?.trim());
  const fetched = await fetchReviews(token, location);
  const payload = buildReviewsPayload(fetched, new Date().toISOString());

  console.log(`${location}: fetched ${fetched.reviews.length} reviews; ${payload.reviews.length} with written text will be shown; Google rating ${payload.averageRating ?? '—'} from ${payload.totalReviewCount ?? '—'} reviews.`);
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
