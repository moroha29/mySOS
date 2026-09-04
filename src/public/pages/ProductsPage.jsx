import { useMemo, useState } from 'react';
import printData from '../../data/printData.json';
import siteContent from '../../data/siteContent.json';
import { getPublicProducts } from '../../utils/catalogue';
import { getImage } from '../../utils/imageRegistry';
import Icon from '../components/Icons';
import { Product } from '../components/Visuals';
import { Button, heading, PageCTA, Photo, ProductCard, SectionHeading, QUOTE_HREF } from '../components/Ui';

const apparelTabs = [
  { id: 'all', name: 'All' },
  { id: 'tshirts', name: 'T-Shirts' },
  { id: 'polos', name: 'Polos' },
  { id: 'jerseys', name: 'Jerseys' },
  { id: 'hoodies', name: 'Hoodies' },
  { id: 'jackets', name: 'Jackets' },
];

export default function ProductsPage() {
  const params = new URLSearchParams(globalThis.location?.search ?? '');
  const requested = params.get('category') || 'apparel';
  const category = siteContent.categories.some((item) => item.id === requested) ? requested : 'apparel';
  const [subcategory, setSubcategory] = useState(params.get('subcategory') || 'all');
  const [showAll, setShowAll] = useState(false);

  const products = useMemo(
    () => getPublicProducts({ category, subcategory: category === 'apparel' && subcategory !== 'all' ? subcategory : undefined }),
    [category, subcategory],
  );
  const visible = showAll ? products : products.slice(0, 8);
  const activeCategory = siteContent.categories.find((item) => item.id === category) ?? siteContent.categories[0];
  const methods = printData.methods.filter((method) => method.public?.visible);
  const heroShot = getImage('scenes/products-hero');

  return <main>
    <section className="hero hero-compact">
      <div className="hero-inner">
        <div>
          <h1>Custom Merchandise,<em>Made Simple</em></h1>
          <p className="hero-lead">Explore our wide range of products that can be customised for your organisation, event or business.</p>
        </div>
        <div className="hero-art" aria-hidden="true">
          {heroShot ? <img className="hero-shot" src={heroShot} alt="" /> : <>
            <Product type="tote" color="sand" mark="YOUR BRAND HERE" className="ha-3" />
            <Product type="jacket" color="black" className="ha-1" />
            <Product type="bottle" color="teal" className="ha-4" />
          </>}
        </div>
      </div>
    </section>

    <section className="section section-tight">
      <SectionHeading eyebrow={heading('browseCategoryHeading', 'Browse by category')} />
      <div className="browse-row">
        {siteContent.categories.map((item) => <a
          key={item.id}
          className={item.id === category ? 'is-active' : ''}
          href={`?category=${item.id}`}
          aria-current={item.id === category ? 'page' : undefined}
        >
          <Icon name={item.icon} size={26} />
          <span className="browse-label">{item.name}<Icon name="chevronDown" size={12} /></span>
        </a>)}
      </div>
    </section>

    <section className="section">
      <SectionHeading eyebrow={`${activeCategory.name} collection`} align="left" />
      {category === 'apparel' && <div className="tab-list" role="tablist" aria-label="Apparel subcategories">
        {apparelTabs.map((tab) => <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={subcategory === tab.id}
          onClick={() => { setSubcategory(tab.id); setShowAll(false); }}
        >{tab.name}</button>)}
      </div>}
      {visible.length > 0
        ? <div className="product-grid">{visible.map((product) => <ProductCard key={product.id} product={product} />)}</div>
        : <div className="empty-state"><h3>No products are published in this category yet.</h3><p>Contact MySOS and we will help source what you need.</p></div>}
      {products.length > 8 && !showAll && <div className="center-action">
        <Button href="#" variant="outline" onClick={(event) => { event.preventDefault(); setShowAll(true); }}>
          View All {activeCategory.name} <Icon name="arrowRight" size={15} className="inline-arrow" />
        </Button>
      </div>}
    </section>

    <section className="section" id="printing">
      <SectionHeading eyebrow={heading('printingMethodsHeading', 'Printing & customisation methods')} align="left" />
      <div className="method-grid">
        {methods.map((method) => <article key={method.id}>
          <span className="benefit-icon"><Icon name={method.public.icon} size={22} /></span>
          <h3>{method.name}</h3>
          <p>{method.public.description}</p>
        </article>)}
      </div>
      <div className="center-action"><a className="text-link" href="#faq">Learn More About Printing Methods <Icon name="arrowRight" size={15} className="inline-arrow" /></a></div>
    </section>

    <section className="promo-band">
      <div className="promo-copy">
        <span className="eyebrow">Need help deciding?</span>
        <h2>We&apos;ll match you to the right product.</h2>
        <p>Our experts can recommend the best products, materials and printing methods for your needs.</p>
        <Button href={QUOTE_HREF}>Get Recommendations <Icon name="arrowRight" size={15} className="inline-arrow" /></Button>
      </div>
      <div className="promo-art" aria-hidden="true"><Photo style="office" imageKey="scenes/products-promo" /></div>
    </section>

    <section className="section" id="faq">
      <SectionHeading eyebrow={heading('faqHeading', 'Frequently asked questions')} align="left" />
      <div className="faq-list">
        {siteContent.faq.map((item) => <details key={item.question}>
          <summary>{item.question}<Icon name="plus" size={16} /></summary>
          <p>{item.answer}</p>
        </details>)}
      </div>
    </section>

    <PageCTA title="Ready to start your order?" description="Let's get in touch with us today." />
  </main>;
}
