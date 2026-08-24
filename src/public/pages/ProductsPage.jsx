import { useMemo, useState } from 'react';
import printData from '../../data/printData.json';
import siteContent from '../../data/siteContent.json';
import { getPublicProducts } from '../../utils/catalogue';
import { Hero, IconTile, ProductCard, SectionHeading } from '../components/Ui';

const subcategories = [
  { id: 'all', name: 'All' }, { id: 'tshirts', name: 'T-Shirts' }, { id: 'polos', name: 'Polos' }, { id: 'jerseys', name: 'Jerseys' }, { id: 'caps', name: 'Caps' }, { id: 'jackets', name: 'Jackets' }
];

export default function ProductsPage() {
  const params = new URLSearchParams(globalThis.location?.search ?? '');
  const requestedCategory = params.get('category') || 'apparel';
  const category = siteContent.categories.some((item) => item.id === requestedCategory) ? requestedCategory : 'apparel';
  const [subcategory, setSubcategory] = useState(params.get('subcategory') || 'all');
  const products = useMemo(() => getPublicProducts({ category, subcategory: category === 'apparel' && subcategory !== 'all' ? subcategory : undefined }), [category, subcategory]);
  const methods = printData.methods.filter((method) => method.public?.visible);
  const activeCategory = siteContent.categories.find((item) => item.id === category) ?? siteContent.categories[0];
  return <main>
    <div className="page-shell"><Hero title="Custom Merchandise," accent="Made Simple." description="Explore our wide range of products that can be customised for your organisation, event or business." /></div>
    <section className="section section-tight"><SectionHeading eyebrow="Browse by category" title="Everything you need, in one place." />
      <div className="browse-row">{siteContent.categories.map((item) => <a key={item.id} className={item.id === category ? 'is-active' : ''} href={`?category=${item.id}`}><IconTile icon={item.icon} label={item.name} /><span>{item.name}</span></a>)}</div>
    </section>
    <section className="section product-collection"><SectionHeading eyebrow={`${activeCategory.name} collection`} title={category === 'apparel' ? 'Made to wear. Made to remember.' : `Custom ${activeCategory.name.toLowerCase()} for every brief.`} />
      {category === 'apparel' && <div className="tab-list" role="tablist" aria-label="Product subcategories">{subcategories.map((tab) => <button key={tab.id} type="button" role="tab" aria-selected={subcategory === tab.id} onClick={() => setSubcategory(tab.id)}>{tab.name}</button>)}</div>}
      <div className="product-grid">{products.map((product) => <ProductCard key={product.id} product={product} />)}</div>
      {products.length === 0 && <div className="empty-state"><h3>No products are published in this category yet.</h3><p>Contact MySOS and we will help source what you need.</p></div>}
    </section>
    <section className="section customization"><SectionHeading eyebrow="Printing & customisation methods" title="The right finish for every idea." />
      <div className="method-grid">{methods.map((method) => <article key={method.id}><IconTile icon={method.public.icon} label={method.name} /><h3>{method.name}</h3><p>{method.public.description}</p></article>)}</div>
    </section>
    <section className="recommendation-banner"><div><span className="eyebrow">Need help deciding?</span><h2>Our experts can recommend the best products, materials and printing methods for your needs.</h2><a className="button" href="/mySOS/quotation_engine/">Get Recommendations <span>→</span></a></div><div className="advisor-art" aria-hidden="true"><span>MY</span><span>SOS</span></div></section>
    <section className="section faq-section" id="faq"><SectionHeading eyebrow="Frequently asked questions" title="Good questions, clear answers." />
      <div className="faq-list">{siteContent.faq.map((item) => <details key={item.question}><summary>{item.question}<span>+</span></summary><p>{item.answer}</p></details>)}</div>
    </section>
  </main>;
}
