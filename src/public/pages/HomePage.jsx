import { useEffect, useMemo, useState } from 'react';
import siteConfig from '../../data/siteConfig.json';
import siteContent from '../../data/siteContent.json';
import solutions from '../../data/solutions.json';
import { cms, configPath, contentPath, headingPath, labelPath, picture, scenePath, solutionPath } from '../cms';
import { firstImage } from '../../utils/imageRegistry';
import { getStories, REQUEST_PATH } from '../../utils/catalogue';
import { hasGoogleReviews } from '../../utils/googleReviews';
import Icon from '../components/Icons';
import { Button, heading, label, Photo, Testimonials, useGoogleReviews } from '../components/Ui';
import CategoryStrip from '../components/CategoryStrip';
import useScrollSteps from '../components/useScrollSteps';
import { processPhoto } from '../processPhotos';

/*
 * The homepage, laid out after the 2026 concept: a banner that asks what the
 * visitor needs rather than listing what MySOS sells, then the proof (who MySOS
 * works for, what people say), what can be made, how MySOS works, and the work
 * itself.
 *
 * Everything on it is content the website manager can edit, and every route out
 * of it goes either to the products or to the request page — never to the
 * agents' quotation engine.
 */

const MARQUEE_SPEED = 34; // px per second — slow enough to read each mark
const CARD_WIDTH = 232;   // keep in sync with .trust-logo width in public.css
const SLIDE_SECONDS = 6;

const two = (number) => String(number).padStart(2, '0');
// What the visitor typed becomes the opening note of their request.
const askHref = (text) => `${REQUEST_PATH}?ask=${encodeURIComponent(text)}`;

/* ------------------------------------------------------------------ banner */

/*
 * The banner's picture card. Pictures come from scenes.homeHeroSlides so the
 * manager chooses them; until any are set it runs MySOS's own photographs, one
 * per solution, and each names the solution it shows. The first is in the
 * prerendered HTML, so the card is never blank, and a reader who asked for less
 * motion keeps that one.
 */
const SLIDE_FALLBACKS = ['scenes/solutions-hero', 'solutions/events', 'solutions/schools', 'scenes/why-hero', 'solutions/businesses'];

function heroSlides() {
  const chosen = (siteContent.scenes?.homeHeroSlides ?? []).map((value) => String(value ?? '').trim()).filter(Boolean);
  const pictures = chosen.length ? chosen : SLIDE_FALLBACKS.map((key) => firstImage(key)).filter(Boolean);
  return pictures.map((src, index) => ({ src, index, solution: solutions[index % Math.max(1, solutions.length)] }));
}

function HeroCard({ slides }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (slides.length < 2 || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;
    const timer = setInterval(() => setShown((current) => (current + 1) % slides.length), SLIDE_SECONDS * 1000);
    return () => clearInterval(timer);
  }, [slides.length]);

  const current = slides[shown] ?? slides[0];
  if (!current) return null;
  return <div className="hero-card">
    {slides.map(({ src, index }) => <div
      key={src}
      className={index === shown ? 'hero-card-slide is-active' : 'hero-card-slide'}
      style={{ backgroundImage: `url("${src.replaceAll('"', '%22')}")` }}
      data-cms-path={cms(scenePath('homeHeroSlides', index))}
      aria-hidden="true"
    />)}
    <div className="hero-card-copy">
      <span className="hero-card-eyebrow" data-cms-path={cms(solutionPath(current.solution, 'name'))}>{current.solution?.name}</span>
      <p className="hero-card-title" data-cms-path={cms(solutionPath(current.solution, 'description'))}>{current.solution?.description}</p>
      <ul className="hero-card-tags">
        {siteContent.categories.slice(0, 5).map((category) => <li key={category.id}>
          <a href={`/mySOS/products/?category=${category.id}`} data-cms-path={cms(contentPath('categories', siteContent.categories.indexOf(category), 'name'))}>{category.name}</a>
        </li>)}
      </ul>
      {slides.length > 1 && <div className="hero-card-dots" aria-hidden="true">
        {slides.map(({ src, index }) => <span key={src} className={index === shown ? 'is-active' : ''} />)}
      </div>}
    </div>
  </div>;
}

