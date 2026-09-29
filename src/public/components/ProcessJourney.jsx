import siteContent from '../../data/siteContent.json';
import { cms, contentPath } from '../cms';
import { Photo, StepCount } from './Ui';
import { processPhoto } from '../processPhotos';
import useScrollSteps from './useScrollSteps';
import Icon from './Icons';

const two = (number) => String(number).padStart(2, '0');

/*
 * An order from first enquiry to delivery: a tracker of numbered steps above a
 * row of cards, one of them at the front.
 *
 * The row scrolls sideways — a swipe, a sideways trackpad scroll, the arrows or
 * a step in the tracker — and the tracker follows whichever card is centred.
 * Scrolling up or down passes straight through to the page.
 *
 * The homepage and Why MySOS both tell this story, so they tell it the same
 * way; each supplies its own heading in `head`, since one leads a page and the
 * other sits inside it.
 */
export default function ProcessJourney({ head, labelledBy }) {
  const steps = siteContent.process;
  const { scrollerRef, active, goTo } = useScrollSteps(steps.length, { axis: 'x' });
  const last = Math.max(1, steps.length - 1);

  return <section className="process-band" aria-labelledby={labelledBy}>
    {head}

    <ol className="journey-steps" style={{ '--reached': active / last }}>
      {steps.map((step, index) => <li key={step.title} className={index < active ? 'is-done' : index === active ? 'is-current' : ''}>
        <button type="button" aria-current={index === active ? 'step' : undefined} onClick={() => goTo(index)}>
          <span className="journey-node" aria-hidden="true">{index < active && <Icon name="check" size={20} />}</span>
          <span className="journey-number">{two(index + 1)}</span>
          <span className="journey-label" data-cms-path={cms(contentPath('process', index, 'title'))}>{step.title}</span>
        </button>
      </li>)}
    </ol>

    <div className="journey-cards" ref={scrollerRef} role="region" aria-label="Our process, one step per card. Scroll sideways to move between them." tabIndex={0}>
      {steps.map((step, index) => {
        const offset = Math.max(-2, Math.min(2, index - active));
        // The card is what the row lines up on, so it never moves; only its
        // face is scaled. Chrome snaps to transformed boxes and re-snaps after
        // every change, which cancelled every scroll while the card itself
        // was scaled.
        return <article className="journey-card" key={step.title} data-step={index} data-offset={offset}>
          <div className="journey-card-face">
            <div className="journey-card-copy">
              <span className="journey-card-number">{two(index + 1)}</span>
              <h3 data-cms-path={cms(contentPath('process', index, 'headline'))}>{step.headline || step.title}</h3>
              <p data-cms-path={cms(contentPath('process', index, 'detail'))}>{step.detail || step.description}</p>
            </div>
            <Photo
              style="studio"
              image={processPhoto(step)}
              imagePath={contentPath('process', index, 'image')}
              label={step.headline || step.title}
              className="journey-card-photo"
              wide
            />
          </div>
        </article>;
      })}
    </div>

    <div className="journey-foot">
      <div className="journey-arrows">
        <button type="button" aria-label="Previous step" disabled={active === 0} onClick={() => goTo(active - 1)}><Icon name="chevronLeft" size={22} /></button>
        <button type="button" aria-label="Next step" disabled={active === steps.length - 1} onClick={() => goTo(active + 1)}><Icon name="chevronRight" size={22} /></button>
      </div>
      <StepCount active={active} total={steps.length} className="journey-count" />
    </div>
  </section>;
}
