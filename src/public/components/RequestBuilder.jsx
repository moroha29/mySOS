import { useEffect, useMemo, useRef, useState } from 'react';
import siteContent from '../../data/siteContent.json';
import { enquiryLinkProps } from '../../utils/catalogue';
import {
  allFileNames, browseCategories, buildRequestMessage, clampQuantity, detailFieldsFor, makeLine, needsPrintingChoice, OTHER_PRINTING,
  packageLines, printingFieldFor, productFor, recommendedDetails, requestHref, searchProducts, suggestionsFor,
} from '../../utils/solutionRequest';
import { clearSavedRequest, mergeArrival, readSavedRequest, writeSavedRequest } from '../../utils/savedRequest';
import { cms, pagePath } from '../cms';
import Icon from './Icons';
import { ProductShot } from './Ui';

/*
 * The customer's own request: which products, how many, how they should be
 * printed, when they are needed. It is sent to MySOS as one message.
 *
 * Both the solution pages and the blank "Get a Quote" page use this. A solution
 * page starts from its use case's recommended package; the quote page starts
 * empty and the customer searches the catalogue for what they want.
 *
 * This is not a quotation: it shows no prices, and never links to the agents'
 * quotation engine.
 */

const words = siteContent.pages?.solutionPage ?? {};
export const word = (key, fallback = '') => words[key] ?? fallback;
export const wordPath = (key) => cms(pagePath('solutionPage', key));
const fill = (template, values) => String(template).replace(/\{(\w+)\}/g, (match, key) => (key in values ? values[key] : match));
const MAX_FILE_BYTES = 10 * 1024 * 1024;

// `onStep` adds to the latest quantity, so quick clicks each count.
function Stepper({ value, onSet, onStep, label }) {
  return <span className="qty-stepper">
    <button type="button" aria-label={`Fewer ${label}`} onClick={() => onStep(-1)} disabled={value <= 1}><Icon name="minus" size={16} /></button>
    <input type="number" inputMode="numeric" min="1" value={value} aria-label={`Quantity of ${label}`} onChange={(event) => onSet(event.target.value)} />
    <button type="button" aria-label={`More ${label}`} onClick={() => onStep(1)}><Icon name="plus" size={16} /></button>
  </span>;
}

export function FilePicker({ id, label, onFiles, children, className = '' }) {
  const [dragging, setDragging] = useState(false);
  const accept = (fileList) => {
    const files = [...(fileList ?? [])].filter((file) => file.size <= MAX_FILE_BYTES && /\.(png|jpe?g|pdf)$/i.test(file.name));
    if (files.length) onFiles(files);
  };
  return <label
    htmlFor={id}
    className={`${className} ${dragging ? 'is-dragging' : ''}`.trim()}
    onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
    onDragLeave={() => setDragging(false)}
    onDrop={(event) => { event.preventDefault(); setDragging(false); accept(event.dataTransfer?.files); }}
  >
    <input id={id} type="file" accept=".png,.jpg,.jpeg,.pdf" multiple className="sr-only" aria-label={label} onChange={(event) => { accept(event.target.files); event.target.value = ''; }} />
    {children}
  </label>;
}

