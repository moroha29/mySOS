import ProductSelector from './ProductSelector';
import PrintSelector from './PrintSelector';
import AddonSelector from './AddonSelector';

const customerTypes = ['Retail', 'Wholesale', 'School', 'Corporate'];
const shippingMethods = ['Self Collect', 'Local Delivery', 'Interstate', 'International'];
const sizes = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'];
const money = new Intl.NumberFormat('en-SG', { style: 'currency', currency: 'SGD' });
const Field = ({ label, error, children, className = '' }) => <label className={`field ${className}`}><span>{label}</span>{children}{error && <small className="field-error">{error}</small>}</label>;

function newItem() {
  return {
    id: globalThis.crypto?.randomUUID?.() ?? `item-${Date.now()}`,
    quantity: '1',
    productId: '',
    productOptions: {},
    prints: [{ method: 'none' }, { method: 'none' }],
    sizes: {},
  };
}

function ItemEditor({ item, index, itemCount, onChange, onRemove, errors, quoteItem }) {
  const set = (key, value) => onChange({ ...item, [key]: value });
  const customProduct = item.productId === 'custom_product';
  const hasPriceOverride = item.quotedUnitPrice !== undefined && item.quotedUnitPrice !== '';
  const costPerPiece = quoteItem?.unitCost ?? 0;
  const quotePerPiece = quoteItem?.unitSellingPrice ?? 0;
  const suggestedPerPiece = quoteItem?.suggestedUnitSellingPrice ?? 0;
  return <article className="order-item">
    <div className="order-item-header">
      <div><span className="item-number">{String(index + 1).padStart(2, '0')}</span><div><h3>Order item {index + 1}</h3><p>Priced on its own quantity tier</p></div></div>
      {itemCount > 1 && <button className="remove-item" type="button" onClick={onRemove}>Remove</button>}
    </div>
    <div className="item-quantity">
      <Field label="Item quantity *" error={errors.quantity}><input type="number" min="1" step="1" value={item.quantity} onChange={(event) => set('quantity', event.target.value)} /></Field>
    </div>
    <ProductSelector
      compact
      productId={item.productId}
      options={item.productOptions}
      onProductChange={(productId) => onChange({ ...item, productId, productOptions: {}, prints: productId === 'jersey_sublimation' ? [{ method: 'sublimation' }, { method: 'none' }] : [{ method: 'none' }, { method: 'none' }] })}
      onOptionsChange={(productOptions) => set('productOptions', productOptions)}
      error={errors.productId || errors.productOptions || errors.teamSet}
    />
    {customProduct
      ? <div className="selector-block direct-price-note"><h3>Printing</h3><p>This product has no pricing engine. Add all product and branding specifications to the description, then enter the final customer quotation price below.</p></div>
      : <PrintSelector compact productId={item.productId} prints={item.prints} onChange={(prints) => set('prints', prints)} errors={errors} />}
    <div className="selector-block pricing-editor">
      <div className="pricing-editor-heading"><h3>{customProduct ? 'Manual quotation' : 'Cost vs quotation'}</h3><p>{customProduct ? 'Other / Blank Product is not priced in mysos.xlsx, so enter its customer price manually.' : 'Leave the quotation price blank to use the suggested tier price.'}</p></div>
      <div className="price-metrics">
        <div><span>Calculated cost / pc</span><strong>{customProduct ? 'Not in workbook' : money.format(costPerPiece)}</strong></div>
        <div><span>Suggested quote / pc</span><strong>{customProduct ? 'Manual entry' : money.format(suggestedPerPiece)}</strong></div>
        <div className={!customProduct && quotePerPiece < costPerPiece ? 'loss' : ''}><span>Current quote / pc</span><strong>{money.format(quotePerPiece)}</strong></div>
      </div>
      <div className="price-override-row">
        <Field label={`Quotation price / piece (SGD)${customProduct ? ' *' : ''}`} error={errors.quotedUnitPrice}>
          <input type="number" min={customProduct ? '0.01' : '0'} step="0.01" value={item.quotedUnitPrice ?? ''} onChange={(event) => set('quotedUnitPrice', event.target.value)} placeholder={customProduct ? 'Enter customer price' : suggestedPerPiece.toFixed(2)} />
        </Field>
        {hasPriceOverride && !customProduct && <button type="button" className="reset-price" onClick={() => set('quotedUnitPrice', '')}>Use suggested price</button>}
      </div>
      {!customProduct && quotePerPiece < costPerPiece && <p className="price-warning">The current quotation price is below cost.</p>}
    </div>
    <details className="size-details"><summary>Optional size breakdown for this item</summary><div className="size-grid">{sizes.map((size) => <label key={size}><span>{size}</span><input type="number" min="0" step="1" value={item.sizes[size] ?? ''} onChange={(event) => set('sizes', { ...item.sizes, [size]: event.target.value })} /></label>)}</div>{errors.sizes && <p className="field-error">{errors.sizes}</p>}</details>
  </article>;
}

