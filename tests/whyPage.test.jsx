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

  it('puts the current step in front with its neighbours either side', () => {
    const offsets = [...render().matchAll(/class="journey-card" data-offset="(-?\d)"/g)].map((match) => Number(match[1]));
    expect(offsets).toEqual([0, 1, 2, 2, 2, 2]);
    // The design: the earlier card tucks behind, the next starts just past the current one.
    expect(css).toMatch(/\.journey-card\[data-offset="-1"\] \{ transform: translateX\(calc\(-50% - 450px\)\) scale\(\.84\); \}/);
    expect(css).toMatch(/\.journey-card\[data-offset="1"\] \{ transform: translateX\(calc\(-50% \+ 631px\)\) scale\(\.84\); \}/);
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
  it('holds each section on screen only where there is room for it', () => {
    expect(css).toMatch(/\.scroll-pin \{ position: sticky; top: 72px; height: calc\(100vh - 72px\);/);
    const fallback = css.slice(css.indexOf('@media (max-width: 1080px), (max-height: 680px) {'));
    expect(fallback).toMatch(/\.scroll-track \{ height: auto; \}/);
    expect(fallback).toMatch(/\.scroll-pin \{ position: static;/);
  });

  it('keeps still for readers who ask for less motion', () => {
    const reduced = css.slice(css.lastIndexOf('@media (prefers-reduced-motion: reduce) {'));
    expect(reduced).toMatch(/\.reason-card, [^}]*\.journey-card[^}]*\{ transition: none; \}/);
    expect(reduced).toMatch(/\.scroll-hint \.icon:last-child \{ animation: none; \}/);
  });

  it('choosing a step scrolls the page to it, so the two never disagree', () => {
    const hook = readFileSync(new URL('../src/public/components/useScrollSteps.js', import.meta.url), 'utf8');
    expect(hook).toMatch(/getComputedStyle\(pin\)\.position === 'sticky'/);
    expect(hook).toMatch(/window\.scrollTo\(\{ top: target, behavior: still \? 'auto' : 'smooth' \}\)/);
  });
});