function DetailsPanel({ line, index, onChange, onFiles }) {
  const fields = detailFieldsFor(line.productId);
  const printing = printingFieldFor(line.productId);
  const set = (id, value) => onChange({ details: { ...line.details, [id]: value } });
  return <div className="request-details" id={`request-details-${index}`}>
    <p className="request-details-title">Customise {line.name} <span>(Optional)</span></p>
    <div className="request-details-grid">
      {fields.map((field) => {
        const isPrinting = field.id === printing?.id;
        const asking = isPrinting && needsPrintingChoice(line);
        return <div className={asking ? 'request-field is-asking' : 'request-field'} key={field.id}>
          <span className="request-field-label" id={`field-${index}-${field.id}`}>{field.label}</span>
          {/* Printing is a list to pick from, however it is set up: there are
              more methods than fit a row of buttons. */}
          {isPrinting && <select
            className="request-printing-select"
            id={`printing-${index}`}
            aria-labelledby={`field-${index}-${field.id}`}
            value={line.details[field.id] ?? ''}
            onChange={(event) => set(field.id, event.target.value)}
          >
            <option value="">{word('printingPlaceholder', 'Choose a printing method…')}</option>
            {field.options.map((option) => <option key={option} value={option}>
              {field.recommended === option ? `${option} (recommended)` : option}
            </option>)}
          </select>}
          {/* Picking "Other" only makes sense with a word about what they want. */}
          {isPrinting && line.details[field.id] === OTHER_PRINTING && <small className="request-field-hint">
            <span data-cms-path={wordPath('printingOtherHint')}>{word('printingOtherHint', 'Describe the printing you have in mind in the notes below.')}</span>
          </small>}
          {!isPrinting && field.type === 'choice' && <div className="request-choices" role="radiogroup" aria-labelledby={`field-${index}-${field.id}`}>
            {field.options.map((option) => <button
              key={option}
              type="button"
              role="radio"
              aria-checked={line.details[field.id] === option}
              className={line.details[field.id] === option ? 'is-chosen' : ''}
              onClick={() => set(field.id, option)}
            >
              {option}
              {field.recommended === option && <small>Recommended</small>}
            </button>)}
          </div>}
          {!isPrinting && field.type === 'select' && <select aria-labelledby={`field-${index}-${field.id}`} value={line.details[field.id] ?? ''} onChange={(event) => set(field.id, event.target.value)}>
            <option value="">Choose…</option>
            {field.options.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>}
          {!isPrinting && field.type === 'text' && <input type="text" aria-labelledby={`field-${index}-${field.id}`} placeholder={field.placeholder ?? ''} value={line.details[field.id] ?? ''} onChange={(event) => set(field.id, event.target.value)} />}
        </div>;
      })}
      <div className="request-field">
        <span className="request-field-label" data-cms-path={wordPath('uploadReferenceLabel')}>{word('uploadReferenceLabel', 'Upload Reference')}</span>
        <FilePicker id={`reference-${index}`} label={`Upload a reference for ${line.name}`} className="request-upload" onFiles={onFiles}>
          <Icon name="upload" size={20} /> {line.files.length ? line.files.join(', ') : `Upload ${line.name.toLowerCase()} artwork`}
        </FilePicker>
      </div>
      <div className="request-field">
        <label className="request-field-label" htmlFor={`notes-${index}`} data-cms-path={wordPath('notesLabel')}>{word('notesLabel', 'Notes (Optional)')}</label>
        <input id={`notes-${index}`} type="text" placeholder={word('notesPlaceholder', 'Any other requirements?')} value={line.detailNotes} onChange={(event) => onChange({ detailNotes: event.target.value })} />
      </div>
    </div>
    <p className="request-skip"><Icon name="info" size={16} /> <span data-cms-path={wordPath('skipDetailsHint')}>{word('skipDetailsHint')}</span></p>
  </div>;
}

function RequestRow({ line, index, open, onToggle, onChange, onRemove, onFiles }) {
  const product = productFor(line.productId);
  const asking = needsPrintingChoice(line);
  return <li className={open ? 'request-row is-open' : 'request-row'}>
    <div className="request-row-main">
      <span className="request-thumb">
        {product ? <ProductShot imageStyle={product.public.imageStyle} slug={product.public.slug} /> : <Icon name="sample" size={30} />}
      </span>
      <span className="request-name">
        <strong>{line.name}</strong>
        {line.note && <small className={/^Printing:/i.test(line.note) ? 'request-note is-highlight' : 'request-note'}>{line.note}</small>}
        {line.files.length > 0 && <small className="request-files">{line.files.join(', ')}</small>}
        {/* Asked here rather than buried in the details, because how a thing is
            printed is the one choice MySOS cannot guess from the product. */}
        {asking && <button type="button" className="request-printing-ask" onClick={() => onToggle({ focusPrinting: true })}>
          <Icon name="info" size={15} />
          <span data-cms-path={wordPath('printingPrompt')}>{word('printingPrompt', 'Choose a printing method')}</span>
        </button>}
      </span>
      <Stepper
        value={line.quantity}
        label={line.name}
        onSet={(value) => onChange({ quantity: clampQuantity(value) })}
        onStep={(by) => onChange((current) => ({ quantity: clampQuantity(current.quantity + by) }))}
      />
      <span className="request-row-actions">
        <button type="button" className="request-details-toggle" aria-expanded={open} aria-controls={`request-details-${index}`} onClick={() => onToggle()}>
          <span data-cms-path={wordPath(open ? 'hideDetailsButton' : 'addDetailsButton')}>{open ? word('hideDetailsButton', 'Hide Details') : word('addDetailsButton', 'Add Details')}</span>
          <Icon name={open ? 'minus' : 'plus'} size={16} />
        </button>
        <button type="button" className="request-remove" aria-label={`Remove ${line.name}`} onClick={onRemove}><Icon name="trash" size={18} /></button>
      </span>
    </div>
    {open && <DetailsPanel line={line} index={index} onChange={onChange} onFiles={onFiles} />}
  </li>;
}

/* A product the customer can add with one tap. */
function ProductCard({ product, onAdd }) {
  return <li>
    <button type="button" onClick={() => onAdd(product)}>
      <span className="request-thumb"><ProductShot imageStyle={product.public.imageStyle} slug={product.public.slug} /></span>
      <span>{product.public.name}</span>
      <Icon name="plus" size={16} />
    </button>
  </li>;
}

/* Anything in the catalogue, not only what MySOS suggested for this use case. */
function ProductSearch({ chosen, onAdd, onBrowse }) {
  const [query, setQuery] = useState('');
  const results = useMemo(() => searchProducts(query, { exclude: chosen }), [query, chosen]);
  const asked = query.trim().length > 0;

  return <div className="request-search">
    <label className="request-search-label" htmlFor="request-search" data-cms-path={wordPath('searchTitle')}>{word('searchTitle', 'Search all products')}</label>
    <div className="request-search-box">
      <Icon name="search" size={18} />
      <input
        id="request-search"
        type="search"
        autoComplete="off"
        placeholder={word('searchPlaceholder', 'Search for a product, e.g. tote bag')}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      {asked && <button type="button" aria-label="Clear search" onClick={() => setQuery('')}><Icon name="close" size={16} /></button>}
    </div>
    {asked && (results.length > 0
      ? <ul className="request-search-results">
        {results.map((product) => <li key={product.id}>
          <button type="button" onClick={() => { onAdd(product); setQuery(''); }}>
            <span className="request-thumb"><ProductShot imageStyle={product.public.imageStyle} slug={product.public.slug} /></span>
            <span className="request-search-name">
              <strong>{product.public.name}</strong>
              <small>{product.public.category.replace('-', ' ')}</small>
            </span>
            <Icon name="plus" size={16} />
          </button>
        </li>)}
      </ul>
      : <p className="request-search-empty">
        <span data-cms-path={wordPath('searchEmpty')}>{word('searchEmpty', 'Nothing matched. Add it as a custom product below and we will source it.')}</span>
        {/* The word they tried may not be ours: "flask" for a bottle, "hat" for a cap. */}
        {onBrowse && <button type="button" className="request-inline" onClick={() => { setQuery(''); onBrowse(); }}>
          <span data-cms-path={wordPath('searchBrowseButton')}>{word('searchBrowseButton', 'Browse all products')}</span>
        </button>}
      </p>)}
  </div>;
}

export default function RequestBuilder({
  topic = '',
  useCase = null,
  startWith = [],
  startNotes = '',
  // The quote page keeps what is in it between visits; a solution page is a
  // recommendation to start from, so it does not.
  remember = false,
  title = word('packageTitle', 'Your Recommended Team Package'),
  titlePath = wordPath('packageTitle'),
  lead = word('packageLead'),
  leadPath = wordPath('packageLead'),
  includedTitle = word('includedTitle', 'Included Products'),
}) {
  // A solution page starts from its use case's package; the quote page starts
  // with whatever product the visitor arrived from, or nothing at all.
  const [lines, setLines] = useState(() => (useCase ? packageLines(useCase) : startWith.filter((item) => productFor(item.productId)).map((item) => makeLine(item, 'start'))));
  const [openKey, setOpenKey] = useState(null);
  const [focusPrinting, setFocusPrinting] = useState(false);
  const [sameQuantity, setSameQuantity] = useState(50);
  const [custom, setCustom] = useState('');
  const [neededBy, setNeededBy] = useState('');
  const [notes, setNotes] = useState(startNotes);
  // Nothing is read from storage while rendering: these pages are drawn ahead
  // of time, and a first render that disagreed with the drawn page would flash.
  const [restored, setRestored] = useState(false);
  const [files, setFiles] = useState([]);
  const [showMore, setShowMore] = useState(true);
  const [sent, setSent] = useState(null);
  const [browseAsked, setBrowseAsked] = useState(0);
  const browseRef = useRef(null);
  const openBrowse = () => { setShowMore(true); setBrowseAsked((count) => count + 1); };

  // "Browse all products" from a search that found nothing: go to the list once it shows.
  useEffect(() => {
    if (!browseAsked) return;
    browseRef.current?.scrollIntoView?.({ block: 'start', behavior: 'smooth' });
    browseRef.current?.focus?.({ preventScroll: true });
  }, [browseAsked]);

  /*
   * What this browser already had, plus whatever product they arrived on. The
   * arrival is merged in rather than replacing the list, so "add to my request"
   * from a product page adds to the request instead of starting a new one.
   */
  useEffect(() => {
    if (!remember || restored) return;
    const saved = readSavedRequest();
    const arrivals = startWith.filter((item) => productFor(item.productId));
    if (saved?.lines?.length) {
      const kept = arrivals.reduce((lines, arrival) => mergeArrival(lines, arrival), saved.lines);
      setLines(kept.map((line) => makeLine(line, 'saved')));
      if (saved.neededBy) setNeededBy(saved.neededBy);
      if (saved.notes && !startNotes) setNotes(saved.notes);
    }
    setRestored(true);
  }, [remember, restored, startWith, startNotes]);

  // Every change is kept, so leaving the page does not lose the request.
  useEffect(() => {
    if (!remember || !restored) return;
    writeSavedRequest({ lines, neededBy, notes });
  }, [remember, restored, lines, neededBy, notes]);

  // A different use case starts again from its own recommendation.
  useEffect(() => {
    if (!useCase) return;
    setLines(packageLines(useCase));
    setOpenKey(null);
    setSent(null);
  }, [useCase]);

  // Opening a row from its printing prompt puts the cursor on that question.
  useEffect(() => {
    if (!focusPrinting || openKey === null) return;
    const index = lines.findIndex((line) => line.key === openKey);
    document.getElementById(`printing-${index}`)?.focus();
    setFocusPrinting(false);
  }, [focusPrinting, openKey, lines]);

  // `change` is the fields to set, or a function of the row as it is now.
  const update = (key, change) => setLines((current) => current.map((line) => (
    line.key === key ? { ...line, ...(typeof change === 'function' ? change(line) : change) } : line
  )));
  const toggle = (line, { focusPrinting: wantPrinting = false } = {}) => {
    if (openKey === line.key && !wantPrinting) { setOpenKey(null); return; }
    // Opening a product's details selects its recommended choices, as the design
    // shows — except the printing question when that is what was asked, which
    // stays open for the customer to answer.
    if (!Object.keys(line.details).length) {
      const details = recommendedDetails(detailFieldsFor(line.productId));
      if (wantPrinting) delete details[printingFieldFor(line.productId)?.id];
      update(line.key, { details });
    }
    setOpenKey(line.key);
    if (wantPrinting) setFocusPrinting(true);
  };
  const addLine = (fields, prefix) => setLines((current) => [...current, makeLine({ ...fields, quantity: fields.quantity ?? current[0]?.quantity ?? 50 }, prefix)]);
  const lineFiles = (key) => (picked) => {
    setFiles((current) => [...current, ...picked.map((file) => ({ file, owner: key }))]);
    setLines((current) => current.map((line) => (line.key === key ? { ...line, files: [...new Set([...line.files, ...picked.map((file) => file.name)])] } : line)));
  };
  const generalFiles = files.filter((entry) => !entry.owner);
  const suggestions = suggestionsFor(useCase, lines);
  const browse = browseCategories(lines);
  const chosenIds = lines.map((line) => line.productId).filter(Boolean);
  const awaitingPrinting = lines.filter(needsPrintingChoice);
  const fileNames = allFileNames(lines, generalFiles.map((entry) => entry.file.name));
  const message = buildRequestMessage({ solutionName: topic, useCaseName: useCase?.name ?? '', lines, neededBy, notes, fileNames });
  const href = requestHref(message, topic);
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  /*
   * A chat link cannot carry files. Where the device can share files (most
   * phones), the files go to WhatsApp with the message through the share
   * sheet. Everywhere else the chat opens with the message, which names the
   * files, and the page says to attach them there.
   */
  const send = async (event) => {
    const attached = files.map((entry) => entry.file);
    if (attached.length && navigator.canShare?.({ files: attached, text: message })) {
      event.preventDefault();
      try {
        await navigator.share({ files: attached, text: message });
        setSent('shared');
        if (remember) clearSavedRequest();
      } catch {
        // Cancelled, or sharing failed: fall back to the chat link.
        if (href) window.open(href, '_blank', 'noreferrer');
        setSent('linked');
      }
      return;
    }
    setSent('linked');
  };

  return <section className="request-builder" aria-labelledby="request-title">
    <div className="section-heading align-center">
      <div>
        <h2 id="request-title" data-cms-path={titlePath}>{title}</h2>
        <p data-cms-path={leadPath}>{lead}</p>
      </div>
    </div>

    <div className="request-layout">
      <div className="request-main">
        <h3 data-cms-path={wordPath('includedTitle')}>{includedTitle}</h3>

        <div className="request-same">
          <label htmlFor="same-quantity" data-cms-path={wordPath('sameQuantityLabel')}>{word('sameQuantityLabel', 'Same quantity for every item?')}</label>
          <input id="same-quantity" type="number" min="1" inputMode="numeric" value={sameQuantity} onChange={(event) => setSameQuantity(event.target.value)} />
          <button type="button" className="btn btn-primary btn-sm" onClick={() => setLines((current) => current.map((line) => ({ ...line, quantity: clampQuantity(sameQuantity) })))}>
            <span data-cms-path={wordPath('applyAllButton')}>{word('applyAllButton', 'Apply to All')}</span>
          </button>
          <small data-cms-path={wordPath('applyAllHint')}>{word('applyAllHint')}</small>
        </div>

        {remember && lines.length > 0 && <p className="request-kept">
          <Icon name="checkCircle" size={16} />
          <span data-cms-path={wordPath('keptNote')}>{word('keptNote', 'Your request is kept on this device, so you can leave and come back to it.')}</span>
          <button type="button" onClick={() => { clearSavedRequest(); setLines([]); setNeededBy(''); setNotes(''); setFiles([]); }}>
            <span data-cms-path={wordPath('startOverButton')}>{word('startOverButton', 'Start a new request')}</span>
          </button>
        </p>}

        {lines.length
          ? <ul className="request-rows">
            {lines.map((line, index) => <RequestRow
              key={line.key}
              line={line}
              index={index}
              open={openKey === line.key}
              onToggle={(options) => toggle(line, options)}
              onChange={(change) => update(line.key, change)}
              onRemove={() => {
                setLines((current) => current.filter((item) => item.key !== line.key));
                setFiles((current) => current.filter((entry) => entry.owner !== line.key));
              }}
              onFiles={lineFiles(line.key)}
            />)}
          </ul>
          : <p className="request-empty" data-cms-path={wordPath('emptyRequest')}>{word('emptyRequest', 'Add at least one product to send a request.')}</p>}

        <ProductSearch chosen={chosenIds} onAdd={(product) => addLine({ productId: product.id }, 'search')} onBrowse={openBrowse} />

        {(suggestions.length > 0 || browse.length > 0) && <div className="request-more">
          <button type="button" className="request-more-toggle" aria-expanded={showMore} onClick={() => setShowMore((value) => !value)}>
            <Icon name="plus" size={16} />
            <span data-cms-path={wordPath('addMoreTitle')}>{word('addMoreTitle', 'Add More Products')}</span>
            <Icon name={showMore ? 'chevronUp' : 'chevronDown'} size={16} />
          </button>
          {showMore && suggestions.length > 0 && <ul className="request-more-list">
            {suggestions.map((product) => <ProductCard key={product.id} product={product} onAdd={() => addLine({ productId: product.id }, 'extra')} />)}
          </ul>}
          {/* The whole catalogue, a category at a time, so nothing is only found by name. */}
          {showMore && browse.length > 0 && <div className="request-browse" id="request-browse" ref={browseRef} tabIndex={-1}>
            <p className="request-browse-title" data-cms-path={wordPath('browseTitle')}>{word('browseTitle', 'Browse all products')}</p>
            {browse.map((category) => <details key={category.id} className="request-browse-group">
              <summary>{category.name} <span>{category.products.length}</span></summary>
              <ul className="request-more-list">
                {category.products.map((product) => <ProductCard key={product.id} product={product} onAdd={() => addLine({ productId: product.id }, 'browse')} />)}
              </ul>
            </details>)}
          </div>}
        </div>}

        <div className="request-custom">
          <label htmlFor="custom-product"><strong data-cms-path={wordPath('customTitle')}>{word('customTitle', 'Looking for something else?')}</strong>
            <small data-cms-path={wordPath('customLead')}>{word('customLead')}</small></label>
          <div className="request-custom-row">
            <input id="custom-product" type="text" placeholder={word('customPlaceholder')} value={custom} onChange={(event) => setCustom(event.target.value)} />
            <button type="button" className="btn btn-outline btn-sm" disabled={!custom.trim()} onClick={() => {
              addLine({ name: custom.trim() }, 'custom');
              setCustom('');
            }}>
              <Icon name="plus" size={16} /> <span data-cms-path={wordPath('customButton')}>{word('customButton', 'Add Custom Product')}</span>
            </button>
          </div>
        </div>

        <div className="request-files-block">
          <strong data-cms-path={wordPath('filesTitle')}>{word('filesTitle', 'General Event Files')}</strong>
          <small data-cms-path={wordPath('filesLead')}>{word('filesLead')}</small>
          <div className="request-files-row">
            <FilePicker id="general-files" label="Upload files for the whole request" className="request-drop" onFiles={(picked) => setFiles((current) => [...current, ...picked.map((file) => ({ file, owner: null }))])}>
              <Icon name="upload" size={26} />
              <span data-cms-path={wordPath('filesDropLabel')}>{word('filesDropLabel', 'Drag and drop files here or Browse Files')}</span>
              <small data-cms-path={wordPath('filesHint')}>{word('filesHint')}</small>
            </FilePicker>
            {generalFiles.length > 0 && <ul className="request-file-list">
              {generalFiles.map((entry) => <li key={`${entry.file.name}-${entry.file.size}`}>
                <Icon name={/\.pdf$/i.test(entry.file.name) ? 'clipboard' : 'photos'} size={20} />
                <span><strong>{entry.file.name}</strong><small>{(entry.file.size / (1024 * 1024)).toFixed(1)} MB</small></span>
                <button type="button" aria-label={`Remove ${entry.file.name}`} onClick={() => setFiles((current) => current.filter((item) => item !== entry))}><Icon name="close" size={16} /></button>
              </li>)}
            </ul>}
          </div>
        </div>
      </div>

      <aside className="request-summary" aria-labelledby="summary-title">
        <h3 id="summary-title" data-cms-path={wordPath('summaryTitle')}>{word('summaryTitle', 'Your Request')}</h3>
        <p className="request-count">{fill(word('summaryCountLabel', '{count} products selected'), { count: lines.length })}</p>
        <ul className="request-summary-list">
          {lines.map((line) => {
            const product = productFor(line.productId);
            const chosen = Object.values(line.details).filter(Boolean).join(' · ');
            return <li key={line.key}>
              <span className="request-thumb">{product ? <ProductShot imageStyle={product.public.imageStyle} slug={product.public.slug} /> : <Icon name="sample" size={22} />}</span>
              <span><strong>{line.name}</strong>{chosen && <small>{chosen}</small>}</span>
              <b>{line.quantity}</b>
            </li>;
          })}
        </ul>

        {awaitingPrinting.length > 0 && <p className="request-printing-note" role="status">
          <Icon name="info" size={16} />
          <span data-cms-path={wordPath('printingSummaryPrompt')}>
            {fill(word('printingSummaryPrompt', 'Tell us how to print {items}, or we will recommend a method.'), { items: awaitingPrinting.map((line) => line.name).join(', ') })}
          </span>
        </p>}

        <label className="request-summary-label" htmlFor="needed-by" data-cms-path={wordPath('neededByLabel')}>{word('neededByLabel', 'Needed By')}</label>
        <span className="request-date"><Icon name="calendar" size={18} /><input id="needed-by" type="date" min={today} value={neededBy} onChange={(event) => setNeededBy(event.target.value)} /></span>

        <label className="request-summary-label" htmlFor="request-notes" data-cms-path={wordPath('additionalNotesLabel')}>{word('additionalNotesLabel', 'Additional Notes')}</label>
        <textarea id="request-notes" rows="4" placeholder={word('additionalNotesPlaceholder')} value={notes} onChange={(event) => setNotes(event.target.value)} />

        {href && lines.length > 0
          ? <a className="btn btn-primary btn-whatsapp request-send" href={href} {...enquiryLinkProps(href)} onClick={send}>
            <Icon name="whatsapp" size={22} />
            <span data-cms-path={wordPath('sendButton')}>{word('sendButton', 'Send Request via WhatsApp')}</span>
          </a>
          : <button type="button" className="btn btn-primary btn-whatsapp request-send" disabled>
            <Icon name="whatsapp" size={22} /><span>{word('sendButton', 'Send Request via WhatsApp')}</span>
          </button>}
        <p className="request-send-hint" data-cms-path={wordPath('sendHint')}>{word('sendHint')}</p>
        {fileNames.length > 0 && sent !== 'shared' && <p className="request-send-files" role="status">
          {fill(word('sendFilesHint', 'WhatsApp links cannot carry files: after the chat opens, attach {files} there.'), { files: fileNames.join(', ') })}
        </p>}
        {sent === 'shared' && <p className="request-send-files" role="status">Your request and files were passed to the app you chose.</p>}
      </aside>
    </div>
  </section>;
}
