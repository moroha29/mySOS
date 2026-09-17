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
- [ ] Data model: `page`, `useCases`, `items`, `suggestions` for all six
      solutions; `siteContent.requestOptions`; wording keys
- [ ] Route `/solutions/<id>/` + prerender + old `?industry=` links
- [ ] Hero (breadcrumb, eyebrow, title, lead, WhatsApp button, collage)
- [ ] Use-case carousel (selected state, arrows, dots)
- [ ] Request builder: rows, steppers, apply-to-all, remove, details panels,
      add-more, custom product, files
- [ ] Summary panel: list, needed-by, notes, Send via WhatsApp (+ file sharing)
- [ ] Overview `/solutions/` cards link to the new pages
- [ ] Responsive (phone: summary below the builder), reduced motion, keyboard
- [ ] Tests: routes, no prices, no engine links, message content, editability
- [ ] Manager: `npm test` against this content; labels for new fields
- [ ] Visual check against the mockup at 1440 and 390
- [ ] Owner review on localhost → PR → deploy

## Log

- 2026-09-17 — Started. Mockup saved; plan and decisions written.

## How to resume

1. `git checkout feat/solution-request-builder`
2. Read this file and the mockup.
3. Start the dev server (Browser pane → `mysos-site`, or `npm run dev`) and open
   http://localhost:5173/mySOS/solutions/churches/
4. Carry on from the first unchecked item. Run `npm test` and `npm run build`
   before committing, and the manager's `npm test` when content shapes change.
