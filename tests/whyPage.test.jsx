import React from 'react';
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import siteContent from '../src/data/siteContent.json';
import { hasIcon } from '../src/public/components/Icons';
import WhyPage from '../src/public/pages/WhyPage';
import { getImage } from '../src/utils/imageRegistry';

const originalLocation = globalThis.location;
afterEach(() => {
  if (originalLocation === undefined) delete globalThis.location;
  else globalThis.location = originalLocation;
});

const render = () => {
  globalThis.location = { pathname: '/mySOS/why-mysos/', search: '' };
  return renderToStaticMarkup(<WhyPage />);
};
const css = readFileSync(new URL('../src/public/public.css', import.meta.url), 'utf8');
const pageSource = readFileSync(new URL('../src/public/pages/WhyPage.jsx', import.meta.url), 'utf8');
const cmsPath = (...path) => `data-cms-path="${JSON.stringify(['homepage', ...path]).replace(/"/g, '&quot;')}"`;

describe('Why MySOS follows its design, top to bottom', () => {
  it('banner, why choose, our process, why clients come back, reviews, closing band', () => {
    const html = render();
    const order = ['class="hero hero-compact"', 'class="why-choose"', 'class="why-process"', 'class="section why-loyalty"', 'class="section reviews"', 'class="page-cta'];
    const positions = order.map((marker) => html.indexOf(marker));
    expect(positions.every((at) => at > -1), JSON.stringify(positions)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
  });

  it('the old list of reasons and the plain process row are gone', () => {
    const html = render();
    expect(html).not.toContain('why-list');
    expect(html).not.toContain('process-steps');
    expect(css).not.toMatch(/\.why-row|\.why-list/);
  });
});

describe('why choose MySOS: the stacked reasons', () => {
  it('stacks every reason, the first at the front and the rest behind it in order', () => {
    const html = render();
    const states = [...html.matchAll(/class="reason-card" data-state="(\w+)" style="--depth:(-?\d+)"/g)];
    expect(states.map((match) => match[1])).toEqual(siteContent.benefits.map((_, index) => (index === 0 ? 'current' : 'next')));
    expect(states.map((match) => Number(match[2]))).toEqual(siteContent.benefits.map((_, index) => index));
  });

  it('counts the reasons and offers a dot for each, the first marked', () => {
    const html = render();
    expect(html).toMatch(/<strong>01<\/strong> \/ 05/);
    const dots = [...html.matchAll(/<button type="button" class="(is-active)?" aria-label="(\d\d): ([^"]+)"/g)];
    expect(dots.map((dot) => dot[3])).toEqual(siteContent.benefits.map((benefit) => benefit.stackLabel));
    expect(dots[0][1]).toBe('is-active');
  });

  it('shows the heading and wording from the design, all editable', () => {
    const html = render();
    const why = siteContent.pages.why;
    expect(why.benefitsTitle).toBe('Everything You Need, Without the Sourcing Headache.');
    for (const key of ['benefitsEyebrow', 'benefitsTitle', 'benefitsLead']) expect(html).toContain(cmsPath('pages', 'why', key));
    siteContent.benefits.forEach((_, index) => {
      for (const key of ['stackLabel', 'shortTitle', 'longDescription', 'image']) expect(html).toContain(cmsPath('benefits', index, key));
    });
  });

  it('every reason has its short label and a card icon that exists', () => {
    for (const benefit of siteContent.benefits) {
      expect(benefit.stackLabel, benefit.icon).toMatch(/\S/);
      expect(hasIcon(benefit.cardIcon), benefit.cardIcon).toBe(true);
      // The photo is still found by the original icon name.
      expect(getImage(`benefits/${benefit.icon}`), benefit.icon).toBeTruthy();
    }
  });
});

describe('our process: the tracker and its cards', () => {
  it('lists every step in the tracker, the first current', () => {
    const html = render();
    const steps = [...html.matchAll(/<li( class="(is-done|is-current)?")?><button type="button"( aria-current="step")?>/g)];
    expect(steps).toHaveLength(siteContent.process.length);
    expect(steps[0][3]).toBe(' aria-current="step"');
    for (const [index, step] of siteContent.process.entries()) {
      expect(html).toContain(`${cmsPath('process', index, 'title')}>${step.title}</span>`);
    }
    expect(html).toMatch(/<strong>01<\/strong> \/ 06/);
  });

  it('puts the current step in front with one neighbour either side', () => {
    const cards = [...render().matchAll(/class="journey-card" data-step="(\d)" data-offset="(-?\d)"/g)];
    expect(cards.map((match) => Number(match[1]))).toEqual([0, 1, 2, 3, 4, 5]);
    expect(cards.map((match) => Number(match[2]))).toEqual([0, 1, 2, 2, 2, 2]);
    // The design: the earlier card tucks behind, the next starts just past the current one.
    expect(css).toMatch(/\.journey-card\[data-offset="-1"\] \.journey-card-face \{ transform: translateX\(230px\) scale\(\.84\); \}/);
    expect(css).toMatch(/\.journey-card\[data-offset="-2"\] \.journey-card-face, \.journey-card\[data-offset="2"\] \.journey-card-face \{ opacity: 0; \}/);
    // Neighbours are solid, with faded content, so nothing shows through.
    expect(css).toMatch(/\.journey-card-face > \* \{ opacity: \.5;/);
  });

  it('offers arrows either side of the counter, the first one off at the start', () => {
    const html = render();
    expect(html).toMatch(/<button type="button" aria-label="Previous step" disabled="">/);
    expect(html).toMatch(/<button type="button" aria-label="Next step">/);
  });

  it('every step has a headline, a line of detail and three points, all editable', () => {
    const html = render();
    for (const [index, step] of siteContent.process.entries()) {
      expect(step.headline, step.title).toMatch(/\S/);
      expect(step.detail, step.title).toMatch(/\S/);
      expect(step.points, step.title).toHaveLength(3);
      for (const [pointIndex, point] of step.points.entries()) {
        expect(hasIcon(point.icon), `${step.title}: ${point.icon}`).toBe(true);
        expect(html).toContain(cmsPath('process', index, 'points', pointIndex, 'label'));
        expect(html).toContain(cmsPath('process', index, 'points', pointIndex, 'text'));
      }
      for (const key of ['headline', 'detail', 'image']) expect(html).toContain(cmsPath('process', index, key));
    }
  });

  it('uses the wording the design gives for the quote, sample and production steps', () => {
    const byTitle = Object.fromEntries(siteContent.process.map((step) => [step.title, step]));
    expect(byTitle.Quote.headline).toBe('A Clear, Detailed Quote');
    expect(byTitle.Sample.headline).toBe('Approve Your Sample');
    expect(byTitle.Sample.detail).toBe('Check the quality, fit, materials and branding before full production.');
    expect(byTitle.Sample.points.map((point) => point.label)).toEqual(['Sample', 'Adjust', 'Finalise']);
    expect(byTitle.Produce.headline).toBe('Production & Quality Check');
  });

  it('every step shows a real MySOS photo until its own is added', () => {
    const borrowed = Object.fromEntries([...pageSource.matchAll(/^\s+(\w+): '([\w/-]+)',$/gm)].map((match) => [match[1], match[2]]));
    for (const step of siteContent.process) {
      expect(getImage(`process/${step.icon}`) || getImage(borrowed[step.icon]), step.icon).toBeTruthy();
    }
    expect(render().match(/class="scene journey-card-photo"/g)).toHaveLength(siteContent.process.length);
  });
});

describe('why clients come back', () => {
  it('shows the four promises from the design, each editable with an icon that exists', () => {
    const html = render();
    expect(siteContent.loyalty.map((item) => item.title)).toEqual([
      'Reliable From Start to Finish',
      'Consistent Quality Across Products',
      'One Contact for Everything',
      'Support Beyond Delivery',
    ]);
    for (const [index, item] of siteContent.loyalty.entries()) {
      expect(hasIcon(item.icon), item.icon).toBe(true);
      expect(html).toContain(cmsPath('loyalty', index, 'title'));
      expect(html).toContain(cmsPath('loyalty', index, 'description'));
    }
    for (const key of ['loyaltyEyebrow', 'loyaltyTitle', 'loyaltyLead']) expect(html).toContain(cmsPath('pages', 'why', key));
  });
});

describe('scrolling, small screens and motion', () => {
  const whyStart = css.indexOf('Why MySOS');
  const whyCss = css.slice(whyStart, css.indexOf('@media (prefers-reduced-motion: reduce) {', whyStart));

  it('never holds the page: no section is pinned to the screen', () => {
    // The first version pinned both sections and made the page thousands of
    // pixels taller, with a screen of empty space above and below each.
    expect(css).not.toMatch(/scroll-pin|scroll-track/);
    expect(whyCss).not.toMatch(/top: 72px/);
    expect(whyCss).not.toMatch(/100vh/);
  });

  it('the reasons scroll inside their own box, one card per step', () => {
    const html = render();
    expect(html).toMatch(/<div class="reason-scroller" role="region" aria-label="[^"]+" tabindex="0" style="--steps:5;--step:150px">/);
    expect([...html.matchAll(/class="reason-snap" style="top:(\d+)px"/g)].map((match) => Number(match[1]))).toEqual([0, 150, 300, 450, 600]);
    expect(whyCss).toMatch(/\.reason-scroller \{ height: 560px; overflow-y: auto; overscroll-behavior-y: auto; scroll-snap-type: y mandatory;/);
    expect(whyCss).toMatch(/\.reason-stack \{ position: sticky; top: 0;/);
    // Phones list every reason instead.
    const listed = whyCss.slice(whyCss.indexOf('@media (max-width: 1080px) {'));
    expect(listed).toMatch(/\.reason-scroller \{ height: auto; overflow: visible;/);
  });

  it('the process scrolls sideways and lets up-and-down scrolling reach the page', () => {
    const html = render();
    expect(html).toMatch(/<div class="journey-cards" role="region" aria-label="[^"]+" tabindex="0">/);
    expect(whyCss).toMatch(/\.journey-cards \{[^}]*overflow-x: auto; overscroll-behavior-x: contain;/);
    expect(whyCss).not.toMatch(/overflow-y: (auto|scroll)[^}]*\}\s*\.journey-cards/);
    // A finger swipe snaps natively; CSS snapping on a mouse pulled short scrolls back.
    expect(whyCss).toMatch(/@media \(pointer: coarse\) \{ \.journey-cards \{ scroll-snap-type: x mandatory; \} \}/);
    const baseRow = whyCss.match(/^\.journey-cards \{\r?\n[^}]*\}/m)[0];
    expect(baseRow).not.toMatch(/scroll-snap-type/);
  });

  it('the card the row lines up on is never scaled, only its face', () => {
    // Chrome snaps to transformed boxes and re-snaps after every change, which
    // cancelled every scroll while the card itself was scaled.
    const card = whyCss.match(/\.journey-card \{[^}]*\}/)[0];
    expect(card).not.toMatch(/transform|opacity/);
    expect(render()).toMatch(/<article class="journey-card"[^>]*><div class="journey-card-face">/);
  });

  it('keeps still for readers who ask for less motion', () => {
    const reduced = css.slice(css.lastIndexOf('@media (prefers-reduced-motion: reduce) {'));
    expect(reduced).toMatch(/\.reason-card, [^}]*\.journey-card[^}]*\{ transition: none; \}/);
    expect(reduced).toMatch(/\.scroll-hint \.icon:last-child \{ animation: none; \}/);
  });

  it('choosing a step scrolls its own box to it, never the page', () => {
    const hook = readFileSync(new URL('../src/public/components/useScrollSteps.js', import.meta.url), 'utf8');
    expect(hook).not.toMatch(/window\.scroll(To|By)\(/);
    expect(hook).toMatch(/scroller\.scrollTo\(\{ left: centreOf\(scroller, item\), behavior: smoothly\(\) \}\)/);
    expect(hook).toMatch(/scroller\.scrollTo\(\{ top: target \* step, behavior: smoothly\(\) \}\)/);
  });

  it('a short sideways nudge moves one card on instead of springing back', () => {
    const hook = readFileSync(new URL('../src/public/components/useScrollSteps.js', import.meta.url), 'utf8');
    expect(hook).toMatch(/else if \(Math\.abs\(moved\) >= NUDGE\) target = clamp\(settledRef\.current \+ Math\.sign\(moved\)\);/);
    // Touch screens snap natively, so they are left alone.
    expect(hook).toMatch(/if \(axis === 'x' && !touch\)/);
  });
});
