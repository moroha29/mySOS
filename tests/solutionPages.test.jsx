import React from 'react';
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import productData from '../src/data/productData.json';
import siteContent from '../src/data/siteContent.json';
import solutions from '../src/data/solutions.json';
import PublicApp, { resolvePublicRoute } from '../src/public/PublicApp';
import {
  buildRequestMessage, clampQuantity, detailFieldsFor, formatNeededBy, makeLine, needsPrintingChoice,
  packageLines, printingFieldFor, recommendedDetails, searchProducts, suggestionsFor,
} from '../src/utils/solutionRequest';

const originalLocation = globalThis.location;
afterEach(() => {
  if (originalLocation === undefined) delete globalThis.location;
  else globalThis.location = originalLocation;
});

const renderAt = (pathname, search = '') => {
  globalThis.location = { pathname, search };
  return renderToStaticMarkup(<PublicApp />);
};
const visible = new Set(productData.catalogue.filter((item) => item.public.visible).map((item) => item.id));
const cmsPath = (...path) => `data-cms-path="${JSON.stringify(path).replace(/"/g, '&quot;')}"`;
const text = (markup) => markup.replace(/<[^>]+>/g, ' ');

describe('a page for every solution', () => {
  it.each(solutions.map((solution) => solution.id))('/mySOS/solutions/%s/ resolves and is prerendered', (id) => {
    expect(resolvePublicRoute(`/mySOS/solutions/${id}/`)).toEqual({ page: 'solution', id });
    expect(readFileSync(new URL('../scripts/prerender.mjs', import.meta.url), 'utf8')).toContain('...solutions.map((solution) => `/solutions/${solution.id}/`)');
  });

  it('an unknown solution is not found', () => {
    expect(resolvePublicRoute('/mySOS/solutions/not-a-solution/')).toEqual({ page: 'not-found' });
  });

  it('every solution link on the site goes to the new pages', () => {
    for (const pathname of ['/mySOS/', '/mySOS/solutions/', '/mySOS/products/']) {
      const markup = renderAt(pathname);
      expect(markup).not.toContain('?industry=');
      for (const solution of solutions) expect(markup).toContain(`href="/mySOS/solutions/${solution.id}/"`);
    }
  });
});

describe.each(solutions)('the $name page', (solution) => {
  const markup = renderAt(`/mySOS/solutions/${solution.id}/`);
  const defaultCase = solution.useCases.find((useCase) => useCase.id === solution.defaultUseCase);

  it('shows its banner, with breadcrumb and a WhatsApp button', () => {
    expect(markup).toContain(`<h1 ${cmsPath('additionalContent', 'solutions', solutions.indexOf(solution), 'page', 'title')}>${solution.page.title.replace(/&/g, '&amp;')}</h1>`);
    expect(markup).toMatch(/<nav class="breadcrumb" aria-label="Breadcrumb">/);
    expect(markup).toMatch(/class="btn btn-primary btn-whatsapp" href="https:\/\/wa\.me\//);
  });

  it('offers its use cases, the default one selected', () => {
    const cards = [...markup.matchAll(/class="use-case-card( is-active)?" aria-pressed="(true|false)"/g)];
    expect(cards).toHaveLength(solution.useCases.length);
    const selected = solution.useCases[cards.findIndex((card) => card[1])];
    expect(selected.id).toBe(solution.defaultUseCase);
  });

  it("builds the default use case's package and a summary of it", () => {
    expect(markup.match(/class="request-row"/g)).toHaveLength(defaultCase.items.length);
    for (const item of defaultCase.items) {
      const name = item.name || productData.catalogue.find((product) => product.id === item.productId).public.name;
      expect(text(markup)).toContain(name.replace(/&/g, '&amp;'));
    }
    expect(markup).toContain(`${defaultCase.items.length} products selected`);
  });

  it('sends the request to WhatsApp, naming the solution and every item', () => {
    const href = markup.match(/class="btn btn-primary btn-whatsapp request-send" href="([^"]+)"/)[1].replace(/&#x27;/g, "'").replace(/&amp;/g, '&');
    const message = new URL(href).searchParams.get('text');
    expect(message).toContain(`${solution.name.replace(' Organisations', '')} – ${defaultCase.name}`);
    expect(message.match(/^\d+\. /gm)).toHaveLength(defaultCase.items.length);
  });

  it('shows no prices and never links to the quotation engine', () => {
    expect(markup).not.toMatch(/quotation_engine/);
    expect(text(markup)).not.toMatch(/\$\s?\d|From \$|S\$|\bSGD\b/);
    expect(markup).not.toContain('class="price"');
  });
});

