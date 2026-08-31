/*
 * Placeholder artwork. The reference design uses photography throughout; until real
 * assets are supplied these SVG scenes stand in so every slot keeps the right shape,
 * tone and composition. Swap `image` on the data records to use a real photo instead.
 */

const palettes = {
  navy: { base: '#0d2a6b', shade: '#081d4d', light: '#1b3f8f' },
  green: { base: '#0a5c3a', shade: '#053f28', light: '#0f7a4d' },
  black: { base: '#20262f', shade: '#12161c', light: '#333b46' },
  white: { base: '#f2f4f7', shade: '#dfe3ea', light: '#ffffff' },
  grey: { base: '#8d95a3', shade: '#6d7583', light: '#a8b0bd' },
  blue: { base: '#14509c', shade: '#0d3a75', light: '#2a6cc4' },
  sand: { base: '#e5dcc8', shade: '#cdc2a9', light: '#f3ece0' },
  teal: { base: '#0b5a5e', shade: '#073e41', light: '#0f7a80' },
};

const paletteFor = (color) => palettes[color] ?? palettes.navy;

/* ---------------------------------------------------------------- garments */

const bodyOf = (variant) => {
  if (variant === 'long') return 'M78 24 L56 30 L26 60 L38 158 L64 154 L64 182 L136 182 L136 154 L162 158 L174 60 L144 30 L122 24 C118 44 82 44 78 24 Z';
  if (variant === 'hoodie') return 'M78 26 L54 32 L24 64 L40 156 L64 152 L64 186 L136 186 L136 152 L160 156 L176 64 L146 32 L122 26 C118 46 82 46 78 26 Z';
  if (variant === 'sleeveless') return 'M80 24 L60 30 L54 70 L64 76 L64 182 L136 182 L136 76 L146 70 L140 30 L120 24 C117 42 83 42 80 24 Z';
  return 'M78 24 L56 30 L30 62 L48 98 L64 84 L64 182 L136 182 L136 84 L152 98 L170 62 L144 30 L122 24 C118 44 82 44 78 24 Z';
};

