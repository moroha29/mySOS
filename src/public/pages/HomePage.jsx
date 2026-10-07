import { useEffect, useMemo, useRef, useState } from 'react';
import siteConfig from '../../data/siteConfig.json';
import siteContent from '../../data/siteContent.json';
import solutions from '../../data/solutions.json';
import { cms, configPath, contentPath, headingPath, labelPath, picture, scenePath, solutionPath } from '../cms';
import { firstImage } from '../../utils/imageRegistry';
import { getStories, REQUEST_PATH } from '../../utils/catalogue';
import { mergeArrival, readSavedRequest, writeSavedRequest } from '../../utils/savedRequest';
import { searchProducts } from '../../utils/solutionRequest';
import useSavedRequest from '../useSavedRequest';
import { hasGoogleReviews } from '../../utils/googleReviews';
import Icon from '../components/Icons';
import { Button, CategoryMark, heading, label, Photo, ProductShot, QuoteButton, Testimonials, useGoogleReviews } from '../components/Ui';
import CategoryStrip from '../components/CategoryStrip';
import ProcessJourney from '../components/ProcessJourney';

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
const SLIDE_SECONDS = 9;
// How long the light takes to cross the card. It only crosses when the picture
// behind it is changing, so the class is held for exactly that long.
const SHEEN_MS = 2300;

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
  // True only while one picture is becoming another: the light crosses the
  // card with the change and is not there the rest of the time.
  const [turning, setTurning] = useState(false);
  useEffect(() => {
    if (slides.length < 2 || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;
    let settle = 0;
    const timer = setInterval(() => {
      setShown((current) => (current + 1) % slides.length);
      setTurning(true);
      clearTimeout(settle);
      settle = setTimeout(() => setTurning(false), SHEEN_MS);
    }, SLIDE_SECONDS * 1000);
    return () => { clearInterval(timer); clearTimeout(settle); };
  }, [slides.length]);

  const current = slides[shown] ?? slides[0];
  if (!current) return null;
  return <div className={turning ? 'hero-card is-turning' : 'hero-card'}>
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
    </div>
  </div>;
}

/*
 * What the search finds: the products themselves, each a picture and its name,
 * with a button that puts it straight into the quote. A description on every
 * card only slowed the list down — the product's own page has the detail.
 *
 * Nothing matches every phrase ("Orientation Pack" is a kind of job, not a
 * product), so an empty result offers to describe it to MySOS instead.
 */
function SearchResults({ query, onAdd, added }) {
  const waiting = useSavedRequest();
  const results = useMemo(() => searchProducts(query), [query]);
  if (!results.length) {
    return <div className="hero-results is-empty">
      <p data-cms-path={cms(labelPath('heroSearchEmpty'))}>{label('heroSearchEmpty', 'No product goes by that name. Tell us what you are planning and we will find it.')}</p>
      <a className="btn btn-secondary btn-sm" href={askHref(query)}>
        <span data-cms-path={cms(labelPath('heroSearchAskButton'))}>{label('heroSearchAskButton', 'Tell us about it')}</span>
      </a>
    </div>;
  }
  return <div className="hero-results">
    <p className="hero-results-title">
      <span data-cms-path={cms(labelPath('heroSuggestTitle'))}>{label('heroSuggestTitle', 'Suggested products for')}</span>
      {` “${query.trim()}”`}
    </p>
    <ul>
      {results.slice(0, 6).map((product) => <li key={product.id}>
        <span className="hero-result-shot"><ProductShot imageStyle={product.public.imageStyle} slug={product.public.slug} /></span>
        <a className="hero-result-name" href={`/mySOS/products/${product.public.slug}/`}>{product.public.name}</a>
        <button type="button" className={added.includes(product.id) ? 'btn btn-outline btn-sm is-added' : 'btn btn-secondary btn-sm'} onClick={() => onAdd(product)}>
          {added.includes(product.id)
            ? <><Icon name="check" size={18} /> <span data-cms-path={cms(labelPath('addedToQuoteLabel'))}>{label('addedToQuoteLabel', 'In your quote')}</span></>
            : <><Icon name="plus" size={18} /> <span data-cms-path={cms(labelPath('addToQuoteLabel'))}>{label('addToQuoteLabel', 'Add to quote')}</span></>}
        </button>
      </li>)}
    </ul>
    {/* Only once there is a quote to go back to. */}
    {waiting > 0 && <a className="text-link hero-results-all" href={REQUEST_PATH}>
      <span data-cms-path={cms(labelPath('returnToQuoteButton'))}>{label('returnToQuoteButton', 'Return to quote')}</span>
      <Icon name="arrowRight" size={18} className="inline-arrow" />
    </a>}
  </div>;
}

