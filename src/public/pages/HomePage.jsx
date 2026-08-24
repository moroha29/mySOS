import siteContent from '../../data/siteContent.json';
import solutions from '../../data/solutions.json';
import { getPublicProducts, getStories } from '../../utils/catalogue';
import { Hero, IconTile, ProcessSteps, ProductCard, SectionHeading, SuccessStoryCard } from '../components/Ui';

export default function HomePage() {
  const featuredStories = getStories().filter((story) => story.featured).slice(0, 4);
  const featuredProducts = getPublicProducts({ featured: true }).slice(0, 4);
  return <main>
    <div className="page-shell"><Hero title="Custom Merchandise," accent="Made Simple." description="We source, customise and deliver premium merchandise for your organisation, event or business.">
      <div className="hero-actions"><a className="button" href="/mySOS/quotation_engine/">Get a Quote</a><a className="button button-outline-light" href="/mySOS/products/">Explore Products <span>→</span></a></div>
      <div className="hero-promises"><span>Small & bulk orders</span><span>Product recommendations</span><span>One-stop sourcing</span><span>On-time delivery</span></div>
    </Hero></div>

    <section className="section section-tight trust-section"><p className="mini-title">Trusted by organisations across Singapore</p><div className="trust-logos"><span>Education</span><span>Student Groups</span><span>Enterprises</span><span>Communities</span><span>Sports Clubs</span></div></section>

    <section className="section"><SectionHeading eyebrow="Products" title="What can we make for you?" />
      <div className="category-grid">{siteContent.categories.map((category) => <a className="category-card" key={category.id} href={`/mySOS/products/?category=${category.id}`}><IconTile icon={category.icon} label={category.name} /><span><strong>{category.name}</strong><small>{category.description}</small></span><b>→</b></a>)}</div>
      <div className="center-action"><a className="button button-secondary" href="/mySOS/products/">View All Products <span>→</span></a></div>
    </section>

    <section className="industry-band"><div className="section band-inner"><SectionHeading eyebrow="Not sure where to start?" title="Tell us what you're planning." description="Choose your industry and we will help with the rest." />
      <div className="industry-nav">{solutions.map((solution) => <a key={solution.id} href={`/mySOS/solutions/?industry=${solution.id}`}><IconTile icon={solution.imageStyle} label={solution.name} /><span>{solution.name}</span></a>)}</div>
      <div className="center-action"><a className="button" href="/mySOS/solutions/">Find My Solution <span>→</span></a></div>
    </div></section>

    <section className="section"><SectionHeading eyebrow="Why choose MySOS?" title="One partner. Every detail handled." />
      <div className="benefit-grid">{siteContent.benefits.map((benefit, index) => <article key={benefit.title}><span className="benefit-icon">0{index + 1}</span><h3>{benefit.title}</h3><p>{benefit.description}</p></article>)}</div>
    </section>

    <section className="section process-section"><SectionHeading eyebrow="How it works" title="From first idea to final delivery." /><ProcessSteps items={siteContent.process} /></section>

    <section className="section"><SectionHeading eyebrow="Real projects. Real results." title="Made for teams like yours." action={<a className="text-link heading-link" href="/mySOS/success-stories/">View all stories →</a>} />
      <div className="story-grid story-grid-four">{featuredStories.map((story) => <SuccessStoryCard key={story.slug} story={story} />)}</div>
    </section>

    <section className="section featured-products"><SectionHeading eyebrow="Popular apparel" title="Ready for your next project?" />
      <div className="product-grid product-grid-four">{featuredProducts.map((product) => <ProductCard key={product.id} product={product} />)}</div>
    </section>
  </main>;
}
