import { useEffect, useMemo, useRef, useState } from 'react';
import printData from '../../data/printData.json';
import siteContent from '../../data/siteContent.json';
import { getDisplayPrice, getPublicProducts, REQUEST_PATH } from '../../utils/catalogue';
import { clampQuantity, detailFieldsFor, LET_MYSOS_CHOOSE, printingFieldFor } from '../../utils/solutionRequest';
import { cms, contentPath, pagePath, pageText, picture } from '../cms';
import BrandMark from '../components/BrandMarks';
import Icon from '../components/Icons';
import { ProductShot } from '../components/Ui';
import { MeasureFigure, Product } from '../components/Visuals';

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

/** The specifications table under the picture, and the chart behind it. */
const specsFor = (product) => siteContent.productSpecs?.[product.public.subcategory] ?? siteContent.productSpecs?.default ?? [];
const chartFor = (product) => siteContent.sizeCharts?.[product.public.subcategory] ?? null;

/* The swatch a colour name is drawn as. A name with no swatch is still offered,
   as a word: "Other (tell us in the notes)" is a real answer and has no ink. */
const swatchFor = (name) => siteContent.colourSwatches?.[String(name).trim()] ?? null;

/* A mark for each way of printing. The card leaves room for a picture, and
   until MySOS uploads one this is what sits in it. */
const METHOD_ICONS = {
  dtf: 'transfer', dtg: 'droplet', silkscreen: 'layers', embroidery: 'thread',
  sublimation: 'sun', uv_printing: 'palette',
};
const methodIcon = (id) => siteContent.printingMethods?.[id]?.icon ?? METHOD_ICONS[id] ?? 'palette';

/*
 * What the product is, under its picture: the description, a table of its
 * specifications and the way to the size chart. It used to be an accordion at
 * the foot of the page, a screen and a half below the picture it described.
 */
/* What a set is made of, where the product is a set rather than one thing. */
function Includes({ product }) {
  const set = siteContent.productIncludes?.[product.id];
  if (!set?.items?.length) return null;
  return <section className="pdp-includes">
    <h2 data-cms-path={cms(contentPath('productIncludes', product.id, 'title'))}>{set.title}</h2>
    <ul>
      {set.items.map((item, index) => <li key={item.name}>
        <Product type={item.visual} color="navy" mark="" />
        <span>
          <strong data-cms-path={cms(contentPath('productIncludes', product.id, 'items', index, 'name'))}>{item.name}</strong>
          <small data-cms-path={cms(contentPath('productIncludes', product.id, 'items', index, 'note'))}>{item.note}</small>
        </span>
      </li>)}
    </ul>
  </section>;
}

function ProductDetails({ product, onChart }) {
  const specs = specsFor(product);
  const [open, setOpen] = useState(false);
  const shown = open ? specs : specs.slice(0, 5);
  const key = siteContent.productSpecs?.[product.public.subcategory] ? product.public.subcategory : 'default';
  if (specs.length === 0) return null;

  return <section className="pdp-details">
    <h2 data-cms-path={wordPath('specsTitle')}>{word('specsTitle', 'Product details')}</h2>
    <p className="pdp-details-lead">{product.public.description}</p>
    <dl className="pdp-specs">
      {shown.map((row, index) => <div key={row.label}>
        <dt data-cms-path={cms(contentPath('productSpecs', key, index, 'label'))}>{row.label}</dt>
        <dd data-cms-path={cms(contentPath('productSpecs', key, index, 'value'))}>{row.value}</dd>
      </div>)}
    </dl>
    <div className="pdp-details-actions">
      {onChart && <button type="button" className="btn btn-outline btn-sm" onClick={onChart}>
        <Icon name="design" size={19} />
        <span data-cms-path={wordPath('sizeChartLabel')}>{word('sizeChartLabel', 'View size chart')}</span>
      </button>}
      {specs.length > 5 && <button type="button" className="pdp-specs-more" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span data-cms-path={open ? wordPath('specsLessLabel') : wordPath('specsMoreLabel')}>{open ? word('specsLessLabel', 'Hide full specifications') : word('specsMoreLabel', 'View full specifications')}</span>
        <Icon name={open ? 'chevronUp' : 'chevronDown'} size={18} />
      </button>}
    </div>
  </section>;
}

/* Centimetres as inches, to one place: the chart is kept in one unit and the
   other is worked out, so the two can never disagree. */
const asInches = (value) => {
  const number = Number(String(value).replace(/[^\d.]/g, ''));
  if (!Number.isFinite(number) || !number) return value;
  return (Math.round((number / 2.54) * 10) / 10).toFixed(1);
};

function ChartTable({ chart, unit }) {
  return <div className="size-chart-table">
    <table>
      <thead><tr>{chart.columns.map((column) => <th key={column} scope="col">{column}</th>)}</tr></thead>
      <tbody>
        {chart.rows.map((row) => <tr key={row[0]}>
          {row.map((cell, index) => (index === 0
            ? <th key={cell} scope="row">{cell}</th>
            : <td key={`${row[0]}-${chart.columns[index]}`} data-label={chart.columns[index]}>{unit === 'inch' ? asInches(cell) : cell}</td>))}
        </tr>)}
      </tbody>
    </table>
  </div>;
}

