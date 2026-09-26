/*
 * Things arrive as you reach them: a short fade and rise, each one a moment
 * after the one before it. Nothing moves on its own, nothing loops, and the
 * page is readable without any of it.
 *
 * The hidden state is set by a class this file adds to the document, so a
 * reader whose JavaScript never runs — or whose browser has no
 * IntersectionObserver — sees the page as it is drawn, not a blank one.
 */

const HIDE_CLASS = 'has-reveal';
const SEEN = 'is-in';

export default function watchReveals(root = globalThis.document) {
  if (!root?.body || typeof IntersectionObserver === 'undefined') return () => {};
  if (globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return () => {};

  root.documentElement.classList.add(HIDE_CLASS);
  const watched = new WeakSet();
  let shown = 0;

  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add(SEEN);
      shown += 1;
      observer.unobserve(entry.target);
    }
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.1 });

  /*
   * Somewhere the observer never reports — a window with no height, a browser
   * that measures oddly — the page would sit blank. Nothing has appeared a few
   * seconds in, so everything is shown at once and the effect is given up.
   */
  const safety = setTimeout(() => {
    if (shown > 0) return;
    for (const node of root.querySelectorAll('[data-reveal]')) node.classList.add(SEEN);
    root.documentElement.classList.remove(HIDE_CLASS);
  }, 2500);

  const scan = () => {
    for (const node of root.querySelectorAll(`[data-reveal]:not(.${SEEN})`)) {
      if (watched.has(node)) continue;
      watched.add(node);
      // Already on screen when the page opens: show it without waiting.
      const box = node.getBoundingClientRect();
      if (box.top < (globalThis.innerHeight ?? 0) * 0.92 && box.bottom > 0) { node.classList.add(SEEN); shown += 1; }
      else observer.observe(node);
    }
  };

  scan();
  // Pages here are one app: sections arrive as the route changes.
  const mutations = new MutationObserver(scan);
  mutations.observe(root.body, { childList: true, subtree: true });

  return () => {
    clearTimeout(safety);
    observer.disconnect();
    mutations.disconnect();
    root.documentElement.classList.remove(HIDE_CLASS);
  };
}
