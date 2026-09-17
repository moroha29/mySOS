/*
 * A customer's request from a solution page: which products, how many, any
 * details, when they are needed, and notes. It is turned into one message the
 * customer sends to MySOS.
 *
 * This is not a quotation. It carries no prices, and nothing here touches the
 * agents' quotation engine.
 */
import productData from '../data/productData.json';
import siteContent from '../data/siteContent.json';
import { messageHref } from './catalogue';

const catalogue = new Map(productData.catalogue.filter((item) => item.public?.visible).map((item) => [item.id, item]));

export const productFor = (productId) => (productId ? catalogue.get(productId) ?? null : null);

let lineCounter = 0;
const nextKey = (prefix) => `${prefix}-${(lineCounter += 1)}`;

/** One row of the request. `details` holds only what the customer set. */
export function makeLine({ productId = '', name = '', note = '', quantity = 1 } = {}, prefix = 'line') {
  const product = productFor(productId);
  return {
    key: nextKey(prefix),
    productId: product ? productId : '',
    name: String(name || product?.public?.name || '').trim(),
    catalogueName: product?.public?.name ?? '',
    note: String(note || ''),
    quantity: clampQuantity(quantity),
    details: {},
    detailNotes: '',
    files: [],
  };
}

export const clampQuantity = (value) => {
  const number = Math.round(Number(value));
  return Number.isFinite(number) ? Math.min(99999, Math.max(1, number)) : 1;
};

/** The use case's recommended package, as editable rows. Unknown products are skipped. */
export function packageLines(useCase) {
  return (useCase?.items ?? [])
    .filter((item) => !item.productId || productFor(item.productId))
    .filter((item) => item.productId || String(item.name || '').trim())
    .map((item, index) => makeLine(item, `${useCase.id}-${index}`));
}

/** Suggested extras that exist and are not already in the request. */
export function suggestionsFor(useCase, lines) {
  const chosen = new Set(lines.map((line) => line.productId).filter(Boolean));
  return (useCase?.suggestions ?? []).map(productFor).filter((product) => product && !chosen.has(product.id));
}

/** The detail fields a product offers, by its catalogue subcategory. */
export function detailFieldsFor(productId, options = siteContent.requestOptions ?? {}) {
  const subcategory = productFor(productId)?.public?.subcategory;
  return options[subcategory] ?? options.default ?? [];
}

/** Opening a product's details selects each field's recommended choice. */
export function recommendedDetails(fields) {
  return Object.fromEntries(fields.filter((field) => field.recommended).map((field) => [field.id, field.recommended]));
}

const neededByFormat = new Intl.DateTimeFormat('en-SG', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

export function formatNeededBy(value) {
  const time = Date.parse(`${value}T00:00:00Z`);
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value)) && Number.isFinite(time) ? neededByFormat.format(time) : '';
}

/*
 * The message the customer sends. Details appear only where the customer set
 * them; everything else is left for MySOS to confirm in the chat. Files are
 * named, because a chat link cannot carry them.
 */
export function buildRequestMessage({ solutionName = '', useCaseName = '', lines = [], neededBy = '', notes = '', fileNames = [], fields = detailFieldsFor } = {}) {
  const topic = [solutionName, useCaseName].filter(Boolean).join(' – ');
  const out = [`Hi MySOS, I'd like to request a quote${topic ? ` for ${topic}` : ''}.`, ''];
  lines.forEach((line, index) => {
    const kind = line.catalogueName && line.catalogueName !== line.name ? ` (${line.catalogueName})` : '';
    out.push(`${index + 1}. ${line.name}${kind} × ${line.quantity}`);
    const labels = Object.fromEntries(fields(line.productId).map((field) => [field.id, field.label]));
    const chosen = Object.entries(line.details ?? {})
      .filter(([, value]) => String(value ?? '').trim())
      .map(([id, value]) => `${labels[id] ?? id}: ${String(value).trim()}`);
    if (chosen.length) out.push(`   ${chosen.join(' · ')}`);
    if (String(line.detailNotes ?? '').trim()) out.push(`   Notes: ${line.detailNotes.trim()}`);
    if (line.files?.length) out.push(`   Reference: ${line.files.join(', ')}`);
  });
  const date = formatNeededBy(neededBy);
  if (date || String(notes).trim() || fileNames.length) out.push('');
  if (date) out.push(`Needed by: ${date}`);
  if (String(notes).trim()) out.push(`Notes: ${String(notes).trim()}`);
  if (fileNames.length) out.push(`Files: ${fileNames.join(', ')}`);
  return out.join('\n');
}

export function requestHref(message, solutionName = '') {
  return messageHref(message, `Request: ${solutionName || 'MySOS'}`);
}

/** Every file name in a request, row references first, without repeats. */
export function allFileNames(lines, generalFiles = []) {
  return [...new Set([...lines.flatMap((line) => line.files ?? []), ...generalFiles])];
}