function HeroSearch() {
  const [asked, setAsked] = useState('');
  const chips = siteContent.heroSearchChips ?? [];
  const href = askHref(asked.trim());
  return <>
    <form
      className="hero-search"
      role="search"
      onSubmit={(event) => { event.preventDefault(); if (asked.trim()) globalThis.location.assign(href); }}
    >
      <Icon name="search" size={20} />
      <input
        type="search"
        aria-label={label('heroSearchPlaceholder', 'Tell us what you need')}
        placeholder={label('heroSearchPlaceholder', 'Try: 200 event kits under $15 each')}
        value={asked}
        onChange={(event) => setAsked(event.target.value)}
      />
      <a className="btn btn-primary" href={asked.trim() ? href : REQUEST_PATH}>
        <span data-cms-path={cms(labelPath('heroSearchButton'))}>{label('heroSearchButton', 'Find it for me')}</span>
      </a>
    </form>
    <ul className="hero-chips">
      {chips.map((chip, index) => <li key={chip}>
        <a href={askHref(chip)}><span data-cms-path={cms(contentPath('heroSearchChips', index))}>{chip}</span></a>
      </li>)}
    </ul>
  </>;
}

/* ------------------------------------------------------- proof and logos */

function LogoCard({ logo, index, duplicate = false }) {
  const src = picture(logo.image, `logos/${logo.key}`);
  // Only the first pass is annotated: the duplicate is decorative, and marking
  // it would give the manager two elements claiming the same field.
  const namePath = duplicate ? undefined : cms(contentPath('trustedBy', index, 'name'));
  return <div className="trust-logo" style={{ '--logo-scale': logo.scale ?? 1 }} aria-hidden={duplicate || undefined}>
    {src
      ? <img className="crest-img" src={src} alt={duplicate ? '' : logo.name} loading="lazy" data-cms-path={duplicate ? undefined : cms(contentPath('trustedBy', index, 'image'))} />
      : <span className="crest-fallback" aria-label={duplicate ? undefined : logo.name} role={duplicate ? undefined : 'img'}><b data-cms-path={namePath}>{logo.name}</b></span>}
  </div>;
}

/*
 * Continuous marquee of the organisations MySOS works for — their own marks,
 * not their names set as text. The list is rendered twice and the track slides
 * exactly -50%, so the wrap is seamless. A CSS animation rather than a rAF
 * loop: it runs on the compositor and pauses on hover declaratively.
 */
function TrustStrip() {
  const logos = siteContent.trustedBy;
  const duration = Math.round((logos.length * CARD_WIDTH) / MARQUEE_SPEED);

  return <section className="trust-strip">
    <p className="mini-title" data-cms-path={cms(headingPath('trustedByHeading'))}>{heading('trustedByHeading', 'Trusted by organisations across Singapore')}</p>
    <div className="trust-row">
      <div className="trust-viewport">
        <div className="trust-track" style={{ '--marquee-duration': `${duration}s` }}>
          {logos.map((logo, index) => <LogoCard key={logo.key} logo={logo} index={index} />)}
          {/* duplicate pass, hidden from assistive tech, purely for the seamless wrap */}
          {logos.map((logo, index) => <LogoCard key={`dup-${logo.key}`} logo={logo} index={index} duplicate />)}
        </div>
      </div>
    </div>
  </section>;
}

/*
 * What clients say: the rating and the reviews themselves, in the slider the
 * site has always carried. The concept showed a single line of proof here; the
 * slider stays, because a rating alone says much less than the reviews do.
 */