function HeroSearch() {
  const [asked, setAsked] = useState('');
  const [added, setAdded] = useState([]);
  const chips = siteContent.heroSearchChips ?? [];
  const href = askHref(asked.trim());
  const query = asked.trim();

  // Straight into the quote, without leaving the page they are reading.
  const addProduct = (product) => {
    const quantity = Number(siteContent.quantityPresets?.[1]) || 50;
    const saved = readSavedRequest()?.lines ?? [];
    writeSavedRequest({ lines: mergeArrival(saved, { productId: product.id, name: product.public.name, quantity, details: {} }) });
    setAdded((current) => (current.includes(product.id) ? current : [...current, product.id]));
  };

  return <>
    <form
      className="hero-search"
      data-reveal
      style={{ '--reveal-delay': '320ms' }}
      role="search"
      onSubmit={(event) => { event.preventDefault(); if (query) globalThis.location.assign(href); }}
    >
      <Icon name="search" size={24} />
      <input
        type="search"
        aria-label={label('heroSearchPlaceholder', 'Tell us what you need')}
        placeholder={label('heroSearchPlaceholder', "Tell us what you're planning")}
        value={asked}
        onChange={(event) => setAsked(event.target.value)}
      />
      <a className="btn btn-primary" href={query ? href : REQUEST_PATH}>
        <span data-cms-path={cms(labelPath('heroSearchButton'))}>{label('heroSearchButton', 'Find My Solution')}</span>
      </a>
    </form>
    <ul className="hero-chips">
      {chips.map((chip, index) => <li key={chip}>
        <button type="button" onClick={() => setAsked(chip)}>
          <span aria-hidden="true">+</span>
          <span data-cms-path={cms(contentPath('heroSearchChips', index))}>{chip}</span>
        </button>
      </li>)}
    </ul>
    {query.length > 1 && <SearchResults query={query} onAdd={addProduct} added={added} />}
  </>;
}

/*
 * The figure at the head of the promises: counts up from nothing and settles
 * on the mark for "endless". The final mark is what the server draws, so it is
 * what a reader sees with no JavaScript, or one who asked for less motion; the
 * count only replaces it while it runs.
 */
const COUNT_MS = 1400;

function CountToInfinity({ value = '∞' }) {
  const [shown, setShown] = useState(value);
  const ref = useRef(null);

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === 'undefined') return undefined;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;

    let frame = 0;
    let started = 0;
    const tick = (now) => {
      started ||= now;
      const part = Math.min(1, (now - started) / COUNT_MS);
      // Fast at first, easing into the last few, then the mark itself.
      const eased = 1 - (1 - part) ** 3;
      if (part < 1) {
        setShown(String(Math.round(eased * 99)));
        frame = requestAnimationFrame(tick);
      } else {
        setShown(value);
        node.classList.add('is-settled');
      }
    };

    const watcher = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      watcher.disconnect();
      setShown('0');
      frame = requestAnimationFrame(tick);
    }, { threshold: 0.4 });
    watcher.observe(node);

    return () => { watcher.disconnect(); cancelAnimationFrame(frame); };
  }, [value]);

  return <strong className="home-figure-value" ref={ref} aria-label={value} data-cms-path={cms(contentPath('homeFigure', 'value'))}>{shown}</strong>;
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
        <Icon name="arrowRight" size={18} className="inline-arrow" />
      </Button>}
    />
  </div>;
}

/* --------------------------------------------------------------- sections */

