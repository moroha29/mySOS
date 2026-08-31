/*
 * Drop-in image registry.
 *
 * Any file placed under `src/assets/images/` is picked up automatically and
 * keyed by its path minus the extension, e.g.
 *
 *   src/assets/images/products/premium-cotton-tee.jpg  ->  'products/premium-cotton-tee'
 *   src/assets/images/stories/ntu-cca-jerseys-2024/hero.jpg -> 'stories/ntu-cca-jerseys-2024/hero'
 *
 * Components ask for a key; if no file exists the placeholder artwork is used
 * instead, so the site works with none, some, or all of the images in place.
 * See ASSETS.md for the full list of keys the design expects.
 */

const modules = import.meta.glob(
  '../assets/images/**/*.{jpg,jpeg,png,webp,avif,svg}',
  { eager: true, query: '?url', import: 'default' },
);

const registry = {};
for (const [path, url] of Object.entries(modules)) {
  const key = path.replace(/^.*\/assets\/images\//, '').replace(/\.[^.]+$/, '');
  registry[key] = url;
}

/** Returns the resolved URL for a key, or null when no such file was supplied. */
export function getImage(key) {
  if (!key) return null;
  return registry[key] ?? null;
}

/** Returns the first key that resolves, or null. Useful for fallback chains. */
export function firstImage(...keys) {
  for (const key of keys) {
    const url = getImage(key);
    if (url) return url;
  }
  return null;
}

/** Every key currently available — handy for debugging what has been dropped in. */
export const availableImages = () => Object.keys(registry).sort();
