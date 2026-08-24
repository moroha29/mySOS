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
  } else if (item.productId === 'tee' || item.productId === 'polo') {
    const garment = productData.catalogue.find((entry) => entry.id === item.productOptions?.garment);
    if (!garment || garment.quotation.productId !== item.productId || !garment.quotation.enabled) errors.productOptions = `Choose a valid ${item.productId} garment.`;
  } else if (item.productId === 'cap') {
    const cap = productData.catalogue.find((entry) => entry.id === item.productOptions?.capType);
    if (!cap || cap.quotation.productId !== 'cap' || !cap.quotation.enabled) errors.productOptions = 'Choose a valid cap type.';
  } else if (item.productId === 'custom_cutsew' && !['basic', 'complex'].includes(item.productOptions?.complexity)) {
    errors.productOptions = 'Choose the sewing complexity.';
  }

  const prints = item.prints ?? [];
  const activePrints = prints.filter((print) => print.method && print.method !== 'none');
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

  const sizeTotal = Object.values(item.sizes ?? {}).reduce((sum, value) => sum + (Number(value) || 0), 0);
  if (sizeTotal > 0 && sizeTotal !== quantity) errors.sizes = `Size breakdown totals ${sizeTotal}; it must equal this item's quantity of ${quantity}.`;
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
  }];
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
  const quantity = Number(item.quantity) || 0;
  const tier = getTier(quantity);
  const product = getProduct(item.productId);
  const productCost = calculateProductCost(item.productId, item.productOptions);
  const prints = (item.prints ?? [])
    .filter((print) => print.method && print.method !== 'none')
    .map((print) => ({ ...print, ...calculatePrintCost(print, quantity) }));
  const apparelTotal = productCost.unitCost * quantity;
  const printingTotal = prints.reduce((sum, print) => sum + print.unitCost * quantity, 0);
  const setupFees = prints.reduce((sum, print) => sum + print.setupFee, 0);
  const internalCost = apparelTotal + printingTotal + setupFees;
  const adjustedCost = internalCost * (tier?.costMultiplier ?? 1);
  const sellingPrice = internalCost * (tier?.sellMultiplier ?? 1);
  return {
    input: item,
    product,
    tier,
    productCost,
    prints,
    apparelTotal,
    printingTotal,
    setupFees,
    internalCost,
    adjustedCost,
    sellingPrice,
    unitCost: quantity > 0 ? adjustedCost / quantity : 0,
    unitSellingPrice: quantity > 0 ? sellingPrice / quantity : 0,
  };
}

export function calculateQuotation(input) {
  const items = normalizedItems(input).map(calculateOrderItem);
  const totalQuantity = items.reduce((sum, item) => sum + (Number(item.input.quantity) || 0), 0);
  const tier = getTier(totalQuantity);
  const addons = calculateAddons(input.addons, totalQuantity);
  const shippingCost = Number(input.shippingCost) || 0;
  const sharedInternalCost = addons.totalCost + shippingCost;
  const internalCost = items.reduce((sum, item) => sum + item.internalCost, 0) + sharedInternalCost;
  const adjustedCost = items.reduce((sum, item) => sum + item.adjustedCost, 0) + sharedInternalCost * (tier?.costMultiplier ?? 1);
  // Each item uses its own quantity tier. Shared charges use the combined-order tier.
  // For one item this remains identical to QUOTATION_OUTPUT!B28, including its separate shipping addition.
  const sellingPrice = items.reduce((sum, item) => sum + item.sellingPrice, 0)
    + sharedInternalCost * (tier?.sellMultiplier ?? 1)
    + addons.totalSell - addons.totalCost + shippingCost;
  const profit = sellingPrice - adjustedCost;
  const first = items[0] ?? {};

  return {
    input,
    items,
    totalQuantity,
    tier,
    addons,
    shippingCost,
    internalCost,
    adjustedCost,
    sellingPrice,
    profit,
    profitMargin: sellingPrice > 0 ? profit / sellingPrice : 0,
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
