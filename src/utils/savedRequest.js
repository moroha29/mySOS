/*
 * The customer's request, kept between visits.
 *
 * Someone puts a product in their request, goes off to look at another page,
 * and comes back expecting to find it there. Nothing was kept before, so the
 * page started empty every time and the work was lost.
 *
 * It lives in this browser only: no account, nothing sent anywhere until they
 * press send. Files are not kept — a File cannot be written to storage, and
 * they are attached to the message at the moment it is sent anyway.
 */

export const SAVED_REQUEST_KEY = 'mysos.request.v1';
/** A request nobody has touched for this long is stale; the page starts fresh. */
export const MAX_SAVED_DAYS = 30;
/** Other parts of the page listen for this to re-read the count. */
export const SAVED_REQUEST_EVENT = 'mysos:request-saved';

const store = () => {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    // Private windows and blocked site data throw on access, not on use.
    return null;
  }
};

const isFresh = (savedAt) => {
  const time = Date.parse(String(savedAt ?? ''));
  if (!Number.isFinite(time)) return false;
  return Date.now() - time < MAX_SAVED_DAYS * 24 * 60 * 60 * 1000;
};

/** What one row keeps: enough to rebuild it, nothing more. */
const cleanLine = (line) => ({
  productId: String(line?.productId ?? ''),
  name: String(line?.name ?? '').slice(0, 120),
  note: String(line?.note ?? '').slice(0, 200),
  quantity: Number(line?.quantity) || 1,
  details: Object.fromEntries(Object.entries(line?.details ?? {})
    .filter(([, value]) => typeof value === 'string' && value.trim())
    .map(([id, value]) => [String(id), String(value).slice(0, 120)])),
  detailNotes: String(line?.detailNotes ?? '').slice(0, 300),
});

/** The request this browser has, or null. */
export function readSavedRequest() {
  const memory = store();
  if (!memory) return null;
  try {
    const saved = JSON.parse(memory.getItem(SAVED_REQUEST_KEY) ?? 'null');
    if (!saved || !Array.isArray(saved.lines) || !isFresh(saved.savedAt)) return null;
    return {
      lines: saved.lines.filter((line) => line && (line.productId || line.name)).map(cleanLine),
      neededBy: String(saved.neededBy ?? ''),
      notes: String(saved.notes ?? ''),
      savedAt: saved.savedAt,
    };
  } catch {
    return null;
  }
}

/** Keeps the request, or clears it when there is nothing left in it. */
export function writeSavedRequest({ lines = [], neededBy = '', notes = '' } = {}) {
  const memory = store();
  if (!memory) return false;
  try {
    if (!lines.length) {
      memory.removeItem(SAVED_REQUEST_KEY);
    } else {
      memory.setItem(SAVED_REQUEST_KEY, JSON.stringify({
        lines: lines.map(cleanLine), neededBy, notes, savedAt: new Date().toISOString(),
      }));
    }
    globalThis.dispatchEvent?.(new CustomEvent(SAVED_REQUEST_EVENT));
    return true;
  } catch {
    // Storage full or blocked: the request still works for this visit.
    return false;
  }
}

export function clearSavedRequest() {
  const memory = store();
  try {
    memory?.removeItem(SAVED_REQUEST_KEY);
  } catch { /* nothing to clear */ }
  globalThis.dispatchEvent?.(new CustomEvent(SAVED_REQUEST_EVENT));
}

/** How many products are waiting in it. */
export const savedLineCount = (saved = readSavedRequest()) => saved?.lines?.length ?? 0;

/*
 * Arriving from a product page adds that product to what is already there,
 * rather than replacing it — and bumps the quantity if it is already in the
 * request, which is what "add it again" means.
 */
export function mergeArrival(lines = [], arrival = null) {
  if (!arrival?.productId && !arrival?.name) return lines;
  const at = lines.findIndex((line) => line.productId && line.productId === arrival.productId);
  if (at < 0) return [...lines, arrival];
  const found = lines[at];
  const merged = {
    ...found,
    quantity: Number(arrival.quantity) > 0 ? Number(arrival.quantity) : found.quantity,
    details: { ...found.details, ...Object.fromEntries(Object.entries(arrival.details ?? {}).filter(([, value]) => String(value ?? '').trim())) },
  };
  return lines.map((line, index) => (index === at ? merged : line));
}