function Reviews() {
  const data = useGoogleReviews();
  if (!hasGoogleReviews(data)) return null;
  return <div className="home-reviews">
    <Testimonials
      eyebrow={heading('reviewsHeading', 'What our clients say')}
      eyebrowPath={headingPath('reviewsHeading')}
      action={<Button href="/mySOS/success-stories/" variant="outline">
        <span data-cms-path={cms(labelPath('viewAllStoriesButton'))}>{label('viewAllStoriesButton', 'View All Success Stories')}</span>
        <Icon name="arrowRight" size={15} className="inline-arrow" />
      </Button>}
    />
  </div>;
}

/* --------------------------------------------------------------- sections */

// The tiles alternate through a fixed set of washes, as the design has them.
const TILE_TONES = ['soft', 'navy', 'green', 'blue', 'mint', 'lilac'];

function CategoryTiles() {
  return <section className="section home-tiles">
    <div className="home-tiles-head">
      <h2 data-cms-path={cms(headingPath('categoriesHeading'))}>{heading('categoriesHeading', 'What can we make for you?')}</h2>
    </div>
    <div className="home-tile-grid">
      {siteContent.categories.map((category, index) => <a
        key={category.id}
        className={`home-tile tone-${TILE_TONES[index % TILE_TONES.length]}`}
        href={`/mySOS/products/?category=${category.id}`}
      >
        <Icon name={category.icon} size={30} cmsPath={contentPath('categories', index, 'icon')} />
        <span className="home-tile-body">
          <strong data-cms-path={cms(contentPath('categories', index, 'name'))}>{category.name}</strong>
          <small data-cms-path={cms(contentPath('categories', index, 'description'))}>{category.description}</small>
        </span>
      </a>)}
    </div>
  </section>;
}

function WhyBand() {
  const reasons = siteContent.benefits.slice(0, 4);
  return <section className="home-why">
    <div className="home-why-inner">
      <div className="home-why-head">
        <h2 data-cms-path={cms(headingPath('benefitsHeading'))}>{heading('benefitsHeading', 'Why choose MySOS?')}</h2>
      </div>
      <ol className="home-why-grid">
        {reasons.map((reason, index) => <li key={reason.icon}>
          <span className="home-why-number">{two(index + 1)}</span>
          <Icon name={reason.cardIcon || reason.icon} size={26} cmsPath={contentPath('benefits', index, reason.cardIcon ? 'cardIcon' : 'icon')} />
          <h3 data-cms-path={cms(contentPath('benefits', index, 'shortTitle'))}>{reason.shortTitle || reason.title}</h3>
          <p data-cms-path={cms(contentPath('benefits', index, 'description'))}>{reason.description}</p>
        </li>)}
      </ol>
    </div>
  </section>;
}

/*
 * Budget first, product second: a visitor who knows what they can spend per
 * person, and roughly how many, is shown what that usually buys. The bands and
 * their wording are content; no MySOS price appears here or anywhere else on
 * the public site.
 */
