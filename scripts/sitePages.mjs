/*
 * Every page this website has, in the order it is offered.
 *
 * One list, built from the site's own content, used twice: the build
 * prerenders exactly these routes, and the website manager shows exactly these
 * pages to preview and edit. A product, solution, story or guide added to the
 * content becomes a page in both places at once, with nothing to keep in step
 * by hand. The manager derives the same list from the same files
 * (src/adapters/mysosSite.js in the website-manager repository), and a test
 * there compares the two.
 *
 * `group` names the page a subpage belongs under; a page without one is a
 * section of its own.
 */
export function sitePages({ productData, solutions, successStories, resources } = {}) {
  const products = (productData?.catalogue ?? []).filter((item) => item.public?.visible);
  const articles = resources?.articles ?? [];
  return [
    { id: "homepage", label: "Home", path: "" },
    { id: "products", label: "Products", path: "products/" },
    ...products.map((product) => ({
      id: `product-${product.id}`,
      label: product.public.name,
      path: `products/${product.public.slug}/`,
      group: "products",
    })),
    { id: "request", label: "Get a Quote", path: "request/" },
    { id: "solutions", label: "Solutions", path: "solutions/" },
    ...(solutions ?? []).map((solution) => ({
      id: `solution-${solution.id}`,
      label: solution.name,
      path: `solutions/${solution.id}/`,
      group: "solutions",
    })),
    { id: "why-mysos", label: "Why MySOS", path: "why-mysos/" },
    { id: "success-stories", label: "Success Stories", path: "success-stories/" },
    ...(successStories ?? []).map((story) => ({
      id: `story-${story.slug}`,
      label: story.title,
      path: `success-stories/${story.slug}/`,
      group: "success-stories",
    })),
    { id: "resources", label: "Guides", path: "resources/" },
    ...articles.map((article) => ({
      id: `guide-${article.slug}`,
      label: article.title,
      path: `resources/${article.slug}/`,
      group: "resources",
    })),
  ];
}

/** The routes the build prerenders: every page above, as a path. */
export const siteRoutes = (content) => sitePages(content).map((page) => `/${page.path}`);
