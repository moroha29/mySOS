# Image assets

Every image slot on the public site resolves through `src/utils/imageRegistry.js`.
Drop a correctly-named file into `src/assets/images/` and it appears automatically —
no code change needed. Any slot with no file falls back to the drawn placeholder,
so the site works with none, some, or all of these in place.

Accepted extensions: `.jpg` `.jpeg` `.png` `.webp` `.avif` `.svg`
(the name before the extension is what matters).

---

## Tier 1 — biggest visual impact (24 files)

### `src/assets/images/scenes/` — page heroes and banners

| File | Aspect | Suggested px | Content |
|---|---|---|---|
| `home-hero` | ~4:3, **transparent PNG** | 1200×900 | The product cluster: jersey, polo, tote, bottle, lanyard on transparent background |
| `products-hero` | ~4:3, **transparent PNG** | 1200×900 | Tote, jacket, bottle cluster on transparent background |
| `solutions-hero` | 16:9 | 1600×900 | Group of students / mixed teams |
| `why-hero` | 16:9 | 1600×900 | MySOS team at work |
| `stories-hero-1` … `stories-hero-5` | portrait-ish | 800×1200 | 5 project photos for the angled collage (centre-cropped) |
| `products-promo` | 21:9 | 1600×700 | Two staff advising a client |
| `solutions-promo` | 21:9 | 1600×700 | Consultation / requirements shot |
| `testimonial` | 16:9 | 1200×675 | Client at the studio (stories-page quote panel) |

> The two hero files should be **transparent PNGs** — they sit directly on the navy
> gradient. Everything else is a normal photo.

### `src/assets/images/solutions/` — industry cards (6 files)

`schools` · `businesses` · `events` · `churches` · `sports-teams` · `community`

16:9, 1200×675. One representative photo per industry.

### `src/assets/images/stories/<slug>/cover` — story card thumbnails (9 files)

16:9, 1200×675. Slugs:

```
ntu-cca-jerseys-2024        corporate-family-day-2024   school-orientation-pack
sports-camp-2024            sports-team-kit-2024        music-festival-2024
community-charity-drive     product-launch-event        church-camp-2024
```

---

## Tier 2 — product catalogue (24 files)

`src/assets/images/products/<slug>` — **square, 800×800**, product on a plain
white or light-grey background, centred with even margins. These render inside a
light tile so the background should be near-white.

| Slug | Product |
|---|---|
| `premium-cotton-tee` | Premium Cotton Tee |
| `cotton-round-neck-tee` | Classic Cotton Tee |
| `dryfit-performance-tee` | DryFit Performance Tee |
| `dryfit-v-neck` | DryFit V-Neck Tee |
| `long-sleeve-tee` | Long Sleeve Tee |
| `polo-cotton-pique` | Polo Shirt |
| `dryfit-polo` | DryFit Polo |
| `premium-cvc-polo` | Premium CVC Polo |
| `sublimation-jersey` | Sublimation Jersey |
| `pullover-hoodie` | Hoodie |
| `windbreaker-jacket` | Windbreaker Jacket |
| `bomber-jacket` | Bomber Jacket |
| `custom-cut-and-sew` | Custom Cut & Sew |
| `custom-snapback` | Custom Snapback |
| `custom-dad-cap` | Dad Cap |
| `trucker-mesh-cap` | Trucker Mesh Cap |
| `five-panel-cap` | 5-Panel Cap |
| `custom-bucket-hat` | Bucket Hat |
| `fitted-cap` | Fitted Cap |
| `canvas-tote-bag` | Canvas Tote Bag |
| `insulated-bottle` | Insulated Bottle |
| `executive-gift-set` | Executive Gift Set |
| `hardcover-notebook` | Hardcover Notebook |
| `event-lanyard` | Event Lanyard |

**Optional** — home-page category tiles. Without these the tile reuses the drawn
art. Square, 400×400:

`products/category-apparel` · `category-bags` · `category-drinkware` ·
`category-corporate-gifts` · `category-stationery` · `category-event-essentials`

---

## Tier 3 — story detail pages

For each story slug, inside `src/assets/images/stories/<slug>/`:

| File | Aspect | Suggested px | Where it appears |
|---|---|---|---|
| `hero` | 21:9 wide | 2000×850 | Full-width banner behind the story title |
| `01` `02` `03` `04` | 2.3:1 | 900×390 | Gallery strip thumbnails |
| `challenge` | 16:9 | 1200×675 | Beside "01 The Challenge" (design sketches, artwork) |
| `solution` | 16:9 | 1200×675 | Beside "02 Our Solution" (only used when the story has no product photo) |
| `outcome` | 16:9 | 1200×675 | Beside "04 The Outcome" (finished project / team) |

Start with `ntu-cca-jerseys-2024` — that's the story the design mocks up in full.
The other eight can stay on `cover` alone.

---

## Tier 4 — logos and Why-page imagery

### `src/assets/images/logos/` — trusted-by strip (7 files)

`ntu` · `smu` · `temasek` · `sit` · `sp` · `nus` · `np`

**SVG or transparent PNG**, roughly 30px tall when rendered — so supply at least
120px tall. These are third-party marks; only use ones MySOS is actually permitted
to display.

### `src/assets/images/benefits/` — Why-page row photos (5 files)

Named after the benefit icon: `supplier` · `value` · `flexible` · `expert` · `tailored`

3:1 wide crops, 1200×400. They render as small 250×84 strips, so pick images that
read at a glance.

---

## Notes

- **Sizing** — supply roughly 2× the rendered size; the build hashes and serves
  them as-is (no resizing step), so compress before dropping them in. Aim for
  under ~300 KB each, WebP where possible.
- **Cropping** — all photo slots use `object-fit: cover`, so the centre of the
  image survives. Product slots use `contain`, so leave even margins.
- **Checking what's registered** — `availableImages()` in
  `src/utils/imageRegistry.js` returns every key currently resolving.
