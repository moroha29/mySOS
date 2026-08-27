import { getTier } from './tierEngine';
import { calculateProductCost, getProduct, productData } from './productEngine';
import { calculatePrintCost } from './printEngine';
import { calculateAddons } from './addonEngine';

function validateOrderItem(item) {
  const errors = {};
  const quantity = Number(item.quantity);
  if (!Number.isInteger(quantity) || quantity < 1) errors.quantity = 'Quantity must be a whole number of at least 1.';
  const product = getProduct(item.productId);
  if (!item.productId) errors.productId = 'Select a product.';
  else if (!product) errors.productId = 'Select a valid product.';
  if (item.productId === 'jersey_sublimation') {
    if (!item.productOptions?.fabric || !item.productOptions?.collar || !item.productOptions?.sleeve) errors.productOptions = 'Choose the jersey fabric, collar, and sleeve.';
    if (item.productOptions?.teamSet && quantity < 10) errors.teamSet = 'Team set pricing requires at least 10 pieces.';
    const knittedCollarUnitCost = Number(item.productOptions?.knittedCollarUnitCost);
    if (item.productOptions?.knittedCollar && (!Number.isFinite(knittedCollarUnitCost) || knittedCollarUnitCost <= 0)) errors.productOptions = 'Enter the knitted collar supplier cost; it is not priced in mysos.xlsx.';
  } else if (item.productId === 'tee' || item.productId === 'polo') {
    const garment = productData.catalogue.find((entry) => entry.id === item.productOptions?.garment);
    if (!garment || garment.quotation.productId !== item.productId || !garment.quotation.enabled) errors.productOptions = `Choose a valid ${item.productId} garment.`;
  } else if (item.productId === 'cap') {
    const cap = productData.catalogue.find((entry) => entry.id === item.productOptions?.capType);
    if (!cap || cap.quotation.productId !== 'cap' || !cap.quotation.enabled) errors.productOptions = 'Choose a valid cap type.';
  } else if (item.productId === 'custom_cutsew' && !['basic', 'complex'].includes(item.productOptions?.complexity)) {
    errors.productOptions = 'Choose the sewing complexity.';
  } else if (item.productId === 'custom_product') {
    if (!item.productOptions?.customName?.trim() || !item.productOptions?.customDescription?.trim()) {
      errors.productOptions = 'Enter the custom product name and description.';
    }
  }
  if (item.quotedUnitPrice !== undefined && item.quotedUnitPrice !== '') {
    const quotedUnitPrice = Number(item.quotedUnitPrice);
    if (!Number.isFinite(quotedUnitPrice) || quotedUnitPrice < 0) errors.quotedUnitPrice = 'Quotation price cannot be negative.';
  }
  if (item.productId === 'custom_product' && (item.quotedUnitPrice === undefined || item.quotedUnitPrice === '' || !Number.isFinite(Number(item.quotedUnitPrice)) || Number(item.quotedUnitPrice) <= 0)) {
    errors.quotedUnitPrice = 'Enter a quotation price greater than zero for this unlisted product.';
  }

  const prints = item.prints ?? [];
  const activePrints = prints.filter((print) => print.method && print.method !== 'none');
  if (item.productId !== 'custom_product') {
    if (activePrints.length === 0) errors.prints = 'Select at least one printing method.';
    prints.forEach((print, index) => {
      if (!print.method || print.method === 'none') return;
      const key = `print${index}`;
      if (print.method === 'sublimation' && item.productId !== 'jersey_sublimation') errors[key] = 'Full sublimation printing is only available for jerseys.';
      else if (product && !product.allowedPrintMethods.includes(print.method)) errors[key] = `${print.method.toUpperCase()} is not compatible with ${product.name}.`;
      if (print.method === 'sublimation' && !print.option) errors[key] = 'Choose a sublimation type.';
      if ((print.method === 'dtf' || print.method === 'dtg') && !print.option) errors[key] = `Choose a ${print.method.toUpperCase()} print option.`;
      if (print.method === 'silkscreen' && (!print.technique || !print.size || !Number.isInteger(Number(print.colors)) || Number(print.colors) < 1)) errors[key] = 'Choose a silkscreen technique, size, and at least one colour.';
      if (print.method === 'embroidery' && (!print.stitchTier || !print.digitizing || !print.placement)) errors[key] = 'Complete the embroidery details.';
    });
    if (item.productId === 'jersey_sublimation' && (activePrints.length !== 1 || activePrints[0]?.method !== 'sublimation')) errors.prints = 'Jerseys require exactly one sublimation printing method.';
  }

  const sizeValues = Object.values(item.sizes ?? {}).filter((value) => value !== '');
  const invalidSize = sizeValues.some((value) => !Number.isInteger(Number(value)) || Number(value) < 0);
  const sizeTotal = sizeValues.reduce((sum, value) => sum + (Number(value) || 0), 0);
  if (invalidSize) errors.sizes = 'Size quantities must be non-negative whole numbers.';
  else if (sizeTotal > 0 && sizeTotal !== quantity) errors.sizes = `Size breakdown totals ${sizeTotal}; it must equal this item's quantity of ${quantity}.`;
  return errors;
}

