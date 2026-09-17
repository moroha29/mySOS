# Google reviews on the website

The "What our clients say" section shows MySOS's real Google reviews. Once a day,
a GitHub Action asks Google for them, saves them to
`src/data/googleReviews.json`, and redeploys the site if anything changed.

Nothing is scraped. There are two official ways in, and the refresh uses whichever
is working:

| | **A. Business Profile API** | **B. Places API** |
|---|---|---|
| Reviews | all of them, up to 30 shown | the 5 Google shows on the listing |
| Rating and count | the listing's own | the listing's own |
| Needs | the owner to sign in once, and Google to approve API access | an API key, nothing to approve |
| Profile must be verified | yes | no |
| Cost | free | free in practice: one call a day, against 1,000 free a month |

**A is preferred and B is the fallback.** Each day the refresh asks the Business
Profile first; if that returns no reviews — access not approved yet, the profile
not verified, or the call failed — it falls back to the five from Places for that
day. Set up either one on its own, or both.

Until one of them is set up, the site shows no reviews: the reviews section and
the stories page show only a link to MySOS's reviews on Google. That is deliberate.
There are no hand-typed reviews to fall back on, so nothing can show a made-up review.

---

## A. Business Profile API — what the owner needs to do (about 20 minutes, plus Google's approval wait)

Do every step signed in to **the Google account that owns the MySOS Business
Profile**.

### 1. Confirm the profile is verified

Open <https://support.google.com/business/workflow/12825603>. It should say
**Verified**. Google only approves API access for profiles verified and active for
more than 60 days.

### 2. Create a Google Cloud project

1. Go to <https://console.cloud.google.com/> and create a project, for example
   "MySOS website".
2. On the project's dashboard, note the **Project number**. Step 4 needs it.

### 3. Turn on the APIs

In **APIs & Services → Library**, search for and enable each of these:

- Google My Business API ← reviews come from this one
- My Business Account Management API
- My Business Business Information API
- My Business Lodging API
- My Business Place Actions API
- My Business Notifications API
- My Business Verifications API

Google's setup guide lists all seven. The website only reads reviews, but enable
them all so the application in step 4 matches what Google expects.

### 4. Apply for API access

1. Open Google's Business Profile API contact form:
   <https://support.google.com/business/contact/api_default>
2. Choose **Application for Basic API Access**.
3. Enter the **Project number** from step 2, and use the owner's email address.

Google emails when the request has been reviewed. To check without waiting: in the
Cloud project, open **APIs & Services → My Business Account Management API →
Quotas**. **0** requests per minute means not approved yet; **300** means approved.

You can carry on with steps 5–7 while you wait.

### 5. Set up the consent screen

In **APIs & Services → OAuth consent screen**:

1. User type: **External**.
2. App name "MySOS website", and the owner's email for the contact fields.
3. Add the scope `https://www.googleapis.com/auth/business.manage`.
4. Set the publishing status to **In production**.

> **Don't leave it in "Testing".** Google makes keys issued to a Testing app
> expire after **7 days**, which would break the daily refresh every week.

### 6. Create the credentials

In **APIs & Services → Credentials → Create credentials → OAuth client ID**, choose
**one** of the two options in step 7 and create the matching client type. Keep the
**Client ID** and **Client secret** it shows.

### 7. Get the key (refresh token)

**Option A — in the browser, nothing to install.** This is Google's own method.

1. Create the client in step 6 as **Web application**, and under *Authorised
   redirect URIs* add `https://developers.google.com/oauthplayground`.
2. Open <https://developers.google.com/oauthplayground>.
3. Click the gear icon, tick **Use your own OAuth credentials**, and paste the Client
   ID and Client secret.
4. In *Step 1*, type `https://www.googleapis.com/auth/business.manage` into the box
   and click **Authorize APIs**. Sign in as the owner and allow access.
5. In *Step 2*, click **Exchange authorization code for tokens**.
6. Copy the **Refresh token**.

**Option B — a script, for whoever looks after the website code.**

1. Create the client in step 6 as **Desktop app**.
2. From this repository, run:

   ```bash
   GOOGLE_CLIENT_ID=... GOOGLE_CLIENT_SECRET=... node scripts/google-reviews-authorize.mjs
   ```

3. Open the link it prints, sign in as the owner and allow access. It prints the
   refresh token and, once access is approved, which location it found.

If Google shows **"Google hasn't verified this app"** in either option, choose
**Advanced → Go to MySOS website**. It is your own app.

### 8. Add the key to GitHub

