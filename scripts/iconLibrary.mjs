/*
 * The icon set, as data the website manager can offer as choices.
 *
 * Icons are drawn in src/public/components/Icons.jsx and content stores only an
 * icon's name ("school", "supplier"). The manager needs to show the choices as
 * pictures, and must offer exactly the icons this site can draw — a copy kept
 * in the manager would drift the first time an icon was added here. So the
 * list is generated from Icons.jsx into src/data/iconLibrary.json, which the
 * manager reads like the other data files, and a test fails whenever the two
 * disagree. Regenerate with `npm run icons`.
 *
 * The groups are the comment headings in Icons.jsx. Interface glyphs (arrows,
 * chevrons, close) and other companies' marks (WhatsApp, Google, Facebook…)
 * are left out: they are not something a section's icon should be.
 */

export const ICON_LIBRARY_FILE = 'src/data/iconLibrary.json';

const NOT_OFFERED = new Set([
  'arrowRight', 'chevronDown', 'chevronUp', 'chevronLeft', 'chevronRight', 'close', 'plus', 'minus',
  'mouse', 'upload', 'trash', 'quote',
  'whatsapp', 'google', 'facebook', 'instagram', 'linkedin', 'youtube',
]);

// Icons.jsx's comment headings, as the manager shows them.
const GROUP_NAMES = [
  [/product/i, 'Products'],
  [/industr/i, 'Industries'],
  [/benefit/i, 'Why choose us'],
  [/print/i, 'Printing'],
  [/process/i, 'How it works'],
];

const groupName = (comment) => GROUP_NAMES.find(([pattern]) => pattern.test(comment))?.[1] || 'General';

/** "checkCircle" -> "Check circle". */
export const iconLabel = (name) => name.replace(/([a-z0-9])([A-Z])/g, '$1 $2').toLowerCase().replace(/^./, (char) => char.toUpperCase());

/** Which comment heading each icon sits under in Icons.jsx. */
export function iconGroups(source) {
  const groups = {};
  let current = 'General';
  for (const line of source.split(/\r?\n/)) {
    const heading = line.match(/^\s*\/\/\s*(.+)$/);
    if (heading) current = groupName(heading[1]);
    const entry = line.match(/^\s{2}([A-Za-z][A-Za-z0-9]*):/);
    if (entry) groups[entry[1]] = current;
  }
  return groups;
}

/**
 * The library: every offered icon with its label, group and SVG markup.
 * `render(glyph)` returns the glyph's markup, without the enclosing <svg>.
 */
export function buildIconLibrary({ glyphs, source, render }) {
  const groups = iconGroups(source);
  const icons = Object.keys(glyphs)
    .filter((name) => !NOT_OFFERED.has(name))
    .map((name) => ({ name, label: iconLabel(name), group: groups[name] || 'General', svg: render(glyphs[name]) }));
  return { version: 1, viewBox: '0 0 24 24', icons };
}

export const iconLibraryJson = (library) => `${JSON.stringify(library, null, 2)}\n`;
