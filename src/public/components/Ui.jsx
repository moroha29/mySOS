import { useEffect, useRef, useState } from 'react';
import googleReviews from '../../data/googleReviews.json';
import siteConfig from '../../data/siteConfig.json';
import siteContent from '../../data/siteContent.json';
import { formatReviewDate, GOOGLE_REVIEWS_URL, hasGoogleReviews, initials, isFresh } from '../../utils/googleReviews';
import { categoryPath, cms, cmsAll, configPath, contentPath, labelPath, picture, scenePath, solutionPath, storyPath } from '../cms';
import { enquiryLinkProps, getDisplayPrice, getEnquiryHref } from '../../utils/catalogue';
import { firstImage, getImage } from '../../utils/imageRegistry';
import { parseProductVisual, parseSceneVisual } from '../../utils/visuals';
import Icon from './Icons';
import { Product, Scene, Sketch, Workshop } from './Visuals';

// "Get a Quote" opens a WhatsApp chat with MySOS; see getEnquiryHref.
export const ENQUIRY_HREF = getEnquiryHref();
export const enquiryProps = { href: ENQUIRY_HREF, ...enquiryLinkProps(ENQUIRY_HREF) };

// Selecting a quote button in the manager offers the number and the message it sends.
export const quoteDestinationPaths = cmsAll(
  configPath('whatsapp', 'number'),
  configPath('whatsapp', 'quoteMessage'),
);

// On-screen wording lives in siteContent so it can be edited in the admin
// portal. The fallback keeps a page rendering if a label is ever removed.
export const label = (key, fallback = '') => siteContent.labels?.[key] ?? fallback;
export const heading = (key, fallback = '') => siteContent.headings?.[key] ?? fallback;

/* --------------------------------------------------------------- primitives */

export function Arrow() {
  return <Icon name="arrowRight" size={16} className="inline-arrow" />;
}

export function Button({ href, children, variant = 'primary', className = '', ...rest }) {
  return <a className={`btn btn-${variant} ${className}`.trim()} href={href} {...rest}>{children}</a>;
}

export function TextLink({ href, children, className = '' }) {
  return <a className={`text-link ${className}`.trim()} href={href}>{children} <Arrow /></a>;
}

export function SectionHeading({ eyebrow, title, description, align = 'center', action, eyebrowPath, titlePath, descriptionPath }) {
  // Without a title the eyebrow is the section heading, not a kicker above one.
  return <div className={`section-heading align-${align} ${title ? '' : 'eyebrow-title'}`.trim()}>
    <div>
      {eyebrow && <span className="eyebrow" data-cms-path={eyebrowPath && cms(eyebrowPath)}>{eyebrow}</span>}
      {title && <h2 data-cms-path={titlePath && cms(titlePath)}>{title}</h2>}
      {description && <p data-cms-path={descriptionPath && cms(descriptionPath)}>{description}</p>}
    </div>
    {action}
  </div>;
}

/* -------------------------------------------------------------------- media */

// `imagePath` is where the picture lives in the draft, so the manager can offer
// an upload when it is clicked. Without it a picture is only reachable from the
// content panel.
export function Photo({ style, label, className = '', image, imageKey, imagePath, wide = false, eager = false }) {
  const src = image || getImage(imageKey);
  if (src) {
    return <div className={`scene ${className}`.trim()} role="img" aria-label={label || ''}>
      <img src={src} alt="" loading={eager ? 'eager' : 'lazy'} fetchPriority={eager ? 'high' : undefined} data-cms-path={imagePath && cms(imagePath)} />
    </div>;
  }
  const scene = parseSceneVisual(style);
  if (scene.kind === 'workshop') return <Workshop className={className} label={label} />;
  if (scene.kind === 'sketch') return <Sketch className={className} label={label} />;
  return <Scene kind={scene.kind} shirt={scene.shirt} wide={wide} className={className} label={label} />;
}

