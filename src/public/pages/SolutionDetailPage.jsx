import { useEffect, useMemo, useRef, useState } from 'react';
import siteContent from '../../data/siteContent.json';
import solutions from '../../data/solutions.json';
import successStories from '../../data/successStories.json';
import { enquiryLinkProps } from '../../utils/catalogue';
import { firstImage } from '../../utils/imageRegistry';
import {
  allFileNames, buildRequestMessage, clampQuantity, detailFieldsFor, makeLine, packageLines,
  productFor, recommendedDetails, requestHref, suggestionsFor,
} from '../../utils/solutionRequest';
import { cms, pagePath, picture, solutionPath } from '../cms';
import Icon from '../components/Icons';
import { Photo, ProductShot } from '../components/Ui';

/*
 * One solution, as the design draws it: a banner, the solution's use cases to
 * choose from, and a request builder for the chosen use case's recommended
 * package. The customer adjusts it and sends it to MySOS on WhatsApp.
 *
 * This is the customer's request, not a quotation: it shows no prices and
 * never links to the agents' quotation engine.
 */

const words = siteContent.pages?.solutionPage ?? {};
const word = (key, fallback = '') => words[key] ?? fallback;
const wordPath = (key) => cms(pagePath('solutionPage', key));
const fill = (template, values) => String(template).replace(/\{(\w+)\}/g, (match, key) => (key in values ? values[key] : match));
const MAX_FILE_BYTES = 10 * 1024 * 1024;

const shortName = (solution) => solution.name.replace(' Organisations', '');

/* The banner's four pictures: chosen ones first, then MySOS's own photos of the same kind of work. */
function heroPictures(solution) {
  const stories = successStories.filter((story) => story.category === solution.id);
  const fallbacks = [
    `solutions/${solution.id}`,
    ...stories.map((story) => `stories/${story.slug}/cover`),
    ...solution.useCases.flatMap((useCase) => useCase.items.map((item) => productFor(item.productId)?.public?.slug)).filter(Boolean).map((slug) => `products/${slug}`),
  ];
  const used = new Set();
  return (solution.page?.heroImages ?? ['', '', '', '']).map((chosen, index) => {
    if (String(chosen || '').trim()) return chosen;
    const key = fallbacks.find((candidate) => !used.has(candidate) && firstImage(candidate));
    if (key) used.add(key);
    return key ? firstImage(key) : '';
  }).map((src, index) => ({ src, index }));
}

function useCasePicture(solution, useCase) {
  const product = useCase.items.map((item) => productFor(item.productId)).find(Boolean);
  return picture(useCase.image, `solutions/${solution.id}/${useCase.id}`)
    || (product && firstImage(`products/${product.public.slug}`))
    || firstImage(`solutions/${solution.id}`);
}

function Hero({ solution, solutionIndex }) {
  const discussHref = requestHref(`Hi MySOS, I'd like to discuss ${shortName(solution)} solutions.`, shortName(solution));
  const pictures = heroPictures(solution);
  return <section className="solution-hero">
    <div className="solution-hero-inner">
      <div className="solution-hero-copy">
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <a href="/mySOS/" aria-label={word('breadcrumbHome', 'Home')}><Icon name="home" size={15} /></a>
          <span aria-hidden="true">/</span>
          <a href="/mySOS/solutions/" data-cms-path={wordPath('breadcrumbSolutions')}>{word('breadcrumbSolutions', 'Solutions')}</a>
          <span aria-hidden="true">/</span>
          <span aria-current="page" data-cms-path={cms(solutionPath(solution, 'name'))}>{shortName(solution)}</span>
        </nav>
        <span className="eyebrow" data-cms-path={cms([...solutionPath(solution, 'page'), 'eyebrow'])}>{solution.page?.eyebrow}</span>
        <h1 data-cms-path={cms([...solutionPath(solution, 'page'), 'title'])}>{solution.page?.title}</h1>
        <p className="solution-hero-lead" data-cms-path={cms([...solutionPath(solution, 'page'), 'lead'])}>{solution.page?.lead}</p>
        {discussHref && <a className="btn btn-primary btn-whatsapp" href={discussHref} {...enquiryLinkProps(discussHref)}>
          <Icon name="whatsapp" size={20} />
          <span data-cms-path={wordPath('discussButton')}>{word('discussButton', 'Discuss on WhatsApp')}</span>
          <Icon name="arrowRight" size={16} />
        </a>}
      </div>
      <div className="solution-collage" aria-hidden="true">
        {pictures.map(({ src, index }) => <div className={`solution-collage-tile tile-${index + 1}`} key={index}>
          <Photo style={solution.imageStyle} image={src} imagePath={[...solutionPath(solution, 'page'), 'heroImages', index]} eager={index < 2} />
        </div>)}
      </div>
    </div>
    <span className="sr-only">{`Solution ${solutionIndex + 1} of ${solutions.length}`}</span>
  </section>;
}

