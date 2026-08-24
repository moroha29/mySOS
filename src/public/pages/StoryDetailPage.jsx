import { getPublicProduct, getQuoteHref, getStoryBySlug } from '../../utils/catalogue';
import { PageCTA, ProcessSteps, StoryVisual } from '../components/Ui';

export default function StoryDetailPage({ slug }) {
  const story = getStoryBySlug(slug);
  if (!story) return <main className="not-found"><span>404</span><h1>Story not found</h1><p>This project may have moved or is not published yet.</p><a className="button" href="/mySOS/success-stories/">View all success stories</a></main>;
  const products = story.products.map(getPublicProduct).filter(Boolean);
  return <main>
    <section className="story-detail-hero"><div className="story-detail-copy"><a href="/mySOS/success-stories/">← Back to all stories</a><span className="story-category">{story.category.replace('-', ' ')}</span><h1>{story.title}</h1><p>{story.summary}</p><dl><div><dt>Industry</dt><dd>{story.category.replace('-', ' ')}</dd></div><div><dt>Products</dt><dd>{products.map((item) => item.public.name).join(', ')}</dd></div><div><dt>Quantity</dt><dd>{story.quantity} pcs</dd></div><div><dt>Year</dt><dd>{story.year}</dd></div></dl></div><StoryVisual style={story.imageStyle} title={story.title} /></section>
    <section className="gallery-strip" aria-label="Project gallery">{story.gallery.map((style, index) => <StoryVisual key={style} style={style} title={`${story.title} gallery image ${index + 1}`} />)}</section>
    <section className="story-detail section">
      <aside className="story-toc"><span>The story</span><a href="#challenge">01 The Challenge</a><a href="#solution">02 Our Solution</a><a href="#process">03 The Process</a><a href="#outcome">04 The Outcome</a><a href="#feedback">05 Client Feedback</a></aside>
      <div className="story-narrative">
        <section id="challenge"><span className="section-number">01</span><h2>The Challenge</h2><p>{story.challenge}</p><StoryVisual style={story.gallery[1] ?? story.imageStyle} title="The challenge" /></section>
        <section id="solution"><span className="section-number">02</span><h2>Our Solution</h2><p>{story.solution}</p><div className="product-mini-list">{products.map((product) => <article key={product.id}><div className={`mini-product ${product.public.imageStyle}`}><span>MySOS</span></div><div><h3>{product.public.name}</h3><a href={getQuoteHref(product.id)}>Get a product quote →</a></div></article>)}</div></section>
        <section id="process"><span className="section-number">03</span><h2>The Process</h2><ProcessSteps items={story.process} /></section>
        <section id="outcome"><span className="section-number">04</span><h2>The Outcome</h2><ul className="outcome-list">{story.outcomes.map((outcome) => <li key={outcome}>{outcome}</li>)}</ul><StoryVisual style={story.gallery.at(-1)} title="The finished project" /></section>
        <section id="feedback" className="feedback"><span className="section-number">05</span><h2>Client Feedback</h2><blockquote>“{story.testimonial.quote}”</blockquote><div><strong>{story.testimonial.name}</strong><span>{story.testimonial.organisation}</span></div></section>
      </div>
    </section>
    <PageCTA />
  </main>;
}
