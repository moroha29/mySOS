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

  /*
   * A second pair of eyes. Flinging the page down can outrun the observer:
   * the section passes through the window between two frames and is never
   * reported, and it would sit invisible until someone scrolled back to it.
   * So anything the page has already reached is shown, checked on the scroll
   * itself and inside a frame.
   */
  const pending = new Set();
  let frame = 0;
  const sweep = () => {
    frame = 0;
    const height = globalThis.innerHeight ?? 0;
    for (const node of pending) {
      if (node.classList.contains(SEEN)) { pending.delete(node); continue; }
      const box = node.getBoundingClientRect();
      // Reached, or already passed: a fling can carry the page straight over
      // a section, and it must not be left invisible behind us.
      if (box.top < height * 0.95 || box.bottom < 0) {
        node.classList.add(SEEN);
        shown += 1;
        observer.unobserve(node);
        pending.delete(node);
      }
    }
  };
  const onScroll = () => { if (!frame) frame = requestAnimationFrame(sweep); };
  globalThis.addEventListener('scroll', onScroll, { passive: true });
  globalThis.addEventListener('resize', onScroll);

  const scan = () => {
    for (const node of root.querySelectorAll(`[data-reveal]:not(.${SEEN})`)) {
      if (watched.has(node)) continue;
      watched.add(node);
      /*
       * Already on screen when the page opens: it still arrives, on the next
       * frame, so the banner is not simply there when someone lands. Anything
       * further down waits until it is reached.
       */
      const box = node.getBoundingClientRect();
      if (box.top < (globalThis.innerHeight ?? 0) * 0.92 && box.bottom > 0) {
        shown += 1;
        requestAnimationFrame(() => node.classList.add(SEEN));
      } else { observer.observe(node); pending.add(node); }
    }
  };

  scan();
  // Pages here are one app: sections arrive as the route changes.
  const mutations = new MutationObserver(scan);
  mutations.observe(root.body, { childList: true, subtree: true });

  return () => {
    clearTimeout(safety);
    if (frame) cancelAnimationFrame(frame);
    globalThis.removeEventListener('scroll', onScroll);
    globalThis.removeEventListener('resize', onScroll);
    observer.disconnect();
    mutations.disconnect();
    root.documentElement.classList.remove(HIDE_CLASS);
  };
}
