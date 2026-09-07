import siteContent from '../data/siteContent.json';
import solutions from '../data/solutions.json';
import successStories from '../data/successStories.json';
import { getImage } from '../utils/imageRegistry';

/*
 * Content paths for the website manager.
 *
 * The manager edits this site by clicking the rendered page, so every element
 * that shows an editable value carries the path of that value in the draft the
 * manager holds. Without them it has to guess which element shows which field
 * by matching text and URLs: measured on this homepage, that bound 40% of the
 * marked nodes to more than one field and 18 of them to the wrong one — every
 * "View Story" card pointed the manager at the main navigation's Success
 * Stories entry, so editing a card would have rewritten the site's own nav.
 *
 * Paths address the manager's draft, not these JSON files:
 *
 *   siteConfig.json       ["homepage", "siteConfig", ...]
 *   siteContent.json      ["homepage", <top-level key>, ...]
 *   solutions.json        ["additionalContent", "solutions", <index>, ...]
 *   successStories.json   ["additionalContent", "successStories", <index>, ...]
 *
 * An element carrying data-cms-path must contain that value and nothing else:
 * the manager rewrites the element's text when the field is edited, so a value
 * sharing an element with other markup would erase it. Where a value sits
 * inside a larger phrase, wrap just the value in a <span>.
 */

/** One value: `data-cms-path={cms(contentPath('headings', 'heroTitle'))}`. */
export const cms = (path) => JSON.stringify(path);

/** Several values on one element, e.g. a link's wording and its destination. */
export const cmsAll = (...paths) => JSON.stringify(paths);

export const contentPath = (...path) => ['homepage', ...path];
export const configPath = (...path) => ['homepage', 'siteConfig', ...path];
export const labelPath = (key) => contentPath('labels', key);
export const headingPath = (key) => contentPath('headings', key);

const indexOf = (list, match) => list.findIndex(match);

/*
 * Solutions and stories are filtered, sorted and paginated before they are
 * rendered, so a map index is not the index the draft uses. These resolve the
 * entry's real position from the source list.
 */
export const solutionPath = (solution, ...path) =>
  ['additionalContent', 'solutions', indexOf(solutions, (entry) => entry.id === solution.id), ...path];

export const storyPath = (story, ...path) =>
  ['additionalContent', 'successStories', indexOf(successStories, (entry) => entry.slug === story.slug), ...path];

export const categoryPath = (category, ...path) =>
  contentPath('categories', indexOf(siteContent.categories, (entry) => entry.id === category.id), ...path);

export const pagePath = (page, ...path) => contentPath('pages', page, ...path);
export const scenePath = (...path) => contentPath('scenes', ...path);

/*
 * A picture chosen in the manager, falling back to the file dropped into
 * src/assets/images. The drop-in registry stays the default so the site still
 * works with no content pictures set at all; a value uploaded through the
 * manager simply wins.
 */
export const picture = (value, key) => (String(value ?? '').trim() || getImage(key));

/** Wording from content, with the shipped copy as the fallback. */
export const pageText = (page, key, fallback = '') => siteContent.pages?.[page]?.[key] ?? fallback;

/*
 * A background picture for a hero panel.
 *
 * The hero is a blue gradient with the product illustrations drawn over it, so
 * unlike every other picture on the site there is no <img> to hang a content
 * path on — which is why it was the one thing on the page nobody could change.
 * The path goes on the panel itself and the picture is painted behind it.
 *
 * With nothing set the panel keeps the gradient it has always had. With a
 * picture set, .has-background lays a navy scrim over it: the headline and lead
 * are white, and white on an arbitrary photo is not readable on its own.
 */
export const heroBackground = (value, path, base = 'hero') => {
  const url = String(value ?? '').trim();
  return {
    className: url ? `${base} has-background` : base,
    'data-cms-path': cms(path),
    'data-cms-background': 'true',
    ...(url ? { style: { backgroundImage: `url("${url.replaceAll('"', '%22')}")` } } : {}),
  };
};