function BudgetFinder() {
  const bands = siteContent.budgetBands ?? [];
  const [bandId, setBandId] = useState(bands[0]?.id);
  const [quantity, setQuantity] = useState(100);
  const band = bands.find((item) => item.id === bandId) ?? bands[0];
  if (!band) return null;
  const ask = `Hi MySOS, I am planning about ${quantity} pieces at ${band.label} per person. ${band.title}.`;

  return <section className="section home-budget">
    <div className="home-budget-card">
      <div className="home-budget-copy">
        <span className="eyebrow" data-cms-path={cms(headingPath('budgetEyebrow'))}>{heading('budgetEyebrow', 'Find by budget')}</span>
        <h2 data-cms-path={cms(headingPath('budgetHeading'))}>{heading('budgetHeading', 'Know the budget, not the product?')}</h2>
        <p data-cms-path={cms(headingPath('budgetLead'))}>{heading('budgetLead')}</p>
      </div>
      <div className="home-budget-picker">
        <div className="home-budget-quantity">
          <label htmlFor="budget-quantity" data-cms-path={cms(labelPath('budgetQuantityLabel'))}>{label('budgetQuantityLabel', 'Estimated quantity')}</label>
          <input id="budget-quantity" type="number" min="1" inputMode="numeric" value={quantity} onChange={(event) => setQuantity(event.target.value)} />
        </div>
        <span className="home-budget-question" id="budget-question" data-cms-path={cms(labelPath('budgetQuestionLabel'))}>{label('budgetQuestionLabel', 'What is your budget per person?')}</span>
        <div className="home-budget-bands" role="radiogroup" aria-labelledby="budget-question">
          {bands.map((item, index) => <button
            key={item.id}
            type="button"
            role="radio"
            aria-checked={item.id === band.id}
            className={item.id === band.id ? 'is-chosen' : ''}
            onClick={() => setBandId(item.id)}
            data-cms-path={cms(contentPath('budgetBands', index, 'label'))}
          >{item.label}</button>)}
        </div>
        <div className="home-budget-result">
          <div>
            <strong data-cms-path={cms(contentPath('budgetBands', bands.indexOf(band), 'title'))}>{band.title}</strong>
            <small data-cms-path={cms(contentPath('budgetBands', bands.indexOf(band), 'description'))}>{band.description}</small>
          </div>
          <Button href={askHref(ask)}><span data-cms-path={cms(labelPath('budgetSeeIdeasLabel'))}>{label('budgetSeeIdeasLabel', 'See matching ideas')}</span></Button>
        </div>
        <p className="home-budget-note" data-cms-path={cms(labelPath('budgetFootnote'))}>{label('budgetFootnote')}</p>
      </div>
    </div>
  </section>;
}

function SelectedWork({ stories }) {
  if (!stories.length) return null;
  return <section className="section home-work">
    <div className="home-work-head">
      <h2 data-cms-path={cms(headingPath('storiesHeading'))}>{heading('storiesHeading', 'Real projects. Real results.')}</h2>
      <a className="text-link" href="/mySOS/success-stories/">
        <span data-cms-path={cms(labelPath('viewAllStoriesButton'))}>{label('viewAllStoriesButton', 'View All Success Stories')}</span>
        <Icon name="arrowRight" size={15} className="inline-arrow" />
      </a>
    </div>
    <div className="home-work-grid">
      {stories.map((story, index) => <a className={`home-work-card tone-${index % 2 ? 'mint' : 'blue'}`} key={story.slug} href={`/mySOS/success-stories/${story.slug}/`}>
        <span className="home-work-tag">{story.category.replace('-', ' ')}</span>
        <span className="home-work-shot"><Photo style={story.imageStyle} image={picture(story.image, `stories/${story.slug}/cover`)} label={`${story.title} project`} /></span>
        <h3>{story.title}</h3>
        <p>{story.summary}</p>
        {story.highlights?.length > 0 && <ul className="home-work-stats">
          {story.highlights.map((highlight) => <li key={highlight.text}>
            <Icon name={highlight.icon} size={18} />
            <span>{highlight.text}</span>
          </li>)}
        </ul>}
      </a>)}
    </div>
  </section>;
}

/*
 * How it works: the steps as a row that scrolls sideways, with the line above
 * following whichever card is centred. The page itself is never held —
 * see useScrollSteps.
 */
