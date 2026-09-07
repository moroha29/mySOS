import { useMemo, useState } from 'react';
import printData from '../../data/printData.json';
import siteContent from '../../data/siteContent.json';
import { categoryPath, cms, cmsAll, configPath, contentPath, headingPath, heroBackground, pagePath, pageText, picture, scenePath } from '../cms';
import { getPublicProducts } from '../../utils/catalogue';
import Icon from '../components/Icons';
import { Product } from '../components/Visuals';
import { Button, heading, PageCTA, Photo, ProductCard, SectionHeading, QUOTE_HREF } from '../components/Ui';

// Tab wording lives in content; the ids are what the filter matches on.
const apparelTabs = siteContent.apparelTabs ?? [];

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
  const heroShot = picture(siteContent.scenes?.productsHeroImage, 'scenes/products-hero');

  return <main>
    <section {...heroBackground(siteContent.scenes?.productsHeroBackgroundImage, scenePath('productsHeroBackgroundImage'), 'hero hero-compact')}>
      <div className="hero-inner">
        <div>
          <h1>
            <span data-cms-path={cms(pagePath('products', 'heroTitle'))}>{pageText('products', 'heroTitle', 'Custom Merchandise,')}</span>
            <em><span data-cms-path={cms(pagePath('products', 'heroTitleAccent'))}>{pageText('products', 'heroTitleAccent', 'Made Simple')}</span></em>
          </h1>
          <p className="hero-lead" data-cms-path={cms(pagePath('products', 'heroLead'))}>{pageText('products', 'heroLead')}</p>
        </div>
        <div className="hero-art" aria-hidden="true">
          {heroShot ? <img className="hero-shot" src={heroShot} alt="" data-cms-path={cms(scenePath('productsHeroImage'))} /> : <>
            <Product type="tote" color="sand" mark="YOUR BRAND HERE" className="ha-3" />
            <Product type="jacket" color="black" className="ha-1" />
            <Product type="bottle" color="teal" className="ha-4" />
          </>}
        </div>
      </div>
    </section>

    <section className="section section-tight">
      <SectionHeading eyebrow={heading('browseCategoryHeading', 'Browse by category')} eyebrowPath={headingPath('browseCategoryHeading')} />
      <div className="browse-row">
        {siteContent.categories.map((item) => <a
          key={item.id}
          className={item.id === category ? 'is-active' : ''}
          href={`?category=${item.id}`}
          aria-current={item.id === category ? 'page' : undefined}
        >
          <Icon name={item.icon} size={26} />
          <span className="browse-label"><span data-cms-path={cms(categoryPath(item, 'name'))}>{item.name}</span><Icon name="chevronDown" size={12} /></span>
        </a>)}
      </div>
    </section>

    <section className="section">
      <SectionHeading eyebrow={`${activeCategory.name} ${pageText('products', 'collectionSuffix', 'collection')}`} align="left" />
      {category === 'apparel' && <div className="tab-list" role="tablist" aria-label="Apparel subcategories">
        {apparelTabs.map((tab) => <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={subcategory === tab.id}
          onClick={() => { setSubcategory(tab.id); setShowAll(false); }}
          data-cms-path={cms(contentPath('apparelTabs', apparelTabs.indexOf(tab), 'name'))}
        >{tab.name}</button>)}
      </div>}
      {visible.length > 0
        ? <div className="product-grid">{visible.map((product) => <ProductCard key={product.id} product={product} />)}</div>
        : <div className="empty-state">
          <h3 data-cms-path={cms(pagePath('products', 'emptyTitle'))}>{pageText('products', 'emptyTitle')}</h3>
          <p data-cms-path={cms(pagePath('products', 'emptyDescription'))}>{pageText('products', 'emptyDescription')}</p>
        </div>}
      {products.length > 8 && !showAll && <div className="center-action">
        <Button href="#" variant="outline" onClick={(event) => { event.preventDefault(); setShowAll(true); }}>
          <span data-cms-path={cms(pagePath('products', 'viewAllPrefix'))}>{pageText('products', 'viewAllPrefix', 'View All')}</span> {activeCategory.name} <Icon name="arrowRight" size={15} className="inline-arrow" />
        </Button>
      </div>}
    </section>

    <section className="section" id="printing">
      <SectionHeading eyebrow={heading('printingMethodsHeading', 'Printing & customisation methods')} eyebrowPath={headingPath('printingMethodsHeading')} align="left" />
      <div className="method-grid">
        {methods.map((method) => <article key={method.id}>
          <span className="benefit-icon"><Icon name={method.public.icon} size={22} /></span>
          <h3>{method.name}</h3>
          <p>{method.public.description}</p>
        </article>)}
      </div>
      <div className="center-action"><a className="text-link" href="#faq"><span data-cms-path={cms(pagePath('products', 'printingGuideLabel'))}>{pageText('products', 'printingGuideLabel')}</span> <Icon name="arrowRight" size={15} className="inline-arrow" /></a></div>
    </section>

    <section className="promo-band">
      <div className="promo-copy">
        <span className="eyebrow" data-cms-path={cms(pagePath('products', 'promoEyebrow'))}>{pageText('products', 'promoEyebrow')}</span>
        <h2 data-cms-path={cms(pagePath('products', 'promoTitle'))}>{pageText('products', 'promoTitle')}</h2>
        <p data-cms-path={cms(pagePath('products', 'promoDescription'))}>{pageText('products', 'promoDescription')}</p>
        <Button href={QUOTE_HREF} data-cms-paths={cmsAll(configPath('quotationPath'))}><span data-cms-path={cms(pagePath('products', 'promoButtonLabel'))}>{pageText('products', 'promoButtonLabel')}</span> <Icon name="arrowRight" size={15} className="inline-arrow" /></Button>
      </div>
      <div className="promo-art" aria-hidden="true"><Photo style="office" image={picture(siteContent.scenes?.productsPromoImage, 'scenes/products-promo')} imagePath={scenePath('productsPromoImage')} /></div>
    </section>

    <section className="section" id="faq">
      <SectionHeading eyebrow={heading('faqHeading', 'Frequently asked questions')} eyebrowPath={headingPath('faqHeading')} align="left" />
      <div className="faq-list">
        {siteContent.faq.map((item, index) => <details key={item.question}>
          <summary><span data-cms-path={cms(contentPath('faq', index, 'question'))}>{item.question}</span><Icon name="plus" size={16} /></summary>
          <p data-cms-path={cms(contentPath('faq', index, 'answer'))}>{item.answer}</p>
        </details>)}
      </div>
    </section>

    <PageCTA
      title={pageText('products', 'ctaTitle', 'Ready to start your order?')}
      titlePath={pagePath('products', 'ctaTitle')}
      description={pageText('products', 'ctaDescription', "Let's get in touch with us today.")}
      descriptionPath={pagePath('products', 'ctaDescription')}
    />
  </main>;
}
