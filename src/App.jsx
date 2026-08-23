import { useMemo, useState } from 'react';
import QuotationForm from './components/QuotationForm';
import QuotationPreview from './components/QuotationPreview';
import { calculateQuotation, validateQuotation } from './engines/quotationEngine';

const today = new Date().toLocaleDateString('en-CA');
const initialValue = {
  customerName: '', customerType: '', orderDate: today, orderReference: '', quantity: '50', productId: '', productOptions: {},
  prints: [{ method: 'none' }, { method: 'none' }], addons: {}, sizes: {}, shippingMethod: '', shippingCost: '0', notes: '',
};

export default function App() {
  const [form, setForm] = useState(initialValue);
  const [attempted, setAttempted] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const allErrors = useMemo(() => validateQuotation(form), [form]);
  const shownErrors = attempted ? allErrors : {};
  const quote = useMemo(() => calculateQuotation(form), [form]);

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
    <header className="app-header"><div className="brand"><div className="brand-mark">mS</div><div><strong>mySOS</strong><span>Quotation engine</span></div></div><div className="header-badge">Agent tool</div></header>
    <main>
      <section className="hero"><div><span className="eyebrow">Fast, consistent agent pricing</span><h1>Build a client-ready quotation.</h1><p>Configure the order, review pricing instantly, and download a polished Excel quotation.</p></div><div className="hero-stat"><strong>100%</strong><span>Runs in your browser</span></div></section>
      <nav className="step-nav" aria-label="Quotation sections"><a href="#customer">01 Customer</a><a href="#product">02 Product</a><a href="#printing">03 Printing</a><a href="#addons">04 Add-ons</a><a href="#preview">05 Preview</a></nav>
      <div className="workspace"><QuotationForm value={form} onChange={setForm} errors={shownErrors} /><QuotationPreview quote={quote} errors={attempted ? allErrors : {}} onDownload={handleDownload} downloading={downloading} /></div>
    </main>
    <footer>mySOS quotation engine · Pricing logic sourced from the approved workbook</footer>
  </>;
}
