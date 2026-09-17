import siteContent from '../../data/siteContent.json';
import { getImage } from '../../utils/imageRegistry';
import { cms, contentPath, headingPath, heroBackground, labelPath, pagePath, pageText, picture, scenePath } from '../cms';
import Icon from '../components/Icons';
import { Button, heading, label, PageCTA, Photo, SectionHeading, Testimonials } from '../components/Ui';
import useScrollSteps from '../components/useScrollSteps';

const two = (number) => String(number).padStart(2, '0');

// How far the reasons box scrolls inside itself for each card.
const REASON_STEP = 150;

/*
 * The process has no photographs of its own yet. Until one is chosen in the
 * manager, or dropped in as src/assets/images/process/<icon>, each step borrows
 * one of MySOS's own photos that shows the same kind of moment.
 */
const PROCESS_PHOTOS = {
  consult: 'solutions/community',
  expert: 'benefits/expert',
  clipboard: 'benefits/tailored',
  sample: 'solutions/schools',
  production: 'solutions/events',
  delivery: 'solutions/businesses',
};
const processPhoto = (step) => picture(step.image, `process/${step.icon}`) || getImage(PROCESS_PHOTOS[step.icon]);

function StepCount({ active, total, className = '' }) {
  return <p className={`step-count ${className}`.trim()} aria-live="polite">
    <strong>{two(active + 1)}</strong> / {two(total)}
  </p>;
}

/*
 * Why choose MySOS: the five reasons as a stack of cards, one at the front.
 *
 * The stack scrolls inside its own box: the wheel over it moves one card at a
 * time, and once the last card is reached the page carries on scrolling.
 */
function ReasonStack() {
  const reasons = siteContent.benefits;
  const { scrollerRef, active, goTo } = useScrollSteps(reasons.length, { axis: 'y', step: REASON_STEP });

  return <section className="why-choose" aria-labelledby="why-choose-title">
    <div className="section-heading align-center">
      <div>
        <span className="eyebrow" data-cms-path={cms(pagePath('why', 'benefitsEyebrow'))}>{pageText('why', 'benefitsEyebrow', 'Why choose MySOS')}</span>
        <h2 id="why-choose-title" data-cms-path={cms(pagePath('why', 'benefitsTitle'))}>{pageText('why', 'benefitsTitle', 'Everything You Need, Without the Sourcing Headache.')}</h2>
        <p data-cms-path={cms(pagePath('why', 'benefitsLead'))}>{pageText('why', 'benefitsLead')}</p>
      </div>
    </div>

    <div className="reason-stage">
      <div className="step-rail">
        <StepCount active={active} total={reasons.length} />
        <ol className="step-dots">
          {reasons.map((reason, index) => <li key={reason.icon}>
            <button
              type="button"
              className={index === active ? 'is-active' : ''}
              aria-label={`${two(index + 1)}: ${reason.stackLabel || reason.title}`}
              aria-current={index === active ? 'step' : undefined}
              onClick={() => goTo(index)}
            />
          </li>)}
        </ol>
        <span className="scroll-hint" aria-hidden="true">
          <Icon name="mouse" size={26} />
          <Icon name="chevronDown" size={14} />
        </span>
      </div>

      <div
        className="reason-scroller"
        ref={scrollerRef}
        role="region"
        aria-label="Reasons to choose MySOS. Scroll inside to see each one."
        tabIndex={0}
        style={{ '--steps': reasons.length, '--step': `${REASON_STEP}px` }}
      >
        <div className="reason-scroll-space">
          {reasons.map((reason, index) => <span className="reason-snap" key={reason.icon} style={{ top: `${index * REASON_STEP}px` }} aria-hidden="true" />)}
          <ol className="reason-stack">
            {reasons.map((reason, index) => {
              const depth = index - active;
              const state = depth < 0 ? 'past' : depth === 0 ? 'current' : 'next';
              const icon = reason.cardIcon || reason.icon;
              return <li className="reason-card" key={reason.icon} data-state={state} style={{ '--depth': Math.min(depth, 5) }}>
                <p className="reason-card-tab" aria-hidden="true">
                  <Icon name={icon} size={22} />
                  <span>{two(index + 1)}</span>
                  <strong data-cms-path={cms(contentPath('benefits', index, 'stackLabel'))}>{reason.stackLabel || reason.title}</strong>
                </p>
                <div className="reason-card-copy">
                  <Icon name={icon} size={58} className="reason-card-icon" />
                  <div>
                    <span className="reason-card-number">{two(index + 1)}</span>
                    <h3 data-cms-path={cms(contentPath('benefits', index, 'shortTitle'))}>{reason.shortTitle}</h3>
                    <p data-cms-path={cms(contentPath('benefits', index, 'longDescription'))}>{reason.longDescription}</p>
                  </div>
                </div>
                <Photo
                  style={reason.scene}
                  image={picture(reason.image, `benefits/${reason.icon}`)}
                  imagePath={contentPath('benefits', index, 'image')}
                  label={`${reason.title} illustration`}
                  className="reason-card-photo"
                  wide
                />
              </li>;
            })}
          </ol>
        </div>
      </div>
    </div>
  </section>;
}

