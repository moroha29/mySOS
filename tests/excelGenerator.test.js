import ExcelJS from 'exceljs';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { calculateQuotation } from '../src/engines/quotationEngine';
import { createQuotationFilename, quotationToBuffer } from '../src/utils/excelGenerator';

describe('Excel quotation output', () => {
  it('creates, saves and reopens a complete formatted XLSX workbook', async () => {
    const quote = calculateQuotation({
      customerName: 'Client Name', customerType: 'School', orderDate: '2026-08-24', orderReference: 'CLIENT-2408', quantity: 50,
      productId: 'tee', productOptions: { garment: 'premium_cotton_tee' }, prints: [{ method: 'dtf', option: 'front_left_chest' }], addons: { packaging: { selected: true }, design_fee: { selected: true } },
      sizes: {}, shippingMethod: 'Local Delivery', shippingCost: 12, notes: 'Valid for 14 days.',
    });
    const buffer = await quotationToBuffer(quote);
    expect(buffer.byteLength).toBeGreaterThan(8000);
    const directory = await mkdtemp(join(tmpdir(), 'mysos-quotation-'));
    const filename = createQuotationFilename('Client Name', '2026-08-24');
    const filePath = join(directory, filename);
    try {
      await writeFile(filePath, Buffer.from(buffer));
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(filePath);
      const sheet = workbook.getWorksheet('Quotation');
      expect(filename).toBe('mySOS_Quotation_Client_Name_2026-08-24.xlsx');
      expect(sheet.getCell('A1').value).toContain('mySOS');
      expect(sheet.getCell('A1').fill.fgColor.argb).toBe('123B35');
      expect(sheet.getCell('B5').value).toBe('Client Name');
      expect(sheet.getCell('E5').value.toISOString().slice(0, 10)).toBe('2026-08-24');
      expect(sheet.getCell('B6').value).toBe('School');
      expect(sheet.getCell('E6').value).toBe('CLIENT-2408');
      expect(sheet.getCell('A10').value).toBe('Tee (DTF/DTG)');
      expect(sheet.getCell('B10').value).toContain('DTF — Front Left Chest');
      expect(sheet.getCell('C10').value).toBe(50);
      expect(sheet.getCell('D10').value).toBe(11.1);
      expect(sheet.getCell('E10').value).toMatchObject({ formula: 'C10*D10', result: 555 });
      expect(sheet.getCell('A11').value).toBe('Packaging');
      expect(sheet.getCell('A12').value).toBe('Design Fee');
      expect(sheet.getCell('A13').value).toBe('Shipping');
      expect(sheet.getCell('E13').value).toBeCloseTo(34.2);
      expect(sheet.getCell('E18').value).toBeCloseTo(quote.sellingPrice);
      expect(sheet.getCell('E18').fill.fgColor.argb).toBe('E46B45');
      expect(sheet.getCell('D10').numFmt).toContain('SGD');
      expect(sheet.actualRowCount).toBeGreaterThanOrEqual(19);
      sheet.eachRow((row) => row.eachCell((cell) => {
        expect(cell.text).not.toMatch(/undefined|NaN|\[object Object\]/i);
      }));
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
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

  it('writes a blank product name, description, and direct unit price', async () => {
    const quote = calculateQuotation({
      customerName: 'Custom Order', customerType: 'Corporate', orderDate: '2026-08-27', orderReference: 'CUSTOM-001',
      items: [{
        id: 'custom-line', quantity: 8, productId: 'custom_product',
        productOptions: { customName: 'Travel Pouch', customDescription: 'Recycled canvas pouch with zip', customUnitPrice: 7.25 },
        prints: [{ method: 'none' }], sizes: {},
      }],
      addons: {}, shippingCost: 0, notes: '',
    });
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(await quotationToBuffer(quote));
    const sheet = workbook.getWorksheet('Quotation');
    expect(sheet.getCell('A10').value).toBe('Travel Pouch');
    expect(sheet.getCell('B10').value).toContain('Recycled canvas pouch with zip');
    expect(sheet.getCell('B10').value).toContain('Direct unit price');
    expect(sheet.getCell('D10').value).toBe(7.25);
    expect(sheet.getCell('E10').value).toMatchObject({ result: 58 });
  });
});