describe('the page wording and content are editable', () => {
  const markup = renderAt('/mySOS/solutions/churches/');
  const index = solutions.findIndex((solution) => solution.id === 'churches');

  it('the banner, use cases and builder wording carry their content paths', () => {
    for (const key of ['eyebrow', 'title', 'lead', 'exploreTitle']) {
      expect(markup).toContain(cmsPath('additionalContent', 'solutions', index, 'page', key));
    }
    solutions[index].useCases.forEach((_, caseIndex) => {
      expect(markup).toContain(cmsPath('additionalContent', 'solutions', index, 'useCases', caseIndex, 'name'));
    });
    for (const key of ['packageTitle', 'includedTitle', 'sameQuantityLabel', 'applyAllButton', 'addMoreTitle', 'customTitle', 'filesTitle', 'summaryTitle', 'neededByLabel', 'additionalNotesLabel', 'sendButton', 'sendHint']) {
      expect(markup, key).toContain(cmsPath('homepage', 'pages', 'solutionPage', key));
    }
  });

  it('follows the design for the Churches page', () => {
    const churches = solutions[index];
    expect(churches.page.title).toBe('Everything Your Church Needs, All in One Place');
    expect(churches.useCases.map((useCase) => useCase.name)).toEqual(['Camps & Retreats', 'Events & Anniversaries', 'Ministry & Volunteer Apparel', 'Welcome & Appreciation Gifts']);
    expect(churches.defaultUseCase).toBe('ministry');
    expect(siteContent.requestOptions.lanyards.map((field) => field.label)).toEqual(['Width', 'Printing', 'Attachment', 'Colour']);
  });
});

describe('the content holds together', () => {
  it('every package and suggestion names a product on the site', () => {
    for (const solution of solutions) {
      expect(solution.useCases.map((useCase) => useCase.id)).toContain(solution.defaultUseCase);
      for (const useCase of solution.useCases) {
        for (const item of useCase.items) {
          if (item.productId) expect(visible.has(item.productId), `${solution.id}/${useCase.id}: ${item.productId}`).toBe(true);
          else expect(item.name, `${solution.id}/${useCase.id}: a custom line needs a name`).toMatch(/\S/);
          expect(item.quantity).toBeGreaterThan(0);
        }
        for (const productId of useCase.suggestions) expect(visible.has(productId), `${solution.id}/${useCase.id}: ${productId}`).toBe(true);
      }
    }
  });

  it('every detail field is a known kind, and a recommended choice is one of its options', () => {
    for (const [group, fields] of Object.entries(siteContent.requestOptions)) {
      for (const field of fields) {
        expect(['choice', 'select', 'text'], `${group}.${field.id}`).toContain(field.type);
        if (field.type !== 'text') expect(field.options.length, `${group}.${field.id}`).toBeGreaterThan(0);
        if (field.recommended) expect(field.options, `${group}.${field.id}`).toContain(field.recommended);
      }
    }
  });
});

