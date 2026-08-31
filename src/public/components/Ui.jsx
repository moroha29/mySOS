import siteConfig from '../../data/siteConfig.json';
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

export function Photo({ style, label, className = '', image, imageKey, wide = false }) {
  const src = image || getImage(imageKey);
  if (src) return <div className={`scene ${className}`.trim()} role="img" aria-label={label || ''}><img src={src} alt="" loading="lazy" /></div>;
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

/* ---------------------------------------------------------------- CTA bands */

export function PageCTA({
  title = 'Need something similar?',
  description = "Let's create something amazing together.",
  primaryLabel = 'Get a Quote',
  primaryHref = QUOTE_HREF,
  showWhatsApp = true,
}) {
  return <section className="page-cta">
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
