import siteContent from '../data/siteContent.json';

/*
 * Text styles chosen in the website manager: a size, a font or a colour on one
 * piece of text.
 *
 * The manager publishes them into siteContent.json as appearance.overrides,
 * each naming the page it is on and the element it styles. Nothing read them,
 * so a style showed in the manager's preview and never on the live site. This
 * applies them the way the preview does, so what was chosen is what goes live.
 *
 * An element is named by its content path ([data-cms-path='…']) when it has
 * one, which the page carries exactly as the preview did, or by its position
 * from <body>. Inside the manager's own preview the manager applies the draft's
 * styles itself, so the site stands back there (data-manager-preview).
 */

// The same choices the manager offers; anything else is ignored.
const FONT_FAMILIES = new Set(['Arial, sans-serif', 'Georgia, serif', '"Trebuchet MS", sans-serif', '"Courier New", monospace']);
// The manager's size slider: from half to three times the design's own size.
const FONT_SCALES = { has: (value) => Number.isFinite(value) && value >= 0.5 && value <= 3 && value !== 1 };
const COLOUR = /^#[0-9a-f]{6}$/i;

// Styles saved before they recorded their exact page name one of these.
const PAGE_PATHS = { homepage: '/', products: '/products', solutions: '/solutions', 'why-mysos': '/why-mysos', 'success-stories': '/success-stories' };

const sitePath = (pathname) => String(pathname ?? '').replace(/^\/mySOS(?=\/|$)/, '').replace(/\/+$/, '') || '/';

/** The styles that belong on the page at `pathname`. */
export function stylesForPage(overrides = siteContent.appearance?.overrides, pathname = globalThis.location?.pathname) {
  const here = sitePath(pathname);
  return (Array.isArray(overrides) ? overrides : []).filter((item) => item && typeof item.selector === 'string'
    && (item.route ? sitePath(item.route) === here : PAGE_PATHS[item.page] === here));
}

/** The elements a style's address names. */
export function styleTargets(selector, root = globalThis.document) {
  const text = String(selector ?? '');
  const all = () => { try { return [...root.querySelectorAll(text)]; } catch { return []; } };
  if (!text.startsWith('body > ')) return all();
  let nodes = [root.body];
  for (const part of text.slice('body > '.length).split(' > ')) {
    const match = part.match(/^([a-z][a-z0-9-]*)(?::nth-of-type\((\d+)\))?$/i);
    if (!match) return all();
    nodes = nodes.flatMap((parent) => {
      const same = [...parent.children].filter((child) => child.tagName.toLowerCase() === match[1].toLowerCase());
      return match[2] ? same.slice(Number(match[2]) - 1, Number(match[2])) : same;
    });
  }
  return nodes;
}

/** Take off every style this module put on, leaving each element as the site drew it. */
function clearTextStyles(root) {
  root.querySelectorAll('[data-text-style]').forEach((node) => {
    const original = node.getAttribute('data-text-style');
    if (original === '') node.removeAttribute('style');
    else node.setAttribute('style', original);
    node.removeAttribute('data-text-style');
  });
}

/** Apply this page's styles; safe to call again (it starts from the site's own look each time). */
export function applyTextStyles({ overrides, pathname = globalThis.location?.pathname, root = globalThis.document } = {}) {
  if (!root?.body || root.documentElement.hasAttribute('data-manager-preview')) return 0;
  clearTextStyles(root);
  let styled = 0;
  stylesForPage(overrides, pathname).forEach((item) => {
    styleTargets(item.selector, root).filter((node) => !node.hasAttribute('data-text-style')).forEach((node) => {
      node.setAttribute('data-text-style', node.getAttribute('style') ?? '');
      // Measured before anything changes, so "Large" is 1.25 times the site's own size here.
      const base = Number.parseFloat(globalThis.getComputedStyle(node).fontSize) || 16;
      if (COLOUR.test(item.color || '')) node.style.setProperty('color', item.color, 'important');
      if (FONT_SCALES.has(Number(item.fontScale))) node.style.setProperty('font-size', `${Math.round(base * Number(item.fontScale) * 100) / 100}px`, 'important');
      if (FONT_FAMILIES.has(item.fontFamily)) node.style.setProperty('font-family', item.fontFamily, 'important');
      styled += 1;
    });
  });
  return styled;
}

/*
 * Keep them applied: once the page has drawn, and again when the window
 * changes size, because a heading's own size depends on the width (it is
 * re-measured from the site's size each time, never compounded).
 */
export function watchTextStyles() {
  if (!stylesForPage().length) return () => {};
  let timer = 0;
  const apply = () => applyTextStyles();
  const later = () => { clearTimeout(timer); timer = setTimeout(apply, 150); };
  const frame = globalThis.requestAnimationFrame(apply);
  globalThis.addEventListener('resize', later);
  return () => {
    globalThis.cancelAnimationFrame(frame);
    clearTimeout(timer);
    globalThis.removeEventListener('resize', later);
  };
}
