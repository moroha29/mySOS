import { useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import printData from '../../data/printData.json';
import siteContent from '../../data/siteContent.json';
import { categoryPath, cms, contentPath, headingPath, heroBackground, pagePath, pageText, picture, scenePath } from '../cms';
import { getPublicProducts } from '../../utils/catalogue';
import Icon from '../components/Icons';
import { Product } from '../components/Visuals';
import { Button, enquiryProps, heading, PageCTA, Photo, ProductCard, quoteDestinationPaths, SectionHeading } from '../components/Ui';

// Tab wording lives in content; the ids are what the filter matches on.
const apparelTabs = siteContent.apparelTabs ?? [];

/*
 * Printing & customisation methods, laid out after the reference design: a
 * vertical list of methods, the chosen method's details, and a photo.
 *
 * Which methods exist, and their names, come from printData.json — the pricing
 * workbook's list, which the manager never edits. What is said about each one
 * (description, "best for", photo) lives in siteContent.printingMethods, keyed by
 * method id, so it can be edited. With no photo uploaded the drawn workshop
 * scene stands in.
 */
function Capabilities({ methods }) {
  const [activeId, setActiveId] = useState(methods[0]?.id);
  const tabRefs = useRef({});
  const active = methods.find((method) => method.id === activeId) ?? methods[0];
  if (!active) return null;
  const copy = siteContent.printingMethods?.[active.id] ?? {};

  // Arrow keys move between methods, as in any tab list.
  const moveFocus = (event, index) => {
    const step = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[event.key];
    if (!step) return;
    event.preventDefault();
    const next = methods[(index + step + methods.length) % methods.length];
    setActiveId(next.id);
    tabRefs.current[next.id]?.focus();
  };

  return <section className="capabilities" id="printing">
    <div className="capabilities-inner">
      <span className="capabilities-eyebrow" data-cms-path={cms(pagePath('products', 'methodsEyebrow'))}>{pageText('products', 'methodsEyebrow', 'Our capabilities')}</span>
      <h2 className="capabilities-title" data-cms-path={cms(pagePath('products', 'methodsTitle'))}>{pageText('products', 'methodsTitle', 'How we bring your brand to life')}</h2>

      <div className="capabilities-body">
        <div className="capabilities-tabs" role="tablist" aria-orientation="vertical" aria-label="Printing and customisation methods">
          {methods.map((method, index) => <button
            key={method.id}
            ref={(node) => { tabRefs.current[method.id] = node; }}
            id={`method-tab-${method.id}`}
            type="button"
            role="tab"
            aria-selected={method.id === active.id}
            aria-controls="method-panel"
            tabIndex={method.id === active.id ? 0 : -1}
            onClick={() => setActiveId(method.id)}
            onKeyDown={(event) => moveFocus(event, index)}
          >{method.name}</button>)}
        </div>

        <div className="capabilities-panel" id="method-panel" role="tabpanel" aria-labelledby={`method-tab-${active.id}`}>
          <h3>{active.name}</h3>
          <p data-cms-path={cms(contentPath('printingMethods', active.id, 'description'))}>{copy.description || active.public.description}</p>
          {copy.bestFor && <div className="capabilities-best">
            <small data-cms-path={cms(pagePath('products', 'methodsBestForLabel'))}>{pageText('products', 'methodsBestForLabel', 'Best for')}</small>
            <span data-cms-path={cms(contentPath('printingMethods', active.id, 'bestFor'))}>{copy.bestFor}</span>
          </div>}
        </div>

        <div className="capabilities-photo">
          <Photo
            style="workshop"
            image={picture(copy.image, `methods/${active.id}`)}
            imagePath={contentPath('printingMethods', active.id, 'image')}
            label={`${active.name} printing`}
          />
        </div>
      </div>
    </div>
  </section>;
}

export default function ProductsPage() {
  const params = new URLSearchParams(globalThis.location?.search ?? '');
  const requested = params.get('category') || 'apparel';
  const category = siteContent.categories.some((item) => item.id === requested) ? requested : 'apparel';
  const [subcategory, setSubcategory] = useState(params.get('subcategory') || 'all');
  const [showAll, setShowAll] = useState(false);
  const collectionRef = useRef(null);

  const toggleShowAll = (event) => {
    event.preventDefault();
    if (!showAll) {
      setShowAll(true);
      return;
    }
    // Collapsing removes every card after the first eight, so someone who
    // scrolled down the full list would be dropped into the printing section.
    // Take them back to the top of the collection instead. The shorter list is
    // committed first so the jump is measured against the final layout, and it
    // jumps rather than animates, so the page doesn't drift while cards vanish.
    const section = collectionRef.current;
    const scrolledPast = Boolean(section) && section.getBoundingClientRect().top < 0;
    flushSync(() => setShowAll(false));
    if (scrolledPast) section.scrollIntoView({ block: 'start', behavior: 'instant' });
  };

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

    <section className="section products-collection" ref={collectionRef}>
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
        ? <div className="product-grid" id="product-collection-grid">{visible.map((product) => <ProductCard key={product.id} product={product} />)}</div>
        : <div className="empty-state">
          <h3 data-cms-path={cms(pagePath('products', 'emptyTitle'))}>{pageText('products', 'emptyTitle')}</h3>
          <p data-cms-path={cms(pagePath('products', 'emptyDescription'))}>{pageText('products', 'emptyDescription')}</p>
        </div>}
      {/* One button that expands and collapses. It used to hide itself once the
          list was expanded, leaving no way back to the shorter list. */}
      {products.length > 8 && <div className="center-action">
        <Button href="#" variant="outline" aria-expanded={showAll} aria-controls="product-collection-grid" onClick={toggleShowAll}>
          {showAll
            ? <><span data-cms-path={cms(pagePath('products', 'showLessLabel'))}>{pageText('products', 'showLessLabel', 'Show Less')}</span> <Icon name="chevronDown" size={15} className="inline-arrow is-up" /></>
            : <><span data-cms-path={cms(pagePath('products', 'viewAllPrefix'))}>{pageText('products', 'viewAllPrefix', 'View All')}</span> {activeCategory.name} <Icon name="arrowRight" size={15} className="inline-arrow" /></>}
        </Button>
      </div>}
    </section>

    <Capabilities methods={methods} />

    <section className="promo-band">
      <div className="promo-copy">
        <span className="eyebrow" data-cms-path={cms(pagePath('products', 'promoEyebrow'))}>{pageText('products', 'promoEyebrow')}</span>
        <h2 data-cms-path={cms(pagePath('products', 'promoTitle'))}>{pageText('products', 'promoTitle')}</h2>
        <p data-cms-path={cms(pagePath('products', 'promoDescription'))}>{pageText('products', 'promoDescription')}</p>
        <Button {...enquiryProps} data-cms-paths={quoteDestinationPaths}><span data-cms-path={cms(pagePath('products', 'promoButtonLabel'))}>{pageText('products', 'promoButtonLabel')}</span> <Icon name="arrowRight" size={15} className="inline-arrow" /></Button>
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
