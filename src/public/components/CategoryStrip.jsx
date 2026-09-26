import siteContent from '../../data/siteContent.json';
import { REQUEST_PATH } from '../../utils/catalogue';
import { categoryPath, cms, labelPath } from '../cms';
import Icon from './Icons';

/*
 * The strip of product categories under the header. The homepage and the
 * products page carry the same one, with the same pills and spacing, so moving
 * between them does not shift the row about. On the products page the category
 * being shown is marked, and choosing one swaps the products in place.
 *
 * On a phone the row scrolls sideways and the trailing link steps aside: it
 * would eat the width the category names need, and the menu already carries it.
 */
export default function CategoryStrip({ activeId = '', onChoose, action }) {
  const label = (key, fallback) => siteContent.labels?.[key] ?? fallback;
  return <nav className="category-strip" aria-label="Product categories">
    <div className="category-strip-inner">
      <ul>
        {siteContent.categories.map((category) => {
          const active = category.id === activeId;
          return <li key={category.id}>
            <a
              className={active ? 'is-active' : undefined}
              href={onChoose ? `?category=${category.id}` : `/mySOS/products/?category=${category.id}`}
              aria-current={active ? 'page' : undefined}
              onClick={onChoose ? (event) => onChoose(event, category.id) : undefined}
              data-cms-path={cms(categoryPath(category, 'name'))}
            >{category.name}</a>
          </li>;
        })}
      </ul>
      <a className="text-link" href={action?.href ?? '/mySOS/products/'}>
        <span data-cms-path={cms(labelPath(action?.labelKey ?? 'quickNavAllLabel'))}>{label(action?.labelKey ?? 'quickNavAllLabel', action?.fallback ?? 'View all products')}</span>
        <Icon name="arrowRight" size={15} className="inline-arrow" />
      </a>
    </div>
  </nav>;
}

export { REQUEST_PATH };
