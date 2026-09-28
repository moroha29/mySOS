import { useEffect, useMemo, useRef, useState } from 'react';
import siteContent from '../../data/siteContent.json';
import { browseCategories, searchProducts } from '../../utils/solutionRequest';
import { cms, pagePath } from '../cms';
import Icon from './Icons';
import { ProductShot } from './Ui';

// The wording is the request builder's own, under pages.solutionPage.
const word = (key, fallback = '') => siteContent.pages?.solutionPage?.[key] ?? fallback;
const wordPath = (key) => cms(pagePath('solutionPage', key));

/*
 * Adding a product to a request, in a window of its own.
 *
 * It used to sit under the rows the customer had already chosen: a search box,
 * an expander of suggestions, and an accordion of every category beneath that.
 * Choosing what to add and reading what you had chosen were the same crowded
 * column. Here the catalogue is somewhere you go and come back from — search
 * across it, or step through it a category at a time — and the request behind
 * stays what it is.
 */
export default function AddProductDialog({ open, lines = [], onAdd, onClose, onCustom }) {
  const ref = useRef(null);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [custom, setCustom] = useState('');

  const groups = useMemo(() => browseCategories(lines), [lines]);
  const chosen = useMemo(() => lines.map((line) => line.productId).filter(Boolean), [lines]);
  const asked = query.trim().length > 0;
  const found = useMemo(
    () => (asked
      ? searchProducts(query, { exclude: chosen })
      : groups.filter((group) => category === 'all' || group.id === category).flatMap((group) => group.products)),
    [asked, category, chosen, groups, query],
  );

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog || typeof dialog.showModal !== 'function') return undefined;
    if (open && !dialog.open) {
      setQuery('');
      setCategory('all');
      dialog.showModal();
    }
    if (!open && dialog.open) dialog.close();
    // The dialog closes itself on Escape and on the backdrop; the page has to
    // hear about it either way.
    const closed = () => onClose();
    dialog.addEventListener('close', closed);
    return () => dialog.removeEventListener('close', closed);
  }, [onClose, open]);

  return <dialog className="add-product" ref={ref} aria-label={word('addDialogTitle', 'Add another product')}>
    <div className="add-product-head">
      <div>
        <strong data-cms-path={wordPath('addDialogTitle')}>{word('addDialogTitle', 'Add another product')}</strong>
        <p data-cms-path={wordPath('addDialogLead')}>{word('addDialogLead', 'Search the catalogue or step through it a category at a time.')}</p>
      </div>
      <button type="button" className="add-product-close" aria-label="Close" onClick={onClose}><Icon name="close" size={22} /></button>
    </div>

    <div className="add-product-search">
      <Icon name="search" size={22} />
      <input
        type="search"
        autoComplete="off"
        placeholder={word('searchPlaceholder', 'Search for a product, e.g. tote bag')}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      {asked && <button type="button" aria-label="Clear search" onClick={() => setQuery('')}><Icon name="close" size={19} /></button>}
    </div>

    {/* The categories stand aside while a search is running: what is on screen
        then is what was searched for, not what was filtered. */}
    {!asked && <div className="add-product-filters" role="tablist" aria-label="Product categories">
      <button type="button" role="tab" aria-selected={category === 'all'} onClick={() => setCategory('all')}>
        <span data-cms-path={wordPath('addDialogAllLabel')}>{word('addDialogAllLabel', 'All products')}</span>
      </button>
      {groups.map((group) => <button
        key={group.id}
        type="button"
        role="tab"
        aria-selected={category === group.id}
        onClick={() => setCategory(group.id)}
      >{group.name}</button>)}
    </div>}

    {found.length > 0
      ? <ul className="add-product-grid">
        {found.map((product) => <li key={product.id}>
          <span className="add-product-shot"><ProductShot imageStyle={product.public.imageStyle} slug={product.public.slug} /></span>
          <strong>{product.public.name}</strong>
          <small>{product.public.description}</small>
          <button type="button" className="btn btn-outline btn-sm" onClick={() => onAdd(product)}>
            <Icon name="plus" size={18} />
            <span data-cms-path={wordPath('addDialogAddLabel')}>{word('addDialogAddLabel', 'Add product')}</span>
          </button>
        </li>)}
      </ul>
      : <p className="add-product-empty" data-cms-path={wordPath('searchEmpty')}>{word('searchEmpty')}</p>}

    {/* What MySOS does not list, said in the customer's own words. */}
    <div className="add-product-foot">
      <span className="add-product-foot-copy">
        <Icon name="spark" size={24} />
        <strong data-cms-path={wordPath('customTitle')}>{word('customTitle', 'Looking for something else?')}</strong>
      </span>
      <span className="add-product-foot-row">
        <input
          type="text"
          aria-label={word('customTitle', 'Looking for something else?')}
          placeholder={word('customPlaceholder')}
          value={custom}
          onChange={(event) => setCustom(event.target.value)}
        />
        <button type="button" className="btn btn-primary btn-sm" disabled={!custom.trim()} onClick={() => { onCustom(custom.trim()); setCustom(''); }}>
          <span data-cms-path={wordPath('customButton')}>{word('customButton', 'Add Custom Product')}</span>
        </button>
      </span>
    </div>
  </dialog>;
}
