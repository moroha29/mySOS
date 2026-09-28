import { useMemo, useState } from 'react';
import resources from '../../data/resources.json';
import siteContent from '../../data/siteContent.json';
import { cms, contentPath, picture } from '../cms';
import { enquiryProps, Button, Photo } from '../components/Ui';
import Icon from '../components/Icons';

const PAGE_SIZE = 6;

export const hub = (key, fallback = '') => resources.hub?.[key] ?? fallback;
export const hubPath = (key) => ['homepage', 'resources', 'hub', key];
export const articlePath = (index, ...rest) => ['homepage', 'resources', 'articles', index, ...rest];
export const topicName = (id) => resources.topics.find((topic) => topic.id === id)?.name ?? id;
export const articleHref = (article) => `/mySOS/resources/${article.slug}/`;

/*
 * The picture on a guide: the manager's upload, else a drawn stand-in. Each
 * topic draws a different one, so a hub with no photographs uploaded yet does
 * not show the same picture six times.
 */
const TOPIC_SCENES = {
  'product-guides': 'hall',
  printing: 'workshop',
  materials: 'studio',
  artwork: 'office',
  ordering: 'outdoor',
};

export function ArticleShot({ article, index, className = '' }) {
  return <Photo
    style={TOPIC_SCENES[article.topic] ?? 'studio'}
    className={className}
    image={picture(article.image, `resources/${article.slug}`)}
    imagePath={articlePath(index, 'image')}
    label={article.title}
    wide
  />;
}

export function ArticleMeta({ article, className = '' }) {
  return <p className={`article-meta ${className}`.trim()}>
    <span className="article-topic">{topicName(article.topic)}</span>
    <span aria-hidden="true">·</span>
    <span>{article.readMinutes} {hub('readSuffix', 'min read')}</span>
  </p>;
}

/*
 * The knowledge hub: every guide MySOS has written, searchable, and filtered by
 * the topics the guides are written under.
 *
 * The search runs over what is on the page rather than asking a server: there
 * are a handful of guides, and a reader who types "artwork" should see the
 * artwork ones without waiting for anything.
 */
