import { useCallback, useEffect, useRef, useState } from 'react';

/*
 * Steps that follow a scroll area of their own, as the Why MySOS design has it.
 *
 * The page itself is never held or scrolled. `axis: 'y'` is a box that scrolls
 * up and down inside itself, one step every `step` pixels (CSS snaps it); once
 * it reaches the end, the wheel carries on scrolling the page as usual.
 * `axis: 'x'` is a row that scrolls sideways, and the step is whichever
 * [data-step] item sits nearest the middle.
 *
 * Where the box has nothing to scroll (on phones every reason is simply
 * listed), nothing is tracked and the first step stays marked.
 */
const SETTLE_DELAY = 160;
const NUDGE = 40;

const itemsOf = (scroller) => [...scroller.querySelectorAll('[data-step]')];
/*
 * Where the row has to sit for an item to be the step being read. A row of
 * cards centred on the current one (`align: 'centre'`) measures from the
 * middle; a row that simply starts at its first card measures from the left,
 * so nothing has to be scrolled before step one counts as reached.
 */
const restFor = (scroller, item, align) => (align === 'start'
  ? item.offsetLeft - (itemsOf(scroller)[0]?.offsetLeft ?? 0)
  : item.offsetLeft + item.offsetWidth / 2 - scroller.clientWidth / 2);
const smoothly = () => (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth');

function nearestItem(scroller, align) {
  let nearest = 0;
  let distance = Infinity;
  itemsOf(scroller).forEach((item, index) => {
    const away = Math.abs(restFor(scroller, item, align) - scroller.scrollLeft);
    if (away < distance) { distance = away; nearest = index; }
  });
  return nearest;
}

export default function useScrollSteps(count, { axis = 'y', step = 150, align = 'centre' } = {}) {
  const scrollerRef = useRef(null);
  const settledRef = useRef(0);
  const [active, setActive] = useState(0);
  const clamp = useCallback((index) => Math.min(count - 1, Math.max(0, index)), [count]);

  const scrollRowTo = useCallback((index) => {
    const scroller = scrollerRef.current;
    const item = scroller && itemsOf(scroller)[index];
    settledRef.current = index;
    if (item) scroller.scrollTo({ left: restFor(scroller, item, align), behavior: smoothly() });
  }, [align]);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller || count < 2) return undefined;
    let frame = 0;
    let settleTimer = 0;
    // Touch screens snap natively (CSS); a mouse or trackpad is settled here.
    const touch = window.matchMedia?.('(pointer: coarse)').matches;

    const measure = () => {
      frame = 0;
      if (axis === 'y') {
        if (scroller.scrollHeight <= scroller.clientHeight + 1) return;
        setActive(clamp(Math.round(scroller.scrollTop / step)));
        return;
      }
      setActive(nearestItem(scroller, align));
    };

    /*
     * When sideways scrolling pauses, finish on a whole card: the nearest one
     * if the scroll already reached it, otherwise the next card in the
     * direction moved. A short wheel or trackpad nudge therefore moves one
     * card on, instead of being pulled back to where it started.
     */
    const settle = () => {
      const items = itemsOf(scroller);
      const from = items[settledRef.current];
      if (!from) return;
      const moved = scroller.scrollLeft - restFor(scroller, from, align);
      const nearest = nearestItem(scroller, align);
      let target = settledRef.current;
      if (nearest !== settledRef.current) target = nearest;
      else if (Math.abs(moved) >= NUDGE) target = clamp(settledRef.current + Math.sign(moved));
      if (target === settledRef.current && Math.abs(moved) < 2) return;
      setActive(target);
      scrollRowTo(target);
    };

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(measure);
      if (axis === 'x' && !touch) {
        clearTimeout(settleTimer);
        settleTimer = setTimeout(settle, SETTLE_DELAY);
      }
    };

    measure();
    scroller.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      clearTimeout(settleTimer);
      scroller.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [align, axis, clamp, count, scrollRowTo, step]);

  // Choosing a step scrolls the box to it, so the box and the marked step agree.
  const goTo = useCallback((index) => {
    const target = clamp(index);
    setActive(target);
    const scroller = scrollerRef.current;
    if (!scroller) return;
    if (axis === 'x') { scrollRowTo(target); return; }
    if (scroller.scrollHeight > scroller.clientHeight + 1) scroller.scrollTo({ top: target * step, behavior: smoothly() });
  }, [axis, clamp, scrollRowTo, step]);

  return { scrollerRef, active, goTo };
}
