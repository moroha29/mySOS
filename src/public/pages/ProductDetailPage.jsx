import { useMemo, useState } from 'react';
import printData from '../../data/printData.json';
import siteContent from '../../data/siteContent.json';
import { getDisplayPrice, getPublicProducts, REQUEST_PATH } from '../../utils/catalogue';
import { clampQuantity, detailFieldsFor, LET_MYSOS_CHOOSE, printingFieldFor } from '../../utils/solutionRequest';
import { cms, contentPath, pagePath, pageText, picture } from '../cms';
import Icon from '../components/Icons';
import { ProductShot } from '../components/Ui';

/*
 * One product, as the 2026 concept draws it: the photograph on the left, and on
 * the right everything needed to ask for it — how many, which colour, how it
 * should be printed — carried straight into the request page.
 *
 * Nothing here is a quotation. Where MySOS publishes an indicative price for a
 * product it is shown as a guide, and the real number comes back after a person
 * has looked at the artwork.
 */

const word = (key, fallback = '') => pageText('product', key, fallback);
const wordPath = (key) => cms(pagePath('product', key));
const fill = (template, values) => String(template).replace(/\{(\w+)\}/g, (match, key) => (key in values ? values[key] : match));

const methodName = (id) => printData.methods.find((method) => method.id === id)?.name ?? id;
const methodNote = (id) => siteContent.printingMethods?.[id]?.bestFor ?? '';

/** The colours this kind of product is offered in, from the request options. */
function coloursFor(product) {
  const field = detailFieldsFor(product.id).find((item) => /colour/i.test(item.id));
  return field?.options ?? [];
}

/** The facts panel: this subcategory's, else the shared set. */
const factsFor = (product) => siteContent.productFacts?.[product.public.subcategory] ?? siteContent.productFacts?.default ?? [];

function Gallery({ product, category }) {
  const photos = useMemo(() => {
    const own = picture('', `products/${product.public.slug}`);
    const others = getPublicProducts({ category: product.public.category })
      .filter((item) => item.id !== product.id)
      .map((item) => ({ slug: item.public.slug, src: picture('', `products/${item.public.slug}`), name: item.public.name }))
      .filter((item) => item.src)
      .slice(0, 3);
    return { own, others };
  }, [product]);

  return <div className="pdp-gallery">
    <div className="pdp-shot">
      {product.public.featured && <span className="pdp-badge" data-cms-path={cms(contentPath('labels', 'featuredBadge'))}>{siteContent.labels?.featuredBadge ?? 'Most requested'}</span>}
      {photos.own
        ? <img src={photos.own} alt={product.public.name} />
        : <ProductShot imageStyle={product.public.imageStyle} slug={product.public.slug} />}
    </div>
    {photos.others.length > 0 && <p className="pdp-thumbs-label">{`More ${(category?.name ?? '').toLowerCase()}`.trim()}</p>}
    {photos.others.length > 0 && <ul className="pdp-thumbs">
      {photos.others.map((other) => <li key={other.slug}>
        <a href={`/mySOS/products/${other.slug}/`} aria-label={other.name}><img src={other.src} alt="" loading="lazy" /></a>
      </li>)}
    </ul>}
    <p className="pdp-mockup">
      <Icon name="checkCircle" size={20} />
      <span>
        <strong data-cms-path={wordPath('mockupTitle')}>{word('mockupTitle', 'Free visual mockup before production')}</strong>
        <small data-cms-path={wordPath('mockupNote')}>{word('mockupNote')}</small>
      </span>
    </p>
    <p className="pdp-category-link">
      <a className="text-link" href={`/mySOS/products/?category=${product.public.category}`}>
        {fill(word('relatedTitle', 'More in this category'), {})} <Icon name="arrowRight" size={15} className="inline-arrow" />
      </a>
    </p>
    <span className="sr-only">{`${category?.name ?? product.public.category} product`}</span>
  </div>;
}

/*
 * The request builder for one product. Every answer is carried to the request
 * page in the address, so the customer never retypes what they chose here.
 */
