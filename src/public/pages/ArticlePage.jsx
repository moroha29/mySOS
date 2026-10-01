import { useEffect, useState } from 'react';
import resources from '../../data/resources.json';
import { cms } from '../cms';
import Icon from '../components/Icons';
import { ArticleMeta, ArticleShot, articleHref, articlePath, hub, hubPath, ResourcesCta, topicName } from './ResourcesPage';

const slugFor = (heading) => heading.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const dateFormat = new Intl.DateTimeFormat('en-SG', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const readDate = (value) => {
  const time = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(time) ? dateFormat.format(time) : '';
};

/*
 * One guide.
 *
 * The contents list down the side follows the reader: the section whose
 * heading last passed the top of the screen is the one marked. It is built
 * from the headings themselves, so a guide that gains a section gains a line
 * in the list without anything else being edited.
 */
export default function ArticlePage({ slug }) {
  const index = resources.articles.findIndex((entry) => entry.slug === slug);
  const article = resources.articles[index];
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (!article) return undefined;
    const headings = [...document.querySelectorAll('.article-body h2')];
    if (headings.length === 0) return undefined;
    let frame = 0;
    const measure = () => {
      frame = 0;
      const line = 140;
      let reached = 0;
      headings.forEach((heading, position) => {
        if (heading.getBoundingClientRect().top <= line) reached = position;
      });
      setActive(reached);
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(measure); };
    measure();
    globalThis.addEventListener('scroll', onScroll, { passive: true });
    return () => { if (frame) cancelAnimationFrame(frame); globalThis.removeEventListener('scroll', onScroll); };
  }, [article]);

  if (!article) return null;
  const previous = resources.articles[index - 1];
  const next = resources.articles[index + 1];

  return <main className="article-page">
    <nav className="breadcrumb" aria-label="Breadcrumb">
      <a href="/resources/" data-cms-path={cms(hubPath('eyebrow'))}>Resources</a>
      <span aria-hidden="true">/</span>
      <span aria-current="page">{topicName(article.topic)}</span>
    </nav>

    <div className="article-layout">
      <article className="article-body">
        <ArticleMeta article={article} className="is-loud" />
        <h1 data-cms-path={cms(articlePath(index, 'title'))}>{article.title}</h1>
        <p className="article-lead" data-cms-path={cms(articlePath(index, 'lead'))}>{article.lead}</p>
        <p className="article-byline">
          <span className="article-avatar" aria-hidden="true"><Icon name="spark" size={20} /></span>
          <span>
            <strong>MySOS Team</strong>
            <small>{readDate(article.date)}</small>
          </span>
        </p>

        <figure className="article-figure" data-reveal>
          <ArticleShot article={article} index={index} />
          {article.imageCaption && <figcaption data-cms-path={cms(articlePath(index, 'imageCaption'))}>{article.imageCaption}</figcaption>}
        </figure>

        {article.quickAnswer && <aside className="article-quick" data-reveal>
          <Icon name="spark" size={26} />
          <div>
            <strong data-cms-path={cms(hubPath('quickAnswerTitle'))}>{hub('quickAnswerTitle', 'Quick answer')}</strong>
            <p data-cms-path={cms(articlePath(index, 'quickAnswer'))}>{article.quickAnswer}</p>
          </div>
        </aside>}

        {article.sections.map((section, position) => <section key={section.heading} id={slugFor(section.heading)} data-reveal>
          <h2 data-cms-path={cms(articlePath(index, 'sections', position, 'heading'))}>{section.heading}</h2>
          {section.body.map((paragraph, line) => <p key={paragraph.slice(0, 24)} data-cms-path={cms(articlePath(index, 'sections', position, 'body', line))}>{paragraph}</p>)}
        </section>)}

        {article.table && <div className="article-table" data-reveal>
          <table>
            <thead>
              <tr>{article.table.columns.map((column, column_index) => <th key={column} data-cms-path={cms(articlePath(index, 'table', 'columns', column_index))}>{column}</th>)}</tr>
            </thead>
            <tbody>
              {article.table.rows.map((row, row_index) => <tr key={row[0]}>
                {row.map((cell, cell_index) => (cell_index === 0
                  ? <th key={cell} scope="row" data-cms-path={cms(articlePath(index, 'table', 'rows', row_index, cell_index))}>{cell}</th>
                  /* The column's name travels with the cell: on a phone the
                     table stacks and the heading row is gone, so each value
                     has to say which column it came from. */
                  : <td key={cell} data-label={article.table.columns[cell_index]} data-cms-path={cms(articlePath(index, 'table', 'rows', row_index, cell_index))}>{cell}</td>))}
              </tr>)}
            </tbody>
          </table>
        </div>}

        {article.closing && <p className="article-closing" data-cms-path={cms(articlePath(index, 'closing'))}>{article.closing}</p>}

        <nav className="article-nearby" aria-label="More guides">
          {previous
            ? <a href={articleHref(previous)}>
              <small><Icon name="chevronLeft" size={18} /> <span data-cms-path={cms(hubPath('previousLabel'))}>{hub('previousLabel')}</span></small>
              <strong>{previous.title}</strong>
            </a>
            : <span />}
          {next && <a className="is-next" href={articleHref(next)}>
            <small><span data-cms-path={cms(hubPath('nextLabel'))}>{hub('nextLabel')}</span> <Icon name="chevronRight" size={18} /></small>
            <strong>{next.title}</strong>
          </a>}
        </nav>
      </article>

      <aside className="article-toc" aria-label={hub('tocTitle', 'On this page')}>
        <p data-cms-path={cms(hubPath('tocTitle'))}>{hub('tocTitle', 'On this page')}</p>
        <ol>
          {article.sections.map((section, position) => <li key={section.heading}>
            <a className={position === active ? 'is-active' : undefined} href={`#${slugFor(section.heading)}`}>{section.heading}</a>
          </li>)}
        </ol>
      </aside>
    </div>

    <ResourcesCta />
  </main>;
}
