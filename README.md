# mySOS Quotation Engine

A fully static React quotation tool for mySOS agents. It converts the supplied Excel pricing workbook into a browser-based form, calculates prices locally, previews the quotation, and downloads a formatted `.xlsx` file. A single quotation can contain multiple products with different quantities and print configurations.

Production URL: `https://moroha29.github.io/mySOS/quotation_engine/`

## Setup

Requirements: Node.js 22 and npm.

```bash
npm install
npm run dev
```

Run the automated workbook-parity and Excel export tests:

```bash
npm test
```

Create the production site:

```bash
npm run build
```

The deployable artifact is written to `dist/quotation_engine`. Vite's base URL is `/mySOS/quotation_engine/`, while the GitHub Pages artifact root is `dist`, so both the HTML page and bundled assets resolve at the required subdirectory.

## Deployment

1. Push the repository to `moroha29/mySOS` on the `main` branch.
2. In GitHub, open **Settings → Pages** and select **GitHub Actions** as the source.
3. The workflow in `.github/workflows/deploy.yml` installs locked dependencies, runs tests, builds the app, and deploys `dist` to GitHub Pages.

The workflow also supports manual runs from the Actions tab.

## Architecture

```text
src/
├── components/        Agent form, selectors, add-ons, and live preview
├── data/              Workbook pricing tables as editable JSON
├── engines/           Pure product, print, tier, add-on, and quote calculations
└── utils/             Professional ExcelJS workbook generation/download
```

Pricing values never live inside React components. To add an option, update the appropriate file in `src/data`; calculation routing stays in `src/engines`. The UI uses product compatibility metadata to restrict print methods and the engine performs a second validation pass before export.

## Workbook logic reproduced

- Eight quantity tiers with cost multiplier, selling multiplier, and margin-adjustment metadata.
- Jersey fabric, collar, sleeve, custom-name, custom-number, and team-set adjustments.
- Tee and polo garment pricing, cap pricing, and custom cut-and-sew component pricing.
- DTF pricing, silkscreen flat minimums/per-piece tiers, embroidery stitch and placement pricing plus digitizing fees, and jersey sublimation pricing.
- Eight add-ons with per-piece or flat-fee behavior and optional quantity overrides.
- `QUOTATION_OUTPUT` totals: internal cost, tier-adjusted cost, selling price, profit, margin, and unit metrics.
- Multi-item orders: every product line receives the tier for its own quantity, then the independently calculated lines are combined into one quotation. Global per-piece add-ons default to the combined order quantity.

The source workbook mentions DTG as a supported Tee/Polo method but contains no separate `PRINT_DTG_ENGINE` or DTG rate table. The app exposes DTG and transparently maps it to the workbook's DTF option prices. Replace the alias in `src/data/printData.json` when approved DTG pricing becomes available.

The workbook's `Margin Adj %` tier field is preserved and returned by the tier engine, but it is not applied again because the workbook's `QUOTATION_OUTPUT` formula does not use it. Applying it would break price parity.

## Validation

The app checks required customer/order data, whole-number quantities, product-specific configuration, size totals, print details, and incompatible combinations. Jersey orders require exactly one sublimation method; sublimation is rejected for all other products.

Customer data stays in the browser. There is no server, database, API, authentication, or analytics dependency.
