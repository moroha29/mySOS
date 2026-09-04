import { useRef } from 'react';
import siteConfig from '../../data/siteConfig.json';
import siteContent from '../../data/siteContent.json';
import { getDisplayPrice, getQuoteHref } from '../../utils/catalogue';
import { firstImage, getImage } from '../../utils/imageRegistry';
import { parseProductVisual, parseSceneVisual } from '../../utils/visuals';
import Icon from './Icons';
import { Product, Scene, Sketch, Workshop } from './Visuals';

export const QUOTE_HREF = siteConfig.quotationPath;

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

export function SectionHeading({ eyebrow, title, description, align = 'center', action }) {
  // Without a title the eyebrow is the section heading, not a kicker above one.
  return <div className={`section-heading align-${align} ${title ? '' : 'eyebrow-title'}`.trim()}>
    <div>
      {eyebrow && <span className="eyebrow">{eyebrow}</span>}
      {title && <h2>{title}</h2>}
      {description && <p>{description}</p>}
    </div>
    {action}
  </div>;
}

/* -------------------------------------------------------------------- media */

export function Photo({ style, label, className = '', image, imageKey, wide = false, eager = false }) {
  const src = image || getImage(imageKey);
  if (src) return <div className={`scene ${className}`.trim()} role="img" aria-label={label || ''}><img src={src} alt="" loading={eager ? 'eager' : 'lazy'} fetchPriority={eager ? 'high' : undefined} /></div>;
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
  return <a className="product-card" href={getQuoteHref(product.id)}>
    <ProductShot imageStyle={product.public.imageStyle} slug={product.public.slug} />
    <h3>{product.public.name}</h3>
    {price && <p className="price">{price}</p>}
  </a>;
}

export function CategoryCard({ category }) {
  const src = getImage(`products/category-${category.id}`);
  return <a className="category-card" href={`/mySOS/products/?category=${category.id}`}>
    {src
      ? <div className="product-visual category-thumb has-photo"><img src={src} alt="" loading="lazy" /></div>
      : <Product type={category.visual} color={category.colour} mark="" className="category-thumb" />}
    <span><strong>{category.name}</strong><small>{category.description}</small></span>
  </a>;
}

export function StoryCard({ story, showBadge = true }) {
  const href = `/mySOS/success-stories/${story.slug}/`;
  return <article className="story-card">
    <a className="story-card-media" href={href}>
      <Photo style={story.imageStyle} label={`${story.title} project`} image={story.image} imageKey={`stories/${story.slug}/cover`} />
      {showBadge && <span className="badge">{story.category.replace('-', ' ')}</span>}
    </a>
    <div className="story-card-body">
      <h3><a href={href}>{story.title}</a></h3>
      <p>{story.summary}</p>
      <TextLink href={href}>View Story</TextLink>
    </div>
  </article>;
}

export function SolutionCard({ solution, active = false }) {
  const href = `/mySOS/solutions/?industry=${solution.id}`;
  return <article className={`solution-card ${active ? 'is-active' : ''}`.trim()}>
    <a href={href}><Photo style={solution.id} label={`${solution.name} solutions`} imageKey={`solutions/${solution.id}`} /></a>
    <div>
      <h3>{solution.name}</h3>
      <p>{solution.description}</p>
      <TextLink href={href}>Explore Solutions</TextLink>
    </div>
  </article>;
}

/* ------------------------------------------------------------------ process */

export function ProcessSteps({ items, variant = 'numbered' }) {
  const steps = items.map((item) => (typeof item === 'string' ? { title: item } : item));
  return <ol className={`process-steps process-${variant}`}>
    {steps.map((step, index) => <li key={step.title}>
      <span className="step-marker">{variant === 'icon' ? <Icon name={step.icon || 'consult'} size={22} /> : String(index + 1).padStart(2, '0')}</span>
      <h3>{step.title}</h3>
      {step.description && <p>{step.description}</p>}
    </li>)}
  </ol>;
}

/* --------------------------------------------------------- reviews slider */

/*
 * Mirrors the review-slider widgets sold for Wix: a rating badge plus a
 * horizontally snapping track of review cards. Data is shaped like the Google
 * Places `reviews` payload, so swapping the static list for a live fetch is a
 * data change rather than a rewrite. `googleMapsUri` drives the per-review
 * source link that Google's attribution policy requires.
 */