describe('the request message', () => {
  const lanyard = () => ({ ...makeLine({ productId: 'event_lanyard', name: 'Lanyard', note: 'Recommended: 20mm, double-sided', quantity: 50 }) });

  it('lists each item with its quantity and what MySOS recommended', () => {
    const message = buildRequestMessage({ solutionName: 'Churches', useCaseName: 'Ministry & Volunteer Apparel', lines: [lanyard(), makeLine({ name: 'Name Badge', quantity: 20 })] });
    expect(message).toBe([
      "Hi MySOS, I'd like to request a quote for Churches – Ministry & Volunteer Apparel.",
      '',
      '1. Lanyard (Event Lanyard) × 50',
      '   Recommended: 20mm, double-sided',
      '2. Name Badge × 20',
    ].join('\n'));
  });

  it("uses the customer's details instead of the recommendation once they choose them", () => {
    const line = lanyard();
    line.details = { ...recommendedDetails(detailFieldsFor('event_lanyard')), attachment: 'Safety buckle', colour: 'Blue' };
    line.detailNotes = 'Print both church names';
    line.files = ['lanyard.png'];
    const message = buildRequestMessage({ lines: [line], neededBy: '2026-10-20', notes: 'Navy please', fileNames: ['lanyard.png', 'logo.pdf'] });
    expect(message).toContain('   Width: 20mm · Printing: Double-sided · Attachment: Safety buckle · Colour: Blue');
    expect(message).not.toContain('Recommended: 20mm');
    expect(message).toContain('   Notes: Print both church names');
    expect(message).toContain('   Reference: lanyard.png');
    expect(message).toContain('Needed by: 20 Oct 2026');
    expect(message).toContain('Notes: Navy please');
    expect(message).toContain('Files: lanyard.png, logo.pdf');
  });

  it('never mentions a price', () => {
    const lines = solutions.flatMap((solution) => solution.useCases.flatMap(packageLines));
    expect(buildRequestMessage({ lines })).not.toMatch(/\$|price/i);
  });

  it('keeps quantities whole and at least one, and dates real', () => {
    expect([clampQuantity('0'), clampQuantity('-4'), clampQuantity('12.6'), clampQuantity('abc'), clampQuantity(500000)]).toEqual([1, 1, 13, 1, 99999]);
    expect(formatNeededBy('2026-02-30')).toBe('');
    expect(formatNeededBy('next week')).toBe('');
  });

  it('suggests only extras not already requested', () => {
    const useCase = solutions.find((solution) => solution.id === 'churches').useCases.find((item) => item.id === 'ministry');
    const lines = packageLines(useCase);
    lines.push(makeLine({ productId: 'insulated_bottle' }));
    expect(suggestionsFor(useCase, lines).map((product) => product.id)).toEqual(['canvas_tote_bag', 'dri_fit_round_neck']);
  });

  it('opening details selects the recommended choices only', () => {
    expect(recommendedDetails(detailFieldsFor('event_lanyard'))).toEqual({ width: '20mm', printing: 'Double-sided' });
    // A product whose kind has no printing question of its own is still asked
    // one, so nothing is sent to MySOS without saying how it should be printed.
    const medal = detailFieldsFor('custom_medal');
    expect(medal.slice(1)).toEqual(siteContent.requestOptions.default);
    expect(medal[0].id).toBe('printing');
    expect(medal[0].options).toContain('Let MySOS recommend');
  });

  it('asks how each product should be printed, unless MySOS already said', () => {
    const line = makeLine({ productId: 'custom_medal' });
    expect(needsPrintingChoice(line)).toBe(true);
    expect(needsPrintingChoice({ ...line, details: { printing: 'Silkscreen' } })).toBe(false);
    // The recommended package says it on the row itself; no need to ask again.
    expect(needsPrintingChoice({ ...line, note: 'Printing: Let MySOS recommend based on your artwork' })).toBe(false);
    expect(printingFieldFor('premium_cotton_tee').id).toBe('printing');
  });

  it('searches the whole catalogue, not just what was recommended', () => {
    expect(searchProducts('tote').map((product) => product.id)).toContain('canvas_tote_bag');
    // Words may come in any order, and a category name finds its products.
    expect(searchProducts('bag tote').map((product) => product.id)).toContain('canvas_tote_bag');
    expect(searchProducts('drinkware').length).toBeGreaterThan(0);
    expect(searchProducts('tote', { exclude: ['canvas_tote_bag'] }).map((product) => product.id)).not.toContain('canvas_tote_bag');
    expect(searchProducts('   ')).toEqual([]);
    expect(searchProducts('nothing at all like this')).toEqual([]);
  });
});

describe('files are never claimed as sent', () => {
  // The builder is shared with the blank "Get a Quote" page.
  const source = readFileSync(new URL('../src/public/components/RequestBuilder.jsx', import.meta.url), 'utf8');

  it('leaves the printing question open when that is what the row asked about', () => {
    // Opening details normally fills in MySOS's recommendations. Answering the
    // printing prompt that way would answer the question for the customer.
    expect(source).toMatch(/if \(wantPrinting\) delete details\[printingFieldFor\(line\.productId\)\?\.id\];/);
    expect(source).toMatch(/document\.getElementById\(`printing-\$\{index\}`\)\?\.focus\(\)/);
  });

  it('shares files through the device when it can, and otherwise says to attach them', () => {
    expect(source).toMatch(/navigator\.canShare\?\.\(\{ files: attached, text: message \}\)/);
    expect(source).toMatch(/await navigator\.share\(\{ files: attached, text: message \}\);\s*setSent\('shared'\)/);
    expect(siteContent.pages.solutionPage.sendFilesHint).toMatch(/attach \{files\}/);
    expect(source).toMatch(/fileNames\.length > 0 && sent !== 'shared'/);
  });
});
