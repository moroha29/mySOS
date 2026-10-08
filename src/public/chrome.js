/*
 * Two things that follow the scroll: the thin line across the top that shows
 * how far down the page you are, and the header, which tightens and lifts off
 * the page once you leave the top of it.
 *
 * One passive listener, read inside a frame, so scrolling stays cheap. Both are
 * decoration: with this switched off the page is exactly as readable.
 *
 * How far down the page you are is written on the bar that draws it, never on
 * <html>. A custom property on the root element is inherited by everything
 * under it, so every element on the page had its style worked out again on
 * every frame of every scroll: 10ms a frame on the home page, where a frame
 * has 16ms to spare. On the one element that reads it, the same write costs
 * a seventh of a millisecond.
 */

export default function watchChrome(root = globalThis.document) {
  if (!root?.documentElement || typeof requestAnimationFrame !== 'function') return () => {};
  if (globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return () => {};

  const page = root.documentElement;
  const bar = root.querySelector('.site-announce');
  let frame = 0;
  let last = '';
  let tight = null;

  const measure = () => {
    frame = 0;
    const scrolled = globalThis.scrollY ?? 0;
    const runway = Math.max(1, page.scrollHeight - (globalThis.innerHeight ?? 0));
    // Rounded to the pixel the bar could actually draw: a bar 1600px wide has
    // no use for the fourth decimal place, and writing the same value again
    // would have the browser work the style out for nothing.
    const along = (Math.round(Math.min(1, scrolled / runway) * 2000) / 2000).toString();
    if (along !== last) { last = along; bar?.style.setProperty('--scrolled', along); }
    const near = scrolled > 24;
    if (near !== tight) { tight = near; page.classList.toggle('is-scrolled', near); }
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
    bar?.style.removeProperty('--scrolled');
  };
}
