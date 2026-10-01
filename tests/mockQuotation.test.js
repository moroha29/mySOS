import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createServer } from 'vite';
import { createMockData } from '../scripts/mockQuotationData.mjs';
const load = (name) => JSON.parse(readFileSync(new URL(`../src/data/${name}.json`, import.meta.url), 'utf8'));
const changeNumbers = (value) => typeof value === 'number' ? value + 98765 : Array.isArray(value) ? value.map(changeNumbers) : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, changeNumbers(entry)])) : value;

describe('isolated public quotation demo', () => {
  it('does not derive fictional pricing from any production numeric values', () => {
    for (const name of ['productData', 'printData', 'addonData', 'tierData']) {
      const source = load(name);
      expect(createMockData(name, source)).toEqual(createMockData(name, changeNumbers(source)));
    }
  });
  it('fails closed for a new unreviewed data source', () => {
    expect(() => createMockData('privateCustomers', [{ name: 'Real client' }])).toThrow();
  });
  // Starting Vite and compiling the engines can pass the 5s default on a cold run.
  it('uses the shared engine and produces clearly labelled demo exports', { timeout: 30000 }, async () => {
    const vite = await createServer({ mode: 'mock', server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' });
    try {
      const { createInitialValue } = await vite.ssrLoadModule('/src/App.jsx');
      const { calculateQuotation, validateQuotation } = await vite.ssrLoadModule('/src/engines/quotationEngine.js');
      const { productData } = await vite.ssrLoadModule('/src/engines/productEngine.js');
      const initial = createInitialValue('');
      expect(initial.customerName).toBe('Sample Studio');
      expect(validateQuotation(initial)).toEqual({});
      const quote = calculateQuotation(initial);
      expect(quote.sellingPrice).toBeGreaterThan(0);
      expect(quote.items[0].product.name).toContain('Demo tee');
      const changed = structuredClone(initial);
      changed.items[0].quantity = '100';
      expect(calculateQuotation(changed).sellingPrice).not.toBe(quote.sellingPrice);
      const cap = productData.catalogue.find((item) => item.quotation.enabled && item.quotation.productId === 'cap');
      const { printData } = await vite.ssrLoadModule('/src/engines/printEngine.js');
      const multiple = structuredClone(initial);
      multiple.items.push({ id: 'item-2', quantity: '20', productId: 'cap', productOptions: { capType: cap.id }, prints: [{ method: 'embroidery', stitchTier: printData.embroidery.stitchTiers[0].id, digitizing: printData.embroidery.digitizing[0].id, placement: printData.embroidery.placements[0].id }], sizes: {} });
      expect(validateQuotation(multiple)).toEqual({});
      expect(calculateQuotation(multiple).items).toHaveLength(2);
      const { generateQuotationWorkbook, createQuotationFilename } = await vite.ssrLoadModule('/src/utils/excelGenerator.js');
      const workbook = generateQuotationWorkbook(quote);
      expect(workbook.getWorksheet('Quotation').getCell('A1').value).toBe('DEMO ONLY | NOT A REAL QUOTE');
      expect(createQuotationFilename('Sample Studio', initial.orderDate)).toMatch(/^DEMO_NOT_A_QUOTE_/);
      const bytes = await workbook.xlsx.writeBuffer();
      expect(bytes.byteLength).toBeGreaterThan(5000);
    } finally { await vite.close(); }
  });
});