function BuildPanel({ product }) {
  const minimum = Number(siteContent.productMinimum ?? 1) || 1;
  const presets = siteContent.quantityPresets ?? [];
  const colours = coloursFor(product);
  const printing = printingFieldFor(product.id);
  const methods = (product.printingMethods ?? []).map((id) => ({ id, name: methodName(id), note: methodNote(id) }));

  const [quantity, setQuantity] = useState(presets[1] ?? minimum);
  const [colour, setColour] = useState('');
  const [method, setMethod] = useState('');
  const price = getDisplayPrice(product);
  const amount = product.public.displayPricing?.show ? Number(product.public.displayPricing.amount) : null;

  const href = useMemo(() => {
    const params = new URLSearchParams({ product: product.id, qty: String(clampQuantity(quantity)) });
    if (colour) params.set('colour', colour);
    if (method) params.set('printing', method);
    return `${REQUEST_PATH}?${params}`;
  }, [product.id, quantity, colour, method]);

  const step = (by) => setQuantity((current) => clampQuantity(Math.max(minimum, Number(current) + by)));

  return <div className="pdp-build">
    <div className="pdp-build-head">
      <h2 data-cms-path={wordPath('buildTitle')}>{word('buildTitle', 'Build your request')}</h2>
    </div>

    <section className="pdp-step">
      <p className="pdp-step-head">
        <span className="pdp-step-number" aria-hidden="true">1</span>
        <label htmlFor="pdp-quantity" data-cms-path={wordPath('quantityQuestion')}>{word('quantityQuestion', 'How many pieces?')}</label>
        <small data-cms-path={wordPath('quantityHint')}>{fill(word('quantityHint', 'Minimum {min}'), { min: minimum })}</small>
      </p>
      <div className="pdp-quantity">
        <button type="button" aria-label="Fewer pieces" onClick={() => step(-10)}><Icon name="minus" size={18} /></button>
        <input id="pdp-quantity" type="number" inputMode="numeric" min={minimum} value={quantity} onChange={(event) => setQuantity(event.target.value)} onBlur={() => setQuantity((current) => Math.max(minimum, clampQuantity(current)))} />
        <button type="button" aria-label="More pieces" onClick={() => step(10)}><Icon name="plus" size={18} /></button>
      </div>
      {presets.length > 0 && <ul className="pdp-presets">
        {presets.map((preset, index) => <li key={preset}>
          <button type="button" className={Number(quantity) === Number(preset) ? 'is-chosen' : ''} onClick={() => setQuantity(preset)} data-cms-path={cms(contentPath('quantityPresets', index))}>{preset}</button>
        </li>)}
      </ul>}
    </section>

    {colours.length > 0 && <section className="pdp-step">
      <p className="pdp-step-head">
        <span className="pdp-step-number" aria-hidden="true">2</span>
        <span id="pdp-colour" data-cms-path={wordPath('colourQuestion')}>{word('colourQuestion', 'Choose a base colour')}</span>
        <small>{colour || word('colourHint', 'Optional')}</small>
      </p>
      <div className="pdp-colours" role="radiogroup" aria-labelledby="pdp-colour">
        {colours.map((option) => <button
          key={option}
          type="button"
          role="radio"
          aria-checked={colour === option}
          className={colour === option ? 'is-chosen' : ''}
          onClick={() => setColour(colour === option ? '' : option)}
        >{option}</button>)}
      </div>
    </section>}

    {methods.length > 0 && <section className="pdp-step">
      <p className="pdp-step-head">
        <span className="pdp-step-number" aria-hidden="true">{colours.length > 0 ? 3 : 2}</span>
        <span id="pdp-method" data-cms-path={wordPath('methodQuestion')}>{word('methodQuestion', 'How would you like to customise it?')}</span>
        <small data-cms-path={wordPath('methodHint')}>{word('methodHint', 'Choose one')}</small>
      </p>
      <div className="pdp-methods" role="radiogroup" aria-labelledby="pdp-method">
        {methods.map((item) => <button
          key={item.id}
          type="button"
          role="radio"
          aria-checked={method === item.name}
          className={method === item.name ? 'is-chosen' : ''}
          onClick={() => setMethod(item.name)}
        >
          <strong>{item.name}</strong>
          {item.note && <small data-cms-path={cms(contentPath('printingMethods', item.id, 'bestFor'))}>{item.note}</small>}
        </button>)}
        {/* The customer may have no idea, and saying so is a real answer. */}
        {printing && <button
          type="button"
          role="radio"
          aria-checked={method === LET_MYSOS_CHOOSE}
          className={method === LET_MYSOS_CHOOSE ? 'is-chosen' : ''}
          onClick={() => setMethod(LET_MYSOS_CHOOSE)}
        >
          <strong data-cms-path={wordPath('methodHelpTitle')}>{word('methodHelpTitle', 'Help me decide')}</strong>
          <small data-cms-path={wordPath('methodHelpNote')}>{word('methodHelpNote')}</small>
        </button>}
      </div>
    </section>}

    <div className="pdp-artwork">
      <span>
        <strong data-cms-path={wordPath('artworkTitle')}>{word('artworkTitle', 'Have artwork or a reference?')}</strong>
        <small data-cms-path={wordPath('artworkHint')}>{word('artworkHint', 'PNG, JPG or PDF')}</small>
      </span>
      {/* Files are attached on the request page, where the message that carries
          them is put together. */}
      <a className="btn btn-outline btn-sm" href={href}><Icon name="upload" size={16} /> <span data-cms-path={wordPath('artworkButton')}>{word('artworkButton', 'Add on the next step')}</span></a>
    </div>

    <div className="pdp-close">
      {price
        ? <p className="pdp-price">
          <small data-cms-path={wordPath('estimateLabel')}>{word('estimateLabel', 'Indicative price')}</small>
          <strong>{price}</strong>
          {amount ? <span>{`about $${(amount * clampQuantity(quantity)).toFixed(0)} for ${clampQuantity(quantity)} pieces`}</span> : null}
        </p>
        : null}
      <p className="pdp-price-note" data-cms-path={price ? wordPath('estimateNote') : wordPath('noPriceNote')}>{price ? word('estimateNote') : word('noPriceNote')}</p>
      <a className="btn btn-primary pdp-add" href={href}>
        <span data-cms-path={wordPath('addButton')}>{word('addButton', 'Add to my request')}</span>
        <Icon name="arrowRight" size={16} className="inline-arrow" />
      </a>
      <p className="pdp-ask">
        <span data-cms-path={wordPath('askPrefix')}>{word('askPrefix', 'Need something different?')}</span>{' '}
        <a href={REQUEST_PATH}><span data-cms-path={wordPath('askLink')}>{word('askLink', 'Ask MySOS for help')}</span></a>
      </p>
    </div>
  </div>;
}

