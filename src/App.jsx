import { printData } from './engines/printEngine';
import { isDemo } from './demoMode';
import { productData } from './engines/productEngine';
import { useEffect, useMemo, useState } from 'react';
import QuotationForm from './components/SchemaQuotationForm';
import formSchema from './data/quotationForm.json';
import QuotationPreview from './components/QuotationPreview';
import { calculateSchemaQuotation, validateSchemaQuotation } from './utils/schemaQuotation';
import { getQuotationPreset } from './utils/catalogue';
import { applyDraftPricing } from './utils/draftPricing';

const today = new Date().toLocaleDateString('en-CA');
export function createInitialValue(search = globalThis.location?.search ?? '') {
  const selectedProduct = new URLSearchParams(search).get('product');
  const preset = getQuotationPreset(selectedProduct ?? (isDemo ? productData.catalogue.find((item) => item.quotation.enabled && item.quotation.productId === 'tee')?.id : undefined)) ?? { productId: '', productOptions: {}, prints: [{ method: 'none' }, { method: 'none' }] };
  if (isDemo && !selectedProduct) preset.prints = [{ method: 'dtf', option: printData.dtf.options[0].id }, { method: 'none' }];
  return {
    customerName: isDemo ? 'Sample Studio' : '', customerType: isDemo ? 'Corporate' : '', orderDate: today, orderReference: isDemo ? 'DEMO-001' : '',
    items: [{ id: 'item-1', quantity: '50', ...preset, sizes: {} }],
    addons: {}, shippingMethod: '', shippingCost: '0', notes: isDemo ? 'DEMONSTRATION ONLY — fictional prices, not a real quotation.' : '',
  };
}

export default function App() {
  const [schema, setSchema] = useState(() => globalThis.__quotationDraft || formSchema);
  useEffect(() => {
    // In the website manager's preview the draft's prices come with its form.
    const draftPrices = () => { if ('__quotationPricing' in window) applyDraftPricing(window.__quotationPricing); };
    const change = event => { if (Array.isArray(event.detail?.sections)) { draftPrices(); setSchema(event.detail); } };
    window.addEventListener('quotation-draft', change);
    if (window.__quotationDraft) { draftPrices(); setSchema(window.__quotationDraft); }
    return () => window.removeEventListener('quotation-draft', change);
  }, []);
  const [form, setForm] = useState(createInitialValue);
  const [attempted, setAttempted] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const allErrors = useMemo(() => validateSchemaQuotation(form, schema), [form, schema]);
  const shownErrors = attempted ? allErrors : {};
  const quote = useMemo(() => calculateSchemaQuotation(form, schema), [form, schema]);

  const handleDownload = async () => {
    setAttempted(true);
    if (Object.keys(allErrors).length > 0) return;
    setDownloading(true);
    try {
      const { downloadQuotationExcel } = await import('./utils/excelGenerator');
      await downloadQuotationExcel(quote);
    } finally { setDownloading(false); }
  };

  return <>
    <main>
      <header className="page-heading"><a className="quote-brand" href="/mySOS/" aria-label="Back to MySOS website">MySOS</a><h1>{isDemo ? 'Quotation demo' : 'Agent quotation'}</h1></header>
      {isDemo && <section className="demo-notice" aria-label="Demo information"><strong>Try the quotation engine</strong><p>All products, costs, prices, and margins in this demo are fictional. Explore the form and download a sample Excel quote. Nothing is submitted or ordered.</p></section>}
      <nav className="step-nav" aria-label="Quotation sections">{schema.sections.filter(section => section.visible !== false && !section.showWhen).map(section => <a key={section.id} href={`#${section.id}-0`}>{section.title}</a>)}<a href="#preview">Quotation total</a></nav>
      <div className="workspace"><QuotationForm schema={schema} value={form} onChange={setForm} errors={shownErrors} quote={quote} /><QuotationPreview quote={quote} errors={attempted ? allErrors : {}} onDownload={handleDownload} downloading={downloading} /></div>
    </main>
    <footer>{isDemo ? 'Public demo · Fictional pricing · Not a valid quotation' : 'mySOS quotation engine · Pricing logic sourced from the approved workbook'}</footer>
  </>;
}
