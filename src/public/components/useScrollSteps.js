import { useCallback, useEffect, useRef, useState } from 'react';

/*
 * A section that stays on screen and moves through `count` steps as the page
 * scrolls, as the Why MySOS design has it.
 *
 * The track is tall and the pin inside it is position: sticky, so scrolling
 * the track is what moves between steps. Where the pin is not sticky — narrow
 * or very short screens, where the CSS simply lists every step — nothing is
 * tracked and the first step stays marked.
 */
export default function useScrollSteps(count) {
  const trackRef = useRef(null);
  const pinRef = useRef(null);
  const [active, setActive] = useState(0);

  const pinned = () => {
    const pin = pinRef.current;
    return Boolean(pin && trackRef.current && getComputedStyle(pin).position === 'sticky');
  };

  // How far the track has scrolled past its pinned start, from 0 to 1.
  const geometry = () => {
    const track = trackRef.current;
    const pin = pinRef.current;
    const top = parseFloat(getComputedStyle(pin).top) || 0;
    const rect = track.getBoundingClientRect();
    const travel = rect.height - pin.offsetHeight;
    return { top, rect, travel };
  };

  useEffect(() => {
    if (count < 2) return undefined;
    let frame = 0;
    const measure = () => {
      frame = 0;
      if (!pinned()) return;
      const { top, rect, travel } = geometry();
      if (travel <= 0) return;
      const progress = Math.min(1, Math.max(0, (top - rect.top) / travel));
      setActive(Math.min(count - 1, Math.floor(progress * count)));
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(measure); };
    measure();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, [count]);

  // Choosing a step scrolls to it, so the page and the marked step never disagree.
  const goTo = useCallback((index) => {
    const step = Math.min(count - 1, Math.max(0, index));
    if (!pinned()) { setActive(step); return; }
    const { top, rect, travel } = geometry();
    const target = window.scrollY + rect.top - top + ((step + 0.5) / count) * travel;
    const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: target, behavior: still ? 'auto' : 'smooth' });
    setActive(step);
  }, [count]);

  return { trackRef, pinRef, active, goTo };
}
