#!/usr/bin/env node
/*
 * One-time sign-in for the daily Google review refresh.
 *
 * Run by the Google Business Profile owner, on their own computer:
 *
 *   GOOGLE_CLIENT_ID=... GOOGLE_CLIENT_SECRET=... node scripts/google-reviews-authorize.mjs
 *
 * It opens nothing on the internet except Google: a small listener on
 * 127.0.0.1 receives Google's reply after the owner signs in in their browser,
 * and the result — the refresh token, plus the location the token can see — is
 * printed to this terminal only. It is never written to disk or sent anywhere.
 *
 * Needs an OAuth client of type "Desktop app". See docs/GOOGLE_REVIEWS.md.
 */
import crypto from 'node:crypto';
import http from 'node:http';

const SCOPE = 'https://www.googleapis.com/auth/business.manage';

const base64url = (buffer) => buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

async function waitForGoogle(server, redirectUri, expectedState) {
  return new Promise((resolve, reject) => {
    server.on('request', (request, response) => {
      const url = new URL(request.url, redirectUri);
      if (url.pathname !== '/') {
        response.writeHead(404).end();
        return;
      }
      const error = url.searchParams.get('error');
      const code = url.searchParams.get('code');
      const ok = !error && code && url.searchParams.get('state') === expectedState;
      response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      response.end(ok
        ? '<h1>Signed in</h1><p>You can close this tab and go back to the terminal.</p>'
        : '<h1>Sign-in did not finish</h1><p>Close this tab and check the terminal.</p>');
      if (ok) resolve(code);
      else reject(new Error(error ? `Google returned "${error}".` : 'The reply from Google did not match this sign-in.'));
    });
  });
}

async function googleJson(url, accessToken) {
  const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(body?.error?.message || `HTTP ${response.status}`);
    error.status = response.status;
    throw error;
  }
  return body;
}

async function listLocations(accessToken) {
  const found = [];
  const { accounts = [] } = await googleJson('https://mybusinessaccountmanagement.googleapis.com/v1/accounts', accessToken);
  for (const account of accounts) {
    let pageToken = '';
    do {
      const url = new URL(`https://mybusinessbusinessinformation.googleapis.com/v1/${account.name}/locations`);
      url.searchParams.set('readMask', 'name,title');
      url.searchParams.set('pageSize', '100');
      if (pageToken) url.searchParams.set('pageToken', pageToken);
      const page = await googleJson(url, accessToken);
      for (const location of page.locations ?? []) {
        // locations.list names a location "locations/{id}"; the reviews
        // endpoint wants it under its account: "accounts/{a}/locations/{l}".
        found.push({ path: `${account.name}/${location.name}`, title: location.title, account: account.accountName });
      }
      pageToken = page.nextPageToken ?? '';
    } while (pageToken);
  }
  return found;
}

async function main() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET ?? '';
  if (!clientId) {
    throw new Error('Set GOOGLE_CLIENT_ID (and GOOGLE_CLIENT_SECRET) from your "Desktop app" OAuth client, then run this again.');
  }

  const verifier = base64url(crypto.randomBytes(48));
  const challenge = base64url(crypto.createHash('sha256').update(verifier).digest());
  const state = base64url(crypto.randomBytes(16));

  const server = http.createServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const redirectUri = `http://127.0.0.1:${server.address().port}`;

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.search = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: SCOPE,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    state,
    // Always ask again, so Google always returns a refresh token.
    access_type: 'offline',
    prompt: 'consent',
  }).toString();

  console.log('\n1. Open this link in the browser where you are signed in as the business owner:\n');
  console.log(`   ${authUrl.href}\n`);
  console.log('2. Choose the owner account and allow "manage your business".');
  console.log('   If Google says it has not verified this app, choose Advanced, then continue — it is your own app.\n');
  console.log('Waiting for Google…');

  let code;
  try {
    code = await waitForGoogle(server, redirectUri, state);
  } finally {
    server.close();
  }

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      ...(clientSecret ? { client_secret: clientSecret } : {}),
      code,
      code_verifier: verifier,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
    }),
  });
  const tokens = await tokenResponse.json().catch(() => ({}));
  if (!tokenResponse.ok) throw new Error(`Google refused the sign-in: ${tokens.error_description || tokens.error || tokenResponse.status}`);
  if (!tokens.refresh_token) {
    throw new Error('Google did not return a refresh token. Remove this app at https://myaccount.google.com/permissions and run the script again.');
  }

  console.log('\nSigned in.\n');
  console.log('Add this as the GitHub secret GOOGLE_REFRESH_TOKEN. Treat it like a password: do not email it or paste it into chat.\n');
  console.log(`   ${tokens.refresh_token}\n`);

  try {
    const locations = await listLocations(tokens.access_token);
    if (!locations.length) {
      console.log('This account can reach no Business Profile locations. Sign in with the account that owns the profile.');
    } else if (locations.length === 1) {
      console.log(`Location found: ${locations[0].title} (${locations[0].path}). Nothing else to set.`);
    } else {
      console.log('This account can reach several locations. Add the right one as the GitHub variable GBP_LOCATION:\n');
      for (const location of locations) console.log(`   ${location.path}   ${location.title}`);
    }
  } catch (error) {
    if (error.status === 403 || error.status === 429) {
      console.log('The Business Profile API is not open to this project yet (access not approved, or the APIs are not enabled).');
      console.log('That is fine: save the token now. The daily refresh starts working once Google approves access.');
    } else {
      console.log(`Signed in, but the location check failed: ${error.message}`);
    }
  }
}

main().catch((error) => {
  console.error(`\n${error.message}`);
  process.exit(1);
});
