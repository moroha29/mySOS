import { getTier } from './tierEngine';
import { calculateProductCost, getProduct, productData } from './productEngine';
import { calculatePrintCost } from './printEngine';
import { calculateAddons } from './addonEngine';

export function validateQuotation(input) {
  const errors = {};
  if (!input.customerName?.trim()) errors.customerName = 'Customer name is required.';
  if (!input.customerType) errors.customerType = 'Customer type is required.';
  if (!input.orderDate) errors.orderDate = 'Order date is required.';
  if (!input.orderReference?.trim()) errors.orderReference = 'Order reference is required.';
  const quantity = Number(input.quantity);
  if (!Number.isInteger(quantity) || quantity < 1) errors.quantity = 'Quantity must be a whole number of at least 1.';
  if (!input.productId) errors.productId = 'Select a product.';

  const product = getProduct(input.productId);
  if (input.productId === 'jersey_sublimation') {
    if (!input.productOptions?.fabric || !input.productOptions?.collar || !input.productOptions?.sleeve) errors.productOptions = 'Choose the jersey fabric, collar, and sleeve.';
    if (input.productOptions?.teamSet && quantity < 10) errors.teamSet = 'Team set pricing requires at least 10 pieces.';
  } else if (input.productId === 'tee' || input.productId === 'polo') {
    const garment = productData.garments.find((item) => item.id === input.productOptions?.garment);
    if (!garment || garment.category !== input.productId) errors.productOptions = `Choose a valid ${input.productId} garment.`;
  } else if (input.productId === 'cap' && !input.productOptions?.capType) {
    errors.productOptions = 'Choose a cap type.';
  } else if (input.productId === 'custom_cutsew' && !['basic', 'complex'].includes(input.productOptions?.complexity)) {
    errors.productOptions = 'Choose the sewing complexity.';
  }

  const prints = input.prints ?? [];
  const activePrints = prints.filter((item) => item.method && item.method !== 'none');
  if (activePrints.length === 0) errors.prints = 'Select at least one printing method.';
  prints.forEach((print, index) => {
    if (!print.method || print.method === 'none') return;
    const key = `print${index}`;
    if (print.method === 'sublimation' && input.productId !== 'jersey_sublimation') errors[key] = 'Full sublimation printing is only available for jerseys.';
    else if (product && !product.allowedPrintMethods.includes(print.method)) errors[key] = `${print.method.toUpperCase()} is not compatible with ${product.name}.`;
    if (print.method === 'sublimation' && !print.option) errors[key] = 'Choose a sublimation type.';
    if ((print.method === 'dtf' || print.method === 'dtg') && !print.option) errors[key] = `Choose a ${print.method.toUpperCase()} print option.`;
    if (print.method === 'silkscreen' && (!print.technique || !print.size || !Number.isInteger(Number(print.colors)) || Number(print.colors) < 1)) errors[key] = 'Choose a silkscreen technique, size, and at least one colour.';
    if (print.method === 'embroidery' && (!print.stitchTier || !print.digitizing || !print.placement)) errors[key] = 'Complete the embroidery details.';
  });
  if (input.productId === 'jersey_sublimation' && (activePrints.length !== 1 || activePrints[0]?.method !== 'sublimation')) errors.prints = 'Jerseys require exactly one sublimation printing method.';

  const sizeTotal = Object.values(input.sizes ?? {}).reduce((sum, value) => sum + (Number(value) || 0), 0);
  if (sizeTotal > 0 && sizeTotal !== quantity) errors.sizes = `Size breakdown totals ${sizeTotal}; it must equal the order quantity of ${quantity}.`;
  const shippingCost = Number(input.shippingCost);
  if (!Number.isFinite(shippingCost) || shippingCost < 0) errors.shippingCost = 'Shipping cost cannot be negative.';
  return errors;
}

export function calculateQuotation(input) {
  const quantity = Number(input.quantity) || 0;
  const tier = getTier(quantity);
  const product = getProduct(input.productId);
  const productCost = calculateProductCost(input.productId, input.productOptions);
  const prints = (input.prints ?? []).filter((item) => item.method && item.method !== 'none').map((print) => ({ ...print, ...calculatePrintCost(print, quantity) }));
  const addons = calculateAddons(input.addons, quantity);
  const shippingCost = Number(input.shippingCost) || 0;
  const apparelTotal = productCost.unitCost * quantity;
  const printingTotal = prints.reduce((sum, print) => sum + print.unitCost * quantity, 0);
  const setupFees = prints.reduce((sum, print) => sum + print.setupFee, 0);
  const internalCost = apparelTotal + printingTotal + setupFees + addons.totalCost + shippingCost;
  const adjustedCost = internalCost * (tier?.costMultiplier ?? 1);
  // Mirrors QUOTATION_OUTPUT!B28 exactly, including its separate shipping addition.
  const sellingPrice = internalCost * (tier?.sellMultiplier ?? 1) + addons.totalSell - addons.totalCost + shippingCost;
  const profit = sellingPrice - adjustedCost;

  return {
    input,
    product,
    tier,
    productCost,
    prints,
    addons,
    apparelTotal,
    printingTotal,
    setupFees,
    shippingCost,
    internalCost,
    adjustedCost,
    sellingPrice,
    profit,
    profitMargin: sellingPrice > 0 ? profit / sellingPrice : 0,
    unitCost: quantity > 0 ? adjustedCost / quantity : 0,
    unitSellingPrice: quantity > 0 ? sellingPrice / quantity : 0,
  };
}