In the GitHub repository go to **Settings → Secrets and variables → Actions**.

On the **Secrets** tab, add three repository secrets:

| Name | Value |
|---|---|
| `GOOGLE_CLIENT_ID` | Client ID from step 6 |
| `GOOGLE_CLIENT_SECRET` | Client secret from step 6 |
| `GOOGLE_REFRESH_TOKEN` | Refresh token from step 7 |

> The refresh token works like a password to the business's Google profile. Paste it
> straight into GitHub. If someone else is adding it, share it through a password
> manager, not email or chat.

Only if the owner's account manages **more than one** business location: on the
**Variables** tab, add `GBP_LOCATION` with the value the script printed, such as
`accounts/123/locations/456`.

### 9. Run it once

**Actions → Refresh Google reviews → Run workflow.** When it finishes, the
reviews are committed and the site redeploys on its own. After that it runs
every day at 3:17am Singapore time.

---

## B. Places API — the fallback (about 10 minutes, no approval)

This shows the same five reviews Google shows on the listing. It needs no
verification and no application, so it is the way to have reviews on the site
while step 4 above is waiting on Google — or instead of it.

### 1. Enable the API and create a key

1. In the same Cloud project, open **APIs & Services → Library**, search for
   **Places API (New)** and enable it.
2. Go to **APIs & Services → Credentials → Create credentials → API key**.
3. Open the new key and, under *API restrictions*, choose **Restrict key** and tick
   **Places API (New)**. Leave *Application restrictions* as **None**: the key is
   used by GitHub Actions, which has no fixed IP address.
4. Billing must be enabled on the project. The refresh makes one call a day, about
   30 a month, and Google's monthly free allowance is 1,000 — so it stays free.
   Setting a budget alert at, say, $5 is still worth doing.

### 2. Add the key to GitHub

**Settings → Secrets and variables → Actions → Secrets → New repository secret**:

| Name | Value |
|---|---|
| `GOOGLE_PLACES_API_KEY` | the API key from step 1 |

That is all the refresh needs. It searches Google for **My Source of Solutions**
and uses only the result whose Maps link is MySOS's own listing (the same
listing the site's "Read reviews on Google" links open), so a similarly named
business is never picked up. The run prints the listing it found and its place
id.

**Optional:** to skip that search on every run, save the printed id on the
**Variables** tab as `GOOGLE_PLACE_ID` (it looks like `ChIJ...`).

Then **Actions → Refresh Google reviews → Run workflow**, same as step 9 above.

---

## How it behaves

- **What is shown.** The newest reviews that have written text, up to 30 from the
  Business Profile or 5 from Places, exactly as the reviewer wrote them, plus
  Google's own average rating and review count. Star-only reviews count toward the
  rating but have nothing to read, so they don't get a card. Reviews are never
  filtered by rating.
- **Which source was used.** The `source` field in `src/data/googleReviews.json`
  says `google-business-profile` or `google-places`, and each run prints what it
  got from each and which one it saved. Nothing on the page changes between them.
- **Attribution.** Each card shows the reviewer's name and Google profile photo
  and links to the listing on Google.
- **Google's 30-day rule.** Google only allows review data to be kept for 30 days.
  The daily run keeps the stored copy fresh, and saves at least weekly even when
  nothing changed. If refreshing ever stops, visitors stop seeing the reviews once
  the stored copy is more than 30 days old. The "Read all reviews on Google" link
  stays.
- **Where they appear.** The review slider on the home and Why MySOS pages, and the
  reviews row at the top of the Success Stories page.
- **Not editable in the website manager.** The manager never writes this file, and
  reviews, the rating, the count and the Google link address cannot be changed.
  Only the wording around them is editable: the section heading and the
  "Read all reviews on Google" text.

## If something goes wrong

Open the failed run under **Actions** and read the last lines.

| Message | What to do |
|---|---|
| `skipped: Google review secrets are not set` | Step 8 isn't done yet. Not an error. |
| `not approved yet` / quota errors | Google hasn't approved step 4. Wait for the email. |
| `invalid_grant` | The key stopped working: revoked, left unused for 6 months, or issued while the app was in Testing. Repeat step 7 and update `GOOGLE_REFRESH_TOKEN`. |
| `several locations` | Add the `GBP_LOCATION` variable (step 8). |
| `Places API refused the request` | Check `GOOGLE_PLACE_ID`, that the key allows the Places API (New), and that billing is on. |
| `Neither source returned reviews` | Both configured sources failed; the two lines above it say why. The stored reviews were left alone. |
