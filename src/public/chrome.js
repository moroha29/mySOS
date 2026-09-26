/*
 * Two things that follow the scroll: the thin line across the top that shows
 * how far down the page you are, and the header, which tightens and lifts off
 * the page once you leave the top of it.
 *
 * One passive listener, read inside a frame, so scrolling stays cheap. Both are
 * decoration: with this switched off the page is exactly as readable.
 */

export default function watchChrome(root = globalThis.document) {
  if (!root?.documentElement || typeof requestAnimationFrame !== 'function') return () => {};
  if (globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return () => {};

  const page = root.documentElement;
  let frame = 0;

  const measure = () => {
    frame = 0;
    const scrolled = globalThis.scrollY ?? 0;
    const runway = Math.max(1, page.scrollHeight - (globalThis.innerHeight ?? 0));
    page.style.setProperty('--scrolled', String(Math.min(1, scrolled / runway)));
    page.classList.toggle('is-scrolled', scrolled > 24);
  };

  const onScroll = () => { if (!frame) frame = requestAnimationFrame(measure); };

  measure();
  globalThis.addEventListener('scroll', onScroll, { passive: true });
  globalThis.addEventListener('resize', onScroll);

  return () => {
    if (frame) cancelAnimationFrame(frame);
    globalThis.removeEventListener('scroll', onScroll);
    globalThis.removeEventListener('resize', onScroll);
    page.classList.remove('is-scrolled');
    page.style.removeProperty('--scrolled');
  };
}
