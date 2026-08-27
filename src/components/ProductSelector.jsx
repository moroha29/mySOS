import { productData } from '../engines/productEngine';

const Field = ({ label, children, className = '' }) => <label className={`field ${className}`}><span>{label}</span>{children}</label>;
const Select = ({ value, onChange, options, placeholder = 'Select an option' }) => (
  <select value={value ?? ''} onChange={(event) => onChange(event.target.value)}>
    <option value="">{placeholder}</option>
    {options.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
  </select>
);

export default function ProductSelector({ productId, options, onProductChange, onOptionsChange, error, compact = false }) {
  const setOption = (key, value) => onOptionsChange({ ...options, [key]: value });
  const setCustomNameAndNumber = (checked) => onOptionsChange({
    ...options,
    customNameAndNumber: checked,
    customName: undefined,
    customNumber: undefined,
  });
  const variants = productData.catalogue
    .filter((item) => item.quotation.productId === productId && item.quotation.enabled)
    .map((item) => ({ id: item.id, name: item.public.name }));
  const Wrapper = compact ? 'div' : 'section';
  return <Wrapper className={compact ? 'selector-block' : 'form-section'} id={compact ? undefined : 'product'}>
    {compact ? <h3>Product</h3> : <div className="section-heading"><span>2</span><div><h2>Product configuration</h2><p>Choose the garment and its construction details.</p></div></div>}
    <div className="form-grid">
      <Field label="Product type *"><Select value={productId} onChange={onProductChange} options={productData.quotationProducts} placeholder="Choose a product" /></Field>
      {(productId === 'tee' || productId === 'polo') && <Field label="Garment type *"><Select value={options.garment} onChange={(value) => setOption('garment', value)} options={variants} /></Field>}
      {productId === 'cap' && <Field label="Cap type *"><Select value={options.capType} onChange={(value) => setOption('capType', value)} options={variants} /></Field>}
      {productId === 'custom_cutsew' && <Field label="Sewing complexity *"><select value={options.complexity ?? ''} onChange={(event) => setOption('complexity', event.target.value)}><option value="">Select an option</option><option value="basic">Basic</option><option value="complex">Complex</option></select></Field>}
      {productId === 'custom_product' && <>
        <Field label="Product name *"><input value={options.customName ?? ''} onChange={(event) => setOption('customName', event.target.value)} placeholder="Enter the product name" /></Field>
        <Field label="Unit cost (SGD) *"><input type="number" min="0" step="0.01" value={options.customUnitCost ?? options.customUnitPrice ?? ''} onChange={(event) => onOptionsChange({ ...options, customUnitCost: event.target.value, customUnitPrice: undefined })} placeholder="0.00" /></Field>
        <Field label="Product description *" className="wide"><textarea rows="3" value={options.customDescription ?? ''} onChange={(event) => setOption('customDescription', event.target.value)} placeholder="Specifications, material, colour, branding, or other details" /></Field>
      </>}
      {productId === 'jersey_sublimation' && <>
        <Field label="Fabric *"><Select value={options.fabric} onChange={(value) => setOption('fabric', value)} options={productData.jersey.fabrics} /></Field>
        <Field label="Collar *"><Select value={options.collar} onChange={(value) => setOption('collar', value)} options={productData.jersey.collars} /></Field>
        <Field label="Sleeve *"><Select value={options.sleeve} onChange={(value) => setOption('sleeve', value)} options={productData.jersey.sleeves} /></Field>
        <div className="check-row wide">
          <label><input type="checkbox" checked={Boolean(options.customNameAndNumber || options.customName || options.customNumber)} onChange={(event) => setCustomNameAndNumber(event.target.checked)} /> Custom name &amp; number</label>
          <label><input type="checkbox" checked={Boolean(options.knittedCollar)} onChange={(event) => setOption('knittedCollar', event.target.checked)} /> Knitted collar</label>
          <label><input type="checkbox" checked={Boolean(options.teamSet)} onChange={(event) => setOption('teamSet', event.target.checked)} /> Team set (10+)</label>
        </div>
      </>}
    </div>
    {error && <p className="field-error">{error}</p>}
  </Wrapper>;
}
