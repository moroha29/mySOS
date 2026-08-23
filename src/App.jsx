import { useMemo, useState } from 'react';
import QuotationForm from './components/QuotationForm';
import QuotationPreview from './components/QuotationPreview';
import { calculateQuotation, validateQuotation } from './engines/quotationEngine';

const today = new Date().toLocaleDateString('en-CA');
const initialValue = {
  customerName: '', customerType: '', orderDate: today, orderReference: '',
  items: [{ id: 'item-1', quantity: '50', productId: '', productOptions: {}, prints: [{ method: 'none' }, { method: 'none' }], sizes: {} }],
  addons: {}, shippingMethod: '', shippingCost: '0', notes: '',
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
    <main>
      <header className="page-heading"><h1>Agent quotation</h1></header>
      <nav className="step-nav" aria-label="Quotation sections"><a href="#customer">01 Customer</a><a href="#products">02 Order items</a><a href="#addons">03 Add-ons</a><a href="#shipping">04 Finish</a><a href="#preview">05 Preview</a></nav>
      <div className="workspace"><QuotationForm value={form} onChange={setForm} errors={shownErrors} /><QuotationPreview quote={quote} errors={attempted ? allErrors : {}} onDownload={handleDownload} downloading={downloading} /></div>
    </main>
    <footer>mySOS quotation engine · Pricing logic sourced from the approved workbook</footer>
  </>;
}
