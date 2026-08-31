import { useMemo } from 'react';
import siteContent from '../../data/siteContent.json';
import solutions from '../../data/solutions.json';
import { getPublicProduct } from '../../utils/catalogue';
import Icon from '../components/Icons';
import { Product } from '../components/Visuals';
import { Button, Photo, ProductCard, SectionHeading, SolutionCard } from '../components/Ui';

export default function SolutionsPage() {
  const industryId = new URLSearchParams(globalThis.location?.search ?? '').get('industry');
  const selected = solutions.find((item) => item.id === industryId) ?? null;
  const recommended = useMemo(
    () => selected?.recommendedProducts.map(getPublicProduct).filter(Boolean) ?? [],
    [selected],
  );

  return <main>
    <section className="hero hero-compact">
      <div className="hero-inner">
        <div>
          <h1>Solutions Designed<em>Around Your Needs</em></h1>
          <p className="hero-lead">Every organisation is different. We provide curated solutions to help you achieve your goals.</p>
        </div>
        <div className="hero-scene"><Photo style="hall" imageKey="scenes/solutions-hero" label="Teams we work with" wide eager /></div>
      </div>
    </section>

    <section className="section section-tight">
      <SectionHeading eyebrow="Choose your industry" />
      <div className="browse-row">
        {solutions.map((solution) => <a
          key={solution.id}
          className={selected?.id === solution.id ? 'is-active' : ''}
          href={`/mySOS/solutions/?industry=${solution.id}`}
          aria-current={selected?.id === solution.id ? 'page' : undefined}
        >
          <Icon name={solution.imageStyle} size={26} />
          <span className="browse-label">{solution.name.replace(' Organisations', '')}</span>
        </a>)}
      </div>
    </section>

    <section className="section section-tight">
      <div className="solution-grid">
        {solutions.map((solution) => <SolutionCard key={solution.id} solution={solution} active={selected?.id === solution.id} />)}
      </div>
    </section>

    {selected && recommended.length > 0 && <section className="section">
      <SectionHeading eyebrow={`Recommended for ${selected.name}`} align="left" />
      <div className="product-grid product-grid-3">{recommended.map((product) => <ProductCard key={product.id} product={product} />)}</div>
    </section>}

    <section className="section">
      <SectionHeading eyebrow="Popular solutions" />
      <div className="popular-grid">
        {siteContent.popularSolutions.map((item) => <article key={item.name}>
          <Product type={item.visual} color={item.colour} mark="" />
          <h3>{item.name}</h3>
        </article>)}
      </div>
      <div className="center-action"><Button href="/mySOS/products/" variant="outline">View All Solutions <Icon name="arrowRight" size={15} className="inline-arrow" /></Button></div>
    </section>

    <section className="promo-band">
      <div className="promo-copy">
        <span className="eyebrow">Not sure where to start?</span>
        <h2>Share your requirements and we&apos;ll recommend the best solutions for you.</h2>
        <p>Tell us about your industry, timeline and budget. We will come back with a shortlist that fits.</p>
        <Button href="/mySOS/quotation_engine/">Find My Solution <Icon name="arrowRight" size={15} className="inline-arrow" /></Button>
      </div>
      <div className="promo-art" aria-hidden="true"><Photo style="office" imageKey="scenes/solutions-promo" /></div>
    </section>
  </main>;
}
