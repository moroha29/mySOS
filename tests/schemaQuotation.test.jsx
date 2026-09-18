import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import SchemaQuotationForm from '../src/components/SchemaQuotationForm';
import schema from '../src/data/quotationForm.json';
import { createInitialValue } from '../src/App';
import { calculateQuotation } from '../src/engines/quotationEngine';
import { calculateSchemaQuotation, validateSchemaQuotation } from '../src/utils/schemaQuotation';
import { answerPath, writeAnswer, presentedOptions } from '../src/utils/formBindings';

describe('schema driven quotation form', () => {
  it('keeps workbook totals unchanged for the original form', () => {
    const value = createInitialValue();
    value.items[0] = { ...value.items[0], productId: 'jersey_sublimation', productOptions: { fabric: 'test' }, prints: [] };
    expect(calculateSchemaQuotation(value, schema).sellingPrice).toBe(calculateQuotation(value).sellingPrice);
  });
  it('binds customer, item and individual printing answers correctly', () => {
    expect(answerPath({ bind: 'customer.name' }, 'customer')).toEqual(['customerName']);
    const path = answerPath({ bind: 'item.prints.*.colours' }, 'print', 1, 1);
    expect(path).toEqual(['items', 1, 'prints', 1, 'colors']);
    const original = { items: [{}, { prints: [{}, {}] }] };
    expect(writeAnswer(original, path, '3').items[1].prints[1].colors).toBe('3');
    expect(original.items[1].prints[1]).toEqual({});
  });
  it('hides and relabels options without changing workbook identifiers', () => {
    expect(presentedOptions({ hiddenOptions: ['a'], optionLabels: { b: 'New name' } }, [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }])).toEqual([{ id: 'b', name: 'New name' }]);
  });
  it('renders edited titles, multiple choice questions and hidden sections', () => {
    const custom = { sections: [{ id: 'extras', title: 'Packaging preferences', fields: [{ key: 'pack', label: 'Pick colours', type: 'multiselect', options: [{ id: 'red', name: 'Red' }], required: true }] }, { id: 'hidden', title: 'Do not show', visible: false, fields: [] }] };
    const html = renderToStaticMarkup(<SchemaQuotationForm schema={custom} value={createInitialValue()} onChange={() => {}} />);
    expect(html).toContain('Packaging preferences');
    expect(html).toContain('Pick colours *');
    expect(html).toContain('type="checkbox"');
    expect(html).not.toContain('Do not show');
  });
  it('validates custom requirements and includes charges and answers in exported quote data', () => {
    const custom = { sections: [{ id: 'extras', fields: [{ key: 'pack', label: 'Gift wrapping', type: 'multiselect', options: [{ id: 'red', name: 'Red', price: 10 }], required: true, priceRule: 'flat' }] }] };
    const value = createInitialValue();
    expect(validateSchemaQuotation(value, custom)['extras.0.pack']).toBe('Gift wrapping is required.');
    value.customAnswers = { extras: { 0: { pack: ['red'] } } };
    const quote = calculateSchemaQuotation(value, custom);
    expect(quote.sellingPrice).toBe(calculateQuotation(value).sellingPrice + 10);
    expect(quote.addons.items.at(-1).quotedTotal).toBe(10);
    expect(quote.form.answers).toEqual([{ step: undefined, item: null, label: 'Gift wrapping', value: 'Red' }]);
    custom.sections[0].visible = false;
    expect(calculateSchemaQuotation(value, custom).sellingPrice).toBe(calculateQuotation(value).sellingPrice);
  });
  it('a choice question charges what the chosen answers add', () => {
    const custom = { sections: [{ id: 'extras', fields: [{ key: 'finish', label: 'Finishing', type: 'multiselect', priceRule: 'perPiece', options: [{ id: 'fold', name: 'Folding', price: 0.5 }, { id: 'bag', name: 'Poly bag', price: 0.25 }, { id: 'none', name: 'Nothing' }] }] }] };
    const value = createInitialValue();
    value.items[0] = { ...value.items[0], productId: 'jersey_sublimation', quantity: '20', productOptions: { fabric: 'mesh_knit', collar: 'round_neck', sleeve: 'short' } };
    const base = calculateQuotation(value).sellingPrice;
    value.customAnswers = { extras: { 0: { finish: ['fold', 'bag'] } } };
    const quote = calculateSchemaQuotation(value, custom);
    expect(quote.addons.items.at(-1).quotedTotal).toBeCloseTo(0.75 * quote.totalQuantity);
    expect(quote.sellingPrice).toBeCloseTo(base + 0.75 * quote.totalQuantity);
    value.customAnswers = { extras: { 0: { finish: ['none'] } } };
    expect(calculateSchemaQuotation(value, custom).sellingPrice).toBeCloseTo(base);
  });
});
