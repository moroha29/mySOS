import ExcelJS from 'exceljs';

const BRAND = '123B35';
const ACCENT = 'E46B45';
const PALE = 'EAF3F0';
const BORDER = 'D8E2DF';
const currencyFormat = '"SGD "#,##0.00';

const safeFilePart = (value) => String(value || 'Customer')
  .trim()
  .replace(/[^a-z0-9_-]+/gi, '_')
  .replace(/^_+|_+$/g, '') || 'Customer';

function styleSection(row) {
  row.height = 24;
  row.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALE } };
    cell.font = { bold: true, color: { argb: BRAND }, size: 11 };
    cell.alignment = { vertical: 'middle' };
    cell.border = { bottom: { style: 'thin', color: { argb: BORDER } } };
  });
}

function styleHeader(row) {
  row.height = 25;
  row.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND } };
    cell.font = { bold: true, color: { argb: 'FFFFFF' } };
    cell.alignment = { vertical: 'middle' };
  });
}

export function createQuotationFilename(customerName, orderDate) {
  return `mySOS_Quotation_${safeFilePart(customerName)}_${orderDate}.xlsx`;
}

export function generateQuotationWorkbook(quote) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'mySOS Quotation Engine';
  workbook.created = new Date();
  workbook.calcProperties.fullCalcOnLoad = true;
  const sheet = workbook.addWorksheet('Quotation', {
    pageSetup: { paperSize: 9, orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 1, margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 } },
    views: [{ showGridLines: false }],
  });
  sheet.columns = [
    { key: 'label', width: 30 },
    { key: 'description', width: 34 },
    { key: 'quantity', width: 12 },
    { key: 'unitPrice', width: 17 },
    { key: 'subtotal', width: 18 },
  ];

  sheet.mergeCells('A1:E1');
  const title = sheet.getCell('A1');
  title.value = 'mySOS  |  QUOTATION';
  title.font = { bold: true, size: 22, color: { argb: 'FFFFFF' } };
  title.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND } };
  title.alignment = { vertical: 'middle', horizontal: 'left' };
  sheet.getRow(1).height = 42;
  sheet.mergeCells('A2:E2');
  sheet.getCell('A2').value = `Quotation reference: ${quote.input.orderReference}`;
  sheet.getCell('A2').font = { italic: true, color: { argb: '5D716D' } };
  sheet.getRow(2).height = 22;

  sheet.mergeCells('A4:E4');
  sheet.getCell('A4').value = 'CUSTOMER INFORMATION';
  styleSection(sheet.getRow(4));
  sheet.addRow(['Customer name', quote.input.customerName, '', 'Order date', new Date(`${quote.input.orderDate}T00:00:00`)]);
  sheet.addRow(['Customer type', quote.input.customerType, '', 'Reference', quote.input.orderReference]);
  sheet.getCell('E5').numFmt = 'dd mmm yyyy';

  sheet.mergeCells('A8:E8');
  sheet.getCell('A8').value = 'QUOTATION DETAILS';
  styleSection(sheet.getRow(8));
  const headerRow = sheet.addRow(['Product / charge', 'Description', 'Quantity', 'Unit price', 'Subtotal']);
  styleHeader(headerRow);
  const itemRows = [];
  itemRows.push(sheet.addRow([quote.product?.name ?? '', quote.productCost.description, quote.input.quantity, quote.productCost.unitCost, { formula: `C${sheet.rowCount + 1}*D${sheet.rowCount + 1}`, result: quote.apparelTotal }]));
  quote.prints.forEach((print) => {
    const rowNumber = sheet.rowCount + 1;
    itemRows.push(sheet.addRow(['Printing', print.description, quote.input.quantity, print.unitCost, { formula: `C${rowNumber}*D${rowNumber}`, result: print.unitCost * quote.input.quantity }]));
  });
  if (quote.setupFees > 0) itemRows.push(sheet.addRow(['Setup fees', 'One-time print setup / digitizing', 1, quote.setupFees, quote.setupFees]));
  quote.addons.items.forEach((addon) => itemRows.push(sheet.addRow([addon.name, addon.type === 'flat' ? 'Flat fee' : 'Add-on', addon.quantity, addon.sellPrice, addon.totalSell])));
  if (quote.shippingCost > 0) itemRows.push(sheet.addRow(['Shipping', quote.input.shippingMethod || 'Shipping', 1, quote.shippingCost, quote.shippingCost]));
  itemRows.forEach((row) => {
    row.height = 23;
    row.eachCell((cell) => { cell.border = { bottom: { style: 'thin', color: { argb: BORDER } } }; cell.alignment = { vertical: 'middle', wrapText: true }; });
    row.getCell(3).numFmt = '#,##0';
    row.getCell(4).numFmt = currencyFormat;
    row.getCell(5).numFmt = currencyFormat;
  });

  const summaryStart = sheet.rowCount + 2;
  sheet.mergeCells(`A${summaryStart}:E${summaryStart}`);
  sheet.getCell(`A${summaryStart}`).value = 'PRICING SUMMARY';
  styleSection(sheet.getRow(summaryStart));
  const subtotalRow = sheet.addRow(['Tier applied', `${quote.tier.label} quantity tier`, '', 'Selling price', quote.sellingPrice]);
  subtotalRow.getCell(5).numFmt = currencyFormat;
  const unitRow = sheet.addRow(['Unit price', '', '', '', quote.unitSellingPrice]);
  unitRow.getCell(5).numFmt = currencyFormat;
  const grandRow = sheet.addRow(['GRAND TOTAL', '', '', '', quote.sellingPrice]);
  grandRow.height = 34;
  grandRow.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ACCENT } };
    cell.font = { bold: true, size: 13, color: { argb: 'FFFFFF' } };
    cell.alignment = { vertical: 'middle' };
  });
  grandRow.getCell(5).numFmt = currencyFormat;

  const notesRow = sheet.rowCount + 2;
  sheet.mergeCells(`A${notesRow}:E${notesRow}`);
  sheet.getCell(`A${notesRow}`).value = 'NOTES';
  styleSection(sheet.getRow(notesRow));
  sheet.mergeCells(`A${notesRow + 1}:E${notesRow + 3}`);
  sheet.getCell(`A${notesRow + 1}`).value = quote.input.notes?.trim() || 'This quotation is generated from the mySOS agent pricing engine. Final specifications are subject to artwork approval and production confirmation.';
  sheet.getCell(`A${notesRow + 1}`).alignment = { vertical: 'top', wrapText: true };
  sheet.getCell(`A${notesRow + 1}`).font = { color: { argb: '4F625E' } };

  sheet.getColumn(4).alignment = { horizontal: 'right' };
  sheet.getColumn(5).alignment = { horizontal: 'right' };
  sheet.getRow(5).height = 22;
  sheet.getRow(6).height = 22;
  sheet.headerFooter.oddFooter = '&LmySOS&CPage &P of &N&RGenerated quotation';
  sheet.autoFilter = { from: `A${headerRow.number}`, to: `E${headerRow.number}` };
  sheet.views = [{ showGridLines: false, state: 'frozen', ySplit: 1 }];
  return workbook;
}

export async function quotationToBuffer(quote) {
  return generateQuotationWorkbook(quote).xlsx.writeBuffer();
}

export async function downloadQuotationExcel(quote) {
  const buffer = await quotationToBuffer(quote);
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = createQuotationFilename(quote.input.customerName, quote.input.orderDate);
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