export function ProductShot({ imageStyle, slug, mark = 'MySOS', className = '' }) {
  const src = getImage(slug && `products/${slug}`);
  if (src) return <div className={`product-visual has-photo ${className}`.trim()}><img src={src} alt="" loading="lazy" /></div>;
  const { type, colour } = parseProductVisual(imageStyle);
  return <Product type={type} color={colour} mark={mark} className={className} />;
}

/* -------------------------------------------------------------------- cards */

export function ProductCard({ product }) {
  const price = getDisplayPrice(product);
  const href = getEnquiryHref(product.id);
  const content = <>
    <ProductShot imageStyle={product.public.imageStyle} slug={product.public.slug} />
    <h3>{product.public.name}</h3>
    {price && <p className="price">{price}</p>}
  </>;
  return href
    ? <a className="product-card" href={href} {...enquiryLinkProps(href)} aria-label={`Ask MySOS for a quote on ${product.public.name}`} data-cms-paths={cmsAll(configPath('whatsapp', 'number'), configPath('whatsapp', 'productQuoteMessage'))}>{content}</a>
    : <div className="product-card">{content}</div>;
}

export function CategoryCard({ category }) {
  const src = picture(category.image, `products/category-${category.id}`);
  return <a className="category-card" href={`/mySOS/products/?category=${category.id}`}>
    {src
      ? <div className="product-visual category-thumb has-photo"><img src={src} alt="" loading="lazy" data-cms-path={cms(categoryPath(category, 'image'))} /></div>
      : <Product type={category.visual} color={category.colour} mark="" className="category-thumb" />}
    <span>
      <strong data-cms-path={cms(categoryPath(category, 'name'))}>{category.name}</strong>
      <small><span data-cms-path={cms(categoryPath(category, 'description'))}>{category.description}</span></small>
    </span>
  </a>;
}

export function StoryCard({ story, showBadge = true }) {
  const href = `/mySOS/success-stories/${story.slug}/`;
  return <article className="story-card">
    <a className="story-card-media" href={href}>
      <Photo style={story.imageStyle} label={`${story.title} project`} image={picture(story.image, `stories/${story.slug}/cover`)} imagePath={storyPath(story, 'image')} />
      {showBadge && <span className="badge">{story.category.replace('-', ' ')}</span>}
    </a>
    <div className="story-card-body">
      <h3><a href={href} data-cms-path={cms(storyPath(story, 'title'))}>{story.title}</a></h3>
      <p data-cms-path={cms(storyPath(story, 'summary'))}>{story.summary}</p>
      <TextLink href={href}><span data-cms-path={cms(labelPath('viewStoryLabel'))}>{label('viewStoryLabel', 'View Story')}</span></TextLink>
    </div>
  </article>;
}

export function SolutionCard({ solution, active = false }) {
  const href = `/mySOS/solutions/?industry=${solution.id}`;
  return <article className={`solution-card ${active ? 'is-active' : ''}`.trim()}>
    <a href={href}><Photo style={solution.id} label={`${solution.name} solutions`} image={picture(solution.image, `solutions/${solution.id}`)} imagePath={solutionPath(solution, 'image')} /></a>
    <div>
      <h3 data-cms-path={cms(solutionPath(solution, 'name'))}>{solution.name}</h3>
      <p data-cms-path={cms(solutionPath(solution, 'description'))}>{solution.description}</p>
      <TextLink href={href}><span data-cms-path={cms(labelPath('exploreSolutionsLabel'))}>{label('exploreSolutionsLabel', 'Explore Solutions')}</span></TextLink>
    </div>
  </article>;
}

/* ------------------------------------------------------------------ process */

/*
 * `pathAt(index, key)` gives the manager the draft path behind a step's title
 * or description, and may return nothing for a value that is not content: a
 * story's process steps are stored as plain titles, and their captions are
 * written here rather than edited.
 */
