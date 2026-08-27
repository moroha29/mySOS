const money = new Intl.NumberFormat('en-SG', { style: 'currency', currency: 'SGD' });

export default function QuotationPreview({ quote, errors, onDownload, downloading }) {
  const valid = Object.keys(errors).length === 0;
  return <aside className="preview-card" id="preview">
    <div className="preview-kicker">Live quotation</div>
    <h2>{quote.input.customerName || 'Customer quotation'}</h2>
    <p className="reference">{quote.input.orderReference || 'Order reference'}</p>
    <div className="preview-group order-preview">
      <small>Order items</small>
      {quote.items.map((item, index) => <div className="preview-item" key={item.input.id ?? index}>
        <div className="preview-line"><span>{item.product?.name || `Item ${index + 1}`}</span><strong>{item.input.quantity || 0} pcs</strong></div>
        <div className="preview-meta"><span>{item.pricingMode === 'direct' ? item.productCost.description : (item.prints.map((print) => print.description).join(' + ') || 'Printing not selected')}</span><strong>{money.format(item.sellingPrice)}</strong></div>
        <div className="item-tier">{item.pricingMode === 'direct' ? 'Direct price' : `Tier ${item.tier?.label ?? '—'}`} · {money.format(item.unitSellingPrice)} / pc</div>
      </div>)}
    </div>
    {quote.addons.items.length > 0 && <div className="preview-group"><small>Add-ons</small>{quote.addons.items.map((addon) => <div className="preview-line muted" key={addon.id}><span>{addon.name}</span><strong>{money.format(addon.totalSell)}</strong></div>)}</div>}
    <div className="tier-chip"><span>Combined quantity</span><strong>{quote.totalQuantity} pcs</strong></div>
    <div className="total-block"><span>Grand total</span><strong>{money.format(quote.sellingPrice)}</strong><small>{money.format(quote.unitSellingPrice)} average per piece</small></div>
    {!valid && <div className="validation-summary"><strong>Complete the highlighted details</strong><span>{Object.values(errors)[0]}</span></div>}
    <button className="download-button" type="button" disabled={!valid || downloading} onClick={onDownload}>{downloading ? 'Preparing Excel…' : 'Download Excel quotation'}</button>
    <p className="privacy-note">Generated on this device. No customer data is uploaded.</p>
  </aside>;
}
