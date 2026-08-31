/*
 * Maps the `imageStyle` strings used across the data files onto the placeholder
 * artwork in `src/public/components/Visuals.jsx`. When real photography lands,
 * point `image` at a file instead and these fall away.
 */

const COLOURS = new Set(['navy', 'green', 'black', 'white', 'grey', 'blue', 'sand', 'teal']);

const TYPE_ALIASES = {
  bag: 'tote',
  canvas: 'tote',
  bucket: 'cap',
  jacket: 'jacket',
  gift: 'gift-set',
};

export function parseProductVisual(imageStyle = 'tee-navy') {
  const parts = String(imageStyle).split('-');
  let colour = 'navy';
  if (COLOURS.has(parts.at(-1))) colour = parts.pop();
  else if (parts.at(-1) === 'canvas') { parts.pop(); colour = 'sand'; }
  let type = parts.join('-');
  if (type === 'gift') type = 'gift-set';
  if (TYPE_ALIASES[type]) type = TYPE_ALIASES[type];
  if (type === 'bucket') colour = 'sand';
  if (type === 'bottle' && colour === 'navy') colour = 'teal';
  if (type === 'lanyard') colour = 'blue';
  return { type: type || 'tee', colour };
}

const STORY_SCENES = {
  'team-green': { kind: 'field', shirt: '#0a5c3a' },
  'team-lineup': { kind: 'field', shirt: '#14509c' },
  'jersey-detail': { kind: 'studio', shirt: '#0a5c3a' },
  production: { kind: 'workshop' },
  'corporate-navy': { kind: 'office', shirt: '#0d2a6b' },
  'event-pack': { kind: 'hall', shirt: '#20262f' },
  'tee-detail': { kind: 'studio', shirt: '#0d2a6b' },
  'school-pack': { kind: 'hall', shirt: '#14509c' },
  'sports-blue': { kind: 'field', shirt: '#14509c' },
  'football-green': { kind: 'field', shirt: '#0f7a4d' },
  festival: { kind: 'stage', shirt: '#20262f' },
  'community-green': { kind: 'hall', shirt: '#0f7a4d' },
  launch: { kind: 'office', shirt: '#20262f' },
  'church-camp': { kind: 'outdoor', shirt: '#0b5a5e' },
  sketch: { kind: 'sketch' },
};

const INDUSTRY_SCENES = {
  schools: { kind: 'hall', shirt: '#14509c' },
  businesses: { kind: 'office', shirt: '#0d2a6b' },
  events: { kind: 'stage', shirt: '#20262f' },
  churches: { kind: 'outdoor', shirt: '#0b5a5e' },
  'sports-teams': { kind: 'field', shirt: '#0a5c3a' },
  community: { kind: 'hall', shirt: '#0f7a4d' },
};

// A style may also name a scene kind directly (e.g. `office`, `studio`).
const SCENE_KINDS = {
  field: '#0a5c3a',
  office: '#0e2f78',
  stage: '#20262f',
  hall: '#14509c',
  outdoor: '#0b5a5e',
  studio: '#20262f',
  workshop: null,
  sketch: null,
};

export function parseSceneVisual(style = 'field') {
  const direct = STORY_SCENES[style] ?? INDUSTRY_SCENES[style];
  if (direct) return direct;
  if (style in SCENE_KINDS) return { kind: style, shirt: SCENE_KINDS[style] ?? '#0e2f78' };
  return { kind: 'field', shirt: '#0e2f78' };
}