/*
 * The size guide, in a window rather than another page: the reader is in the
 * middle of choosing and should come back to where they were.
 *
 * Three ways of answering the same question — where to hold the tape, and the
 * numbers in either unit — rather than a table and nothing else.
 */
function SizeChart({ product, open, onClose }) {
  const chart = chartFor(product);
  const ref = useRef(null);
  const [tab, setTab] = useState('measure');
  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;
    if (open && !node.open) { setTab('measure'); node.showModal(); }
    if (!open && node.open) node.close();
    return undefined;
  }, [open]);
  if (!chart) return null;

  const tabs = [
    ['measure', word('measureTab', 'Measurement guide')],
    ['cm', word('chartCmTab', 'Size chart (cm)')],
    ['inch', word('chartInchTab', 'Size chart (inch)')],
  ];

  return <dialog className="size-chart" ref={ref} onClose={onClose} onClick={(event) => { if (event.target === ref.current) onClose(); }}>
    <div className="size-chart-head">
      <h2 data-cms-path={wordPath('sizeChartTitle')}>{word('sizeChartTitle', 'Size guide')}</h2>
      <p>{product.public.name}</p>
      <button type="button" className="size-chart-close" aria-label="Close" onClick={onClose}><Icon name="close" size={22} /></button>
    </div>

    <div className="size-chart-tabs" role="tablist" aria-label="Size guide">
      {tabs.map(([id, label]) => <button
        key={id}
        type="button"
        role="tab"
        aria-selected={tab === id}
        className={tab === id ? 'is-chosen' : ''}
        onClick={() => setTab(id)}
      >{label}</button>)}
    </div>

    {tab === 'measure'
      ? <div className="size-measure">
        <MeasureFigure type={chart.diagram ?? 'tee'} />
        <ul className="size-measure-key">
          {(chart.measure ?? []).map((row, index) => <li key={row.key}>
            <span className="size-measure-badge" aria-hidden="true">{row.key}</span>
            <span>
              <strong data-cms-path={cms(contentPath('sizeCharts', product.public.subcategory, 'measure', index, 'label'))}>{row.label}</strong>
              <small data-cms-path={cms(contentPath('sizeCharts', product.public.subcategory, 'measure', index, 'note'))}>{row.note}</small>
            </span>
          </li>)}
        </ul>
        {chart.tip && <p className="size-measure-tip" data-cms-path={cms(contentPath('sizeCharts', product.public.subcategory, 'tip'))}>{chart.tip}</p>}
      </div>
      : <>
        <ChartTable chart={chart} unit={tab} />
        {/* The note carries the unit, so it has to change with the tab. */}
        {(tab === 'inch' ? chart.noteInch : chart.note) && <p
          className="size-chart-note"
          data-cms-path={cms(contentPath('sizeCharts', product.public.subcategory, tab === 'inch' ? 'noteInch' : 'note'))}
        >{tab === 'inch' ? chart.noteInch : chart.note}</p>}
      </>}

    <button type="button" className="btn btn-primary size-chart-back" onClick={onClose}>
      <span data-cms-path={wordPath('sizeChartClose')}>{word('sizeChartClose', 'Back to my request')}</span>
    </button>
  </dialog>;
}

function Gallery({ product, category }) {
  const photos = useMemo(() => {
    const own = picture('', `products/${product.public.slug}`);
    // Everything else in the category, not the first three: the row scrolls,
    // so there is room for all of them.
    const others = getPublicProducts({ category: product.public.category })
      .filter((item) => item.id !== product.id)
      .map((item) => ({ slug: item.public.slug, src: picture('', `products/${item.public.slug}`), name: item.public.name }))
      .filter((item) => item.src)
      .slice(0, 12);
    return { own, others };
  }, [product]);

  const railRef = useRef(null);
  const [reach, setReach] = useState({ prev: false, next: false });
  // Which way there is still something to scroll to. Measured rather than
  // counted, because how many fit depends on how wide the column is.
  const measure = () => {
    const rail = railRef.current;
    if (!rail) return;
    const room = rail.scrollWidth - rail.clientWidth;
    setReach({ prev: rail.scrollLeft > 4, next: room > 4 && rail.scrollLeft < room - 4 });
  };
  useEffect(() => {
    measure();
    const rail = railRef.current;
    if (!rail) return undefined;
    globalThis.addEventListener('resize', measure);
    return () => globalThis.removeEventListener('resize', measure);
  }, [photos.others.length]);
  const nudge = (by) => {
    const rail = railRef.current;
    if (!rail) return;
    const step = rail.firstElementChild?.getBoundingClientRect().width ?? 160;
    rail.scrollBy({ left: by * (step + 12) * 2, behavior: 'smooth' });
  };

  return <div className="pdp-gallery" data-reveal>
    <div className="pdp-shot">
      {product.public.featured && <span className="pdp-badge" data-cms-path={cms(contentPath('labels', 'featuredBadge'))}>{siteContent.labels?.featuredBadge ?? 'Most requested'}</span>}
      {photos.own
        ? <img src={photos.own} alt={product.public.name} />
        : <ProductShot imageStyle={product.public.imageStyle} slug={product.public.slug} />}
    </div>
    {photos.others.length > 0 && <p className="pdp-thumbs-label">{`More ${(category?.name ?? '').toLowerCase()}`.trim()}</p>}
    {photos.others.length > 0 && <div className={reach.prev || reach.next ? 'pdp-thumb-rail has-more' : 'pdp-thumb-rail'}>
      <ul className="pdp-thumbs" ref={railRef} onScroll={measure}>
        {photos.others.map((other) => <li key={other.slug}>
          <a href={`/mySOS/products/${other.slug}/`} aria-label={other.name}><img src={other.src} alt="" loading="lazy" /></a>
        </li>)}
      </ul>
      {(reach.prev || reach.next) && <>
        <button type="button" className="pdp-thumb-arrow is-prev" aria-label="Previous products" disabled={!reach.prev} onClick={() => nudge(-1)}>
          <Icon name="chevronLeft" size={20} />
        </button>
        <button type="button" className="pdp-thumb-arrow is-next" aria-label="More products" disabled={!reach.next} onClick={() => nudge(1)}>
          <Icon name="chevronRight" size={20} />
        </button>
      </>}
    </div>}
    <span className="sr-only">{`${category?.name ?? product.public.category} product`}</span>
  </div>;
}

