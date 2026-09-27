import { useEffect } from 'react';
import siteContent from '../../data/siteContent.json';
import { cms, contentPath, headingPath, heroBackground, labelPath, pagePath, pageText, picture, scenePath } from '../cms';
import Icon from '../components/Icons';
import { Button, heading, label, PageCTA, Photo, QuoteButton, SectionHeading, StepCount, Testimonials } from '../components/Ui';
import ProcessJourney from '../components/ProcessJourney';
import useScrollSteps from '../components/useScrollSteps';
import { processPhoto } from '../processPhotos';

const two = (number) => String(number).padStart(2, '0');

// How far the reasons box scrolls inside itself for each card.
const REASON_STEP = 150;


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
    <div className="section-heading align-center" data-reveal>
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
          <Icon name="mouse" size={30} />
          <Icon name="chevronDown" size={18} />
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
              const iconPath = contentPath('benefits', index, reason.cardIcon ? 'cardIcon' : 'icon');
              return <li className="reason-card" key={reason.icon} data-state={state} style={{ '--depth': Math.min(depth, 5) }}>
                <p className="reason-card-tab" aria-hidden="true">
                  <Icon name={icon} size={25} cmsPath={iconPath} />
                  <span>{two(index + 1)}</span>
                  <strong data-cms-path={cms(contentPath('benefits', index, 'stackLabel'))}>{reason.stackLabel || reason.title}</strong>
                </p>
                <div className="reason-card-copy">
                  <Icon name={icon} size={63} className="reason-card-icon" cmsPath={iconPath} />
                  <div>
                    <span className="reason-card-number">{two(index + 1)}</span>
                    <h3 data-cms-path={cms(contentPath('benefits', index, 'shortTitle'))}>{reason.shortTitle}</h3>
                    <p data-cms-path={cms(contentPath('benefits', index, 'longDescription'))}>{reason.longDescription}</p>
                  </div>
                </div>
                <Photo
                  style={reason.scene}
                  image={picture(reason.image, `benefits/${reason.key ?? reason.icon}`)}
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
      {promises.map((promise, index) => <li className="loyalty-card" key={promise.title} data-reveal style={{ '--reveal-delay': `${index * 70}ms` }}>
        <Icon name={promise.icon} size={45} cmsPath={contentPath('loyalty', index, 'icon')} />
        <h3 data-cms-path={cms(contentPath('loyalty', index, 'title'))}>{promise.title}</h3>
        <p data-cms-path={cms(contentPath('loyalty', index, 'description'))}>{promise.description}</p>
      </li>)}
    </ul>
  </section>;
}

export default function WhyPage() {
  // The page's own gentle snapping, set on the document because that is what
  // scrolls. It is taken off again when the reader leaves the page.
  useEffect(() => {
    document.documentElement.dataset.scrollSnap = 'why';
    return () => { delete document.documentElement.dataset.scrollSnap; };
  }, []);

  return <main className="why-page">
    <section {...heroBackground(siteContent.scenes?.whyHeroBackgroundImage, scenePath('whyHeroBackgroundImage'), 'hero hero-compact')}>
      <div className="hero-inner">
        <div>
          <span className="eyebrow" data-reveal data-cms-path={cms(headingPath('heroEyebrow'))}>{heading('heroEyebrow')}</span>
          <h1 data-reveal style={{ '--reveal-delay': '70ms' }} data-cms-path={cms(pagePath('why', 'heroTitle'))}>{pageText('why', 'heroTitle', 'Why MySOS')}</h1>
          <p className="hero-lead" data-reveal style={{ '--reveal-delay': '250ms' }} data-cms-path={cms(pagePath('why', 'heroLead'))}>{pageText('why', 'heroLead', 'One Supplier. Endless Possibilities.')}</p>
          <div className="hero-actions" data-reveal style={{ '--reveal-delay': '330ms' }}>
            <QuoteButton showArrow />
            <Button href="/mySOS/success-stories/" variant="ghost">
              <span data-cms-path={cms(labelPath('viewAllStoriesButton'))}>{label('viewAllStoriesButton', 'View All Success Stories')}</span>
              <Icon name="arrowRight" size={19} className="inline-arrow" />
            </Button>
          </div>
        </div>
        <div className="hero-scene"><Photo style="office" image={picture(siteContent.scenes?.whyHeroImage, 'scenes/why-hero')} imagePath={scenePath('whyHeroImage')} label="The MySOS team at work" wide eager /></div>
      </div>
    </section>

    {/* Reviews sit directly under the banner, as on the other pages. */}
    <Testimonials action={<Button href="/mySOS/success-stories/" variant="outline"><span data-cms-path={cms(labelPath('viewAllReviewsButton'))}>{label('viewAllReviewsButton', 'View All Reviews')}</span> <Icon name="arrowRight" size={18} className="inline-arrow" /></Button>} />

    <ReasonStack />
    <ProcessJourney
      labelledBy="why-process-title"
      head={<div className="section-heading align-center eyebrow-title" data-reveal>
        <div>
          <h2 id="why-process-title" className="eyebrow" data-cms-path={cms(headingPath('whyProcessHeading'))}>{heading('whyProcessHeading', 'Our process')}</h2>
          <p data-cms-path={cms(pagePath('why', 'processLead'))}>{pageText('why', 'processLead', 'Follow your order from first enquiry to final delivery.')}</p>
        </div>
      </div>}
    />
    <ClientLoyalty />

    <PageCTA
      title={pageText('why', 'ctaTitle', 'Bring your ideas to life with MySOS.')}
      titlePath={pagePath('why', 'ctaTitle')}
      description={pageText('why', 'ctaDescription', "We're ready to help.")}
      descriptionPath={pagePath('why', 'ctaDescription')}
    />
  </main>;
}
