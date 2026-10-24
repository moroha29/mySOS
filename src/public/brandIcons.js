/*
 * MySOS's own icons, where they have been drawn.
 *
 * Two runs of the page are illustrated with artwork the client had made rather
 * than with the drawn set in Icons.jsx: the six steps of Our Process, each a
 * green disc, and the four promises under Why Clients Come Back. They are
 * two-coloured and sized to their own frame, so they cannot be a glyph in that
 * set, which is one path tinted with currentColor at 24 by 24.
 *
 * The lookup is by the name already on the record -- "consult", "award" -- so
 * nothing in the content had to change, and a name with no file of its own
 * passes straight through to the drawn icon. A picture uploaded through the
 * website manager is a path rather than a name, so it finds no file either and
 * is likewise passed through, which is what lets it win.
 */
import { getImage } from '../utils/imageRegistry';

export const brandIcon = (set, name) => getImage(`icons/${set}/${name}`) ?? name;