function normalizedItems(input) {
  if (Array.isArray(input.items)) return input.items;
  return [{
    quantity: input.quantity,
    productId: input.productId,
    productOptions: input.productOptions,
    prints: input.prints,
    sizes: input.sizes,
    quotedUnitPrice: input.quotedUnitPrice,
  }];
}

function buildItemDescription(productCost, prints, sizes = {}) {
  const printDescriptions = prints.map((print) => `Print ${print.slot}: ${print.description}`);
  const sizeEntries = Object.entries(sizes)
    .map(([size, value]) => [size, Number(value)])
    .filter(([, value]) => Number.isInteger(value) && value > 0)
    .map(([size, value]) => `${size} ${value}`);
  const sizeDescription = sizeEntries.length > 0 ? `Sizes: ${sizeEntries.join(', ')}` : '';
  return [productCost.description, ...printDescriptions, sizeDescription].filter(Boolean).join(' · ');
}

export function validateQuotation(input) {
  const errors = {};
  if (!input.customerName?.trim()) errors.customerName = 'Customer name is required.';
  if (!input.customerType) errors.customerType = 'Customer type is required.';
  if (!input.orderDate) errors.orderDate = 'Order date is required.';
  if (!input.orderReference?.trim()) errors.orderReference = 'Order reference is required.';
  const items = normalizedItems(input);
  if (items.length === 0) errors.items = 'Add at least one order item.';
  items.forEach((item, index) => {
    const itemErrors = validateOrderItem(item);
    Object.entries(itemErrors).forEach(([key, message]) => {
      errors[Array.isArray(input.items) ? `item${index}.${key}` : key] = message;
    });
  });
  const shippingCost = Number(input.shippingCost);
  if (!Number.isFinite(shippingCost) || shippingCost < 0) errors.shippingCost = 'Shipping cost cannot be negative.';
  return errors;
}

