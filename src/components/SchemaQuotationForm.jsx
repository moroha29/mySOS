import { isVisible, resolveOptions } from '../utils/quotationForm';
import { answerPath, readAnswer, writeAnswer, presentedOptions } from '../utils/formBindings';
import { getProduct } from '../engines/productEngine';
import { addonData } from '../engines/addonEngine';

export default function SchemaQuotationForm({ schema, value, onChange, errors = {}, quote }) {
  const update = (path, answer) => onChange(writeAnswer(value, path, answer));
  const renderField = (field, section, itemIndex, printIndex = 0) => {
    const item = value.items[itemIndex] || {};
    const path = answerPath(field, section.id, itemIndex, printIndex, section.repeatsPerItem ? item.id : 0);
    const answer = readAnswer(value, path);
    const context = { ...value, ...item, printMethods: (item.prints || []).map(print => print.method) };
    if (!isVisible(field, context)) return null;
    let options = presentedOptions(field, resolveOptions(field, context));
    if (field.limitToProductMethods) options = options.filter(option => option.id === 'none' || getProduct(item.productId)?.allowedPrintMethods.includes(option.id));
    const set = (next) => {
      if (field.key === 'productId') {
        const draft = writeAnswer(value, path, next);
        draft.items[itemIndex] = { ...draft.items[itemIndex], productOptions: {}, prints: [{ method: next === 'jersey_sublimation' ? 'sublimation' : 'none' }, { method: 'none' }] };
        onChange(draft);
      } else update(path, next);
    };
    const common = { required: Boolean(field.required), 'aria-label': field.label };
    let control;
    if (field.type === 'select') control = <select {...common} value={answer ?? ''} onChange={event => set(event.target.value)}><option value="">{field.key === 'productId' ? 'Choose a product' : 'Choose an option'}</option>{options.map(option => <option key={option.id} value={option.id}>{option.name}</option>)}</select>;
    else if (field.type === 'multiselect') control = <div className="schema-options">{options.map(option => <label key={option.id}><input type="checkbox" checked={(answer || []).includes(option.id)} onChange={event => set(event.target.checked ? [...(answer || []), option.id] : (answer || []).filter(id => id !== option.id))} />{option.name}</label>)}</div>;
    else if (field.type === 'toggle') control = <input {...common} type="checkbox" checked={Boolean(answer)} onChange={event => set(event.target.checked)} />;
    else if (field.type === 'sizeGrid') control = <div className="size-grid">{(field.sizes || []).map(size => <label key={size}>{size}<input aria-label={`${field.label}: ${size}`} type="number" min="0" step="1" value={answer?.[size] ?? ''} onChange={event => set({ ...answer, [size]: event.target.value })} /></label>)}</div>;
    else if (field.type === 'addonList') control = <div className="schema-options">{options.map(option => <div key={option.id}><label><input type="checkbox" checked={Boolean(answer?.[option.id]?.selected)} onChange={event => set({ ...answer, [option.id]: { ...answer?.[option.id], selected: event.target.checked } })} />{option.name}</label>{answer?.[option.id]?.selected && addonData.find(addon => addon.id === option.id)?.type === 'perPiece' && <input type="number" min="1" aria-label={`${option.name} quantity`} placeholder="Order quantity" value={answer?.[option.id]?.quantity ?? ''} onChange={event => set({ ...answer, [option.id]: { ...answer[option.id], quantity: event.target.value } })} />}</div>)}</div>;
    else if (field.type === 'textarea') control = <textarea {...common} rows="3" value={answer ?? ''} onChange={event => set(event.target.value)} />;
    else control = <input {...common} type={field.type === 'currency' ? 'number' : field.type} min={field.min} step={field.step || (field.type === 'currency' ? '0.01' : undefined)} value={answer ?? ''} onChange={event => set(event.target.value)} />;
    return <div className="field" key={`${field.key}-${printIndex}`}><span>{field.label}{field.required ? ' *' : ' (optional)'}</span>{control}{field.help && <small>{field.help}</small>}</div>;
  };
  let sectionNumber = 0;
  const renderSection = (section) => {
    const instances = section.repeatsPerItem ? value.items.map((_, itemIndex) => itemIndex) : [0];
    return instances.map(itemIndex => {
      const item = value.items[itemIndex] || {};
      const context = { ...value, ...item, printMethods: (item.prints || []).map(print => print.method) };
      if (!isVisible(section, context)) return null;
      const slots = section.showWhen?.field === 'printMethod'
        ? (item.prints || []).map((print, i) => section.showWhen.includesAny?.includes(print.method) ? i : -1).filter(i => i >= 0) : [0];
      return <section className="form-section" key={`${section.id}-${itemIndex}`} id={`${section.id}-${itemIndex}`}>
        <div className="section-heading"><span>{++sectionNumber}</span><div><h2>{section.title}</h2>{section.repeatsPerItem && <p>Order item {itemIndex + 1}</p>}</div></div>
        {slots.map(slot => <div className="form-grid" key={slot}>{slots.length > 1 && <h3>Printing {slot + 1}</h3>}{section.fields.map(field => renderField(field, section, itemIndex, slot))}</div>)}
      </section>;
    });
  };
  return <form className="quotation-form" onSubmit={event => event.preventDefault()}>
    {schema.sections.map(renderSection)}
    <section className="form-section"><h2>Order items & quotation prices</h2>
      {value.items.map((item, index) => <div className="selector-block" key={item.id}>
        <h3>Order item {index + 1}</h3>
        {item.productId === 'custom_product' && <label className="field">Custom product name<input required value={item.productOptions.customName || ''} onChange={event => update(['items', index, 'productOptions', 'customName'], event.target.value)} /></label>}
        <label className="field">Quotation price per piece (SGD){item.productId === 'custom_product' ? ' *' : ' — optional override'}<input type="number" min="0" step="0.01" value={item.quotedUnitPrice ?? ''} placeholder={quote?.items[index]?.suggestedUnitSellingPrice?.toFixed(2)} onChange={event => update(['items', index, 'quotedUnitPrice'], event.target.value)} /></label>
        {value.items.length > 1 && <button type="button" onClick={() => onChange({ ...value, items: value.items.filter((_, i) => i !== index) })}>Remove this item</button>}
      </div>)}
      <button type="button" className="add-item" onClick={() => onChange({ ...value, items: [...value.items, { id: crypto.randomUUID(), quantity: '1', productId: '', productOptions: {}, prints: [{ method: 'none' }, { method: 'none' }], sizes: {} }] })}>+ Add another order item</button>
      <label className="field">Quotation notes<textarea value={value.notes || ''} onChange={event => update(['notes'], event.target.value)} /></label>
    </section>
    {Object.keys(errors).length > 0 && <section className="form-section" role="alert"><h3>Please check these answers</h3><ul>{Object.entries(errors).map(([key, message]) => <li key={key}>{message}</li>)}</ul></section>}
  </form>;
}