export function ProcessSteps({ items, variant = 'numbered', pathAt }) {
  const steps = items.map((item) => (typeof item === 'string' ? { title: item } : item));
  const path = (index, key) => {
    const found = pathAt?.(index, key);
    return found && cms(found);
  };
  return <ol className={`process-steps process-${variant}`}>
    {steps.map((step, index) => <li key={step.title}>
      <span className="step-marker">{variant === 'icon' ? <Icon name={step.icon || 'consult'} size={22} /> : String(index + 1).padStart(2, '0')}</span>
      <h3 data-cms-path={path(index, 'title')}>{step.title}</h3>
      {step.description && <p data-cms-path={path(index, 'description')}>{step.description}</p>}
    </li>)}
  </ol>;
}

/* --------------------------------------------------------- reviews slider */

/*
 * Google reviews, for the slider and the stories page's quote panel.
 *
 * Reviews come only from the business's own Google Business Profile, refreshed
 * daily into googleReviews.json by scripts/fetch-google-reviews.mjs (setup in
 * docs/GOOGLE_REVIEWS.md). They are the reviewers' words, so nothing showing a
 * review, the rating or the count carries a data-cms-path: the website manager
 * cannot change them. With no stored reviews — before Google approves API
 * access — a section shows a link to the reviews on Google instead. There is
 * deliberately no hand-typed fallback.
 *
 * Google allows stored review data to be kept for 30 days. If the daily refresh
 * ever stops, the stored copy is dropped once it is older than that. The check
 * runs after hydration rather than during render, so the prerendered HTML and
 * the first render in the browser always agree.
 */
export function useGoogleReviews() {
  const available = hasGoogleReviews(googleReviews);
  const [expired, setExpired] = useState(false);
  useEffect(() => {
    if (available && !isFresh(googleReviews)) setExpired(true);
  }, [available]);
  return available && !expired ? googleReviews : null;
}

/** "Read all reviews on Google". The wording is site copy and stays editable; the address is not. */
export function GoogleReviewsLink() {
  return <a className="text-link" href={GOOGLE_REVIEWS_URL} target="_blank" rel="noreferrer">
    <span data-cms-path={cms(labelPath('readReviewsOnGoogleLabel'))}>{label('readReviewsOnGoogleLabel', 'Read all reviews on Google')}</span> <Arrow />
  </a>;
}

export function Testimonials({ eyebrow = heading('reviewsHeading', 'What our clients say'), eyebrowPath = contentPath('headings', 'reviewsHeading'), action }) {
  const data = useGoogleReviews();
  const trackRef = useRef(null);

  const scrollByCard = (direction) => {
    const track = trackRef.current;
    if (!track) return;
    const card = track.firstElementChild;
    const step = card ? card.getBoundingClientRect().width + 18 : track.clientWidth;
    track.scrollBy({ left: direction * step, behavior: 'smooth' });
  };

  return <section className="section reviews">
    <SectionHeading eyebrow={eyebrow} eyebrowPath={eyebrowPath} />

    <div className="review-summary">
      <Icon name="google" size={26} />
      {data?.averageRating
        ? <>
          <span className="rating-value">{data.averageRating}</span>
          <span className="stars" aria-label={`${data.averageRating} out of 5`}>{Array.from({ length: 5 }, (_, i) => <Icon key={i} name="star" size={14} />)}</span>
          {data.totalReviewCount ? <small>
            <span data-cms-path={cms(labelPath('reviewsCountPrefix'))}>{label('reviewsCountPrefix', 'Based on')}</span>
            {' '}{data.totalReviewCount}{' '}
            <span data-cms-path={cms(labelPath('reviewsCountSuffix'))}>{label('reviewsCountSuffix', 'reviews')}</span>
          </small> : null}
        </>
        : <small><span data-cms-path={cms(labelPath('reviewsFallbackLabel'))}>{label('reviewsFallbackLabel', 'Reviews from Google')}</span></small>}
      <GoogleReviewsLink />
    </div>

    {data && <div className="review-rail">
      <button className="carousel-btn" type="button" aria-label="Previous reviews" onClick={() => scrollByCard(-1)}><Icon name="chevronLeft" size={16} /></button>
      <div className="review-track" ref={trackRef}>
        {data.reviews.map((review) => <blockquote className="review-card" key={review.id}>
          <div className="review-head">
            <span className="stars" aria-label={`${review.rating} out of 5 stars`}>{Array.from({ length: review.rating }, (_, i) => <Icon key={i} name="star" size={13} />)}</span>
            <small className="review-time">{formatReviewDate(review.createTime)}</small>
          </div>
          <p className="review-text">&ldquo;{review.text}&rdquo;</p>
          <footer>
            {review.photoUrl
              ? <img className="avatar avatar-photo" src={review.photoUrl} alt="" width="34" height="34" loading="lazy" referrerPolicy="no-referrer" />
              : <span className="avatar" aria-hidden="true">{initials(review.author)}</span>}
            <span className="review-author"><strong>{review.author}</strong></span>
            <a className="review-source" href={GOOGLE_REVIEWS_URL} target="_blank" rel="noreferrer" aria-label={`Read ${review.author}'s review on Google`}><Icon name="google" size={16} /></a>
          </footer>
        </blockquote>)}
      </div>
      <button className="carousel-btn" type="button" aria-label="Next reviews" onClick={() => scrollByCard(1)}><Icon name="chevronRight" size={16} /></button>
    </div>}

    {action && <div className="center-action">{action}</div>}
  </section>;
}