export function calculateOrderItem(item) {
  const enteredQuantity = Number(item.quantity);
  const quantity = Number.isFinite(enteredQuantity) ? Math.max(0, enteredQuantity) : 0;
  const tier = getTier(quantity);
  const selectedProduct = getProduct(item.productId);
  const customProduct = item.productId === 'custom_product';
  const product = customProduct && selectedProduct
    ? { ...selectedProduct, name: item.productOptions?.customName?.trim() || selectedProduct.name }
    : selectedProduct;
  const productCost = calculateProductCost(item.productId, item.productOptions);
  const costKnown = productCost.costKnown !== false;
  const prints = (item.prints ?? [])
    .map((print, index) => ({ ...print, slot: index + 1 }))
    .filter((print) => print.method && print.method !== 'none')
    .map((print) => ({ ...print, ...calculatePrintCost(print, quantity) }));
  const description = buildItemDescription(productCost, prints, item.sizes);
  const apparelTotal = productCost.unitCost * quantity;
  const printingTotal = prints.reduce((sum, print) => sum + print.unitCost * quantity, 0);
  const setupFees = prints.reduce((sum, print) => sum + print.setupFee, 0);
  const internalCost = Math.max(0, apparelTotal + printingTotal + setupFees);
  const adjustedCost = Math.max(0, internalCost * (tier?.costMultiplier ?? 1));
  const suggestedSellingPrice = costKnown ? Math.max(0, internalCost * (tier?.sellMultiplier ?? 1)) : 0;
  const enteredQuotedUnitPrice = Number(item.quotedUnitPrice);
  const hasQuotedPriceOverride = item.quotedUnitPrice !== undefined
    && item.quotedUnitPrice !== ''
    && Number.isFinite(enteredQuotedUnitPrice)
    && enteredQuotedUnitPrice >= 0;
  const sellingPrice = hasQuotedPriceOverride ? enteredQuotedUnitPrice * quantity : suggestedSellingPrice;
  return {
    input: item,
    quantity,
    product,
    tier,
    productCost,
    prints,
    description,
    apparelTotal,
    printingTotal,
    setupFees,
    pricingMode: hasQuotedPriceOverride ? 'override' : (costKnown ? 'tiered' : 'manual-required'),
    costKnown,
    internalCost,
    adjustedCost,
    suggestedSellingPrice,
    sellingPrice,
    unitCost: quantity > 0 ? adjustedCost / quantity : 0,
    suggestedUnitSellingPrice: quantity > 0 ? suggestedSellingPrice / quantity : 0,
    unitSellingPrice: quantity > 0 ? sellingPrice / quantity : 0,
  };
}

export function calculateQuotation(input) {
  const items = normalizedItems(input).map(calculateOrderItem);
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const tier = getTier(totalQuantity);
  const addons = calculateAddons(input.addons, totalQuantity);
  const enteredShippingCost = Number(input.shippingCost);
  const shippingCost = Number.isFinite(enteredShippingCost) ? Math.max(0, enteredShippingCost) : 0;
  const sharedInternalCost = addons.totalCost + shippingCost;
  const sellMultiplier = tier?.sellMultiplier ?? 1;
  const quotedAddonItems = addons.items.map((addon) => {
    const quotedTotal = addon.totalCost * sellMultiplier + addon.totalSell - addon.totalCost;
    return { ...addon, quotedTotal, quotedUnitPrice: addon.quantity > 0 ? quotedTotal / addon.quantity : 0 };
  });
  const quotedAddonsTotal = quotedAddonItems.reduce((sum, addon) => sum + addon.quotedTotal, 0);
  const quotedShipping = shippingCost * (sellMultiplier + 1);
  const quotedAddons = { ...addons, items: quotedAddonItems, quotedTotal: quotedAddonsTotal };
  const internalCost = Math.max(0, items.reduce((sum, item) => sum + item.internalCost, 0) + sharedInternalCost);
  const adjustedCost = Math.max(0, items.reduce((sum, item) => sum + item.adjustedCost, 0) + sharedInternalCost * (tier?.costMultiplier ?? 1));
  // Each item uses its own quantity tier. Shared charges use the combined-order tier.
  // For one item this remains identical to QUOTATION_OUTPUT!B28, including its separate shipping addition.
  const sellingPrice = Math.max(0, items.reduce((sum, item) => sum + item.sellingPrice, 0) + quotedAddonsTotal + quotedShipping);
  const profit = sellingPrice - adjustedCost;
  const hasUnknownCosts = items.some((item) => !item.costKnown);
  const first = items[0] ?? {};

  return {
    input,
    items,
    totalQuantity,
    tier,
    addons: quotedAddons,
    shippingCost,
    quotedShipping,
    internalCost,
    adjustedCost,
    sellingPrice,
    profit,
    profitMargin: !hasUnknownCosts && sellingPrice > 0 ? profit / sellingPrice : 0,
    hasUnknownCosts,
    unitCost: totalQuantity > 0 ? adjustedCost / totalQuantity : 0,
    unitSellingPrice: totalQuantity > 0 ? sellingPrice / totalQuantity : 0,
    // Backward-compatible fields for existing integrations and single-item tests.
    product: first.product,
    productCost: first.productCost,
    prints: first.prints ?? [],
    apparelTotal: first.apparelTotal ?? 0,
    printingTotal: first.printingTotal ?? 0,
    setupFees: items.reduce((sum, item) => sum + item.setupFees, 0),
  };
}
