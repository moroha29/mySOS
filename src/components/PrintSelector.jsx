import { printData } from '../engines/printEngine';
import { getProduct } from '../engines/productEngine';

const Field = ({ label, children }) => <label className="field"><span>{label}</span>{children}</label>;
const OptionSelect = ({ value, onChange, items, label = 'Select an option' }) => <select value={value ?? ''} onChange={(event) => onChange(event.target.value)}><option value="">{label}</option>{items.map((item) => {
  const optionValue = typeof item === 'string' ? item : (item.id ?? item.name);
  return <option key={optionValue} value={optionValue}>{typeof item === 'string' ? item : item.name}</option>;
})}</select>;

function PrintCard({ index, print, allowed, onChange, error }) {
  const set = (key, value) => onChange({ ...print, [key]: value });
  const methods = printData.methods.filter((item) => item.id === 'none' || allowed.includes(item.id));
  const techniques = [...new Set(printData.silkscreen.rates.map((item) => item.technique))];
  const sizes = [...new Set(printData.silkscreen.rates.filter((item) => item.technique === print.technique).map((item) => item.size))];
  return <div className="print-card">
    <div className="print-card-title"><strong>Printing method {index + 1}</strong>{index === 1 && <span className="optional">Optional</span>}</div>
    <div className="form-grid compact">
      <Field label="Method"><OptionSelect value={print.method} onChange={(method) => onChange({ method })} items={methods} label="Choose method" /></Field>
      {(print.method === 'dtf' || print.method === 'dtg') && <Field label="Print option"><OptionSelect value={print.option} onChange={(value) => set('option', value)} items={printData.dtf.options} /></Field>}
      {print.method === 'silkscreen' && <>
        <Field label="Technique"><OptionSelect value={print.technique} onChange={(value) => onChange({ method: 'silkscreen', technique: value })} items={techniques} /></Field>
        <Field label="Size"><OptionSelect value={print.size} onChange={(value) => set('size', value)} items={sizes} /></Field>
        <Field label="Number of colours"><input type="number" min="1" step="1" value={print.colors ?? ''} onChange={(event) => set('colors', event.target.value)} /></Field>
      </>}
      {print.method === 'embroidery' && <>
        <Field label="Stitch tier"><OptionSelect value={print.stitchTier} onChange={(value) => set('stitchTier', value)} items={printData.embroidery.stitchTiers} /></Field>
        <Field label="Digitizing"><OptionSelect value={print.digitizing} onChange={(value) => set('digitizing', value)} items={printData.embroidery.digitizing} /></Field>
        <Field label="Placement"><OptionSelect value={print.placement} onChange={(value) => set('placement', value)} items={printData.embroidery.placements} /></Field>
      </>}
      {print.method === 'sublimation' && <Field label="Sublimation type"><OptionSelect value={print.option} onChange={(value) => set('option', value)} items={printData.sublimation.options} /></Field>}
    </div>
    {print.method === 'dtg' && <p className="helper">DTG uses the workbook’s DTF option rates because no separate DTG pricing table is present.</p>}
    {error && <p className="field-error">{error}</p>}
  </div>;
}

export default function PrintSelector({ productId, prints, onChange, errors, compact = false }) {
  const allowed = getProduct(productId)?.allowedPrintMethods ?? [];
  const Wrapper = compact ? 'div' : 'section';
  return <Wrapper className={compact ? 'selector-block' : 'form-section'} id={compact ? undefined : 'printing'}>
    {compact ? <h3>Printing</h3> : <div className="section-heading"><span>3</span><div><h2>Printing options</h2><p>Add up to two print methods or placements.</p></div></div>}
    <div className="print-grid">
      {prints.map((print, index) => <PrintCard key={index} index={index} print={print} allowed={allowed} onChange={(value) => onChange(prints.map((item, itemIndex) => itemIndex === index ? value : item))} error={errors[`print${index}`]} />)}
    </div>
    {errors.prints && <p className="field-error">{errors.prints}</p>}
  </Wrapper>;
}