/*
 * Our process: the six steps as a tracker over a row of cards.
 *
 * The row scrolls sideways — a swipe, a sideways trackpad scroll, the arrows or
 * a step in the tracker — and the tracker follows whichever card is centred.
 * Scrolling up or down passes straight through to the page.
 */
function ProcessJourney() {
  const steps = siteContent.process;
  const { scrollerRef, active, goTo } = useScrollSteps(steps.length, { axis: 'x' });
  const last = Math.max(1, steps.length - 1);

  return <section className="why-process" aria-labelledby="why-process-title">
    <div className="section-heading align-center eyebrow-title">
      <div>
        <h2 id="why-process-title" className="eyebrow" data-cms-path={cms(headingPath('whyProcessHeading'))}>{heading('whyProcessHeading', 'Our process')}</h2>
        <p data-cms-path={cms(pagePath('why', 'processLead'))}>{pageText('why', 'processLead', 'Follow your order from first enquiry to final delivery.')}</p>
      </div>
    </div>

    <ol className="journey-steps" style={{ '--reached': active / last, '--pulse': (active - 0.35) / last }}>
      {active > 0 && <li className="journey-pulse" aria-hidden="true" />}
      {steps.map((step, index) => <li key={step.title} className={index < active ? 'is-done' : index === active ? 'is-current' : ''}>
        <button type="button" aria-current={index === active ? 'step' : undefined} onClick={() => goTo(index)}>
          <span className="journey-node" aria-hidden="true">{index < active && <Icon name="check" size={17} />}</span>
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
              {step.points?.length > 0 && <ul className="journey-points">
                {step.points.map((point, pointIndex) => <li key={`${point.icon}-${pointIndex}`}>
                  <span className="journey-point-head">
                    <Icon name={point.icon} size={20} />
                    <strong data-cms-path={cms(contentPath('process', index, 'points', pointIndex, 'label'))}>{point.label}</strong>
                  </span>
                  <small data-cms-path={cms(contentPath('process', index, 'points', pointIndex, 'text'))}>{point.text}</small>
                </li>)}
              </ul>}
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
        <button type="button" aria-label="Previous step" disabled={active === 0} onClick={() => goTo(active - 1)}><Icon name="chevronLeft" size={18} /></button>
        <button type="button" aria-label="Next step" disabled={active === steps.length - 1} onClick={() => goTo(active + 1)}><Icon name="chevronRight" size={18} /></button>
      </div>
      <StepCount active={active} total={steps.length} className="journey-count" />
    </div>
  </section>;
}

/* Why clients come back: four promises that outlast one order. */
function ClientLoyalty() {
  const promises = siteContent.loyalty ?? [];
  if (!promises.length) return null;
  return <section className="section why-loyalty">
    <SectionHeading
      eyebrow={pageText('why', 'loyaltyEyebrow', 'Built for the long term')}
      eyebrowPath={pagePath('why', 'loyaltyEyebrow')}
      title={pageText('why', 'loyaltyTitle', 'Why Clients Come Back')}
      titlePath={pagePath('why', 'loyaltyTitle')}
      description={pageText('why', 'loyaltyLead')}
      descriptionPath={pagePath('why', 'loyaltyLead')}
    />
    <ul className="loyalty-grid">
      {promises.map((promise, index) => <li className="loyalty-card" key={promise.title}>
        <Icon name={promise.icon} size={42} />
        <h3 data-cms-path={cms(contentPath('loyalty', index, 'title'))}>{promise.title}</h3>
        <p data-cms-path={cms(contentPath('loyalty', index, 'description'))}>{promise.description}</p>
      </li>)}
    </ul>
  </section>;
}

export default function WhyPage() {
  return <main className="why-page">
    <section {...heroBackground(siteContent.scenes?.whyHeroBackgroundImage, scenePath('whyHeroBackgroundImage'), 'hero hero-compact')}>
      <div className="hero-inner">
        <div>
          <h1 data-cms-path={cms(pagePath('why', 'heroTitle'))}>{pageText('why', 'heroTitle', 'Why MySOS')}</h1>
          <p className="hero-lead" data-cms-path={cms(pagePath('why', 'heroLead'))}>{pageText('why', 'heroLead', 'One Supplier. Endless Possibilities.')}</p>
        </div>
        <div className="hero-scene"><Photo style="office" image={picture(siteContent.scenes?.whyHeroImage, 'scenes/why-hero')} imagePath={scenePath('whyHeroImage')} label="The MySOS team at work" wide eager /></div>
      </div>
    </section>

    <ReasonStack />
    <ProcessJourney />
    <ClientLoyalty />

    {/* The design closes on what clients say, after the reasons to come back. */}
    <Testimonials action={<Button href="/mySOS/success-stories/" variant="outline"><span data-cms-path={cms(labelPath('viewAllReviewsButton'))}>{label('viewAllReviewsButton', 'View All Reviews')}</span> <Icon name="arrowRight" size={15} className="inline-arrow" /></Button>} />

    <PageCTA
      title={pageText('why', 'ctaTitle', 'Bring your ideas to life with MySOS.')}
      titlePath={pagePath('why', 'ctaTitle')}
      description={pageText('why', 'ctaDescription', "We're ready to help.")}
      descriptionPath={pagePath('why', 'ctaDescription')}
    />
  </main>;
}