/* ---------------------------------------------------------------- CTA bands */

export function PageCTA({
  title = 'Need something similar?',
  description = "Let's create something amazing together.",
  titlePath,
  descriptionPath,
  primaryLabel = label('heroQuoteButton', 'Get a Quote'),
  primaryPath = labelPath('heroQuoteButton'),
  primaryHref = ENQUIRY_HREF,
  showWhatsApp = true,
}) {
  const bandBg = picture(siteContent.scenes?.ctaBandImage, 'scenes/band-cta');
  return <section className="page-cta" style={bandBg ? { '--band-bg': `url(${bandBg})` } : undefined}>
    <div className="page-cta-inner">
      <div>
        <h2 data-cms-path={titlePath && cms(titlePath)}>{title}</h2>
        <p data-cms-path={descriptionPath && cms(descriptionPath)}>{description}</p>
      </div>
      <div className="page-cta-actions">
        {/* The button's wording and where it sends people, together. */}
        <Button href={primaryHref} {...enquiryLinkProps(primaryHref)} data-cms-paths={quoteDestinationPaths}>
          <span data-cms-path={primaryPath && cms(primaryPath)}>{primaryLabel}</span>
        </Button>
        {showWhatsApp && <WhatsAppLink />}
      </div>
    </div>
  </section>;
}

/*
 * The WhatsApp button is a composed destination: the link is built from the
 * number and the greeting, so selecting it in the manager has to offer those
 * two fields rather than a URL box that edits nothing.
 */
export const whatsAppDestinationPaths = cmsAll(
  configPath('whatsapp', 'number'),
  configPath('whatsapp', 'defaultMessage'),
);

export function WhatsAppLink({ label: text = label('whatsAppButton', 'WhatsApp Us'), textPath = labelPath('whatsAppButton') }) {
  const { whatsapp } = siteConfig;
  const href = whatsapp.enabled && whatsapp.number
    ? `https://wa.me/${whatsapp.number}?text=${encodeURIComponent(whatsapp.defaultMessage)}`
    : null;
  const content = <><Icon name="whatsapp" size={18} /> <span data-cms-path={textPath && cms(textPath)}>{text}</span></>;
  return href
    ? <a className="btn btn-ghost" href={href} target="_blank" rel="noreferrer" data-cms-paths={whatsAppDestinationPaths}>{content}</a>
    : <span className="btn btn-ghost is-disabled">{content}</span>;
}

export { Icon };
