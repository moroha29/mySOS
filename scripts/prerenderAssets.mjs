/*
 * Rewrites source asset paths in prerendered markup onto the hashed files the
 * client build actually emitted. Kept separate from prerender.mjs so it can be
 * tested without spinning up Vite.
 *
 * Vite's dev SSR pipeline resolves `import.meta.glob(..., '?url')` to source
 * paths (/src/assets/images/logos/ntu.png), which do not exist in dist.
 */

// Matches a source asset path wherever it appears — a src/href attribute or the
// url(...) of an inline CSS custom property.
//
// The trailing class lists the characters a path may contain rather than the
// ones that end it. A negated class needs `\s`, and that escape does not
// survive a template literal (it collapses to a bare "s", which silently
// truncated every match at ".../image|s/..."). Path characters are a closed,
// obvious set, so matching them positively avoids the trap.
//
// The optional base prefix is inside the match so it is replaced rather than
// left in front of the result as a doubled "/mySOS/mySOS/".
export function sourceAssetPattern(base) {
  return new RegExp(`(?:${base})?/src/assets/[A-Za-z0-9._/-]+`, 'g');
}

export function resolveAssetUrls(html, assetUrls, base) {
  const rewritten = html.replace(sourceAssetPattern(base), (url) => {
    const sourcePath = url.startsWith(base) ? url.slice(base.length) : url;
    return assetUrls.get(sourcePath) ?? url;
  });
  // Anything still pointing into /src/assets/ would 404, so the caller fails
  // the build rather than shipping broken images.
  const unresolved = [...new Set(rewritten.match(sourceAssetPattern(base)) || [])];
  return { html: rewritten, unresolved };
}