function Garment({ type = 'tee', color = 'navy', mark = 'MySOS' }) {
  const p = paletteFor(color);
  const variant = type === 'long-sleeve' ? 'long' : type === 'hoodie' || type === 'jacket' || type === 'windbreaker' || type === 'bomber' ? 'hoodie' : 'tee';
  const stroke = color === 'white' ? '#c3cad6' : 'rgba(255,255,255,.22)';
  return (
    <svg viewBox="18 14 164 176" className="garment" role="presentation" aria-hidden="true">
      <defs>
        <linearGradient id={`g-${type}-${color}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={p.light} />
          <stop offset="55%" stopColor={p.base} />
          <stop offset="100%" stopColor={p.shade} />
        </linearGradient>
      </defs>
      <path d={bodyOf(variant)} fill={`url(#g-${type}-${color})`} stroke={stroke} strokeWidth="1.5" />
      {/* soft fabric shading down the centre */}
      <path d="M100 52 V180" stroke="rgba(0,0,0,.12)" strokeWidth="10" fill="none" opacity=".35" />
      {type === 'polo' && <>
        {/* collar band, then the buttoned placket */}
        <path d="M76 22 C80 46 120 46 124 22 L115 19 C111 37 89 37 85 19 Z" fill={p.light} stroke={stroke} strokeWidth="1" />
        <rect x="94" y="40" width="12" height="30" rx="1" fill={p.shade} opacity=".6" />
        <circle cx="100" cy="48" r="2.2" fill="rgba(255,255,255,.65)" />
        <circle cx="100" cy="62" r="2.2" fill="rgba(255,255,255,.65)" />
      </>}
      {(type === 'jacket' || type === 'windbreaker' || type === 'bomber') && <>
        <path d="M100 40 V186" stroke="rgba(255,255,255,.35)" strokeWidth="2" fill="none" />
        <path d="M64 176 H136" stroke="rgba(0,0,0,.3)" strokeWidth="7" fill="none" />
      </>}
      {type === 'hoodie' && <>
        <path d="M78 26 C86 52 114 52 122 26" fill="none" stroke={stroke} strokeWidth="8" />
        <path d="M92 46 V70 M108 46 V70" stroke="rgba(255,255,255,.4)" strokeWidth="2" fill="none" />
        <path d="M76 128 h48 v26 h-48 z" fill="rgba(0,0,0,.16)" />
      </>}
      {type === 'jersey' && <>
        <text x="100" y="128" textAnchor="middle" fontSize="46" fontWeight="800" fill="rgba(255,255,255,.9)" fontFamily="Inter, sans-serif">10</text>
        <text x="100" y="82" textAnchor="middle" fontSize="12" fontWeight="700" letterSpacing="1.5" fill="rgba(255,255,255,.75)" fontFamily="Inter, sans-serif">{mark}</text>
      </>}
      {type !== 'jersey' && mark && <text x="100" y="104" textAnchor="middle" fontSize="13" fontWeight="800" letterSpacing="1.4" fill={color === 'white' || color === 'sand' ? 'rgba(13,42,107,.55)' : 'rgba(255,255,255,.68)'} fontFamily="Inter, sans-serif">{mark}</text>}
    </svg>
  );
}

function Cap({ color = 'navy', mark = 'MySOS' }) {
  const p = paletteFor(color);
  return (
    <svg viewBox="34 40 142 118" className="garment" role="presentation" aria-hidden="true">
      <path d="M46 128 C46 74 76 48 100 48 C124 48 154 74 154 128 Z" fill={p.base} stroke="rgba(255,255,255,.2)" strokeWidth="1.5" />
      <path d="M100 48 V128" stroke="rgba(0,0,0,.2)" strokeWidth="2" />
      <path d="M40 128 H170 C170 146 150 150 128 150 H46 C40 150 38 140 40 128 Z" fill={p.shade} />
      <circle cx="100" cy="52" r="5" fill={p.light} />
      <text x="100" y="106" textAnchor="middle" fontSize="12" fontWeight="800" letterSpacing="1.2" fill="rgba(255,255,255,.75)" fontFamily="Inter, sans-serif">{mark}</text>
    </svg>
  );
}

function Tote({ color = 'sand', mark = 'YOUR BRAND HERE' }) {
  const p = paletteFor(color);
  return (
    <svg viewBox="46 24 108 158" className="garment" role="presentation" aria-hidden="true">
      <path d="M74 62 C74 34 126 34 126 62" fill="none" stroke={p.shade} strokeWidth="9" strokeLinecap="round" />
      <rect x="52" y="58" width="96" height="118" rx="4" fill={p.base} stroke={p.shade} strokeWidth="1.5" />
      <path d="M52 58 H148 V72 H52 Z" fill="rgba(0,0,0,.06)" />
      <text x="100" y="118" textAnchor="middle" fontSize="12" fontWeight="800" letterSpacing="0.8" fill="rgba(13,42,107,.6)" fontFamily="Inter, sans-serif">{mark.split(' ')[0]}</text>
      <text x="100" y="134" textAnchor="middle" fontSize="12" fontWeight="800" letterSpacing="0.8" fill="rgba(13,42,107,.6)" fontFamily="Inter, sans-serif">{mark.split(' ').slice(1).join(' ')}</text>
    </svg>
  );
}

function Bottle({ color = 'green', mark = 'MySOS' }) {
  const p = paletteFor(color);
  return (
    <svg viewBox="70 18 60 168" className="garment" role="presentation" aria-hidden="true">
      <rect x="86" y="24" width="28" height="18" rx="4" fill={p.shade} />
      <rect x="76" y="40" width="48" height="140" rx="20" fill={p.base} stroke="rgba(255,255,255,.18)" strokeWidth="1.5" />
      <rect x="84" y="52" width="10" height="112" rx="5" fill="rgba(255,255,255,.16)" />
      <text x="100" y="116" textAnchor="middle" fontSize="10" fontWeight="800" letterSpacing="1" fill="rgba(255,255,255,.75)" fontFamily="Inter, sans-serif" transform="rotate(-90 100 116)">{mark}</text>
    </svg>
  );
}

function GiftSet({ color = 'navy' }) {
  const p = paletteFor(color);
  return (
    <svg viewBox="32 36 136 136" className="garment" role="presentation" aria-hidden="true">
      <rect x="46" y="84" width="108" height="82" rx="5" fill={p.base} />
      <rect x="38" y="66" width="124" height="24" rx="5" fill={p.light} />
      <rect x="92" y="66" width="16" height="100" fill="#0f9a55" />
      <rect x="46" y="118" width="108" height="12" fill="#0f9a55" opacity=".9" />
      <path d="M100 66 C86 66 74 58 74 50 C74 42 86 42 92 50 L100 64 L108 50 C114 42 126 42 126 50 C126 58 114 66 100 66 Z" fill="#0f9a55" />
      <circle cx="100" cy="62" r="5" fill="#0b7f45" />
    </svg>
  );
}

function Notebook({ color = 'navy' }) {
  const p = paletteFor(color);
  return (
    <svg viewBox="46 24 116 152" className="garment" role="presentation" aria-hidden="true">
      <rect x="58" y="30" width="90" height="140" rx="5" fill={p.base} />
      <rect x="52" y="30" width="14" height="140" rx="4" fill={p.shade} />
      <rect x="132" y="30" width="8" height="140" fill="rgba(255,255,255,.08)" />
      <circle cx="103" cy="96" r="16" fill="none" stroke="rgba(255,255,255,.5)" strokeWidth="2" />
      <path d="M148 66 h10 v14 h-10 z" fill="#0f9a55" />
    </svg>
  );
}

function Lanyard({ color = 'blue' }) {
  const p = paletteFor(color);
  return (
    <svg viewBox="60 14 80 160" className="garment" role="presentation" aria-hidden="true">
      <path d="M66 20 L100 96 L134 20" fill="none" stroke={p.base} strokeWidth="12" />
      <rect x="74" y="96" width="52" height="72" rx="5" fill="#f4f6f9" stroke="#c9d1de" strokeWidth="1.5" />
      <rect x="82" y="108" width="36" height="6" rx="3" fill={p.base} />
      <rect x="82" y="122" width="26" height="5" rx="2.5" fill="#c9d1de" />
      <rect x="82" y="134" width="32" height="5" rx="2.5" fill="#c9d1de" />
    </svg>
  );
}

const garmentTypes = new Set(['tee', 'polo', 'jersey', 'hoodie', 'jacket', 'windbreaker', 'bomber', 'long-sleeve', 'sleeveless']);

export function Product({ type = 'tee', color = 'navy', mark = 'MySOS', className = '' }) {
  const art = type === 'cap' || type === 'bucket' ? <Cap color={color} mark={mark} />
    : type === 'tote' || type === 'bag' ? <Tote color={color} />
      : type === 'bottle' ? <Bottle color={color} mark={mark} />
        : type === 'gift-set' ? <GiftSet color={color} />
          : type === 'notebook' ? <Notebook color={color} />
            : type === 'lanyard' ? <Lanyard color={color} />
              : garmentTypes.has(type) ? <Garment type={type} color={color} mark={mark} />
                : <Garment type="tee" color={color} mark={mark} />;
  return <div className={`product-visual ${className}`.trim()}>{art}</div>;
}
/* ------------------------------------------------------------------ scenes */

/*
 * Stand-in photography. Each scene is built from a blurred backdrop, a lit
 * midground and a row of figures, then graded with a warm wash and a vignette
 * so it reads as a photograph at card size rather than as an icon.
 */

const skinTones = ['#c68e63', '#a86f49', '#d9a97f', '#8b5a39', '#b87f56'];
const hairTones = ['#2b2119', '#171310', '#3d2a1c', '#0f0d0c'];

function Person({ x, scale = 1, shirt = '#0d2a6b', skin = '#c68e63', hair = '#2b2119', pose = 0 }) {
  const sleeve = 'rgba(0,0,0,.14)';
  return (
    <g transform={`translate(${x} 0) scale(${scale})`}>
      <ellipse cx="0" cy="1" rx="15" ry="3.6" fill="#000" opacity=".2" />
      <rect x="-9.5" y="-29" width="8.5" height="29" rx="2.5" fill="#222a38" />
      <rect x="1" y="-29" width="8.5" height="29" rx="2.5" fill="#2a3342" />
      <rect x="-11.5" y="-37" width="23" height="12" rx="3" fill="#1c2431" />
      <rect x="-12" y="-65" width="24" height="30" rx="4" fill={shirt} />
      <rect x="-12" y="-65" width="7" height="30" fill="#fff" opacity=".07" />
      <path d="M-12 -64 h7 v29 h-7 z" fill="none" />
      <rect x="-17.5" y="-64" width="6.5" height="14" rx="3" fill={shirt} />
      <rect x="11" y="-64" width="6.5" height="14" rx="3" fill={shirt} />
      <path d="M-17.5 -51 h6.5 M11 -51 h6.5" stroke={sleeve} strokeWidth="1" />
      {pose === 1
        ? <rect x="-13" y="-50" width="26" height="6" rx="3" fill={skin} />
        : <>
          <rect x={pose === 2 ? -19 : -16.5} y="-50" width="5" height={pose === 2 ? 10 : 16} rx="2.5" fill={skin} transform={pose === 2 ? 'rotate(-22 -16 -50)' : undefined} />
          <rect x="11.5" y="-50" width="5" height="16" rx="2.5" fill={skin} />
        </>}
      <rect x="-3.2" y="-71" width="6.4" height="7" rx="2" fill={skin} />
      <circle cx="0" cy="-77" r="8.2" fill={skin} />
      <path d="M-8.2 -78.5 a8.2 8.2 0 0 1 16.4 0 q-3 -4.5 -8.2 -4.5 t-8.2 4.5 z" fill={hair} />
      <ellipse cx="0" cy="-70.5" rx="7" ry="2.4" fill="#000" opacity=".08" />
    </g>
  );
}

function Backdrop({ kind, width, id }) {
  const w = width + 24;
  const x0 = -12;
  if (kind === 'office') {
    return <g>
      <rect x={x0} y="-12" width={w} height="120" fill="#dfe5ee" />
      {Array.from({ length: Math.ceil(w / 52) }, (_, i) => <g key={i}>
        <rect x={x0 + 8 + i * 52} y="-4" width="36" height="78" rx="2" fill="#eaf2fb" />
        <rect x={x0 + 8 + i * 52} y="-4" width="36" height="78" rx="2" fill="#9fc4e8" opacity=".45" />
        <rect x={x0 + 8 + i * 52} y="-4" width="14" height="78" fill="#fff" opacity=".5" />
      </g>)}
      <rect x={x0} y="72" width={w} height="12" fill="#c3cbd8" />
    </g>;
  }
  if (kind === 'stage') {
    return <g>
      <rect x={x0} y="-12" width={w} height="120" fill="#1d1030" />
      <path d={`M${width * 0.16} -12 L${width * 0.34} 96 H${width * 0.02} Z`} fill="#ffd27a" opacity=".22" />
      <path d={`M${width * 0.84} -12 L${width * 0.66} 96 H${width * 0.98} Z`} fill="#ff6fb5" opacity=".2" />
      <circle cx={width * 0.24} cy="24" r="17" fill="#ffcf6a" opacity=".5" />
      <circle cx={width * 0.52} cy="14" r="11" fill="#ff85c2" opacity=".45" />
      <circle cx={width * 0.78} cy="28" r="14" fill="#ff9d4d" opacity=".45" />
      <rect x={x0} y="62" width={w} height="34" fill="#120a20" opacity=".75" />
    </g>;
  }
  if (kind === 'hall') {
    return <g>
      <rect x={x0} y="-12" width={w} height="120" fill="#e6dac2" />
      <rect x={x0} y="-12" width={w} height="34" fill="#cbbb9c" />
      {Array.from({ length: Math.ceil(w / 64) }, (_, i) => <rect key={i} x={x0 + 20 + i * 64} y="14" width="10" height="62" fill="#b9a684" opacity=".7" />)}
      <rect x={width * 0.3} y="10" width={width * 0.4} height="26" rx="3" fill="#0d2a6b" opacity=".7" />
    </g>;
  }
  if (kind === 'outdoor') {
    return <g>
      <rect x={x0} y="-12" width={w} height="120" fill="#cfe7ef" />
      <rect x={x0} y="-12" width={w} height="52" fill="#a9d6e4" />
      {Array.from({ length: Math.ceil(w / 28) }, (_, i) => <circle key={i} cx={x0 + 14 + i * 28} cy={50 - (i % 3) * 5} r={13 + (i % 2) * 4} fill="#2f7d5e" opacity=".9" />)}
      <rect x={x0} y="74" width={w} height="30" fill="#4f8f6a" />
    </g>;
  }
  if (kind === 'studio') {
    return <g>
      <rect x={x0} y="-12" width={w} height="120" fill="#aeb7c4" />
      <ellipse cx={width / 2} cy="66" rx={width * 0.42} ry="52" fill="#dde3ea" opacity=".85" />
      <rect x={x0} y="86" width={w} height="22" fill="#98a2b1" />
    </g>;
  }
  // field
  return <g>
    <rect x={x0} y="-12" width={w} height="120" fill="#cbe4f3" />
    <rect x={x0} y="-12" width={w} height="40" fill="#a9d3ea" />
    {/* distant stand */}
    <rect x={x0} y="48" width={w} height="20" fill="#8b98a6" />
    {Array.from({ length: Math.ceil(w / 8) }, (_, i) => <rect key={i} x={x0 + i * 8} y="50" width="4.5" height="16" fill="#9daab8" />)}
    {/* treeline on the horizon */}
    {Array.from({ length: Math.ceil(w / 30) }, (_, i) => <circle key={i} cx={x0 + 14 + i * 30} cy={46 - (i % 3) * 3} r={11 + (i % 2) * 3} fill="#43804f" />)}
    <rect x={x0} y="66" width={w} height="42" fill="#55974f" />
  </g>;
}

function Foreground({ kind, width }) {
  if (kind === 'field') {
    return <g>
      <rect y="96" width={width} height="54" fill="#4a8c4d" />
      {Array.from({ length: Math.ceil(width / 34) }, (_, i) => i % 2 === 0
        && <rect key={i} x={i * 34} y="96" width="34" height="54" fill="#fff" opacity=".05" />)}
      <path d={`M0 118 H${width}`} stroke="#fff" strokeWidth="1.6" opacity=".38" fill="none" />
      <rect y="96" width={width} height="54" fill="url(#grass-shade)" opacity=".35" />
    </g>;
  }
  if (kind === 'office') return <rect y="96" width={width} height="54" fill="#6f7889" />;
  if (kind === 'stage') return <rect y="96" width={width} height="54" fill="#160c26" />;
  if (kind === 'hall') return <g>
    <rect y="96" width={width} height="54" fill="#8a7250" />
    {Array.from({ length: Math.ceil(width / 26) }, (_, i) => <rect key={i} x={i * 26} y="96" width="1.4" height="54" fill="#6d5940" opacity=".7" />)}
  </g>;
  if (kind === 'outdoor') return <rect y="96" width={width} height="54" fill="#4a8768" />;
  return <rect y="96" width={width} height="54" fill="#8f99a8" />;
}

/*
 * `wide` widens the viewBox so a scene stretched across a full-width hero keeps
 * its figures at a believable size instead of cropping into abstract blobs.
 */
export function Scene({ kind = 'field', shirt = '#0d2a6b', people, wide = false, className = '', label }) {
  const width = wide ? 560 : 260;
  const count = people ?? (wide ? 15 : 7);
  const backCount = Math.max(2, Math.round(count * 0.7));
  const id = `${kind}-${shirt.replace('#', '')}-${width}`;
  const spacing = width / (count + 1);
  const accent = kind === 'stage' || kind === 'studio' ? '#f2f4f7' : '#ffffff';
  const base = kind === 'studio' ? 1.3 : 1;

  return (
    <div className={`scene ${className}`.trim()} role="img" aria-label={label || ''}>
      <svg viewBox={`0 0 ${width} 150`} preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs>
          <filter id={`soft-${id}`} x="-6%" y="-6%" width="112%" height="112%">
            <feGaussianBlur stdDeviation="2.4" />
          </filter>
          <linearGradient id="grass-shade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#000" stopOpacity=".28" />
            <stop offset="100%" stopColor="#000" stopOpacity="0" />
          </linearGradient>
          <radialGradient id={`vig-${id}`} cx="50%" cy="46%" r="72%">
            <stop offset="55%" stopColor="#000" stopOpacity="0" />
            <stop offset="100%" stopColor="#000" stopOpacity=".38" />
          </radialGradient>
          <linearGradient id={`light-${id}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fff" stopOpacity=".16" />
            <stop offset="60%" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
        </defs>

        <g filter={`url(#soft-${id})`}><Backdrop kind={kind} width={width} id={id} /></g>
        <Foreground kind={kind} width={width} />

        {/* back row, smaller and knocked back for depth */}
        <g transform="translate(0 122)" opacity=".85">
          {Array.from({ length: backCount }, (_, i) => (
            <Person
              key={`b${i}`}
              x={(width / (backCount + 1)) * (i + 1) + 9}
              scale={0.62 * base}
              shirt={i % 4 === 2 ? accent : shirt}
              skin={skinTones[(i + 2) % skinTones.length]}
              hair={hairTones[(i + 1) % hairTones.length]}
              pose={(i + 1) % 3}
            />
          ))}
          <rect x="-10" y="-90" width={width + 20} height="100" fill="#0b1c3a" opacity=".16" />
        </g>
        <g transform="translate(0 140)">
          {Array.from({ length: count }, (_, i) => (
            <Person
              key={i}
              x={spacing * (i + 1)}
              scale={(i % 3 === 1 ? 0.87 : i % 3 === 2 ? 0.78 : 0.83) * base}
              shirt={i % 5 === 3 ? accent : shirt}
              skin={skinTones[i % skinTones.length]}
              hair={hairTones[i % hairTones.length]}
              pose={i % 3}
            />
          ))}
        </g>

        <rect width={width} height="150" fill="#ff9a3c" opacity=".05" />
        <rect width={width} height="150" fill={`url(#light-${id})`} />
        <rect width={width} height="150" fill={`url(#vig-${id})`} />
      </svg>
    </div>
  );
}

export function Workshop({ className = '', label }) {
  return (
    <div className={`scene ${className}`.trim()} role="img" aria-label={label || ''}>
      <svg viewBox="0 0 260 150" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs>
          <filter id="ws-soft" x="-6%" y="-6%" width="112%" height="112%"><feGaussianBlur stdDeviation="2.6" /></filter>
          <radialGradient id="ws-vig" cx="50%" cy="46%" r="72%">
            <stop offset="52%" stopColor="#000" stopOpacity="0" />
            <stop offset="100%" stopColor="#000" stopOpacity=".45" />
          </radialGradient>
        </defs>
        <g filter="url(#ws-soft)">
          <rect x="-10" y="-10" width="280" height="130" fill="#39414e" />
          <rect x="-10" y="-10" width="280" height="46" fill="#4c5665" />
          <rect x="16" y="6" width="52" height="30" rx="3" fill="#8d97a6" opacity=".5" />
          <rect x="192" y="6" width="52" height="30" rx="3" fill="#8d97a6" opacity=".5" />
        </g>
        <rect y="98" width="260" height="52" fill="#242a34" />
        <rect x="10" y="92" width="240" height="10" rx="2" fill="#3e4757" />
        {/* carousel press */}
        <g stroke="#98a3b4" strokeWidth="3.2" fill="none">
          <circle cx="130" cy="70" r="32" />
          <path d="M130 38 V102 M98 70 H162 M107 47 l46 46 M153 47 l-46 46" />
        </g>
        <circle cx="130" cy="70" r="9" fill="#6e7a8c" />
        {[52, 208].map((x) => <g key={x}>
          <rect x={x - 24} y="50" width="48" height="42" rx="4" fill="#0a5c3a" />
          <rect x={x - 24} y="50" width="48" height="42" rx="4" fill="#fff" opacity=".08" />
          <text x={x} y="76" textAnchor="middle" fontSize="10" fontWeight="800" fill="#fff" opacity=".65" fontFamily="Inter, sans-serif">MySOS</text>
        </g>)}
        <rect width="260" height="150" fill="#ff9a3c" opacity=".05" />
        <rect width="260" height="150" fill="url(#ws-vig)" />
      </svg>
    </div>
  );
}

export function Sketch({ className = '', label }) {
  return (
    <div className={`scene ${className}`.trim()} role="img" aria-label={label || ''}>
      <svg viewBox="0 0 260 150" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs>
          <radialGradient id="sk-vig" cx="50%" cy="45%" r="72%">
            <stop offset="58%" stopColor="#000" stopOpacity="0" />
            <stop offset="100%" stopColor="#000" stopOpacity=".2" />
          </radialGradient>
        </defs>
        <rect width="260" height="150" fill="#f0eade" />
        {/* pencil sketch of a tee */}
        <g stroke="#9b9384" strokeWidth="1.3" fill="none">
          <path d="M46 34 l-13 5 -14 16 9 17 9 -7 v58 h40 V65 l9 7 9 -17 -14 -16 -13 -5 c-2 8 -20 8 -22 0 z" />
          <path d="M56 62 h22 M56 74 h22 M56 86 h14" strokeOpacity=".55" />
        </g>
        {/* finished garment sample */}
        <g transform="translate(150 22)">
          <path d="M32 12 l-13 5 -14 16 9 17 9 -7 v56 h40 V43 l9 7 9 -17 -14 -16 -13 -5 c-2 8 -20 8 -22 0 z" fill="#20262f" />
          <path d="M32 12 l-13 5 -14 16 9 17 9 -7 v56 h40 V43 l9 7 9 -17 -14 -16 -13 -5 c-2 8 -20 8 -22 0 z" fill="#fff" opacity=".06" />
          <text x="52" y="72" textAnchor="middle" fontSize="21" fontWeight="800" fill="#fff" opacity=".92" fontFamily="Inter, sans-serif">10</text>
        </g>
        {/* pens on the desk */}
        <g strokeLinecap="round">
          <path d="M22 132 h56" stroke="#c2b8a4" strokeWidth="4" />
          <path d="M88 134 h34" stroke="#0d2a6b" strokeWidth="4" opacity=".75" />
          <path d="M132 132 h26" stroke="#0a5c3a" strokeWidth="4" opacity=".75" />
        </g>
        <rect width="260" height="150" fill="url(#sk-vig)" />
      </svg>
    </div>
  );
}
