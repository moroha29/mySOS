import { readFileSync } from 'node:fs';

// Values depend only on field paths, never on the production price or margin.
function sampleNumber(path) {
  const hash = [...path].reduce((n, char) => (n * 31 + char.charCodeAt(0)) >>> 0, 7);
  if (/multiplier/i.test(path)) return 1.1 + (hash % 4) / 10;
  if (/marginAdjustment/i.test(path)) return .03;
  if (/metresPerGarment/i.test(path)) return 1.5;
  return Number((2.37 + (hash % 11) * .83).toFixed(2));
}
function syntheticNumbers(value, path = '') {
  if (typeof value === 'number') return sampleNumber(path);
  if (Array.isArray(value)) return value.map((entry, index) => syntheticNumbers(entry, `${path}.${index}`));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, syntheticNumbers(entry, `${path}.${key}`)]));
  return value;
}
export function createMockData(name, source) {
  if (name === 'successStories') return [];
  if (name === 'siteConfig') return { companyName: 'Demo Merchandise Studio', legalName: 'Fictional demo company', basePath: '/mySOS/', email: '', whatsapp: { enabled: false }, socialLinks: [], navigation: [] };
  if (name === 'tierData') {
    const boundaries = [[1, 12], [13, 24], [25, 48], [49, 96], [97, 192], [193, 384], [385, 768], [769, 999999]];
    return boundaries.map(([minQty, maxQty], index) => ({ label: `${minQty}–${maxQty}`, minQty, maxQty, costMultiplier: 1, sellMultiplier: 1.9 - index * .07, marginAdjustment: .01 }));
  }
  if (name === 'quotationForm') {
    // Form structure stays shared. Any custom pricing is replaced before bundling.
    const schema = structuredClone(source);
    schema.notes = ['Public demonstration using fictional data.'];
    for (const section of schema.sections) for (const field of section.fields) {
      if (field.priceRule) field.priceRule = syntheticNumbers(field.priceRule, field.key);
      if ('defaultValue' in field) delete field.defaultValue;
      if ('default' in field) delete field.default;
    }
    return schema;
  }
  if (!['productData', 'printData', 'addonData'].includes(name)) throw new Error(`Mock build has no safe data provider for ${name}`);
  const result = syntheticNumbers(source);
  if (name === 'productData') {
    result.catalogue.forEach((item, index) => {
      item.public.name = `Demo ${item.quotation.productId.replaceAll('_', ' ')} ${String(index + 1).padStart(2, '0')}`;
      item.public.description = 'Fictional sample merchandise for demonstrating the quotation workflow.';
      item.public.slug = `demo-product-${index + 1}`;
      item.quotation.minimumQuantity = 1;
    });
  }
  return result;
}
export function mockDataPlugin(root) {
  const prefix = '\0mock-quotation-data:';
  return {
    name: 'isolated-mock-quotation-data', enforce: 'pre',
    resolveId(id) {
      const match = id.replaceAll('\\', '/').match(/\/data\/([^/]+)\.json$/);
      if (match) return prefix + match[1];
    },
    generateBundle(_options, bundle) {
      for (const output of Object.values(bundle)) {
        if (output.type !== 'chunk') continue;
        const realData = Object.keys(output.modules).filter((id) => /\/src\/data\//.test(id.replaceAll('\\', '/')));
        if (realData.length) throw new Error('Production data entered the mock bundle: ' + realData.join(', '));
      }
    },
    load(id) {
      if (!id.startsWith(prefix)) return;
      const name = id.slice(prefix.length);
      const source = JSON.parse(readFileSync(`${root}/src/data/${name}.json`, 'utf8'));
      return `export default ${JSON.stringify(createMockData(name, source))};`;
    },
  };
}
