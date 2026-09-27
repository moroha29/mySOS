import { useEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import printData from '../../data/printData.json';
import siteContent from '../../data/siteContent.json';
import { categoryPath, cms, contentPath, headingPath, heroBackground, labelPath, pagePath, pageText, picture, scenePath } from '../cms';
import { getPublicProducts, REQUEST_PATH } from '../../utils/catalogue';
import { getImage } from '../../utils/imageRegistry';
import CategoryStrip from '../components/CategoryStrip';
import Icon from '../components/Icons';
import { Button, heading, label, PageCTA, Photo, ProductCard, QuoteButton, SectionHeading } from '../components/Ui';

// Tab wording lives in content; the ids are what the filter matches on.
const apparelTabs = siteContent.apparelTabs ?? [];

/*
 * What MySOS can print on this kind of product, named in the banner rather
 * than in a band of its own further down the page.
 *
 * Every product in the catalogue carries the methods it can be branded with,
 * so a category's ways of printing are simply the ones its products offer —
 * MySOS's own data, kept per product in the portal, rather than a list of
 * categories to keep in step by hand. Names and order come from printData,
 * the pricing workbook's list.
 */
function waysToPrint(products) {
  const offered = new Set(products.flatMap((product) => product.printingMethods ?? []));
  return printData.methods.filter((method) => method.public?.visible && offered.has(method.id));
}

/* The picture beside the banner: the category's own if one is uploaded, else
   the first photograph among its products, else the drawn stand-in. */
function categoryPicture(category, products) {
  const chosen = String(category?.image ?? '').trim();
  if (chosen) return { src: chosen, path: categoryPath(category, 'image') };
  for (const product of products) {
    const photo = getImage(`products/${product.public.slug}`);
    if (photo) return { src: photo, path: null };
  }
  return { src: picture(siteContent.scenes?.productsHeroImage, 'scenes/products-hero'), path: scenePath('productsHeroImage') };
}

const knownCategory = (id) => (siteContent.categories.some((item) => item.id === id) ? id : 'apparel');

export default function ProductsPage() {
  const params = new URLSearchParams(globalThis.location?.search ?? '');
  const [category, setCategory] = useState(() => knownCategory(params.get('category') || 'apparel'));
  const [subcategory, setSubcategory] = useState(params.get('subcategory') || 'all');
  const [showAll, setShowAll] = useState(false);
  const collectionRef = useRef(null);

  /*
   * Categories are swapped in place. They used to be plain links, so choosing
   * one reloaded the page and dropped the reader back at the top of the banner,
   * away from the products they were looking at. The address still changes, so
   * the link can be copied, opened in a new tab and stepped back through.
   */
  const chooseCategory = (event, id) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
    event.preventDefault();
    setCategory(id);
    setSubcategory('all');
    setShowAll(false);
    globalThis.history?.pushState?.({ category: id }, '', `?category=${id}`);
  };

  useEffect(() => {
    const onPop = () => setCategory(knownCategory(new URLSearchParams(globalThis.location?.search ?? '').get('category') || 'apparel'));
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

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
  /*
   * The ways MySOS can put a brand on what is in this category, rather than
   * the whole list every time: a bottle is not embroidered. Which methods suit
   * which category is content, so MySOS can correct it; a category that names
   * none is offered all of them.
   */
  // Everything in the category, not only what is on screen: the ways of
  // printing belong to the category, not to the first eight products.
  const ways = useMemo(() => waysToPrint(getPublicProducts({ category })), [category]);
  const banner = useMemo(() => categoryPicture(activeCategory, getPublicProducts({ category })), [activeCategory, category]);

  return <main className="page-paper">
    <CategoryStrip activeId={category} onChoose={chooseCategory} />

    <section {...heroBackground(siteContent.scenes?.productsHeroBackgroundImage, scenePath('productsHeroBackgroundImage'), 'hero hero-compact')}>
      <div className="hero-inner">
        <div>
          <nav className="breadcrumb" aria-label="Breadcrumb" data-reveal>
            <a href="/mySOS/" aria-label="Home"><Icon name="home" size={18} /></a>
            <span aria-hidden="true">/</span>
            <span aria-current="page" data-cms-path={cms(categoryPath(activeCategory, 'name'))}>{activeCategory.name}</span>
          </nav>
          {/* The client's line for this page, kept above the category it is
              showing — the page now says what was chosen in the strip. */}
          <span className="eyebrow" data-reveal>
            <span data-cms-path={cms(pagePath('products', 'heroTitle'))}>{pageText('products', 'heroTitle', 'Custom Merchandise,')}</span>{' '}
            <span data-cms-path={cms(pagePath('products', 'heroTitleAccent'))}>{pageText('products', 'heroTitleAccent', 'Made Simple')}</span>
          </span>
          <h1 data-reveal style={{ '--reveal-delay': '70ms' }} data-cms-path={cms(categoryPath(activeCategory, 'name'))}>{activeCategory.name}</h1>
          <p className="hero-lead" data-reveal style={{ '--reveal-delay': '250ms' }} data-cms-path={cms(pagePath('products', 'heroLead'))}>{pageText('products', 'heroLead')}</p>
          {ways.length > 0 && <div className="hero-ways" id="printing" data-reveal style={{ '--reveal-delay': '300ms' }}>
            <span className="hero-ways-label">
              <span data-cms-path={cms(pagePath('products', 'waysLabel'))}>{pageText('products', 'waysLabel', 'Ways to print on')}</span>{' '}
              <span data-cms-path={cms(categoryPath(activeCategory, 'name'))}>{activeCategory.name}</span>
            </span>
            <ul>
              {ways.map((method) => <li key={method.id}>
                <Icon name="check" size={18} />
                <span>{method.name}</span>
              </li>)}
            </ul>
          </div>}
          <div className="hero-actions" data-reveal style={{ '--reveal-delay': '330ms' }}>
            <QuoteButton showArrow />
            <Button href="/mySOS/solutions/" variant="ghost">
              <span data-cms-path={cms(labelPath('exploreSolutionsLabel'))}>{label('exploreSolutionsLabel', 'Explore Solutions')}</span>
              <Icon name="arrowRight" size={19} className="inline-arrow" />
            </Button>
          </div>
        </div>
        <div className="hero-scene">
          <Photo
            style="hall"
            image={banner.src}
            imagePath={banner.path}
            label={`${activeCategory.name} MySOS has made`}
            wide
            eager
          />
        </div>
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
      {/* The fill counts are how many columns are left over on the last row, at
          each of the three widths this grid is drawn at. The card that asks for
          what is not listed stretches across them, so no row ends part-drawn. */}
      {visible.length > 0
        ? <div
          className="product-grid"
          id="product-collection-grid"
          data-fill4={4 - (visible.length % 4)}
          data-fill3={3 - (visible.length % 3)}
          data-fill2={2 - (visible.length % 2)}
        >
          {visible.map((product, index) => <ProductCard key={product.id} product={product} reveal={index % 8} />)}
          {/* Not everything MySOS can make is listed, and a short category used
              to trail off into white space. This closes the row with the way
              to ask for what is not there. */}
          <a className="product-ask" href={REQUEST_PATH} data-reveal style={{ '--reveal-delay': `${(visible.length % 8) * 50}ms` }}>
            <span className="product-ask-inner">
              <Icon name="spark" size={30} />
              <strong data-cms-path={cms(headingPath('industryHeading'))}>{heading('industryHeading', "Don't know what you need?")}</strong>
              <small data-cms-path={cms(headingPath('industryDescription'))}>{heading('industryDescription')}</small>
              <span className="product-ask-go">
                <span data-cms-path={cms(labelPath('heroSearchAskButton'))}>{label('heroSearchAskButton', 'Tell us about it')}</span>
                <Icon name="arrowRight" size={19} className="inline-arrow" />
              </span>
            </span>
          </a>
        </div>
        : <div className="empty-state">
          <h3 data-cms-path={cms(pagePath('products', 'emptyTitle'))}>{pageText('products', 'emptyTitle')}</h3>
          <p data-cms-path={cms(pagePath('products', 'emptyDescription'))}>{pageText('products', 'emptyDescription')}</p>
        </div>}
      {/* One button that expands and collapses. It used to hide itself once the
          list was expanded, leaving no way back to the shorter list. */}
      {products.length > 8 && <div className="center-action">
        <Button href="#" variant="outline" aria-expanded={showAll} aria-controls="product-collection-grid" onClick={toggleShowAll}>
          {showAll
            ? <><span data-cms-path={cms(pagePath('products', 'showLessLabel'))}>{pageText('products', 'showLessLabel', 'Show Less')}</span> <Icon name="chevronDown" size={18} className="inline-arrow is-up" /></>
            : <><span data-cms-path={cms(pagePath('products', 'viewAllPrefix'))}>{pageText('products', 'viewAllPrefix', 'View All')}</span> {activeCategory.name} <Icon name="arrowRight" size={18} className="inline-arrow" /></>}
        </Button>
      </div>}
    </section>

    <section className="promo-band">
      <div className="promo-copy" data-reveal>
        <span className="eyebrow" data-cms-path={cms(pagePath('products', 'promoEyebrow'))}>{pageText('products', 'promoEyebrow')}</span>
        <h2 data-cms-path={cms(pagePath('products', 'promoTitle'))}>{pageText('products', 'promoTitle')}</h2>
        <p data-cms-path={cms(pagePath('products', 'promoDescription'))}>{pageText('products', 'promoDescription')}</p>
        <QuoteButton showArrow />
      </div>
      <div className="promo-art" aria-hidden="true"><Photo style="office" image={picture(siteContent.scenes?.productsPromoImage, 'scenes/products-promo')} imagePath={scenePath('productsPromoImage')} /></div>
    </section>

    <section className="section" id="faq">
      <SectionHeading eyebrow={heading('faqHeading', 'Frequently asked questions')} eyebrowPath={headingPath('faqHeading')} align="left" />
      <div className="faq-list" data-reveal>
        {siteContent.faq.map((item, index) => <details key={item.question}>
          <summary><span data-cms-path={cms(contentPath('faq', index, 'question'))}>{item.question}</span><Icon name="plus" size={19} /></summary>
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