function UseCasePicker({ solution, activeId, onChoose }) {
  const trackRef = useRef(null);
  const [showAll, setShowAll] = useState(false);
  const [pages, setPages] = useState({ count: 1, current: 0 });

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return undefined;
    const measure = () => {
      const count = Math.max(1, Math.ceil(track.scrollWidth / Math.max(1, track.clientWidth) - 0.05));
      const current = Math.min(count - 1, Math.round(track.scrollLeft / Math.max(1, track.clientWidth)));
      setPages({ count, current });
    };
    measure();
    track.addEventListener('scroll', measure, { passive: true });
    window.addEventListener('resize', measure);
    return () => {
      track.removeEventListener('scroll', measure);
      window.removeEventListener('resize', measure);
    };
  }, [showAll]);

  const move = (direction) => trackRef.current?.scrollBy({ left: direction * trackRef.current.clientWidth * 0.8, behavior: 'smooth' });
  const toPage = (page) => trackRef.current?.scrollTo({ left: page * trackRef.current.clientWidth, behavior: 'smooth' });

  return <section className="use-cases" aria-labelledby="use-cases-title">
    <div className="section-heading align-center">
      <div>
        <h2 id="use-cases-title" data-cms-path={cms([...solutionPath(solution, 'page'), 'exploreTitle'])}>{solution.page?.exploreTitle}</h2>
        <p data-cms-path={wordPath('exploreLead')}>{word('exploreLead')}</p>
      </div>
    </div>
    <div className={showAll ? 'use-case-rail is-all' : 'use-case-rail'}>
      {!showAll && <button className="use-case-arrow" type="button" aria-label="Previous" disabled={pages.current === 0} onClick={() => move(-1)}><Icon name="chevronLeft" size={20} /></button>}
      <ul className="use-case-track" ref={trackRef}>
        {solution.useCases.map((useCase, index) => {
          const active = useCase.id === activeId;
          return <li key={useCase.id}>
            <button type="button" className={active ? 'use-case-card is-active' : 'use-case-card'} aria-pressed={active} onClick={() => onChoose(useCase.id)}>
              <span className="use-case-photo"><Photo style={solution.imageStyle} image={useCasePicture(solution, useCase)} imagePath={[...solutionPath(solution, 'useCases', index), 'image']} /></span>
              {active && <span className="use-case-selected"><Icon name="check" size={14} /><span data-cms-path={wordPath('selectedLabel')}>{word('selectedLabel', 'Selected')}</span></span>}
              <span className="use-case-name">
                <Icon name={useCase.icon} size={30} />
                <span data-cms-path={cms([...solutionPath(solution, 'useCases', index), 'name'])}>{useCase.name}</span>
              </span>
            </button>
          </li>;
        })}
      </ul>
      {!showAll && <button className="use-case-arrow" type="button" aria-label="Next" disabled={pages.current >= pages.count - 1} onClick={() => move(1)}><Icon name="chevronRight" size={20} /></button>}
    </div>
    <div className="use-case-foot">
      {!showAll && pages.count > 1 ? <div className="use-case-dots">
        {Array.from({ length: pages.count }, (_, page) => <button key={page} type="button" className={page === pages.current ? 'is-active' : ''} aria-label={`Page ${page + 1}`} onClick={() => toPage(page)} />)}
      </div> : <span />}
      <button className="use-case-all" type="button" aria-expanded={showAll} onClick={() => setShowAll((value) => !value)}>
        <span data-cms-path={wordPath('viewAllLabel')}>{showAll ? 'Show fewer' : word('viewAllLabel', 'View all solutions')}</span>
        <Icon name={showAll ? 'chevronUp' : 'chevronDown'} size={16} />
      </button>
    </div>
  </section>;
}

function Stepper({ value, onChange, label }) {
  return <span className="qty-stepper">
    <button type="button" aria-label={`Fewer ${label}`} onClick={() => onChange(value - 1)} disabled={value <= 1}><Icon name="minus" size={16} /></button>
    <input type="number" inputMode="numeric" min="1" value={value} aria-label={`Quantity of ${label}`} onChange={(event) => onChange(event.target.value)} />
    <button type="button" aria-label={`More ${label}`} onClick={() => onChange(value + 1)}><Icon name="plus" size={16} /></button>
  </span>;
}

