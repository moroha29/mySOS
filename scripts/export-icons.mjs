/*
 * Writes src/data/iconLibrary.json from Icons.jsx. See iconLibrary.mjs.
 *
 *   npm run icons
 */
import { createServer } from 'vite';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildIconLibrary, iconLibraryJson, ICON_LIBRARY_FILE } from './iconLibrary.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const vite = await createServer({ root, server: { middlewareMode: true }, appType: 'custom', logLevel: 'warn' });
try {
  const { iconGlyphs } = await vite.ssrLoadModule('/src/public/components/Icons.jsx');
  const source = await readFile(path.join(root, 'src/public/components/Icons.jsx'), 'utf8');
  const render = (glyph) => renderToStaticMarkup(React.createElement('svg', null, glyph)).replace(/^<svg>|<\/svg>$/g, '');
  const library = buildIconLibrary({ glyphs: iconGlyphs, source, render });
  await writeFile(path.join(root, ICON_LIBRARY_FILE), iconLibraryJson(library));
  console.log(`Wrote ${library.icons.length} icons to ${ICON_LIBRARY_FILE}`);
} finally {
  await vite.close();
}
