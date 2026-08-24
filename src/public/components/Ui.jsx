import { getDisplayPrice, getQuoteHref } from '../../utils/catalogue';

export const iconMap = {
  shirt: 'T', bag: 'B', bottle: 'D', gift: 'G', notebook: 'N', lanyard: 'E',
  school: 'S', business: 'B', events: 'E', church: 'C', sports: '◎', community: 'C',
  layers: '≋', transfer: '↗', droplet: '◉', thread: '✣', spark: '✦', sun: '☼',
  welcome: 'W', grad: 'G'
};

export function SectionHeading({ eyebrow, title, description, action }) {
  return <div className="section-heading-public">
    <div>{eyebrow && <span className="eyebrow">{eyebrow}</span>}<h2>{title}</h2>{description && <p>{description}</p>}</div>
    {action}
  </div>;
}

export function IconTile({ icon, label }) {
  return <span className="icon-tile" aria-hidden="true">{iconMap[icon] ?? label?.slice(0, 1)}</span>;
}

export function MerchVisual({ style = 'tee-navy', label, image }) {
  return <div className={`merch-visual ${style}`} role="img" aria-label={label}>{image ? <img src={image} alt="" loading="lazy" /> : <><span className="merch-neck" /><span className="merch-mark">MySOS</span></>}</div>;
}

export function ProductCard({ product }) {
  return <article className="product-card">
    <MerchVisual style={product.public.imageStyle} image={product.public.image} label={`${product.public.name} product`} />
    <div className="product-card-copy"><h3>{product.public.name}</h3><p className="price-display">{getDisplayPrice(product)}</p><a href={getQuoteHref(product.id)} aria-label={`Get a quote for ${product.public.name}`}>Get a quote <span>→</span></a></div>
  </article>;
}

export function StoryVisual({ style, title }) {
  const image = style?.startsWith('/') ? style : null;
  return <div className={`story-visual ${image ? 'has-image' : style}`} role="img" aria-label={`${title} project visual`}>{image ? <img src={image} alt="" loading="lazy" /> : <div className="people-row" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /></div>}</div>;
}

export function SuccessStoryCard({ story }) {
  return <article className="story-card">
    <a href={`/mySOS/success-stories/${story.slug}/`}><StoryVisual style={story.imageStyle} title={story.title} /></a>
    <div className="story-card-copy"><span className="story-category">{story.category.replace('-', ' ')}</span><h3><a href={`/mySOS/success-stories/${story.slug}/`}>{story.title}</a></h3><p>{story.summary}</p><a className="text-link" href={`/mySOS/success-stories/${story.slug}/`}>View Story <span>→</span></a></div>
  </article>;
}

export function ProcessSteps({ items }) {
  return <ol className="process-steps">{items.map((item, index) => <li key={item.title ?? item}><span>{String(index + 1).padStart(2, '0')}</span><h3>{item.title ?? item}</h3>{item.description && <p>{item.description}</p>}</li>)}</ol>;
}

export function Hero({ title, accent, description, children, visual = 'hero-products', compact = false }) {
  return <section className={`public-hero ${compact ? 'is-compact' : ''}`}>
    <div className="hero-copy"><h1>{title}<br /><em>{accent}</em></h1><p>{description}</p>{children}</div>
    <div className={`hero-art ${visual}`} aria-hidden="true"><MerchVisual style="jersey" /><MerchVisual style="polo-navy" /><div className="hero-bag">YOUR<br />IDEA<br />HERE</div></div>
  </section>;
}

export function PageCTA({ title = 'Need something similar?', description = "Let's create something amazing together." }) {
  return <section className="page-cta"><div><h2>{title}</h2><p>{description}</p></div><div><a className="button" href="/mySOS/quotation_engine/">Get a Quote</a></div></section>;
}
