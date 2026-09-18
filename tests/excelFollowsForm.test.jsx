import ExcelJS from 'exceljs';
import { describe, expect, it } from 'vitest';
import schema from '../src/data/quotationForm.json';
import { createInitialValue } from '../src/App';
import { calculateSchemaQuotation } from '../src/utils/schemaQuotation';
import { quotationToBuffer } from '../src/utils/excelGenerator';

/*
 * The Excel quote says what the form says. Renamed questions and choices were
 * lost in it (it always read "Customer name", "Customer type" and the
 * workbook's own product names), and answers to questions added in the form
 * were only run together in the notes.
 */

const cells = (sheet) => {
  const text = [];
  sheet.eachRow((row) => row.eachCell((cell) => { if (cell.value != null && cell.value !== '') text.push(String(cell.value?.result ?? cell.value)); }));
  return text;
};

async function sheetFor(form, value) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await quotationToBuffer(calculateSchemaQuotation(value, form)));
  return workbook.getWorksheet('Quotation');
}

function editedForm() {
  const form = structuredClone(schema);
  const customer = form.sections.find((section) => section.id === 'customer');
  customer.fields.find((field) => field.key === 'customerName').label = 'Your name';
  const type = customer.fields.find((field) => field.key === 'customerType');
  type.label = 'Organisation type';
  type.options.find((option) => option.id === 'school').name = 'School or college';
  customer.fields.find((field) => field.key === 'orderReference').visible = false;
  const product = form.sections.find((section) => section.id === 'product').fields.find((field) => field.key === 'productId');
  product.optionLabels = { tee: 'Classic tee' };
  form.sections.push({ id: 'packing', title: 'Packing', fields: [
    { key: 'finish', label: 'Finishing touches', type: 'multiselect', priceRule: 'perPiece', options: [{ id: 'fold', name: 'Folded and bagged', price: 0.5 }, { id: 'tag', name: 'Swing tag' }] },
    { key: 'gift', label: 'Gift boxed', type: 'toggle' },
  ] });
  return form;
}

function answeredValue() {
  const value = createInitialValue();
  value.customerName = 'Jamie Tan';
  value.customerType = 'school';
  value.orderReference = 'REF-1';
  value.items[0] = { ...value.items[0], productId: 'tee', quantity: '50', productOptions: { garment: 'premium_cotton_tee' }, prints: [{ method: 'dtf', option: 'front_left_chest' }, { method: 'none' }] };
  value.customAnswers = { packing: { 0: { finish: ['fold', 'tag'], gift: true } } };
  return value;
}

describe('the Excel quote follows the form', () => {
  it('names the customer details as the form asks them, and leaves out hidden ones', async () => {
    const sheet = await sheetFor(editedForm(), answeredValue());
    expect(sheet.getCell('A5').value).toBe('Your name');
    expect(sheet.getCell('B5').value).toBe('Jamie Tan');
    expect(sheet.getCell('D5').value).toBe('Organisation type');
    expect(sheet.getCell('E5').value).toBe('School or college');
    expect(cells(sheet).join(' ')).not.toMatch(/Order reference|REF-1/);
  });

  it('uses the form\'s names for workbook choices', async () => {
    const text = cells(await sheetFor(editedForm(), answeredValue()));
    expect(text).toContain('Classic tee');
    expect(text).not.toContain('Tee (DTF/DTG)');
  });

  it('lists added questions with their answers, and their charges as lines', async () => {
    const text = cells(await sheetFor(editedForm(), answeredValue()));
    expect(text).toContain('ADDITIONAL DETAILS');
    const at = text.lastIndexOf('Finishing touches');
    expect(text.slice(at - 1, at + 2)).toEqual(['Packing', 'Finishing touches', 'Folded and bagged, Swing tag']);
    expect(text).toContain('Gift boxed');
    expect(text).toContain('Yes');
    expect(text.filter((entry) => entry === 'Finishing touches').length).toBe(2); // the answer, and its charge line
  });

  it('a quote without added questions has no extra section', async () => {
    const text = cells(await sheetFor(schema, answeredValue()));
    expect(text).not.toContain('ADDITIONAL DETAILS');
    expect(text).toContain('Customer name');
  });
});