// The tiles alternate through a fixed set of washes, as the design has them.
const TILE_TONES = ['soft', 'navy', 'green', 'blue', 'mint', 'lilac', 'sand', 'rose'];
/* Two of the six tiles are dark, and a navy mark on navy is no mark at all. */
const DARK_TONES = new Set(['navy', 'green']);

function CategoryTiles() {
  return <section className="section home-tiles">
    <div className="home-tiles-head" data-reveal>
      <div>
        <span className="eyebrow" data-cms-path={cms(headingPath('homeTilesEyebrow'))}>{heading('homeTilesEyebrow', 'Explore products')}</span>
        <h2 data-cms-path={cms(headingPath('categoriesHeading'))}>{heading('categoriesHeading', 'What can we make for you?')}</h2>
      </div>
      <p data-cms-path={cms(headingPath('homeTilesLead'))}>{heading('homeTilesLead')}</p>
    </div>
    <div className="home-tile-grid">
      {siteContent.categories.map((category, index) => <a
        key={category.id}
        className={`home-tile tone-${TILE_TONES[index % TILE_TONES.length]}`}
        href={`/mySOS/products/?category=${category.id}`}
        data-reveal
        style={{ '--reveal-delay': `${index * 60}ms` }}
      >
        <CategoryMark category={category} tone={DARK_TONES.has(TILE_TONES[index % TILE_TONES.length]) ? 'white' : 'navy'} className="category-mark tile-mark" />
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
      <div className="home-why-head" data-reveal>
        <div>
          <span className="eyebrow" data-cms-path={cms(headingPath('homeWhyEyebrow'))}>{heading('homeWhyEyebrow', 'Why MySOS')}</span>
          <h2 data-cms-path={cms(headingPath('homeWhyHeading'))}>{heading('homeWhyHeading', 'One team. Every step handled.')}</h2>
        </div>
        <p data-cms-path={cms(headingPath('homeWhyLead'))}>{heading('homeWhyLead')}</p>
      </div>
      <ol className="home-why-grid">
        {reasons.map((reason, index) => <li key={reason.icon} data-reveal style={{ '--reveal-delay': `${index * 80}ms` }}>
          <span className="home-why-number">{two(index + 1)}</span>
          <Icon name={reason.cardIcon || reason.icon} size={30} cmsPath={contentPath('benefits', index, reason.cardIcon ? 'cardIcon' : 'icon')} />
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
    <div className="home-budget-card" data-reveal>
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
    <div className="home-work-head" data-reveal>
      <div>
        <span className="eyebrow" data-cms-path={cms(headingPath('homeWorkEyebrow'))}>{heading('homeWorkEyebrow', 'Selected work')}</span>
        <h2 data-cms-path={cms(headingPath('homeWorkHeading'))}>{heading('homeWorkHeading', 'Complex orders. Simple solutions.')}</h2>
      </div>
      <a className="text-link" href={REQUEST_PATH}>
        <span data-cms-path={cms(labelPath('workDiscussLabel'))}>{label('workDiscussLabel', 'Discuss your project')}</span>
        <Icon name="arrowRight" size={18} className="inline-arrow" />
      </a>
    </div>
    <div className="home-work-grid">
      {stories.map((story, index) => <a className={`home-work-card tone-${index % 2 ? 'mint' : 'blue'}`} key={story.slug} href={`/mySOS/success-stories/${story.slug}/`} data-reveal style={{ '--reveal-delay': `${index * 90}ms` }}>
        <span className="home-work-tag">{story.category.replace('-', ' ')}</span>
        <span className="home-work-shot"><Photo style={story.imageStyle} image={picture(story.image, `stories/${story.slug}/cover`)} label={`${story.title} project`} /></span>
        <h3>{story.title}</h3>
        <p>{story.summary}</p>
        {story.highlights?.length > 0 && <ul className="home-work-stats">
          {story.highlights.map((highlight) => <li key={highlight.text}>
            <Icon name={highlight.icon} size={22} />
            <span>{highlight.text}</span>
          </li>)}
        </ul>}
      </a>)}
    </div>
  </section>;
}

/*
 * How it works, told the way Why MySOS tells it: the same tracker and the same
 * row of cards, one at the front.
 *
 * It used to be a row of small cards with a progress line above them. The line
 * could never fill: five of the six cards were on screen at once, so the row
 * had only a few hundred pixels to scroll and the last steps could not be
 * reached at all.
 */
function ProcessRail() {
  return <ProcessJourney
    labelledBy="home-process-title"
    head={<div className="home-process-head" data-reveal>
      <div>
        <span className="eyebrow" data-cms-path={cms(headingPath('homeProcessEyebrow'))}>{heading('homeProcessEyebrow', 'How it works')}</span>
        <h2 id="home-process-title" data-cms-path={cms(headingPath('homeProcessHeading'))}>{heading('homeProcessHeading', 'From brief to delivery.')}</h2>
      </div>
      <p data-cms-path={cms(headingPath('homeProcessLead'))}>{heading('homeProcessLead')}</p>
    </div>}
  />;
}

function ClosingBand() {
  return <section className="home-closing">
    <div className="home-closing-inner" data-reveal>
      <h2 data-cms-path={cms(headingPath('homeClosingTitle'))}>{heading('homeClosingTitle', "Have a difficult request? That's our thing.")}</h2>
      <div>
        <p data-cms-path={cms(headingPath('homeClosingLead'))}>{heading('homeClosingLead')}</p>
        <div className="home-closing-actions"><QuoteButton labelKey="homeStartButton" showArrow /></div>
      </div>
    </div>
  </section>;
}

/* ------------------------------------------------------------------- page */

export default function HomePage() {
  const featuredStories = useMemo(() => getStories().filter((story) => story.featured).slice(0, 2), []);
  const slides = heroSlides();
  const stats = siteContent.homeStats ?? [];
  const figure = siteContent.homeFigure ?? null;

  return <main className="home-page">
    <CategoryStrip />

    <section className="home-hero">
      <div className="home-hero-inner">
        <div className="home-hero-copy">
          <span className="eyebrow" data-reveal data-cms-path={cms(headingPath('heroEyebrow'))}>{heading('heroEyebrow')}</span>
          {/* The two halves arrive one after the other. The words inside are not
              split: the manager rewrites these elements, and a value has to sit
              in an element of its own. */}
          <h1>
            <span data-reveal style={{ '--reveal-delay': '70ms' }} data-cms-path={cms(headingPath('heroTitleLead'))}>{heading('heroTitleLead', 'Tell us what you need.')}</span>{' '}
            <em data-reveal style={{ '--reveal-delay': '160ms' }}><span data-cms-path={cms(headingPath('heroTitleAccentLong'))}>{heading('heroTitleAccentLong', "We'll source the rest.")}</span></em>
          </h1>
          <p className="home-hero-lead" data-reveal style={{ '--reveal-delay': '250ms' }} data-cms-path={cms(headingPath('heroSearchLead'))}>{heading('heroSearchLead')}</p>
          <HeroSearch />
        </div>
        <HeroCard slides={slides} />
      </div>
    </section>

    {stats.length > 0 && <section className="home-stats">
      {figure && <div className="home-figure" data-reveal>
        <CountToInfinity value={figure.value} />
        <span className="home-figure-label" data-cms-path={cms(contentPath('homeFigure', 'label'))}>{figure.label}</span>
        {figure.note && <small data-cms-path={cms(contentPath('homeFigure', 'note'))}>{figure.note}</small>}
      </div>}
      <ul className="home-stat-list">
        {stats.map((stat, index) => <li key={stat.value} data-reveal style={{ '--reveal-delay': `${(index + 1) * 80}ms` }}>
          {stat.icon && <Icon name={stat.icon} size={23} cmsPath={contentPath('homeStats', index, 'icon')} />}
          <strong data-cms-path={cms(contentPath('homeStats', index, 'value'))}>{stat.value}</strong>
          {stat.note && <small data-cms-path={cms(contentPath('homeStats', index, 'note'))}>{stat.note}</small>}
        </li>)}
      </ul>
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
