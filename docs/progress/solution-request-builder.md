# Progress: solution pages with a customer request builder

**Branch:** `feat/solution-request-builder` (off `main` at `ac0b8e3`)
**Design:** [solution-page-mockup.jpg](solution-page-mockup.jpg) (the Churches page; every solution gets one)
**Status:** in progress — see the checklist below. Update it as work lands.

## What this is

One page per solution (Schools, Businesses, Events, Churches, Sports Teams,
Community) at `/mySOS/solutions/<id>/`, following the mockup:

1. **Hero** — breadcrumb (Home / Solutions / Churches), eyebrow ("Church
   solutions"), big title, lead, a "Discuss on WhatsApp" button, and a photo
   collage on the right.
2. **Explore <Solution> Solutions** — a sideways carousel of use-case cards
   (e.g. Camps & Retreats, Events & Anniversaries, Ministry & Volunteer
   Apparel, Welcome & Appreciation Gifts). One is selected ("✓ Selected");
   choosing a card loads its package below. Dots and ‹ › arrows; "View all
   <solution> solutions".
3. **Your Recommended Team Package** — the request builder:
   - **Included products**: each row has a thumbnail, name, a short
     recommendation ("Recommended: Embroidered chest logo"), a − qty + stepper,
     "Add details" (expands per-product options) and a remove button.
   - **Same quantity for every item?** — a number box and "Apply to All".
   - **Details panel** (e.g. the lanyard's): width (15/20/25mm, one marked
     Recommended), printing (single/double-sided), attachment (select),
     colour (select), upload a reference, notes, and "Skip this section and
     we'll confirm the details with you on WhatsApp."
   - **Add More Products** — suggested extras (bottle, tote bag, crew shirt).
   - **Looking for something else?** — free-text custom product + "Add Custom
     Product".
   - **General event files** — drop zone for logos/artwork.
4. **Your Request** (sticky summary on the right) — the chosen items and
   quantities, **Needed by** (date), **Additional notes**, and **Send Request
   via WhatsApp**: "We'll open WhatsApp with your selected products,
   quantities and notes already included."

### This is not the quotation engine

It is the *customer's* request to MySOS. It shows **no prices** and sends a
WhatsApp message. The agents' quotation engine (`/mySOS/quotation_engine/`)
stays unlinked from the public site. Tests enforce this
(`tests/renderSmoke.test.jsx`).

## Decisions made

- **Route:** `/mySOS/solutions/<id>/`, prerendered for every solution. The old
  `/mySOS/solutions/?industry=<id>` links keep working (they render the same page).
- **Data:** each solution in `src/data/solutions.json` gains `page` (hero
  wording and pictures) and `useCases` (cards, each with its package `items`
  and `suggestions`). Products refer to catalogue ids from `productData.json`;
  an item can also be a custom line with only a name. Per-product detail
  fields live in `siteContent.requestOptions`, keyed by catalogue subcategory.
  All of it is editable in the website manager, whose mySOS adapter already
  saves `solutions.json` and `siteContent.json`.
- **Sending:** the request becomes one WhatsApp message (`wa.me` link) with
  every item, quantity, chosen detail, the needed-by date and the notes.
- **Files:** a static site cannot attach files to a `wa.me` link. On phones that
  support it, "Send" uses the Web Share API (`navigator.share({ files, text })`),
  so the files go to WhatsApp with the message. Elsewhere, the message lists the
  file names and the page tells the visitor to attach them in the chat.
  **Never claim files were sent when they were not.**
- **No prices** anywhere in the builder.
- **Header:** the mockup's header says "Discuss on WhatsApp" and has a search
  icon. That is site-wide, so it is left alone unless asked.

## Checklist

- [x] Branch, saved mockup, this file
- [x] Data model: `page`, `useCases`, `items`, `suggestions` for all six
      solutions; `siteContent.requestOptions`; wording keys
      (`siteContent.pages.solutionPage`). Seeded by a one-off script; Churches
      wording is the design's, the other five follow its pattern. Every
      product id is checked against the catalogue.
- [x] Route `/solutions/<id>/` + prerender (20 routes now) + old `?industry=`
      links forward to the new pages
- [x] Hero (breadcrumb, eyebrow, title, lead, WhatsApp button, collage).
      Collage falls back to the solution photo, its stories' covers, then its
      products' photos until banner pictures are chosen in the manager.
- [x] Use-case carousel (selected state, arrows, dots, "View all" expands to a
      grid). Card photos avoid repeating one another.
- [x] Request builder: rows, steppers (quick clicks add up), apply-to-all,
      remove, details panels (recommended choices preselected), add-more,
      custom product, files
- [x] Summary panel: list with chosen details, needed-by, notes, Send via
      WhatsApp (+ file sharing where the device supports it)
- [x] Overview `/solutions/`, header, footer and home link to the new pages
- [x] Responsive (phone: summary below the builder, no sideways scroll),
      reduced motion, keyboard (all controls are buttons/inputs with labels)
- [x] Tests: `tests/solutionPages.test.jsx` — routes, content integrity, no
      prices, no engine links, message content, editability, file honesty
- [x] Manager: `npm test` passes against this content
- [x] Manager: friendly labels for the new fields (website-manager#23,
      merged; the running portal shows them after its next rebuild).
      Later: a product picker instead of typing catalogue ids.
- [x] Visual check at 1440 and 390 (headless Chrome, real clicks)
- [ ] Owner review on localhost → PR → deploy

### Ideas not yet done
- A sticky "Send request" bar on phones, since the summary sits at the bottom.
- "Discuss on WhatsApp" in the site header, as in the mockup (site-wide change).

## Log

- 2026-09-17 — Started. Mockup saved; plan and decisions written.
- 2026-09-17 — Data model in. Each solution has 4 use cases; Churches defaults
  to "Ministry & Volunteer Apparel" as in the design. The "Name Badge" is a
  custom line (no catalogue product). Subcategories without their own detail
  fields (gift sets, mats, medals, name tents, notebooks, pens, stickers,
  towels) use `requestOptions.default` (colour only) plus notes and upload.
- 2026-09-18 — Page, builder, summary, styles and tests in (commit on this
  branch). Flow checked in headless Chrome with real clicks: details panel
  preselects 20mm / Double-sided for the lanyard; apply-to-all, add bottle,
  add custom product, remove cap, needed-by and notes all end up in the
  WhatsApp message. Fixed on the way: quick "+" clicks losing a step, each
  item's recommendation missing from the message, 30 February being accepted
  as a date, repeated card photos, lanyard width choices wrapping.
- 2026-09-18 — Waiting on the owner's review at
  http://localhost:5173/mySOS/solutions/churches/ before the PR.

## How to resume

1. `git checkout feat/solution-request-builder`
2. Read this file and the mockup.
3. Start the dev server (Browser pane → `mysos-site`, or `npm run dev`) and open
   http://localhost:5173/mySOS/solutions/churches/
4. Carry on from the first unchecked item. Run `npm test` and `npm run build`
   before committing, and the manager's `npm test` when content shapes change.
