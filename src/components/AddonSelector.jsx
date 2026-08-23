import { addonData } from '../engines/addonEngine';

export default function AddonSelector({ addons, onChange }) {
  const update = (id, patch) => onChange({ ...addons, [id]: { ...addons[id], ...patch } });
  return <section className="form-section" id="addons">
    <div className="section-heading"><span>4</span><div><h2>Add-ons</h2><p>Per-piece quantities default to the order quantity.</p></div></div>
    <div className="addon-grid">
      {addonData.map((addon) => {
        const selection = addons[addon.id] ?? {};
        return <div className={`addon-card ${selection.selected ? 'selected' : ''}`} key={addon.id}>
          <label className="addon-toggle"><input type="checkbox" checked={Boolean(selection.selected)} onChange={(event) => update(addon.id, { selected: event.target.checked })} /><span><strong>{addon.name}</strong><small>{addon.type === 'flat' ? `SGD ${addon.sellPrice.toFixed(2)} flat` : `SGD ${addon.sellPrice.toFixed(2)} / piece`}</small></span></label>
          {addon.type === 'perPiece' && selection.selected && <input aria-label={`${addon.name} quantity`} type="number" min="1" step="1" placeholder="Order qty" value={selection.quantity ?? ''} onChange={(event) => update(addon.id, { quantity: event.target.value })} />}
        </div>;
      })}
    </div>
  </section>;
}