export default function QuotationForm({ value, onChange, errors, quote }) {
  const set = (key, next) => onChange({ ...value, [key]: next });
  const itemErrors = (index) => Object.fromEntries(Object.entries(errors)
    .filter(([key]) => key.startsWith(`item${index}.`))
    .map(([key, message]) => [key.split('.')[1], message]));
  const updateItem = (index, item) => set('items', value.items.map((current, currentIndex) => currentIndex === index ? item : current));
  return <form className="quotation-form" onSubmit={(event) => event.preventDefault()}>
    <section className="form-section" id="customer">
      <div className="section-heading"><span>1</span><div><h2>Customer details</h2><p>Start with the order and contact information.</p></div></div>
      <div className="form-grid">
        <Field label="Customer name *" error={errors.customerName}><input value={value.customerName} onChange={(event) => set('customerName', event.target.value)} placeholder="Company or customer name" /></Field>
        <Field label="Customer type *" error={errors.customerType}><select value={value.customerType} onChange={(event) => set('customerType', event.target.value)}><option value="">Select customer type</option>{customerTypes.map((item) => <option key={item}>{item}</option>)}</select></Field>
        <Field label="Order date *" error={errors.orderDate}><input type="date" value={value.orderDate} onChange={(event) => set('orderDate', event.target.value)} /></Field>
        <Field label="Order reference *" error={errors.orderReference}><input value={value.orderReference} onChange={(event) => set('orderReference', event.target.value)} placeholder="e.g. Q-2026-001" /></Field>
      </div>
    </section>

    <section className="form-section" id="products">
      <div className="section-heading"><span>2</span><div><h2>Order items</h2><p>Add different products and quantities to the same quotation.</p></div></div>
      <div className="order-items">
        {value.items.map((item, index) => <ItemEditor key={item.id} item={item} index={index} itemCount={value.items.length} onChange={(next) => updateItem(index, next)} onRemove={() => set('items', value.items.filter((_, currentIndex) => currentIndex !== index))} errors={itemErrors(index)} quoteItem={quote?.items?.[index]} />)}
      </div>
      {errors.items && <p className="field-error">{errors.items}</p>}
      <button className="add-item" type="button" onClick={() => set('items', [...value.items, newItem()])}><span>+</span> Add another product</button>
    </section>

    <AddonSelector step="3" addons={value.addons} onChange={(addons) => set('addons', addons)} />
    <section className="form-section" id="shipping">
      <div className="section-heading"><span>4</span><div><h2>Shipping & notes</h2><p>Finish the commercial details before export.</p></div></div>
      <div className="form-grid">
        <Field label="Shipping method"><select value={value.shippingMethod} onChange={(event) => set('shippingMethod', event.target.value)}><option value="">Select method</option>{shippingMethods.map((item) => <option key={item}>{item}</option>)}</select></Field>
        <Field label="Shipping cost (SGD)" error={errors.shippingCost}><input type="number" min="0" step="0.01" value={value.shippingCost} onChange={(event) => set('shippingCost', event.target.value)} /></Field>
        <Field label="Quotation notes" className="wide"><textarea rows="4" value={value.notes} onChange={(event) => set('notes', event.target.value)} placeholder="Payment terms, lead time, validity, or special instructions" /></Field>
      </div>
    </section>
  </form>;
}
