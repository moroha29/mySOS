import { isDemo } from '../demoMode';
import ExcelJS from 'exceljs';

const BRAND = '123B35';
const ACCENT = 'E46B45';
const PALE = 'EAF3F0';
const BORDER = 'D8E2DF';
const currencyFormat = '"SGD "#,##0.00';

function excelDate(dateString) {
  const [year, month, day] = String(dateString).split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12));
}

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
  return `${isDemo ? 'DEMO_NOT_A_QUOTE' : 'mySOS_Quotation'}_${safeFilePart(customerName)}_${orderDate}.xlsx`;
}

export function generateQuotationWorkbook(quote) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'mySOS Quotation Engine';
  workbook.created = new Date();
  workbook.calcProperties.fullCalcOnLoad = true;
  const sheet = workbook.addWorksheet('Quotation', {
    pageSetup: { paperSize: 9, orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0, margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 } },
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
  title.value = isDemo ? 'DEMO ONLY | NOT A REAL QUOTE' : 'mySOS  |  QUOTATION';
  title.font = { bold: true, size: 22, color: { argb: 'FFFFFF' } };
  title.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND } };
  title.alignment = { vertical: 'middle', horizontal: 'left' };
  sheet.getRow(1).height = 42;
  sheet.mergeCells('A2:E2');
  // Only when the form asks for a reference; a hidden question leaves it out.
  const reference = quote.form ? quote.form.customer.find((entry) => entry.key === 'customer.reference')?.value : quote.input.orderReference;
  sheet.getCell('A2').value = reference ? `Quotation reference: ${reference}` : '';
  sheet.getCell('A2').font = { italic: true, color: { argb: '5D716D' } };
  sheet.getRow(2).height = 22;

  sheet.mergeCells('A4:E4');
  sheet.getCell('A4').value = 'CUSTOMER INFORMATION';
  styleSection(sheet.getRow(4));
  // The customer questions as the form asks them (its own names, only the ones
  // it shows), two to a row; a quote made without a form keeps the four fixed.
  const customer = quote.form?.customer ?? [
    { key: 'customer.name', label: 'Customer name', value: quote.input.customerName },
    { key: 'customer.orderDate', type: 'date', label: 'Order date', value: quote.input.orderDate },
    { key: 'customer.type', label: 'Customer type', value: quote.input.customerType },
    { key: 'customer.reference', label: 'Reference', value: quote.input.orderReference },
  ];
  for (let index = 0; index < customer.length; index += 2) {
    const pair = [customer[index], customer[index + 1]].map((entry) => entry && {
      label: entry.label,
      value: entry.type === 'date' && entry.value ? excelDate(entry.value) : entry.value ?? '',
      date: entry.type === 'date' && Boolean(entry.value),
    });
    const row = sheet.addRow([pair[0].label, pair[0].value, '', pair[1]?.label ?? '', pair[1]?.value ?? '']);
    row.height = 22;
    if (pair[0].date) row.getCell(2).numFmt = 'dd mmm yyyy';
    if (pair[1]?.date) row.getCell(5).numFmt = 'dd mmm yyyy';
  }

  const detailsStart = sheet.rowCount + 2;
  sheet.mergeCells(`A${detailsStart}:E${detailsStart}`);
  sheet.getCell(`A${detailsStart}`).value = 'QUOTATION DETAILS';
  styleSection(sheet.getRow(detailsStart));
  const headerRow = sheet.addRow(['Product / charge', 'Description', 'Quantity', 'Unit price', 'Subtotal']);
  styleHeader(headerRow);
  const itemRows = [];
  quote.items.forEach((item) => {
    const rowNumber = sheet.rowCount + 1;
    const pricingDescription = item.pricingMode === 'override' ? 'Manual quotation price' : `Tier ${item.tier?.label ?? '—'}`;
    const description = [item.description, pricingDescription].filter(Boolean).join(' · ');
    itemRows.push(sheet.addRow([item.product?.name ?? '', description, item.quantity, item.unitSellingPrice, { formula: `C${rowNumber}*D${rowNumber}`, result: item.sellingPrice }]));
  });
  quote.addons.items.forEach((addon) => {
    itemRows.push(sheet.addRow([addon.name, addon.type === 'flat' ? 'Flat add-on' : 'Order add-on', addon.quantity, addon.quotedUnitPrice, addon.quotedTotal]));
  });
  if (quote.shippingCost > 0) {
    itemRows.push(sheet.addRow(['Shipping', quote.input.shippingMethod || 'Shipping', 1, quote.quotedShipping, quote.quotedShipping]));
  }
  itemRows.forEach((row) => {
    const descriptionLength = String(row.getCell(2).value ?? '').length;
    row.height = descriptionLength > 110 ? 48 : descriptionLength > 60 ? 36 : 23;
    row.eachCell((cell) => { cell.border = { bottom: { style: 'thin', color: { argb: BORDER } } }; cell.alignment = { vertical: 'middle', wrapText: true }; });
    row.getCell(3).numFmt = '#,##0';
    row.getCell(4).numFmt = currencyFormat;
    row.getCell(5).numFmt = currencyFormat;
  });

  // Answers to the questions added in the form, each under its step and question.
  const answers = quote.form?.answers ?? [];
  if (answers.length) {
    const answersStart = sheet.rowCount + 2;
    sheet.mergeCells(`A${answersStart}:E${answersStart}`);
    sheet.getCell(`A${answersStart}`).value = 'ADDITIONAL DETAILS';
    styleSection(sheet.getRow(answersStart));
    const answersHeader = sheet.addRow(['Step', 'Question', 'Answer', '', '']);
    sheet.mergeCells(`C${answersHeader.number}:E${answersHeader.number}`);
    styleHeader(answersHeader);
    answers.forEach((entry) => {
      const row = sheet.addRow([entry.item ? `${entry.step} (item ${entry.item})` : entry.step, entry.label, entry.value, '', '']);
      sheet.mergeCells(`C${row.number}:E${row.number}`);
      row.height = String(entry.value).length > 60 ? 36 : 23;
      row.eachCell((cell) => { cell.border = { bottom: { style: 'thin', color: { argb: BORDER } } }; cell.alignment = { vertical: 'middle', wrapText: true }; });
      row.getCell(3).alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
    });
  }

  const summaryStart = sheet.rowCount + 2;
  sheet.mergeCells(`A${summaryStart}:E${summaryStart}`);
  sheet.getCell(`A${summaryStart}`).value = 'PRICING SUMMARY';
  styleSection(sheet.getRow(summaryStart));
  const tiersUsed = [...new Set(quote.items.map((item) => item.tier?.label).filter(Boolean))].join(', ');
  const subtotalRow = sheet.addRow(['Item tiers applied', tiersUsed, '', 'Selling price', quote.sellingPrice]);
  subtotalRow.getCell(5).numFmt = currencyFormat;
  const unitRow = sheet.addRow(['Average unit price', `${quote.totalQuantity} total pieces`, '', '', quote.unitSellingPrice]);
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