function InfoSection({ product }) {
  const facts = factsFor(product);
  const sections = siteContent.productInfoSections ?? [];
  const [open, setOpen] = useState(0);

  return <section className="section pdp-info">
    <div className="pdp-info-copy">
      <span className="eyebrow" data-cms-path={wordPath('infoEyebrow')}>{word('infoEyebrow', 'Product information')}</span>
      <h2 data-cms-path={wordPath('infoTitle')}>{word('infoTitle', 'Everything important, kept simple.')}</h2>
      <p data-cms-path={wordPath('infoLead')}>{word('infoLead')}</p>
      <ul className="pdp-facts">
        {facts.map((fact, index) => <li key={fact.label}>
          <strong data-cms-path={cms(contentPath('productFacts', siteContent.productFacts?.[product.public.subcategory] ? product.public.subcategory : 'default', index, 'label'))}>{fact.label}</strong>
          <small data-cms-path={cms(contentPath('productFacts', siteContent.productFacts?.[product.public.subcategory] ? product.public.subcategory : 'default', index, 'value'))}>{fact.value}</small>
        </li>)}
      </ul>
    </div>
    <div className="pdp-accordion">
      {/* The product's own description leads, then the shared sections. */}
      {[{ title: 'Product specifications', body: product.public.description, own: true }, ...sections].map((entry, index) => <div key={entry.title} className={open === index ? 'is-open' : ''}>
        <button type="button" aria-expanded={open === index} onClick={() => setOpen(open === index ? -1 : index)}>
          <span data-cms-path={entry.own ? undefined : cms(contentPath('productInfoSections', index - 1, 'title'))}>{entry.title}</span>
          <Icon name={open === index ? 'minus' : 'plus'} size={16} />
        </button>
        {open === index && <p data-cms-path={entry.own ? undefined : cms(contentPath('productInfoSections', index - 1, 'body'))}>{entry.body}</p>}
      </div>)}
    </div>
  </section>;
}

export default function ProductDetailPage({ slug }) {
  const product = getPublicProducts().find((item) => item.public.slug === slug);
  if (!product) return null;
  const category = siteContent.categories.find((item) => item.id === product.public.category);

  return <main className="page-paper pdp">
    <nav className="breadcrumb pdp-breadcrumb" aria-label="Breadcrumb">
      <a href="/mySOS/">Home</a>
      <span aria-hidden="true">›</span>
      <a href={`/mySOS/products/?category=${product.public.category}`}>{category?.name ?? product.public.category}</a>
      <span aria-hidden="true">›</span>
      <span aria-current="page">{product.public.name}</span>
    </nav>

    <div className="pdp-top">
      <Gallery product={product} category={category} />
      <div className="pdp-copy">
        <span className="eyebrow">{category?.name ?? product.public.category}</span>
        <h1>{product.public.name}</h1>
        <p className="pdp-lead">{product.public.description}</p>
        <ul className="pdp-promises">
          {(siteContent.pages?.product?.promises ?? []).map((promise, index) => <li key={promise}>
            <Icon name="check" size={15} />
            <span data-cms-path={cms(pagePath('product', 'promises', index))}>{promise}</span>
          </li>)}
        </ul>
        <BuildPanel product={product} />
      </div>
    </div>

    <InfoSection product={product} />
  </main>;
}
