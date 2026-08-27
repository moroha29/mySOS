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
        <div className="preview-line"><span>{item.product?.name || `Item ${index + 1}`}</span><strong>{item.quantity} pcs</strong></div>
        <div className="preview-meta"><span>{item.description || 'Printing not selected'}</span><strong>{money.format(item.sellingPrice)}</strong></div>
        <div className="item-tier">{item.pricingMode === 'override' ? 'Manual quote' : `Tier ${item.tier?.label ?? '—'}`}</div>
        <div className={`preview-cost-line ${item.costKnown && item.unitSellingPrice < item.unitCost ? 'loss' : ''}`}><span>{item.costKnown ? `Cost ${money.format(item.unitCost)} / pc` : 'Cost not supplied'}</span><strong>Quote {money.format(item.unitSellingPrice)} / pc</strong></div>
      </div>)}
    </div>
    {(quote.addons.items.length > 0 || quote.quotedShipping > 0) && <div className="preview-group"><small>Order charges</small>
      {quote.addons.items.map((addon) => <div className="preview-line muted" key={addon.id}><span>{addon.name}</span><strong>{money.format(addon.quotedTotal)}</strong></div>)}
      {quote.quotedShipping > 0 && <div className="preview-line muted"><span>{quote.input.shippingMethod || 'Shipping'}</span><strong>{money.format(quote.quotedShipping)}</strong></div>}
    </div>}
    <div className="tier-chip"><span>Combined quantity</span><strong>{quote.totalQuantity} pcs</strong></div>
    <div className="cost-summary">
      <div><span>{quote.hasUnknownCosts ? 'Known workbook costs only' : 'Total calculated cost'}</span><strong>{money.format(quote.adjustedCost)}</strong></div>
      <div><span>Quotation price</span><strong>{money.format(quote.sellingPrice)}</strong></div>
      <div className={!quote.hasUnknownCosts && quote.profit < 0 ? 'loss' : ''}><span>Gross profit</span><strong>{quote.hasUnknownCosts ? 'Unavailable' : money.format(quote.profit)}</strong></div>
    </div>
    <div className="total-block"><span>Grand total</span><strong>{money.format(quote.sellingPrice)}</strong><small>{money.format(quote.unitSellingPrice)} average per piece</small></div>
    {!valid && <div className="validation-summary"><strong>Complete the highlighted details</strong><span>{Object.values(errors)[0]}</span></div>}
    <button className="download-button" type="button" disabled={!valid || downloading} onClick={onDownload}>{downloading ? 'Preparing Excel…' : 'Download Excel quotation'}</button>
    <p className="privacy-note">Generated on this device. No customer data is uploaded.</p>
  </aside>;
}