function ProcessRail() {
  const steps = siteContent.process;
  const { scrollerRef, active, goTo } = useScrollSteps(steps.length, { axis: 'x', align: 'start' });
  const reached = steps.length > 1 ? active / (steps.length - 1) : 0;

  return <section className="section home-process">
    <div className="home-process-head">
      <h2 data-cms-path={cms(headingPath('processHeading'))}>{heading('processHeading', 'How it works')}</h2>
    </div>
    <div className="home-process-card">
      <ol className="home-process-track" style={{ '--reached': reached }}>
        {steps.map((step, index) => <li key={step.title} className={index <= active ? 'is-done' : ''}>
          <button type="button" aria-current={index === active ? 'step' : undefined} onClick={() => goTo(index)}>
            <span className="sr-only">{`${two(index + 1)} ${step.title}`}</span>
          </button>
        </li>)}
      </ol>
      <div className="home-process-rail" ref={scrollerRef} role="region" aria-label="How a MySOS order works, one step per card. Scroll sideways to move between them." tabIndex={0}>
        {steps.map((step, index) => <article className="home-process-step" key={step.title} data-step={index} data-active={index === active ? 'true' : undefined}>
          <span className="home-process-shot"><Photo style="studio" image={processPhoto(step)} imagePath={contentPath('process', index, 'image')} label={step.headline || step.title} wide /></span>
          <span className="home-process-label">{two(index + 1)} · <span data-cms-path={cms(contentPath('process', index, 'title'))}>{step.title}</span></span>
          <h3 data-cms-path={cms(contentPath('process', index, 'headline'))}>{step.headline || step.title}</h3>
          <p data-cms-path={cms(contentPath('process', index, 'detail'))}>{step.detail || step.description}</p>
        </article>)}
      </div>
    </div>
  </section>;
}

function ClosingBand() {
  return <section className="home-closing">
    <div className="home-closing-inner">
      <h2 data-cms-path={cms(headingPath('closingCtaTitle'))}>{heading('closingCtaTitle', 'Have a difficult request? That is our thing.')}</h2>
      <div>
        <p data-cms-path={cms(headingPath('closingCtaDescription'))}>{heading('closingCtaDescription')}</p>
        <div className="home-closing-actions">
          <Button href={REQUEST_PATH}>
            <span data-cms-path={cms(labelPath('heroQuoteButton'))}>{label('heroQuoteButton', 'Get a Quote')}</span>
            <Icon name="arrowRight" size={16} className="inline-arrow" />
          </Button>
        </div>
      </div>
    </div>
  </section>;
}

/* ------------------------------------------------------------------- page */

export default function HomePage() {
  const featuredStories = useMemo(() => getStories().filter((story) => story.featured).slice(0, 2), []);
  const slides = heroSlides();
  const stats = siteContent.homeStats ?? [];

  return <main className="home-page">
    <CategoryStrip />

    <section className="home-hero">
      <div className="home-hero-inner">
        <div className="home-hero-copy">
          <span className="eyebrow" data-cms-path={cms(configPath('tagline'))}>{siteConfig.tagline}</span>
          <h1>
            <span data-cms-path={cms(headingPath('heroTitle'))}>{heading('heroTitle', 'Custom Merchandise,')}</span>{' '}
            <em><span data-cms-path={cms(headingPath('heroTitleAccent'))}>{heading('heroTitleAccent', 'Made Simple.')}</span></em>
          </h1>
          <p className="home-hero-lead" data-cms-path={cms(headingPath('heroLead'))}>{heading('heroLead')}</p>
          <HeroSearch />
        </div>
        <HeroCard slides={slides} />
      </div>
    </section>

    {stats.length > 0 && <section className="home-stats">
      {stats.map((stat, index) => <div key={stat.value}>
        {stat.icon && <span className="home-stat-icon"><Icon name={stat.icon} size={22} cmsPath={contentPath('homeStats', index, 'icon')} /></span>}
        <strong data-cms-path={cms(contentPath('homeStats', index, 'value'))}>{stat.value}</strong>
        {stat.note && <small data-cms-path={cms(contentPath('homeStats', index, 'note'))}>{stat.note}</small>}
      </div>)}
    </section>}

    <TrustStrip />
    <Reviews />
    <CategoryTiles />
    <WhyBand />
    <BudgetFinder />
    <SelectedWork stories={featuredStories} />
    <ProcessRail />
    <ClosingBand />
  </main>;
}
