# MySOS Website and Quotation Engine

A fully static React site for MySOS. The public website and agent quotation engine are built together and deployed to GitHub Pages with no backend.

- Public website: `https://moroha29.github.io/mySOS/`
- Agent quotation engine: `https://moroha29.github.io/mySOS/quotation_engine/`

The public catalogue and quotation engine share the same structured product data. Public starting prices are intentionally separate from internal base costs and exact quotation calculations.

## Run locally

Requirements: Node.js 22 and npm.

```bash
npm install
npm run dev
```

Run all pricing, Excel, catalogue, routing and integration tests:

```bash
npm test
```

Create the complete GitHub Pages artifact:

```bash
npm run build
```

The deployable files are written to `dist/`. The root `index.html` is the public site; `dist/quotation_engine/index.html` is the existing agent tool. Vite uses the exact case-sensitive base path `/mySOS/`.

## Content and pricing files

| What to maintain | File |
| --- | --- |
| Products, public starting prices and product base costs | `src/data/productData.json` |
| Printing methods and printing base costs | `src/data/printData.json` |
| Add-on base costs and selling amounts | `src/data/addonData.json` |
| Quantity cost/selling multipliers | `src/data/tierData.json` |
| Industry solutions and recommended products | `src/data/solutions.json` |
| Success stories and story detail content | `src/data/successStories.json` |
| Benefits, process, FAQ, testimonials and public categories | `src/data/siteContent.json` |
| Navigation, contact details, social links and WhatsApp | `src/data/siteConfig.json` |

## How to change a product price

1. Open `src/data/productData.json`.
2. Find the product in `catalogue` by its `id`.
3. To change the public “From” price, edit `public.displayPricing.amount`.
4. To change the quotation base cost, edit `quotation.baseCost`. These values serve different purposes and should not be treated as interchangeable.
5. Commit the file. The GitHub Actions workflow tests, builds and redeploys the complete site.

Component-priced jerseys and custom cut-and-sew products use their named cost fields below `jersey` and `customCutSew` instead of a single `quotation.baseCost`.

Jersey options use one combined `customNameAndNumberBaseCost` and a separate `knittedCollarBaseCost`. Update those values in `src/data/productData.json` when supplier costs change.

Salespeople can select **Other / Blank Product** for an item that is not in the catalogue. Its entered unit cost feeds the normal quantity-tier suggestion; its name and description are carried into the live preview and Excel quotation. Printing or branding details for that line should be included in the description and supplier cost.

Every item shows its calculated cost, suggested quotation price and current quotation price. Leave the quotation-price override blank to use the tier suggestion, or enter a non-negative per-piece price to override it. The internal preview highlights quotations below cost; customer Excel exports contain only the quotation price.

## How to add a product

1. Add an object to `catalogue` in `src/data/productData.json`.
2. Give it a unique `id` and public `slug`.
3. Fill in the `public` section: name, category, subcategory, description, visibility, featured state, image and display pricing. Use a root-relative path such as `/mySOS/assets/products/example.webp`. When no production image is available, `imageStyle` provides the built-in visual fallback.
4. Fill in the `quotation` section. Use the existing `productId` values (`tee`, `polo`, `cap`, `jersey_sublimation`, or `custom_cutsew`) so the quotation form knows which configuration fields to show.
5. List compatible `printingMethods`.
6. Run `npm test` and `npm run build` before committing.

Ordinary tee, polo and cap variants require no React source change. A genuinely new pricing model still requires a corresponding pure engine calculation and tests.

## How to hide or disable a product

- Hide it from the public website: set `public.visible` to `false`.
- Remove it from featured sections: set `public.featured` to `false`.
- Disable agent quotation selection and product preselection: set `quotation.enabled` to `false`.

These controls are independent so an existing product can remain quoteable while temporarily hidden from the website, or remain visible as an enquiry item without supporting automated quotation.

## How to change printing prices

Open `src/data/printData.json`.

- DTF/DTG: edit `dtf.options[].baseCost` (DTG intentionally aliases the workbook's DTF table).
- Silkscreen: edit the named flat and per-piece rate fields in `silkscreen.rates`.
- Embroidery: edit `embroidery.stitchTiers[].baseCost`, digitizing fees, or placement multipliers.
- Sublimation: edit `sublimation.options[].baseCost`.

Do not place printing prices in React components.

## How to change add-on prices

Open `src/data/addonData.json` and edit:

- `baseCost` for the cost used by quotation calculations.
- `sellPrice` for the add-on selling amount.
- `type` only when the add-on changes between per-piece and flat-fee behaviour.

## How to change quantity tiers

Open `src/data/tierData.json`. Each tier has an inclusive `minQty` and `maxQty`, a `costMultiplier`, a `sellMultiplier`, and preserved `marginAdjustment` metadata. Keep the ranges continuous and non-overlapping. The current engine intentionally does not apply `marginAdjustment` because the approved source workbook's output formula does not use it.

## How to add a success story

1. Add one object to `src/data/successStories.json`.
2. Use a unique URL-safe `slug`.
3. Add the category, summary, product IDs, quantity, year, challenge, solution, process, outcomes and testimonial. Gallery values may be `/mySOS/assets/...` image paths; style tokens remain available as fallbacks.
4. Set `featured` to `true` to make the story eligible for the homepage.
5. Commit. The listing, category filters and detail route are generated from the entry automatically.

GitHub Pages uses `public/404.html` to restore nested public routes such as `/mySOS/success-stories/example/` after a direct refresh. No separate HTML file is required when a story is added.

## WhatsApp configuration

WhatsApp is configured in `src/data/siteConfig.json`. Store `number` in international format without spaces or a leading plus sign, and use `displayNumber` for the human-readable footer label. Setting `whatsapp.enabled` to `false` hides the outbound link without changing components.

## Architecture

```text
src/
├── data/                 Shared catalogue, pricing and public content
├── engines/              Pure product, print, tier, add-on and quote calculations
├── components/           Existing agent quotation form and live preview
├── public/               Public site shell, reusable UI and six page experiences
├── utils/
│   ├── catalogue.js      Public selectors, story lookup and quote preselection
│   └── excelGenerator.js ExcelJS workbook generation and browser download
├── App.jsx               Existing quotation application
└── main.jsx              Quotation entry point
```

The public application starts at `src/public/main.jsx`. The two HTML entry points are configured in `vite.config.js`, so one build produces both required deployment surfaces. ExcelJS remains dynamically loaded only when an agent downloads a quotation.

## Quotation logic preserved

The engine preserves:

- Eight quantity tiers with separate cost and selling multipliers.
- Jersey fabric, collar, sleeve, combined custom name-and-number, knitted-collar and team-set adjustments.
- Cost-based quotation lines for unlisted products with optional selling-price overrides.
- Tee, polo, cap and custom cut-and-sew cost calculations.
- DTF/DTG, silkscreen, embroidery and sublimation calculations.
- Per-piece and flat add-ons.
- Separate raw internal cost, tier-adjusted cost, selling price, profit and margin values.
- Independently tiered multi-product orders.
- Form validation, live preview and formatted `.xlsx` generation.

The public website displays only `public.displayPricing`. It never renders quotation base costs, internal costs or tier-adjusted costs. Because the project is fully static, bundled data should not be treated as secret.

## Deployment

Push to `main` or manually run the GitHub Actions workflow. It uses Node.js 22, runs `npm ci`, `npm test`, and `npm run build`, then uploads `dist/` as the GitHub Pages artifact.

In the repository settings, configure Pages to use **GitHub Actions**. The expected deployment URL is `https://moroha29.github.io/mySOS/`.