function FilePicker({ id, label, onFiles, children, className = '' }) {
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
  const set = (id, value) => onChange({ details: { ...line.details, [id]: value } });
  return <div className="request-details" id={`request-details-${index}`}>
    <p className="request-details-title">Customise {line.name} <span>(Optional)</span></p>
    <div className="request-details-grid">
      {fields.map((field) => <div className="request-field" key={field.id}>
        <span className="request-field-label" id={`field-${index}-${field.id}`}>{field.label}</span>
        {field.type === 'choice' && <div className="request-choices" role="radiogroup" aria-labelledby={`field-${index}-${field.id}`}>
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
        {field.type === 'select' && <select aria-labelledby={`field-${index}-${field.id}`} value={line.details[field.id] ?? ''} onChange={(event) => set(field.id, event.target.value)}>
          <option value="">Choose…</option>
          {field.options.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>}
        {field.type === 'text' && <input type="text" aria-labelledby={`field-${index}-${field.id}`} placeholder={field.placeholder ?? ''} value={line.details[field.id] ?? ''} onChange={(event) => set(field.id, event.target.value)} />}
      </div>)}
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
  return <li className={open ? 'request-row is-open' : 'request-row'}>
    <div className="request-row-main">
      <span className="request-thumb">
        {product ? <ProductShot imageStyle={product.public.imageStyle} slug={product.public.slug} /> : <Icon name="sample" size={30} />}
      </span>
      <span className="request-name">
        <strong>{line.name}</strong>
        {line.note && <small className={/^Printing:/i.test(line.note) ? 'request-note is-highlight' : 'request-note'}>{line.note}</small>}
        {line.files.length > 0 && <small className="request-files">{line.files.join(', ')}</small>}
      </span>
      <Stepper value={line.quantity} label={line.name} onChange={(value) => onChange({ quantity: clampQuantity(value) })} />
      <span className="request-row-actions">
        <button type="button" className="request-details-toggle" aria-expanded={open} aria-controls={`request-details-${index}`} onClick={onToggle}>
          <span data-cms-path={wordPath(open ? 'hideDetailsButton' : 'addDetailsButton')}>{open ? word('hideDetailsButton', 'Hide Details') : word('addDetailsButton', 'Add Details')}</span>
          <Icon name={open ? 'minus' : 'plus'} size={16} />
        </button>
        <button type="button" className="request-remove" aria-label={`Remove ${line.name}`} onClick={onRemove}><Icon name="trash" size={18} /></button>
      </span>
    </div>
    {open && <DetailsPanel line={line} index={index} onChange={onChange} onFiles={onFiles} />}
  </li>;
}

function RequestBuilder({ solution, useCase }) {
  const [lines, setLines] = useState(() => packageLines(useCase));
  const [openKey, setOpenKey] = useState(null);
  const [sameQuantity, setSameQuantity] = useState(50);
  const [custom, setCustom] = useState('');
  const [neededBy, setNeededBy] = useState('');
  const [notes, setNotes] = useState('');
  const [files, setFiles] = useState([]);
  const [showMore, setShowMore] = useState(true);
  const [sent, setSent] = useState(null);

  // A different use case starts again from its own recommendation.
  useEffect(() => {
    setLines(packageLines(useCase));
    setOpenKey(null);
    setSent(null);
  }, [useCase]);

  const update = (key, change) => setLines((current) => current.map((line) => (line.key === key ? { ...line, ...change } : line)));
  const toggle = (line) => {
    if (openKey === line.key) { setOpenKey(null); return; }
    // Opening a product's details selects its recommended choices, as the design shows.
    if (!Object.keys(line.details).length) update(line.key, { details: recommendedDetails(detailFieldsFor(line.productId)) });
    setOpenKey(line.key);
  };
  const lineFiles = (key) => (picked) => {
    setFiles((current) => [...current, ...picked.map((file) => ({ file, owner: key }))]);
    setLines((current) => current.map((line) => (line.key === key ? { ...line, files: [...new Set([...line.files, ...picked.map((file) => file.name)])] } : line)));
  };
  const generalFiles = files.filter((entry) => !entry.owner);
  const suggestions = suggestionsFor(useCase, lines);
  const fileNames = allFileNames(lines, generalFiles.map((entry) => entry.file.name));
  const message = buildRequestMessage({ solutionName: shortName(solution), useCaseName: useCase.name, lines, neededBy, notes, fileNames });
  const href = requestHref(message, shortName(solution));
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
        <h2 id="request-title" data-cms-path={wordPath('packageTitle')}>{word('packageTitle', 'Your Recommended Team Package')}</h2>
        <p data-cms-path={wordPath('packageLead')}>{word('packageLead')}</p>
      </div>
    </div>

    <div className="request-layout">
      <div className="request-main">
        <h3 data-cms-path={wordPath('includedTitle')}>{word('includedTitle', 'Included Products')}</h3>

        <div className="request-same">
          <label htmlFor="same-quantity" data-cms-path={wordPath('sameQuantityLabel')}>{word('sameQuantityLabel', 'Same quantity for every item?')}</label>
          <input id="same-quantity" type="number" min="1" inputMode="numeric" value={sameQuantity} onChange={(event) => setSameQuantity(event.target.value)} />
          <button type="button" className="btn btn-primary btn-sm" onClick={() => setLines((current) => current.map((line) => ({ ...line, quantity: clampQuantity(sameQuantity) })))}>
            <span data-cms-path={wordPath('applyAllButton')}>{word('applyAllButton', 'Apply to All')}</span>
          </button>
          <small data-cms-path={wordPath('applyAllHint')}>{word('applyAllHint')}</small>
        </div>

        {lines.length
          ? <ul className="request-rows">
            {lines.map((line, index) => <RequestRow
              key={line.key}
              line={line}
              index={index}
              open={openKey === line.key}
              onToggle={() => toggle(line)}
              onChange={(change) => update(line.key, change)}
              onRemove={() => {
                setLines((current) => current.filter((item) => item.key !== line.key));
                setFiles((current) => current.filter((entry) => entry.owner !== line.key));
              }}
              onFiles={lineFiles(line.key)}
            />)}
          </ul>
          : <p className="request-empty" data-cms-path={wordPath('emptyRequest')}>{word('emptyRequest', 'Add at least one product to send a request.')}</p>}

        {suggestions.length > 0 && <div className="request-more">
          <button type="button" className="request-more-toggle" aria-expanded={showMore} onClick={() => setShowMore((value) => !value)}>
            <Icon name="plus" size={16} />
            <span data-cms-path={wordPath('addMoreTitle')}>{word('addMoreTitle', 'Add More Products')}</span>
            <Icon name={showMore ? 'chevronUp' : 'chevronDown'} size={16} />
          </button>
          {showMore && <ul className="request-more-list">
            {suggestions.map((product) => <li key={product.id}>
              <button type="button" onClick={() => setLines((current) => [...current, makeLine({ productId: product.id, quantity: lines[0]?.quantity ?? 50 }, 'extra')])}>
                <span className="request-thumb"><ProductShot imageStyle={product.public.imageStyle} slug={product.public.slug} /></span>
                <span>{product.public.name}</span>
                <Icon name="plus" size={16} />
              </button>
            </li>)}
          </ul>}
        </div>}

        <div className="request-custom">
          <label htmlFor="custom-product"><strong data-cms-path={wordPath('customTitle')}>{word('customTitle', 'Looking for something else?')}</strong>
            <small data-cms-path={wordPath('customLead')}>{word('customLead')}</small></label>
          <div className="request-custom-row">
            <input id="custom-product" type="text" placeholder={word('customPlaceholder')} value={custom} onChange={(event) => setCustom(event.target.value)} />
            <button type="button" className="btn btn-outline btn-sm" disabled={!custom.trim()} onClick={() => {
              setLines((current) => [...current, makeLine({ name: custom.trim(), quantity: lines[0]?.quantity ?? 50 }, 'custom')]);
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

export default function SolutionDetailPage({ solutionId }) {
  const solutionIndex = solutions.findIndex((item) => item.id === solutionId);
  const solution = solutions[solutionIndex];
  const requested = new URLSearchParams(globalThis.location?.search ?? '').get('use');
  const [useCaseId, setUseCaseId] = useState(() => (solution?.useCases.some((item) => item.id === requested) ? requested : solution?.defaultUseCase ?? solution?.useCases[0]?.id));
  const useCase = solution?.useCases.find((item) => item.id === useCaseId) ?? solution?.useCases[0];

  if (!solution) return null;
  return <main className="solution-page">
    <Hero solution={solution} solutionIndex={solutionIndex} />
    {solution.useCases.length > 0 && <UseCasePicker solution={solution} activeId={useCase?.id} onChoose={setUseCaseId} />}
    {useCase && <RequestBuilder solution={solution} useCase={useCase} />}
  </main>;
}