export default function ResourcesPage() {
  const [query, setQuery] = useState('');
  const [topic, setTopic] = useState('all');
  const [shown, setShown] = useState(PAGE_SIZE);

  const found = useMemo(() => {
    const asked = query.trim().toLowerCase();
    return resources.articles.filter((article) => {
      if (topic !== 'all' && article.topic !== topic) return false;
      if (!asked) return true;
      return `${article.title} ${article.summary} ${topicName(article.topic)}`.toLowerCase().includes(asked);
    });
  }, [query, topic]);

  const visible = found.slice(0, shown);
  const [lead, ...rest] = visible;

  return <main className="resources-page">
    <section className="resources-hero">
      <div className="resources-hero-inner">
        <div className="resources-hero-copy" data-reveal>
          <span className="eyebrow" data-cms-path={cms(hubPath('eyebrow'))}>{hub('eyebrow')}</span>
          <h1>
            <span data-cms-path={cms(hubPath('titleLead'))}>{hub('titleLead')}</span>{' '}
            <em data-cms-path={cms(hubPath('titleAccent'))}>{hub('titleAccent')}</em>
          </h1>
          <p className="resources-hero-lead" data-cms-path={cms(hubPath('lead'))}>{hub('lead')}</p>
          <form className="resources-search" role="search" onSubmit={(event) => event.preventDefault()}>
            <Icon name="search" size={22} />
            <input
              type="search"
              autoComplete="off"
              aria-label={hub('searchPlaceholder')}
              placeholder={hub('searchPlaceholder')}
              value={query}
              onChange={(event) => { setQuery(event.target.value); setShown(PAGE_SIZE); }}
            />
            {query && <button type="button" aria-label="Clear search" onClick={() => setQuery('')}><Icon name="close" size={19} /></button>}
          </form>
          <p className="resources-popular">
            <span data-cms-path={cms(hubPath('popularLabel'))}>{hub('popularLabel')}</span>
            {(resources.hub.popular ?? []).map((term, index) => <button
              key={term}
              type="button"
              onClick={() => { setQuery(term); setTopic('all'); setShown(PAGE_SIZE); }}
              data-cms-path={cms(hubPath('popular'))}
              data-cms-index={index}
            >{term}</button>)}
          </p>
        </div>
        <div className="resources-hero-art" aria-hidden="true">
          <Photo style="workshop" image={picture(siteContent.scenes?.resourcesHeroImage, 'scenes/products-promo')} imagePath={['homepage', 'scenes', 'resourcesHeroImage']} wide eager />
        </div>
      </div>
    </section>

    <nav className="topic-row" aria-label="Guide topics">
      <button type="button" className={topic === 'all' ? 'is-active' : undefined} onClick={() => { setTopic('all'); setShown(PAGE_SIZE); }}>
        <span data-cms-path={cms(hubPath('allLabel'))}>{hub('allLabel', 'All articles')}</span>
      </button>
      {resources.topics.map((entry, index) => <button
        key={entry.id}
        type="button"
        className={topic === entry.id ? 'is-active' : undefined}
        onClick={() => { setTopic(entry.id); setShown(PAGE_SIZE); }}
        data-cms-path={cms(['homepage', 'resources', 'topics', index, 'name'])}
      >{entry.name}</button>)}
    </nav>

    <section className="section resources-list">
      <div className="section-heading align-left eyebrow-title" data-reveal>
        <div>
          <h2 className="eyebrow" data-cms-path={cms(hubPath('exploreTitle'))}>{hub('exploreTitle')}</h2>
        </div>
        <p data-cms-path={cms(hubPath('exploreLead'))}>{hub('exploreLead')}</p>
      </div>

      {visible.length === 0
        ? <p className="resources-empty" data-cms-path={cms(hubPath('emptyLabel'))}>{hub('emptyLabel')}</p>
        : <>
          <div className="guide-lead-row">
            <a className="guide-card is-lead" href={articleHref(lead)} data-reveal>
              <ArticleShot article={lead} index={resources.articles.indexOf(lead)} className="guide-shot" />
              <ArticleMeta article={lead} />
              <h3>{lead.title}</h3>
              <p>{lead.summary}</p>
              <span className="guide-go"><Icon name="arrowRight" size={19} className="inline-arrow" /></span>
            </a>
            <div className="guide-stack">
              {rest.slice(0, 2).map((article, index) => <a
                className="guide-card is-side"
                key={article.slug}
                href={articleHref(article)}
                data-reveal
                style={{ '--reveal-delay': `${(index + 1) * 70}ms` }}
              >
                <ArticleShot article={article} index={resources.articles.indexOf(article)} className="guide-shot" />
                <div>
                  <ArticleMeta article={article} />
                  <h3>{article.title}</h3>
                  <p>{article.summary}</p>
                </div>
                <span className="guide-go"><Icon name="arrowRight" size={19} className="inline-arrow" /></span>
              </a>)}
            </div>
          </div>

          {rest.length > 2 && <div className="guide-grid">
            {rest.slice(2).map((article, index) => <a
              className="guide-card"
              key={article.slug}
              href={articleHref(article)}
              data-reveal
              style={{ '--reveal-delay': `${index * 70}ms` }}
            >
              <ArticleShot article={article} index={resources.articles.indexOf(article)} className="guide-shot" />
              <ArticleMeta article={article} />
              <h3>{article.title}</h3>
              <p>{article.summary}</p>
              <span className="guide-go"><Icon name="arrowRight" size={19} className="inline-arrow" /></span>
            </a>)}
          </div>}

          {found.length > visible.length && <div className="center-action">
            <Button variant="outline" onClick={() => setShown((count) => count + PAGE_SIZE)}>
              <span data-cms-path={cms(hubPath('moreLabel'))}>{hub('moreLabel')}</span>
              <Icon name="arrowRight" size={18} className="inline-arrow" />
            </Button>
          </div>}
        </>}
    </section>

    <ResourcesCta />
  </main>;
}

/* The band that closes both the hub and every guide on it. */
export function ResourcesCta() {
  return <section className="resources-cta" data-reveal>
    <div>
      <h2 data-cms-path={cms(hubPath('ctaTitle'))}>{hub('ctaTitle')}</h2>
      <p data-cms-path={cms(hubPath('ctaLead'))}>{hub('ctaLead')}</p>
    </div>
    <Button {...enquiryProps} variant="primary">
      <span data-cms-path={cms(hubPath('ctaButton'))}>{hub('ctaButton', 'Ask MySOS')}</span>
      <Icon name="arrowRight" size={18} className="inline-arrow" />
    </Button>
  </section>;
}

export { resources, contentPath };