/*
 * The request builder for one product. Every answer is carried to the request
 * page in the address, so the customer never retypes what they chose here.
 */
/*
 * The standard sizes a kind is offered in, read from its own size chart so
 * the guide and the form can never disagree about what "Large" means. A kind
 * whose step does not ask for them keeps the one standard size it had.
 */
function sizeOptionsFor(step, product) {
  if (!step?.sizesFromChart) return [];
  const chart = chartFor(product);
  if (!chart) return [];
  return chart.rows.map((row) => ({
    name: row[0],
    values: Object.fromEntries(step.fields.map((field) => {
      const at = chart.columns.indexOf(field.column);
      return [field.id, (at > 0 ? row[at] : null) ?? field.standard ?? ''];
    })),
  }));
}

/*
 * How this thing should be printed, from whichever step asks. A card can
 * travel under a different name than the one written on it: "Help me decide"
 * reaches the quote as "Let MySOS recommend", which is what the builder's own
 * list calls it.
 */
function printingAnswer(drawn, answers) {
  const step = drawn?.find((item) => item.type === 'methods' || item.asPrinting);
  if (!step) return '';
  const said = answers[step.id] ?? '';
  return step.options?.find((item) => item.name === said)?.value ?? said;
}

/** Which size is being asked for, and what it measures. */
function sizePick(step, product, answers) {
  const sizes = sizeOptionsFor(step, product);
  const asked = answers[step.id] ?? '';
  const fallback = sizes.find((size) => size.name === (step.defaultSize ?? 'Standard'))?.name ?? sizes[0]?.name ?? 'standard';
  const picked = asked || fallback;
  const custom = picked === 'custom';
  const size = sizes.find((item) => item.name === picked) ?? null;
  const valueOf = (field) => (custom ? (answers[field.id] ?? '') : (size?.values[field.id] ?? field.standard ?? ''));
  return { sizes, picked, custom, size, valueOf };
}

/* The steps a kind is asked, where the client drew its own set. */
const stepsFor = (product) => siteContent.productSteps?.[product.public.subcategory] ?? null;
const unitFor = (product) => siteContent.productUnit?.[product.public.subcategory] ?? '';
const assuranceFor = (product) => siteContent.productAssurance?.[product.public.subcategory] ?? null;

/*
 * One colour to choose. A colour with ink of its own is drawn as itself;
 * "Other" is drawn as a swatch too, in every colour at once, because it is
 * still a colour answer and a word in a pill beside a row of circles reads
 * as something else entirely.
 */
const OTHER_COLOUR = /^other\b/i;

function ColourChoice({ name, chosen, onPick }) {
  const ink = swatchFor(name);
  const other = !ink && OTHER_COLOUR.test(name);
  return <button
    type="button"
    role="radio"
    title={name}
    aria-label={name}
    aria-checked={chosen}
    className={[ink || other ? 'is-swatch' : 'is-word', other ? 'is-other' : '', chosen ? 'is-chosen' : ''].filter(Boolean).join(' ')}
    style={ink ? { '--ink': ink } : undefined}
    onClick={onPick}
  >
    {ink || other ? <em aria-hidden="true" /> : name}
    {/* "Other (tell us in the notes)" says where to say it; beside a swatch
        the first word is enough, and the whole name is still on the button. */}
    {other && <span>{name.replace(/\s*\(.*\)\s*$/, '')}</span>}
  </button>;
}

/*
 * One step of a drawn set. Every type here appears in the drawings: a size
 * either standard or typed in, a row of cards to pick one from, the colours,
 * add-ons that can open a panel of their own, somewhere to put a logo and
 * somewhere to say the rest.
 */
