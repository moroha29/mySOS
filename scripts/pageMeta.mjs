/*
 * What each page tells a search engine, a shared link and a browser tab.
 *
 * Every one of the 73 prerendered pages carried the same <title> — "MySOS |
 * Custom Merchandise, Made Simple" — the same three sentences of description
 * between them, no canonical address and no share card at all. A product page
 * and a success story were indistinguishable in a search result, and a link
 * pasted into WhatsApp, where most of this business is done, arrived as a bare
 * URL with no picture and no name.
 *
 * Nothing here is new content to write and keep up to date: the title is the
 * name the page already has in the site's own list of pages, and the
 * description is the line the page already opens with. Rename a product in the
 * portal and its search result follows.
 */

export const SITE_ORIGIN = "https://mysourceofsolutions.com";

const BRAND = "MySOS";
const HOME_TITLE = "MySOS | Custom Merchandise, Made Simple";

/* One line, no markup, and short enough to survive a search result. */
function oneLine(value, limit = 160) {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  if (text.length <= limit) return text;
  const cut = text.slice(0, limit - 1);
  const stop = cut.lastIndexOf(" ");
  return `${(stop > limit * 0.6 ? cut.slice(0, stop) : cut).replace(/[,;:.\s]+$/, "")}…`;
}

function pathOf(route) {
  return route.replace(/^\/+/, "").replace(/\/+$/, "");
}

/*
 * The description a page already shows: a product's own line, a story's
 * summary, a guide's summary, or the lead a section opens with. The site's
 * default is the last resort, not the first.
 */
function describe(route, content) {
  const { productData, solutions, successStories, resources, siteContent } = content;
  const path = pathOf(route);
  const pages = siteContent?.pages ?? {};
  const fixed = {
    "": siteContent?.headings?.heroLead,
    products: pages.products?.heroLead,
    request: pages.request?.heroLead,
    solutions: pages.solutions?.heroLead,
    "success-stories": pages.stories?.heroLead,
    "why-mysos": pages.why?.heroLead,
    resources: resources?.hub?.lead,
  };
  if (path in fixed) return oneLine(fixed[path]);

  const [section, slug] = path.split("/");
  if (section === "products") {
    return oneLine((productData?.catalogue ?? []).find((item) => item.public?.slug === slug)?.public?.description);
  }
  if (section === "solutions") {
    return oneLine((solutions ?? []).find((item) => item.id === slug)?.description);
  }
  if (section === "success-stories") {
    return oneLine((successStories ?? []).find((item) => item.slug === slug)?.summary);
  }
  if (section === "resources") {
    return oneLine((resources?.articles ?? []).find((item) => item.slug === slug)?.summary);
  }
  return "";
}

/* A guide or a story is a piece of writing; everything else is a page. */
function kindOf(route) {
  const [section, slug] = pathOf(route).split("/");
  return slug && (section === "resources" || section === "success-stories") ? "article" : "website";
}

/**
 * Title, description, address and kind for one page. `page` is the entry from
 * sitePages(), so the title is the name the portal shows for it too.
 */
export function pageMeta(page, content, { origin = SITE_ORIGIN } = {}) {
  const route = `/${page.path}`;
  const described = describe(route, content);
  return {
    route,
    title: page.path === "" ? HOME_TITLE : `${page.label} | ${BRAND}`,
    description: described || oneLine(content.siteContent?.headings?.heroLead),
    canonical: `${origin}${route}`,
    type: kindOf(route),
  };
}

const escape = (value) => String(value ?? "")
  .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");

/**
 * The head a page carries. `image` is a path within the site, already resolved
 * to the built file; it is made absolute here because a share card is fetched
 * by a server that has no page to resolve it against.
 */
export function headTags(meta, { image = "", siteName = BRAND, origin = SITE_ORIGIN } = {}) {
  const absolute = image ? `${origin}${image}` : "";
  return [
    `<title>${escape(meta.title)}</title>`,
    `<meta name="description" content="${escape(meta.description)}" />`,
    `<link rel="canonical" href="${escape(meta.canonical)}" />`,
    `<meta property="og:type" content="${escape(meta.type)}" />`,
    `<meta property="og:site_name" content="${escape(siteName)}" />`,
    `<meta property="og:title" content="${escape(meta.title)}" />`,
    `<meta property="og:description" content="${escape(meta.description)}" />`,
    `<meta property="og:url" content="${escape(meta.canonical)}" />`,
    ...(absolute ? [`<meta property="og:image" content="${escape(absolute)}" />`] : []),
    `<meta name="twitter:card" content="${absolute ? "summary_large_image" : "summary"}" />`,
    `<meta name="twitter:title" content="${escape(meta.title)}" />`,
    `<meta name="twitter:description" content="${escape(meta.description)}" />`,
    ...(absolute ? [`<meta name="twitter:image" content="${escape(absolute)}" />`] : []),
  ].join("\n    ");
}

/*
 * The picture a shared link shows: the page's own first photograph, taken from
 * the page itself rather than from a list someone has to keep in step.
 *
 * It is read before the build's asset names are substituted in, because the
 * folder is the only thing that says what a picture is for — hashed, every
 * picture is just a .png. The first image on every page of this site is the
 * wordmark, and the one after it is often a client's logo; neither says
 * anything about the page. Pages drawn rather than photographed — the stories,
 * the products still waiting for a photo — fall back to the website's own.
 */
const PHOTO_FOLDERS = /\/src\/assets\/images\/(?:products|scenes|stories|solutions|benefits)\//i;
export const SITE_SHARE_IMAGE = "/src/assets/images/scenes/why-hero.jpg";

export function leadImage(markup, resolve) {
  for (const match of String(markup ?? "").matchAll(/(?:src|href)="([^"]+\.(?:jpe?g|png|webp))"/gi)) {
    if (PHOTO_FOLDERS.test(match[1])) return resolve(match[1]) || "";
  }
  return resolve(SITE_SHARE_IMAGE) || "";
}

/** Every public page, newest content first is not a thing here: site order. */
export function sitemapXml(routes, { origin = SITE_ORIGIN, lastModified = new Date() } = {}) {
  const day = new Date(lastModified).toISOString().slice(0, 10);
  const urls = routes.map((route) => `  <url>
    <loc>${escape(`${origin}${route}`)}</loc>
    <lastmod>${day}</lastmod>
  </url>`).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}

/*
 * The quotation tools are working pages for the business, not pages for anyone
 * to find; they are kept out of search here and marked noindex in their own
 * HTML, so neither has to be remembered alone.
 */
export const PRIVATE_PATHS = ["/quotation_engine/", "/mock_quotation_engine/"];

export function robotsTxt({ origin = SITE_ORIGIN } = {}) {
  return `User-agent: *
Allow: /
${PRIVATE_PATHS.map((path) => `Disallow: ${path}`).join("\n")}

Sitemap: ${origin}/sitemap.xml
`;
}
