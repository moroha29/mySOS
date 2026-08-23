import ExcelJS from 'exceljs';
import { describe, expect, it } from 'vitest';
import { calculateQuotation } from '../src/engines/quotationEngine';
import { createQuotationFilename, quotationToBuffer } from '../src/utils/excelGenerator';

describe('Excel quotation output', () => {
  it('creates a formatted, readable XLSX workbook', async () => {
    const quote = calculateQuotation({
      customerName: 'Acme School', customerType: 'School', orderDate: '2026-08-23', orderReference: 'ACME-23', quantity: 50,
      productId: 'tee', productOptions: { garment: 'premium_cotton_tee' }, prints: [{ method: 'dtf', option: 'front_left_chest' }], addons: { packaging: { selected: true } },
      sizes: {}, shippingMethod: 'Local Delivery', shippingCost: 12, notes: 'Valid for 14 days.',
    });
    const buffer = await quotationToBuffer(quote);
    expect(buffer.byteLength).toBeGreaterThan(8000);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const sheet = workbook.getWorksheet('Quotation');
    expect(sheet.getCell('A1').value).toContain('mySOS');
    expect(sheet.getCell('B5').value).toBe('Acme School');
    expect(sheet.actualRowCount).toBeGreaterThan(15);
    expect(createQuotationFilename('Acme School', '2026-08-23')).toBe('mySOS_Quotation_Acme_School_2026-08-23.xlsx');
  });

  it('writes multiple product lines into one quotation workbook', async () => {
    const input = {
      customerName: 'Mixed Order', customerType: 'Corporate', orderDate: '2026-08-23', orderReference: 'MIX-001',
      items: [
        { id: 'tee-line', quantity: 50, productId: 'tee', productOptions: { garment: 'premium_cotton_tee' }, prints: [{ method: 'dtf', option: 'front_left_chest' }], sizes: {} },
        { id: 'polo-line', quantity: 25, productId: 'polo', productOptions: { garment: 'polo_cotton_pique' }, prints: [{ method: 'dtf', option: 'sleeve' }], sizes: {} },
      ],
      addons: {}, shippingCost: 0, notes: '',
    };
    const quote = calculateQuotation(input);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(await quotationToBuffer(quote));
    const sheet = workbook.getWorksheet('Quotation');
    const productLabels = [sheet.getCell('A10').value, sheet.getCell('A11').value];
    expect(productLabels).toEqual(['Tee (DTF/DTG)', 'Polo']);
    expect(sheet.getCell('C10').value).toBe(50);
    expect(sheet.getCell('C11').value).toBe(25);
  });
});