export function Testimonials({ eyebrow = 'What our clients say', action }) {
  const { rating, count, googleMapsUri } = siteContent.reviewSummary ?? {};
  const reviews = siteContent.testimonials ?? [];
  const trackRef = useRef(null);

  const scrollByCard = (direction) => {
    const track = trackRef.current;
    if (!track) return;
    const card = track.firstElementChild;
    const step = card ? card.getBoundingClientRect().width + 18 : track.clientWidth;
    track.scrollBy({ left: direction * step, behavior: 'smooth' });
  };

  return <section className="section reviews">
    <SectionHeading eyebrow={eyebrow} />

    <div className="review-summary">
      <Icon name="google" size={26} />
      {rating
        ? <>
          <span className="rating-value">{rating}</span>
          <span className="stars" aria-label={`${rating} out of 5`}>{Array.from({ length: 5 }, (_, i) => <Icon key={i} name="star" size={14} />)}</span>
          {count && <small>Based on {count} reviews</small>}
        </>
        : <small>Reviews from Google</small>}
      {googleMapsUri && <a className="text-link" href={googleMapsUri} target="_blank" rel="noreferrer">Read all reviews on Google <Arrow /></a>}
    </div>

    <div className="review-rail">
      <button className="carousel-btn" type="button" aria-label="Previous reviews" onClick={() => scrollByCard(-1)}><Icon name="chevronLeft" size={16} /></button>
      <div className="review-track" ref={trackRef}>
        {reviews.map((review) => <blockquote className="review-card" key={review.name}>
          <div className="review-head">
            <span className="stars" aria-label={`${review.rating} out of 5 stars`}>{Array.from({ length: review.rating }, (_, i) => <Icon key={i} name="star" size={13} />)}</span>
            {review.relativeTime && <small className="review-time">{review.relativeTime}</small>}
          </div>
          <p>&ldquo;{review.quote}&rdquo;</p>
          <footer>
            <span className="avatar">{review.name.split(' ').map((part) => part[0]).join('')}</span>
            <span className="review-author">
              <strong>{review.name}</strong>
              <small>{review.role}</small>
            </span>
            {(review.googleMapsUri || googleMapsUri)
              ? <a className="review-source" href={review.googleMapsUri || googleMapsUri} target="_blank" rel="noreferrer" aria-label={`See ${review.name}'s review on Google`}><Icon name="google" size={16} /></a>
              : <Icon name="google" size={16} className="review-source is-static" />}
          </footer>
        </blockquote>)}
      </div>
      <button className="carousel-btn" type="button" aria-label="Next reviews" onClick={() => scrollByCard(1)}><Icon name="chevronRight" size={16} /></button>
    </div>

    {action && <div className="center-action">{action}</div>}
  </section>;
}

/* ---------------------------------------------------------------- CTA bands */

export function PageCTA({
  title = 'Need something similar?',
  description = "Let's create something amazing together.",
  primaryLabel = 'Get a Quote',
  primaryHref = QUOTE_HREF,
  showWhatsApp = true,
}) {
  const bandBg = getImage('scenes/band-cta');
  return <section className="page-cta" style={bandBg ? { '--band-bg': `url(${bandBg})` } : undefined}>
    <div className="page-cta-inner">
      <div><h2>{title}</h2><p>{description}</p></div>
      <div className="page-cta-actions">
        <Button href={primaryHref}>{primaryLabel}</Button>
        {showWhatsApp && <WhatsAppLink />}
      </div>
    </div>
  </section>;
}

export function WhatsAppLink({ label = 'WhatsApp Us' }) {
  const { whatsapp } = siteConfig;
  const href = whatsapp.enabled && whatsapp.number
    ? `https://wa.me/${whatsapp.number}?text=${encodeURIComponent(whatsapp.defaultMessage)}`
    : null;
  const content = <><Icon name="whatsapp" size={18} /> {label}</>;
  return href
    ? <a className="btn btn-ghost" href={href} target="_blank" rel="noreferrer">{content}</a>
    : <span className="btn btn-ghost is-disabled">{content}</span>;
}

export { Icon };
