import { productData } from '../engines/productEngine';

const Field = ({ label, children }) => <label className="field"><span>{label}</span>{children}</label>;
const Select = ({ value, onChange, options, placeholder = 'Select an option' }) => (
  <select value={value ?? ''} onChange={(event) => onChange(event.target.value)}>
    <option value="">{placeholder}</option>
    {options.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
  </select>
);

export default function ProductSelector({ productId, options, onProductChange, onOptionsChange, error }) {
  const setOption = (key, value) => onOptionsChange({ ...options, [key]: value });
  const garments = productData.garments.filter((item) => item.category === productId);
  return <section className="form-section" id="product">
    <div className="section-heading"><span>2</span><div><h2>Product configuration</h2><p>Choose the garment and its construction details.</p></div></div>
    <div className="form-grid">
      <Field label="Product type *"><Select value={productId} onChange={onProductChange} options={productData.products} placeholder="Choose a product" /></Field>
      {(productId === 'tee' || productId === 'polo') && <Field label="Garment type *"><Select value={options.garment} onChange={(value) => setOption('garment', value)} options={garments} /></Field>}
      {productId === 'cap' && <Field label="Cap type *"><Select value={options.capType} onChange={(value) => setOption('capType', value)} options={productData.caps} /></Field>}
      {productId === 'custom_cutsew' && <Field label="Sewing complexity *"><select value={options.complexity ?? ''} onChange={(event) => setOption('complexity', event.target.value)}><option value="">Select an option</option><option value="basic">Basic</option><option value="complex">Complex</option></select></Field>}
      {productId === 'jersey_sublimation' && <>
        <Field label="Fabric *"><Select value={options.fabric} onChange={(value) => setOption('fabric', value)} options={productData.jersey.fabrics} /></Field>
        <Field label="Collar *"><Select value={options.collar} onChange={(value) => setOption('collar', value)} options={productData.jersey.collars} /></Field>
        <Field label="Sleeve *"><Select value={options.sleeve} onChange={(value) => setOption('sleeve', value)} options={productData.jersey.sleeves} /></Field>
        <div className="check-row wide">
          <label><input type="checkbox" checked={Boolean(options.customName)} onChange={(event) => setOption('customName', event.target.checked)} /> Custom name</label>
          <label><input type="checkbox" checked={Boolean(options.customNumber)} onChange={(event) => setOption('customNumber', event.target.checked)} /> Custom number</label>
          <label><input type="checkbox" checked={Boolean(options.teamSet)} onChange={(event) => setOption('teamSet', event.target.checked)} /> Team set (10+)</label>
        </div>
      </>}
    </div>
    {error && <p className="field-error">{error}</p>}
  </section>;
}