function DrawnStep({ step, number, product, answers, onAnswer, colours, methods, printing, href, onChart }) {
  // Added to whatever has been answered so far rather than to a copy taken
  // when this step was drawn: two answers in quick succession both stick.
  const set = (key, value) => onAnswer((said) => ({ ...said, [key]: value }));
  const mine = answers[step.id] ?? '';
  const head = <p className="pdp-step-head">
    <span className="pdp-step-number" aria-hidden="true">{number}</span>
    <span>{step.question}{step.optional && <em className="pdp-step-optional"> (optional)</em>}</span>
    {step.hint && <small>{step.hint}</small>}
  </p>;

  if (step.type === 'dimensions') {
    const { sizes, picked, custom, valueOf } = sizePick(step, product, answers);
    return <section className="pdp-step">
      {head}
      {/* The sizes this kind is made in, then the way to ask for one it is
          not. A kind with no chart behind it keeps the single standard it
          always had. */}
      <div className={`pdp-sizing${sizes.length ? ' is-sizes' : ''}`} role="radiogroup" aria-label={step.question}>
        {sizes.length
          ? sizes.map((size) => <button
            key={size.name}
            type="button"
            role="radio"
            aria-checked={picked === size.name}
            className={picked === size.name ? 'is-chosen' : ''}
            onClick={() => set(step.id, size.name)}
          >{size.name}</button>)
          : <button type="button" role="radio" aria-checked={!custom} className={custom ? '' : 'is-chosen'} onClick={() => set(step.id, 'standard')}>{step.standardLabel ?? word('standardLabel', 'Standard size')}</button>}
        <button type="button" role="radio" aria-checked={custom} className={custom ? 'is-chosen' : ''} onClick={() => set(step.id, 'custom')}>{step.customLabel ?? word('customLabel', 'Enter my own')}</button>
      </div>
      <ul className="pdp-dimensions">
        {step.fields.map((field) => <li key={field.id}>
          <label htmlFor={`pdp-${field.id}`}>{field.label}</label>
          <input
            id={`pdp-${field.id}`}
            type="text"
            inputMode="decimal"
            placeholder={field.standard ?? ''}
            readOnly={!custom}
            value={valueOf(field)}
            onChange={(event) => set(field.id, event.target.value)}
          />
        </li>)}
      </ul>
      {onChart && <button type="button" className="pdp-chart-link" onClick={onChart}>
        <Icon name="design" size={19} />
        <span data-cms-path={wordPath('sizeChartLabel')}>{word('sizeChartLabel', 'View size chart')}</span>
      </button>}
    </section>;
  }

  if (step.type === 'cards') {
    return <section className="pdp-step">
      {head}
      {/* All of them in one row where they fit: a material is chosen by
          comparing, which is harder two at a time. */}
      <div className="pdp-methods is-row" role="radiogroup" aria-label={step.question}>
        {step.options.map((option) => <button
          key={option.name}
          type="button"
          role="radio"
          aria-checked={mine === option.name}
          className={mine === option.name ? 'is-chosen' : ''}
          onClick={() => set(step.id, option.name)}
        >
          {/* An option that comes in a colour shows the colour. The rest keep
              the mark, until MySOS uploads a photograph of it. */}
          <span className={`pdp-method-shot${option.swatch ? ' is-swatch' : ''}`} style={option.swatch ? { '--ink': option.swatch } : undefined}>
            {option.swatch ? null : <Icon name={option.icon ?? 'spark'} size={30} />}
          </span>
          {/* The one most people take, said once rather than left to be
              guessed from the order. */}
          {option.tag && <em className="pdp-method-tag">{option.tag}</em>}
          <strong>{option.name}</strong>
          {option.note && <small>{option.note}</small>}
        </button>)}
      </div>
    </section>;
  }

  if (step.type === 'colour') {
    if (colours.length === 0) return null;
    return <section className="pdp-step">
      {head}
      <div className="pdp-colours" role="radiogroup" aria-label={step.question}>
        {colours.map((option) => <ColourChoice
          key={option}
          name={option}
          chosen={mine === option}
          onPick={() => set(step.id, mine === option ? '' : option)}
        />)}
      </div>
    </section>;
  }

  if (step.type === 'methods') {
    if (methods.length === 0) return null;
    return <section className="pdp-step">
      {head}
      <div className="pdp-methods" role="radiogroup" aria-label={step.question}>
        {methods.map((item) => <button
          key={item.id}
          type="button"
          role="radio"
          aria-checked={mine === item.name}
          className={mine === item.name ? 'is-chosen' : ''}
          onClick={() => set(step.id, item.name)}
        >
          <span className="pdp-method-shot"><Icon name={methodIcon(item.id)} size={30} /></span>
          <strong>{item.name}</strong>
          {item.note && <small>{item.note}</small>}
        </button>)}
        {printing && <button
          type="button"
          role="radio"
          aria-checked={mine === LET_MYSOS_CHOOSE}
          className={mine === LET_MYSOS_CHOOSE ? 'is-chosen' : ''}
          onClick={() => set(step.id, LET_MYSOS_CHOOSE)}
        >
          <span className="pdp-method-shot"><Icon name="spark" size={30} /></span>
          <strong data-cms-path={wordPath('methodHelpTitle')}>{word('methodHelpTitle', 'Help me decide')}</strong>
          <small data-cms-path={wordPath('methodHelpNote')}>{word('methodHelpNote')}</small>
        </button>}
      </div>
    </section>;
  }

  if (step.type === 'addons') {
    const chosen = Array.isArray(answers[step.id]) ? answers[step.id] : [];
    const toggle = (name) => set(step.id, chosen.includes(name) ? chosen.filter((item) => item !== name) : [...chosen, name]);
    const opened = step.options.filter((option) => option.fields && chosen.includes(option.name));
    return <section className="pdp-step">
      {head}
      <div className="pdp-addons">
        {step.options.map((option) => <label key={option.name} className={chosen.includes(option.name) ? 'is-chosen' : ''}>
          <input type="checkbox" checked={chosen.includes(option.name)} onChange={() => toggle(option.name)} />
          <span className="pdp-method-shot"><Icon name={option.icon ?? 'spark'} size={26} /></span>
          <strong>{option.name}</strong>
          {option.note && <small>{option.note}</small>}
        </label>)}
      </div>
      {/* An add-on can ask for more: the panel belongs to it and only opens
          once it has been picked. */}
      {opened.map((option) => <div className="pdp-addon-panel" key={`${option.name}-panel`}>
        <ul>
          {option.fields.map((field) => <li key={field.id}>
            <label htmlFor={`pdp-${field.id}`}>{field.label}</label>
            {field.type === 'select'
              ? <select id={`pdp-${field.id}`} value={answers[field.id] ?? field.options[0]} onChange={(event) => set(field.id, event.target.value)}>
                {field.options.map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
              : field.type === 'choice'
                ? <span className="pdp-addon-choice">
                  {field.options.map((value) => <button
                    key={value}
                    type="button"
                    className={(answers[field.id] ?? field.options[0]) === value ? 'is-chosen' : ''}
                    onClick={() => set(field.id, value)}
                  >{value}</button>)}
                </span>
                : <input id={`pdp-${field.id}`} type="text" inputMode="decimal" placeholder={field.placeholder ?? ''} value={answers[field.id] ?? ''} onChange={(event) => set(field.id, event.target.value)} />}
            {field.note && <small>{field.note}</small>}
          </li>)}
        </ul>
        {option.fieldsNote && <p className="pdp-addon-note">{option.fieldsNote}</p>}
      </div>)}
    </section>;
  }

  if (step.type === 'select') {
    const custom = Boolean(step.allowCustom) && answers[`${step.id}Mode`] === 'custom';
    return <section className="pdp-step">
      {head}
      {/* What is stocked, and the way to ask for something that is not. The
          two are the same answer, so they share one line on the request. */}
      {step.allowCustom && <div className="pdp-sizing" role="radiogroup" aria-label={step.question}>
        <button type="button" role="radio" aria-checked={!custom} className={custom ? '' : 'is-chosen'} onClick={() => set(`${step.id}Mode`, 'standard')}>{step.standardLabel ?? word('standardLabel', 'Standard')}</button>
        <button type="button" role="radio" aria-checked={custom} className={custom ? 'is-chosen' : ''} onClick={() => set(`${step.id}Mode`, 'custom')}>{step.customLabel ?? word('customLabel', 'Enter my own')}</button>
      </div>}
      {custom
        ? <input
          className="pdp-field"
          type="text"
          aria-label={step.question}
          placeholder={step.customPlaceholder ?? ''}
          value={mine}
          onChange={(event) => set(step.id, event.target.value)}
        />
        : <select className="pdp-field" aria-label={step.question} value={mine} onChange={(event) => set(step.id, event.target.value)}>
          <option value="">{step.placeholder ?? ''}</option>
          {step.options.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>}
      {step.note && <p className="pdp-step-note">{step.note}</p>}
    </section>;
  }

  if (step.type === 'upload') {
    return <section className="pdp-step">
      {head}
      {/* The file itself is attached on the request page, where the message
          that carries it is put together. */}
      <a className="pdp-dropzone" href={href}>
        <Icon name="upload" size={30} />
        <strong data-cms-path={wordPath('uploadCta')}>{word('uploadCta', 'Upload your logo or drop it here')}</strong>
        {step.hint && <small>{step.hint}</small>}
      </a>
      {step.note && <p className="pdp-step-note">{step.note}</p>}
    </section>;
  }

  if (step.type === 'notes') {
    return <section className="pdp-step">
      {head}
      <textarea
        className="pdp-notes"
        rows="3"
        placeholder={step.placeholder ?? ''}
        value={answers[step.id] ?? ''}
        onChange={(event) => set(step.id, event.target.value)}
      />
    </section>;
  }

  return null;
}

function BuildPanel({ product, onChart }) {
  const minimum = Number(siteContent.productMinimum ?? 1) || 1;
  const presets = siteContent.quantityPresets ?? [];
  const colours = coloursFor(product);
  const printing = printingFieldFor(product.id);
  const methods = (product.printingMethods ?? []).map((id) => ({ id, name: methodName(id), note: methodNote(id) }));
  // A product asked for by size gets the size step; a bottle does not.
  const sizeField = detailFieldsFor(product.id).find((item) => /size/i.test(item.id));
  const sizeRun = sizeField ? (siteContent.sizeRun ?? []) : [];

  const [quantity, setQuantity] = useState(presets[1] ?? minimum);
  const [colour, setColour] = useState('');
  const [method, setMethod] = useState('');
  // "later" until the customer says otherwise: most people asking for a quote
  // do not have the breakdown yet, and being told that is a relief.
  const [sizing, setSizing] = useState('later');
  const [breakdown, setBreakdown] = useState({});
  // The kinds the client drew their own steps for keep their answers together.
  const drawn = stepsFor(product);
  const unit = unitFor(product);
  const assurance = assuranceFor(product);
  const [answers, setAnswers] = useState({});
  const sizesLine = useMemo(() => sizeRun
    .map((size) => [size, Number(breakdown[size]) || 0])
    .filter(([, count]) => count > 0)
    .map(([size, count]) => `${count} ${size}`)
    .join(', '), [breakdown, sizeRun]);
  const sizesTotal = useMemo(() => sizeRun.reduce((sum, size) => sum + (Number(breakdown[size]) || 0), 0), [breakdown, sizeRun]);
  const price = getDisplayPrice(product);
  const amount = product.public.displayPricing?.show ? Number(product.public.displayPricing.amount) : null;

  /*
   * Everything answered on a drawn set, as one readable line on the request:
   * "Material: Nylon - Branding: Sublimation - Add ons: Badge holder". The
   * quote builder has a field for the colour and the printing and nothing for
   * the rest, so the rest travels as the row's note.
   */
  const drawnNote = useMemo(() => {
    if (!drawn) return '';
    const said = [];
    for (const step of drawn) {
      // The colour and the printing have fields of their own on the request.
      if (step.type === 'colour' || step.type === 'methods' || step.type === 'upload' || step.asPrinting) continue;
      const value = answers[step.id];
      if (step.type === 'addons') {
        const chosen = Array.isArray(value) ? value : [];
        if (chosen.length) said.push(`${step.question}: ${chosen.join(', ')}`);
        for (const option of step.options.filter((item) => item.fields && chosen.includes(item.name))) {
          const parts = option.fields
            .map((field) => [field.label, answers[field.id] ?? (field.options ? field.options[0] : '')])
            .filter(([, answer]) => String(answer).trim())
            .map(([label, answer]) => `${label} ${answer}`);
          if (parts.length) said.push(`${option.name}: ${parts.join(', ')}`);
        }
        continue;
      }
      if (step.type === 'dimensions') {
        const { sizes, picked, custom, valueOf } = sizePick(step, product, answers);
        if (!custom && !sizes.length) continue;
        const parts = step.fields
          .map((field) => [field.label, valueOf(field)])
          .filter(([, answer]) => String(answer ?? '').trim())
          .map(([label, answer]) => `${label} ${answer}`);
        // A named size still carries its numbers: the name is what MySOS
        // reads, the numbers are what gets made.
        const head = custom ? '' : `${picked} - `;
        if (parts.length) said.push(`${step.question}: ${head}${parts.join(', ')}`);
        else if (!custom) said.push(`${step.question}: ${picked}`);
        continue;
      }
      if (String(value ?? '').trim()) said.push(step.type === 'notes' ? String(value).trim() : `${step.question}: ${value}`);
    }
    return said.join(' - ');
  }, [answers, drawn]);

  const href = useMemo(() => {
    const params = new URLSearchParams({ product: product.id, qty: String(clampQuantity(quantity)) });
    const saidColour = drawn ? answers[drawn.find((step) => step.type === 'colour')?.id] : colour;
    const saidMethod = drawn ? printingAnswer(drawn, answers) : method;
    if (saidColour) params.set('colour', saidColour);
    if (saidMethod) params.set('printing', saidMethod);
    if (sizing === 'enter' && sizesLine) params.set('sizes', sizesLine);
    if (drawnNote) params.set('note', drawnNote.slice(0, 400));
    return `${REQUEST_PATH}?${params}`;
  }, [product.id, quantity, colour, method, sizing, sizesLine, drawn, answers, drawnNote]);

  const step = (by) => setQuantity((current) => clampQuantity(Math.max(minimum, Number(current) + by)));

  return <div className="pdp-build">
    <div className="pdp-build-head">
      <h2 data-cms-path={wordPath('buildTitle')}>{word('buildTitle', 'Build your request')}</h2>
    </div>

    <section className="pdp-step">
      <p className="pdp-step-head">
        <span className="pdp-step-number" aria-hidden="true">1</span>
        <label htmlFor="pdp-quantity">
          <span data-cms-path={wordPath('quantityQuestion')}>{word('quantityQuestion', 'How many pieces?')}</span>
          {unit && <em className="pdp-step-optional">{` (${unit})`}</em>}
        </label>
        <small data-cms-path={wordPath('quantityHint')}>{fill(word('quantityHint', 'Minimum {min}'), { min: minimum })}</small>
      </p>
      <div className="pdp-quantity">
        <button type="button" aria-label="Fewer pieces" onClick={() => step(-10)}><Icon name="minus" size={22} /></button>
        <input id="pdp-quantity" type="number" inputMode="numeric" min={minimum} value={quantity} onChange={(event) => setQuantity(event.target.value)} onBlur={() => setQuantity((current) => Math.max(minimum, clampQuantity(current)))} />
        <button type="button" aria-label="More pieces" onClick={() => step(10)}><Icon name="plus" size={22} /></button>
      </div>
      {presets.length > 0 && <ul className="pdp-presets">
        {presets.map((preset, index) => <li key={preset}>
          <button type="button" className={Number(quantity) === Number(preset) ? 'is-chosen' : ''} onClick={() => setQuantity(preset)} data-cms-path={cms(contentPath('quantityPresets', index))}>{preset}</button>
        </li>)}
      </ul>}
    </section>

    {/* A kind the client drew their own steps for is asked those, in that
        order; everything else keeps the general ones. */}
    {drawn
      ? drawn.map((step, index) => <DrawnStep
        key={step.id}
        step={step}
        number={index + 2}
        product={product}
        answers={answers}
        onAnswer={setAnswers}
        colours={colours}
        methods={methods}
        printing={printing}
        href={href}
        onChart={chartFor(product) ? onChart : null}
      />)
      : <>
    {sizeRun.length > 0 && <section className="pdp-step">
      <p className="pdp-step-head">
        <span className="pdp-step-number" aria-hidden="true">2</span>
        <span id="pdp-sizes" data-cms-path={wordPath('sizesQuestion')}>{word('sizesQuestion', 'Choose sizes')}</span>
      </p>
      {/* "Not confirmed yet" is the honest default: most people asking for a
          quote do not have the breakdown, and being told that is fine is worth
          more than an empty grid of boxes. */}
      <div className="pdp-sizing" role="radiogroup" aria-labelledby="pdp-sizes">
        <button type="button" role="radio" aria-checked={sizing === 'enter'} className={sizing === 'enter' ? 'is-chosen' : ''} onClick={() => setSizing('enter')}>
          <span data-cms-path={wordPath('sizesEnterLabel')}>{word('sizesEnterLabel', 'Enter size breakdown')}</span>
        </button>
        <button type="button" role="radio" aria-checked={sizing === 'later'} className={sizing === 'later' ? 'is-chosen' : ''} onClick={() => setSizing('later')}>
          {sizing === 'later' && <Icon name="check" size={18} />}
          <span data-cms-path={wordPath('sizesLaterLabel')}>{word('sizesLaterLabel', 'Sizes not confirmed yet')}</span>
        </button>
      </div>
      {sizing === 'later'
        ? <p className="pdp-sizes-later">
          <Icon name="checkCircle" size={22} />
          <span>
            <strong data-cms-path={wordPath('sizesLaterTitle')}>{word('sizesLaterTitle')}</strong>
            <small data-cms-path={wordPath('sizesLaterNote')}>{word('sizesLaterNote')}</small>
          </span>
        </p>
        : <>
          <ul className="pdp-size-run">
            {sizeRun.map((size, index) => <li key={size}>
              <label htmlFor={'pdp-size-' + size} data-cms-path={cms(contentPath('sizeRun', index))}>{size}</label>
              <input
                id={'pdp-size-' + size}
                type="number"
                inputMode="numeric"
                min="0"
                placeholder="0"
                value={breakdown[size] ?? ''}
                onChange={(event) => setBreakdown({ ...breakdown, [size]: event.target.value })}
              />
            </li>)}
          </ul>
          {sizesTotal > 0 && <p className="pdp-size-total">
            <strong>{sizesTotal}</strong>{' '}
            <span data-cms-path={wordPath('sizesTotalLabel')}>{word('sizesTotalLabel', 'pieces across the sizes')}</span>
          </p>}
        </>}
      {chartFor(product) && <button type="button" className="pdp-chart-link" onClick={onChart}>
        <Icon name="design" size={19} />
        <span data-cms-path={wordPath('sizeChartLabel')}>{word('sizeChartLabel', 'View size chart')}</span>
      </button>}
    </section>}

    {colours.length > 0 && <section className="pdp-step">
      <p className="pdp-step-head">
        <span className="pdp-step-number" aria-hidden="true">{sizeRun.length > 0 ? 3 : 2}</span>
        <span id="pdp-colour" data-cms-path={wordPath('colourQuestion')}>{word('colourQuestion', 'Choose a product colour')}</span>
        <small>{colour || word('colourHint', 'Optional')}</small>
      </p>
      {/* The colour itself rather than its name in a box. The name is still
          carried, for anyone who hovers and for a reader who cannot see it. */}
      <div className="pdp-colours" role="radiogroup" aria-labelledby="pdp-colour">
        {colours.map((option) => <ColourChoice
          key={option}
          name={option}
          chosen={colour === option}
          onPick={() => setColour(colour === option ? '' : option)}
        />)}
      </div>
    </section>}

    {methods.length > 0 && <section className="pdp-step">
      <p className="pdp-step-head">
        <span className="pdp-step-number" aria-hidden="true">{2 + (sizeRun.length > 0 ? 1 : 0) + (colours.length > 0 ? 1 : 0)}</span>
        <span id="pdp-method" data-cms-path={wordPath('methodQuestion')}>{word('methodQuestion', 'Choose a customisation option')}</span>
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
          {/* Room for a picture of the method; the mark stands in until MySOS
              uploads one. */}
          <span className="pdp-method-shot"><Icon name={methodIcon(item.id)} size={30} cmsPath={contentPath('printingMethods', item.id, 'icon')} /></span>
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
          <span className="pdp-method-shot"><Icon name="spark" size={30} /></span>
          <strong data-cms-path={wordPath('methodHelpTitle')}>{word('methodHelpTitle', 'Help me decide')}</strong>
          <small data-cms-path={wordPath('methodHelpNote')}>{word('methodHelpNote')}</small>
        </button>}
      </div>
    </section>}

    <div className="pdp-artwork">
      <span className="pdp-step-number" aria-hidden="true">{2 + (sizeRun.length > 0 ? 1 : 0) + (colours.length > 0 ? 1 : 0) + (methods.length > 0 ? 1 : 0)}</span>
      <span>
        <strong data-cms-path={wordPath('artworkTitle')}>{word('artworkTitle', 'Have artwork or a reference?')}</strong>
        <small data-cms-path={wordPath('artworkHint')}>{word('artworkHint', 'PNG, JPG or PDF')}</small>
      </span>
      {/* Files are attached on the request page, where the message that carries
          them is put together. */}
      <a className="btn btn-outline btn-sm" href={href}><Icon name="upload" size={19} /> <span data-cms-path={wordPath('artworkButton')}>{word('artworkButton', 'Add on the next step')}</span></a>
    </div>
      </>}

    {assurance && <p className="pdp-assurance">
      <Icon name="spark" size={24} />
      <span>
        <strong>{assurance.title}</strong>
        <small>{assurance.note}</small>
      </span>
    </p>}

    <div className="pdp-close">
      {price
        ? <p className="pdp-price">
          <small data-cms-path={wordPath('estimateLabel')}>{word('estimateLabel', 'Indicative price')}</small>
          <strong>{price}</strong>
          {/* A set is counted in sets, here as well as in the question above. */}
          {amount ? <span>{`about $${(amount * clampQuantity(quantity)).toFixed(0)} for ${clampQuantity(quantity)} ${unitFor(product) || 'pieces'}`}</span> : null}
        </p>
        : null}
      <p className="pdp-price-note" data-cms-path={price ? wordPath('estimateNote') : wordPath('noPriceNote')}>{price ? word('estimateNote') : word('noPriceNote')}</p>
      <a className="btn btn-primary pdp-add" href={href}>
        <Icon name="plus" size={19} />
        <span data-cms-path={wordPath('addButton')}>{word('addButton', 'Add to my request')}</span>
      </a>
      <p className="pdp-ask">
        <span data-cms-path={wordPath('askPrefix')}>{word('askPrefix', 'Need something different?')}</span>{' '}
        <a href={REQUEST_PATH}><span data-cms-path={wordPath('askLabel')}>{word('askLabel', 'Ask MySOS for help')}</span></a>
      </p>
    </div>
  </div>;
}

function InfoSection({ product }) {
  const facts = factsFor(product);
  const sections = siteContent.productInfoSections ?? [];
  const [open, setOpen] = useState(0);

  return <section className="section pdp-info" data-reveal>
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
      {sections.map((entry, index) => <div key={entry.title} className={open === index ? 'is-open' : ''}>
        <button type="button" aria-expanded={open === index} onClick={() => setOpen(open === index ? -1 : index)}>
          <span data-cms-path={cms(contentPath('productInfoSections', index, 'title'))}>{entry.title}</span>
          <Icon name={open === index ? 'minus' : 'plus'} size={19} />
        </button>
        {open === index && <p data-cms-path={cms(contentPath('productInfoSections', index, 'body'))}>{entry.body}</p>}
      </div>)}
    </div>
  </section>;
}

export default function ProductDetailPage({ slug }) {
  const product = getPublicProducts().find((item) => item.public.slug === slug);
  const [chart, setChart] = useState(false);
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
      <div className="pdp-left">
        <Gallery product={product} category={category} />
        <Includes product={product} />
        <ProductDetails product={product} onChart={chartFor(product) ? () => setChart(true) : null} />
        <p className="pdp-mockup">
          <Icon name="checkCircle" size={24} />
          <span>
            <strong data-cms-path={wordPath('mockupTitle')}>{word('mockupTitle', 'Free visual mockup before production')}</strong>
            <small data-cms-path={wordPath('mockupNote')}>{word('mockupNote')}</small>
          </span>
        </p>
        <p className="pdp-category-link">
          <a className="text-link" href={`/mySOS/products/?category=${product.public.category}`}>
            {fill(word('relatedTitle', 'More in this category'), {})} <Icon name="arrowRight" size={18} className="inline-arrow" />
          </a>
        </p>
      </div>
      <div className="pdp-copy" data-reveal style={{ '--reveal-delay': '90ms' }}>
        <span className="eyebrow">{category?.name ?? product.public.category}</span>
        <h1>{product.public.name}</h1>
        <p className="pdp-lead">{product.public.description}</p>
        <ul className="pdp-promises">
          {/* The client's own mark where there is one for this promise, and
              the tick for anything they add later. */}
          {(siteContent.pages?.product?.promises ?? []).map((promise, index) => <li key={promise}>
            {siteContent.pages?.product?.promiseMarks?.[promise]
              ? <BrandMark name={siteContent.pages.product.promiseMarks[promise]} size={30} />
              : <Icon name="check" size={18} />}
            <span data-cms-path={cms(pagePath('product', 'promises', index))}>{promise}</span>
          </li>)}
        </ul>
        <BuildPanel product={product} onChart={() => setChart(true)} />
      </div>
    </div>

    <InfoSection product={product} />
    <SizeChart product={product} open={chart} onClose={() => setChart(false)} />
  </main>;
}
