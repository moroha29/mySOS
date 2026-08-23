import ProductSelector from './ProductSelector';
import PrintSelector from './PrintSelector';
import AddonSelector from './AddonSelector';

const customerTypes = ['Retail', 'Wholesale', 'School', 'Corporate'];
const shippingMethods = ['Self Collect', 'Local Delivery', 'Interstate', 'International'];
const sizes = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'];
const Field = ({ label, error, children, className = '' }) => <label className={`field ${className}`}><span>{label}</span>{children}{error && <small className="field-error">{error}</small>}</label>;

export default function QuotationForm({ value, onChange, errors }) {
  const set = (key, next) => onChange({ ...value, [key]: next });
  return <form className="quotation-form" onSubmit={(event) => event.preventDefault()}>
    <section className="form-section" id="customer">
      <div className="section-heading"><span>1</span><div><h2>Customer details</h2><p>Start with the order and contact information.</p></div></div>
      <div className="form-grid">
        <Field label="Customer name *" error={errors.customerName}><input value={value.customerName} onChange={(event) => set('customerName', event.target.value)} placeholder="Company or customer name" /></Field>
        <Field label="Customer type *" error={errors.customerType}><select value={value.customerType} onChange={(event) => set('customerType', event.target.value)}><option value="">Select customer type</option>{customerTypes.map((item) => <option key={item}>{item}</option>)}</select></Field>
        <Field label="Order date *" error={errors.orderDate}><input type="date" value={value.orderDate} onChange={(event) => set('orderDate', event.target.value)} /></Field>
        <Field label="Order reference *" error={errors.orderReference}><input value={value.orderReference} onChange={(event) => set('orderReference', event.target.value)} placeholder="e.g. Q-2026-001" /></Field>
        <Field label="Quantity *" error={errors.quantity}><input type="number" min="1" step="1" value={value.quantity} onChange={(event) => set('quantity', event.target.value)} /></Field>
      </div>
      <details className="size-details"><summary>Optional size breakdown</summary><div className="size-grid">{sizes.map((size) => <label key={size}><span>{size}</span><input type="number" min="0" step="1" value={value.sizes[size] ?? ''} onChange={(event) => set('sizes', { ...value.sizes, [size]: event.target.value })} /></label>)}</div>{errors.sizes && <p className="field-error">{errors.sizes}</p>}</details>
    </section>
    <ProductSelector productId={value.productId} options={value.productOptions} onProductChange={(productId) => onChange({ ...value, productId, productOptions: {}, prints: productId === 'jersey_sublimation' ? [{ method: 'sublimation' }, { method: 'none' }] : [{ method: 'none' }, { method: 'none' }] })} onOptionsChange={(productOptions) => set('productOptions', productOptions)} error={errors.productId || errors.productOptions || errors.teamSet} />
    <PrintSelector productId={value.productId} prints={value.prints} onChange={(prints) => set('prints', prints)} errors={errors} />
    <AddonSelector addons={value.addons} onChange={(addons) => set('addons', addons)} />
    <section className="form-section" id="shipping">
      <div className="section-heading"><span>5</span><div><h2>Shipping & notes</h2><p>Finish the commercial details before export.</p></div></div>
      <div className="form-grid">
        <Field label="Shipping method"><select value={value.shippingMethod} onChange={(event) => set('shippingMethod', event.target.value)}><option value="">Select method</option>{shippingMethods.map((item) => <option key={item}>{item}</option>)}</select></Field>
        <Field label="Shipping cost (SGD)" error={errors.shippingCost}><input type="number" min="0" step="0.01" value={value.shippingCost} onChange={(event) => set('shippingCost', event.target.value)} /></Field>
        <Field label="Quotation notes" className="wide"><textarea rows="4" value={value.notes} onChange={(event) => set('notes', event.target.value)} placeholder="Payment terms, lead time, validity, or special instructions" /></Field>
      </div>
    </section>
  </form>;
}
