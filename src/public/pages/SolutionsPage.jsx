import { useMemo } from 'react';
import solutions from '../../data/solutions.json';
import siteContent from '../../data/siteContent.json';
import { getPublicProduct } from '../../utils/catalogue';
import { IconTile, PageCTA, ProductCard, SectionHeading, StoryVisual } from '../components/Ui';

export default function SolutionsPage() {
  const industryId = new URLSearchParams(globalThis.location?.search ?? '').get('industry');
  const selected = solutions.find((item) => item.id === industryId) ?? null;
  const recommended = useMemo(() => selected?.recommendedProducts.map(getPublicProduct).filter(Boolean) ?? [], [selected]);
  return <main>
    <section className="simple-hero solutions-hero"><div><span className="eyebrow">Made around you</span><h1>Solutions Designed<br />Around Your Needs</h1><p>Every organisation is different. We provide curated solutions to help you achieve your goals.</p></div><div className="hero-people"><span /><span /><span /><span /></div></section>
    <section className="section"><SectionHeading eyebrow="Choose your industry" title={selected ? `Ideas for ${selected.name}` : 'Start with what you are planning.'} />
      <div className="industry-tabs">{solutions.map((solution) => <a className={selected?.id === solution.id ? 'is-active' : ''} key={solution.id} href={`/mySOS/solutions/?industry=${solution.id}`}><IconTile icon={solution.imageStyle} label={solution.name} /><span>{solution.name}</span></a>)}</div>
      <div className="solution-grid">{solutions.map((solution) => <article key={solution.id} className={selected?.id === solution.id ? 'is-selected' : ''}><StoryVisual style={solution.imageStyle} title={solution.name} /><div><h3>{solution.name}</h3><p>{solution.description}</p><a className="text-link" href={`/mySOS/solutions/?industry=${solution.id}`}>Explore Solutions <span>→</span></a></div></article>)}</div>
    </section>
    {selected && <section className="section selected-products"><SectionHeading eyebrow={`Recommended for ${selected.name}`} title="A practical place to start." /><div className="product-grid product-grid-three">{recommended.map((product) => <ProductCard key={product.id} product={product} />)}</div></section>}
    <section className="section"><SectionHeading eyebrow="Popular solutions" title="Proven packs, ready to tailor." /><div className="popular-solutions">{siteContent.popularSolutions.map((item) => <article key={item.name}><IconTile icon={item.icon} label={item.name} /><h3>{item.name}</h3></article>)}</div></section>
    <PageCTA title="Not sure where to start?" description="Share your requirements and we will recommend the best solution for you." />
  </main>;
}
