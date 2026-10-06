import { useEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import printData from '../../data/printData.json';
import siteContent from '../../data/siteContent.json';
import { categoryPath, cms, contentPath, headingPath, heroBackground, labelPath, pagePath, pageText, picture, scenePath } from '../cms';
import { enquiryLinkProps, getPublicProducts, messageHref } from '../../utils/catalogue';
import { getImage } from '../../utils/imageRegistry';
import CategoryStrip from '../components/CategoryStrip';
import Icon from '../components/Icons';
import { Button, heading, label, PageCTA, Photo, ProductCard, QuoteButton, SectionHeading } from '../components/Ui';
import { Product } from '../components/Visuals';

const fill = (template, values) => String(template).replace(/\{(\w+)\}/g, (match, key) => (key in values ? values[key] : match));

/*
 * What each kind of product is drawn as in the row that picks between them.
 * Anything the drawings do not cover falls back to the category's own mark.
 */
const TYPE_VISUALS = {
  tshirts: 'tee', polos: 'polo', jerseys: 'jersey', hoodies: 'hoodie', jackets: 'jacket',
  singlets: 'sleeveless', caps: 'cap', totes: 'tote', drawstring: 'bag', bottles: 'bottle',
  'gift-sets': 'gift-set', notebooks: 'notebook', lanyards: 'lanyard',
  towels: 'towel', medals: 'medal', mats: 'mat', pens: 'pen',
  'name-tents': 'name-tent', stickers: 'sticker',
};

const prettyName = (id) => id.replace(/-/g, ' ').replace(/(^|\s)\S/g, (letter) => letter.toUpperCase());

/*
 * The kinds within a category, read from the products themselves rather than
 * from a list kept by hand: the apparel filter named five while the catalogue
 * held seven, so six caps could be reached only by searching for them.
 */
function typesIn(products, names) {
  const seen = [];
  for (const product of products) {
    const id = product.public.subcategory;
    if (!id || seen.some((type) => type.id === id)) continue;
    seen.push({ id, name: names[id] ?? prettyName(id), visual: TYPE_VISUALS[id] });
  }
  return seen.length > 1 ? seen : [];
}

/*
 * The kinds a category is browsed by. Where the client drew the row it is
 * theirs, name for name and mark for mark, including kinds the catalogue has
 * nothing under yet: the row says what MySOS makes, not what happens to be
 * loaded. Anywhere they did not draw one, it is still read from the products.
 */
function typeRowFor(category, products, names) {
  const drawn = siteContent.categoryTypes?.[category.id];
  if (drawn?.length) return drawn.map((type) => ({ ...type, visual: TYPE_VISUALS[type.id] }));
  return typesIn(products, names);
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
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('featured');
  const [showAll, setShowAll] = useState(false);
  const collectionRef = useRef(null);
  /* The shelf the search narrows is a screen below the box that narrows it.
     Saying how many matched, and offering the way down, is the difference
     between a search that looks broken and one that worked. */
  const goToResults = () => collectionRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });

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

  const toggleShowAll = () => {
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

  const products = useMemo(() => {
    const inCategory = getPublicProducts({ category, subcategory: subcategory === 'all' ? undefined : subcategory });
    const asked = query.trim().toLowerCase();
    if (!asked) return inCategory;
    // What the reader typed, against what a product is called and what it is.
    return inCategory.filter((product) => `${product.public.name} ${product.public.description ?? ''}`.toLowerCase().includes(asked));
  }, [category, query, subcategory]);

  /* What MySOS puts first, or the reader's own order. */
  const shelf = useMemo(() => {
    if (sort === 'name') return [...products].sort((a, b) => a.public.name.localeCompare(b.public.name));
    if (sort === 'price') {
      const amount = (product) => product.public.displayPricing?.amount ?? Number.POSITIVE_INFINITY;
      return [...products].sort((a, b) => amount(a) - amount(b));
    }
    return products;
  }, [products, sort]);
  const visible = showAll ? shelf : shelf.slice(0, 8);
  const activeCategory = siteContent.categories.find((item) => item.id === category) ?? siteContent.categories[0];
  /*
   * The ways MySOS can put a brand on what is in this category, rather than
   * the whole list every time: a bottle is not embroidered. Which methods suit
   * which category is content, so MySOS can correct it; a category that names
   * none is offered all of them.
   */
  // The kinds within this category, each with the thing it stands for.
  const types = useMemo(() => typeRowFor(activeCategory, getPublicProducts({ category }), siteContent.subcategoryNames ?? {}), [activeCategory, category]);
  const banner = useMemo(() => categoryPicture(activeCategory, getPublicProducts({ category })), [activeCategory, category]);
  // Asking for what is not listed opens a chat rather than the quote page: it
  // is a question, not an order, and it names what the reader was looking at.
  const askHref = useMemo(() => messageHref(`Hi MySOS, I am looking at ${activeCategory.name} and cannot find what I need. Can you help?`, `${activeCategory.name} enquiry`), [activeCategory]);

  return <main className="page-paper products-page">
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
          <h1 data-reveal style={{ '--reveal-delay': '70ms' }}>
            <span data-cms-path={cms(labelPath('categoryTitlePrefix'))}>{label('categoryTitlePrefix', 'Custom')}</span>{' '}
            <span data-cms-path={cms(categoryPath(activeCategory, 'name'))}>{activeCategory.name}</span>
          </h1>
          <p className="hero-lead" data-reveal style={{ '--reveal-delay': '250ms' }} data-cms-path={cms(categoryPath(activeCategory, 'description'))}>{activeCategory.description}</p>
          {/* Searching narrows what is on the shelf below rather than sending
              the reader to another page for the answer. */}
          <form className="hero-search collection-search" role="search" data-reveal style={{ '--reveal-delay': '300ms' }} onSubmit={(event) => { event.preventDefault(); goToResults(); }}>
            <Icon name="search" size={22} />
            <input
              type="search"
              autoComplete="off"
              aria-label={pageText('products', 'searchLabel', 'Search this category')}
              placeholder={activeCategory.searchPlaceholder || pageText('products', 'searchPlaceholder')}
              value={query}
              onChange={(event) => { setQuery(event.target.value); setShowAll(false); }}
            />
            {query && <button type="button" aria-label="Clear search" onClick={() => setQuery('')}><Icon name="close" size={19} /></button>}
          </form>
          {/* Read out as it changes, so it reaches someone who cannot see the
              shelf move either. */}
          {query.trim() && <p className={products.length ? 'collection-found' : 'collection-found is-none'} role="status" aria-live="polite">
            {products.length
              ? <button type="button" onClick={goToResults}>
                <span data-cms-path={cms(pagePath('products', products.length === 1 ? 'searchFoundOne' : 'searchFound'))}>
                  {products.length === 1
                    ? pageText('products', 'searchFoundOne', '1 match below')
                    : fill(pageText('products', 'searchFound', '{count} matches below'), { count: products.length })}
                </span>
                <Icon name="chevronDown" size={18} />
              </button>
              : <span>
                <Icon name="search" size={18} />
                <span data-cms-path={cms(pagePath('products', 'searchFoundNone'))}>{pageText('products', 'searchFoundNone', 'Nothing here matches')}</span>
              </span>}
          </p>}
          <div className="hero-actions" data-reveal style={{ '--reveal-delay': '360ms' }}>
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

    {/* The kinds within a category, before the shelf itself. */}
    {types.length > 0 && <section className="section section-tight product-types">
      <h2 data-reveal>
        <span data-cms-path={cms(pagePath('products', 'typesPrefix'))}>{pageText('products', 'typesPrefix', 'Browse')}</span>{' '}
        <span data-cms-path={cms(categoryPath(activeCategory, 'typeWord'))}>{activeCategory.typeWord}</span>{' '}
        <span data-cms-path={cms(pagePath('products', 'typesSuffix'))}>{pageText('products', 'typesSuffix', 'types')}</span>
      </h2>
      {/* One button per kind, each with its own mark, filling the row. Picking
          the kind already chosen clears it, which is how the reader gets back
          to everything without an "All" button the design does not have. */}
      <div className="type-row" role="tablist" aria-label={`${activeCategory.name} types`} data-reveal style={{ '--reveal-delay': '80ms' }}>
        {types.map((type, index) => <button
          key={type.id}
          type="button"
          role="tab"
          aria-selected={subcategory === type.id}
          onClick={() => { setSubcategory(subcategory === type.id ? 'all' : type.id); setShowAll(false); }}
        >
          {type.icon
            ? <Icon name={type.icon} size={26} cmsPath={contentPath('categoryTypes', activeCategory.id, index, 'icon')} />
            : <Product type={type.visual || activeCategory.visual} color={subcategory === type.id ? 'white' : 'navy'} mark="" />}
          <span data-cms-path={type.icon
            ? cms(contentPath('categoryTypes', activeCategory.id, index, 'name'))
            : cms(contentPath('subcategoryNames', type.id))}
          >{type.name}</span>
        </button>)}
      </div>
    </section>}

    <section className="section products-collection" ref={collectionRef}>
      <div className="collection-bar">
        <h2 className="collection-title">
          <span data-cms-path={cms(pagePath('products', 'exploreTitle'))}>{pageText('products', 'exploreTitle', 'Explore all')}</span>{' '}
          <span data-cms-path={cms(categoryPath(activeCategory, 'name'))}>{activeCategory.name}</span>
        </h2>
        <label className="collection-sort">
          <span data-cms-path={cms(pagePath('products', 'sortLabel'))}>{pageText('products', 'sortLabel', 'Sort by')}</span>
          <select value={sort} onChange={(event) => setSort(event.target.value)}>
            <option value="featured">{pageText('products', 'sortFeatured', 'Featured')}</option>
            <option value="name">{pageText('products', 'sortName', 'Name A–Z')}</option>
            <option value="price">{pageText('products', 'sortPrice', 'Price, low to high')}</option>
          </select>
        </label>
      </div>
      {visible.length > 0
        /* A new key remounts the shelf, so the cards deal themselves out again
           rather than swapping in place when you change what is on it. The
           search box is left out of it: re-dealing on every letter typed is
           a flicker, not an arrival. */
        ? <div className="product-grid" id="product-collection-grid" key={`${activeCategory.id}-${subcategory}-${sort}-${showAll}`}>
          {visible.map((product, index) => <ProductCard key={product.id} product={product} reveal={index % 8} />)}
        </div>
        : <div className="empty-state">
          <h3 data-cms-path={cms(pagePath('products', 'emptyTitle'))}>{pageText('products', 'emptyTitle')}</h3>
          <p data-cms-path={cms(pagePath('products', 'emptyDescription'))}>{pageText('products', 'emptyDescription')}</p>
        </div>}
      {/* One button that expands and collapses. It used to hide itself once the
          list was expanded, leaving no way back to the shorter list. */}
      {products.length > 8 && <div className="center-action">
        <Button variant="outline" aria-expanded={showAll} aria-controls="product-collection-grid" onClick={toggleShowAll}>
          {showAll
            ? <><span data-cms-path={cms(pagePath('products', 'showLessLabel'))}>{pageText('products', 'showLessLabel', 'Show Less')}</span> <Icon name="chevronDown" size={18} className="inline-arrow is-up" /></>
            : <><span data-cms-path={cms(pagePath('products', 'viewAllPrefix'))}>{pageText('products', 'viewAllPrefix', 'View All')}</span>{' '}<span data-cms-path={cms(categoryPath(activeCategory, 'name'))}>{activeCategory.name}</span> <Icon name="arrowRight" size={18} className="inline-arrow" /></>}
        </Button>
      </div>}

      {/* Not everything MySOS can make is listed. This closes the products with
          the way to ask for the rest — a message, rather than a form to fill
          in first. */}
      {askHref && <a className="product-ask" href={askHref} {...enquiryLinkProps(askHref)} data-reveal>
        <span className="product-ask-inner">
          <Icon name="spark" size={30} />
          <strong data-cms-path={cms(headingPath('industryHeading'))}>{heading('industryHeading', "Don't know what you need?")}</strong>
          <small data-cms-path={cms(headingPath('industryDescription'))}>{heading('industryDescription')}</small>
          <span className="product-ask-go">
            <span data-cms-path={cms(labelPath('heroSearchAskButton'))}>{label('heroSearchAskButton', 'Tell us about it')}</span>
            <Icon name="arrowRight" size={19} className="inline-arrow" />
          </span>
        </span>
      </a>}
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
