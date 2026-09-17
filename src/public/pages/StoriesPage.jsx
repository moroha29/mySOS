import { useEffect, useMemo, useRef, useState } from 'react';
import siteContent from '../../data/siteContent.json';
import solutions from '../../data/solutions.json';
import { cms, headingPath, heroBackground, pagePath, pageText, picture, scenePath, solutionPath, storyPath } from '../cms';
import { getStories } from '../../utils/catalogue';
import Icon from '../components/Icons';
import { heading, PageCTA, Photo, useGoogleReviews } from '../components/Ui';
import { formatReviewDate, GOOGLE_REVIEWS_URL, initials } from '../../utils/googleReviews';

// One large project and four smaller ones per page, as in the design.
const PAGE_SIZE = 5;

const storyHref = (story) => `/mySOS/success-stories/${story.slug}/`;
const storyPicture = (story) => picture(story.image, `stories/${story.slug}/cover`);
const categoryName = (id) => (solutions.find((solution) => solution.id === id)?.name ?? String(id).replace(/-/g, ' ')).replace(' Organisations', '');
const fill = (template, values) => String(template).replace(/\{(\w+)\}/g, (match, key) => (key in values ? values[key] : match));

/*
 * The reviews row under the banner, as the design draws it: heading and Google
 * rating, two review cards side by side, arrows, and a link to every review on
 * Google.
 *
 * It keeps that shape whether or not there are reviews to show. The cards only
 * ever hold the business's real Google reviews (see useGoogleReviews); until
 * there are some, the same two cards invite visitors to write one and to read
 * them on Google. The design's sample names and 4.9 are not real, so no
 * rating is shown until Google provides one.
 */
function ReviewStars({ count = 5, muted = false }) {
  return <span className={muted ? 'stars is-muted' : 'stars'} aria-hidden={muted || undefined} aria-label={muted ? undefined : `${count} out of 5 stars`}>
    {Array.from({ length: count }, (_, i) => <Icon key={i} name="star" size={18} />)}
  </span>;
}

function ReviewInvite({ textKey, text, labelKey, label }) {
  return <div className="stories-review is-invite">
    <div className="stories-review-head">
      <Icon name="google" size={24} />
      <ReviewStars muted />
    </div>
    <p className="stories-review-text" data-cms-path={cms(pagePath('stories', textKey))}>{pageText('stories', textKey, text)}</p>
    <footer>
      <span className="stories-review-avatar is-google" aria-hidden="true"><Icon name="google" size={22} /></span>
      <span>
        <a className="stories-review-invite-link" href={GOOGLE_REVIEWS_URL} target="_blank" rel="noreferrer">
          <strong data-cms-path={cms(pagePath('stories', labelKey))}>{pageText('stories', labelKey, label)}</strong>
          <Icon name="arrowRight" size={14} />
        </a>
        <small data-cms-path={cms(pagePath('stories', 'reviewsSourceLabel'))}>{pageText('stories', 'reviewsSourceLabel', 'Google reviews')}</small>
      </span>
    </footer>
  </div>;
}

function StoryReviews() {
  const data = useGoogleReviews();
  const reviews = data?.reviews ?? [];
  const trackRef = useRef(null);
  // Which ways the cards can still move; two cards fit, so arrows start off.
  const [canMove, setCanMove] = useState({ back: false, on: reviews.length > 2 });

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return undefined;
    const measure = () => setCanMove({
      back: track.scrollLeft > 2,
      on: track.scrollLeft + track.clientWidth < track.scrollWidth - 2,
    });
    measure();
    track.addEventListener('scroll', measure, { passive: true });
    window.addEventListener('resize', measure);
    return () => {
      track.removeEventListener('scroll', measure);
      window.removeEventListener('resize', measure);
    };
  }, [reviews.length]);

  const scrollByCard = (direction) => {
    const track = trackRef.current;
    if (!track) return;
    const card = track.firstElementChild;
    const step = card ? card.getBoundingClientRect().width + 22 : track.clientWidth;
    track.scrollBy({ left: direction * step, behavior: 'smooth' });
  };

  return <section className="stories-reviews" aria-labelledby="stories-reviews-title">
    <div className="stories-reviews-summary">
      <h2 id="stories-reviews-title" data-cms-path={cms(headingPath('reviewsHeading'))}>{heading('reviewsHeading', 'What our clients say')}</h2>
      {data?.averageRating
        ? <p className="stories-reviews-rating">
          <span className="stories-reviews-score">{data.averageRating}</span>
          <Icon name="star" size={36} className="stories-reviews-star" />
          <span className="stories-reviews-google">
            <Icon name="google" size={30} />
            <span data-cms-path={cms(pagePath('stories', 'reviewsOnGoogleLabel'))}>{pageText('stories', 'reviewsOnGoogleLabel', 'on Google')}</span>
          </span>
        </p>
        : <p className="stories-reviews-rating is-pending">
          <span className="stories-reviews-google">
            <Icon name="google" size={30} />
            <span data-cms-path={cms(pagePath('stories', 'reviewsPendingLabel'))}>{pageText('stories', 'reviewsPendingLabel', 'Reviews on Google')}</span>
          </span>
        </p>}
    </div>

    <div className="stories-reviews-track" ref={trackRef}>
      {reviews.length > 0
        ? reviews.map((review) => <blockquote className="stories-review" key={review.id}>
          <div className="stories-review-head">
            <Icon name="google" size={24} />
            <ReviewStars count={review.rating} />
          </div>
          <p className="stories-review-text">&ldquo;{review.text}&rdquo;</p>
          <footer>
            {review.photoUrl
              ? <img className="stories-review-avatar" src={review.photoUrl} alt="" width="44" height="44" loading="lazy" referrerPolicy="no-referrer" />
              : <span className="stories-review-avatar is-initials" aria-hidden="true">{initials(review.author)}</span>}
            <span>
              <strong>{review.author}</strong>
              <small>{formatReviewDate(review.createTime)}</small>
            </span>
          </footer>
        </blockquote>)
        : <>
          <ReviewInvite
            textKey="reviewsInviteText"
            text="Worked with MySOS? Share your experience on Google and help other organisations choose with confidence."
            labelKey="reviewsInviteLabel"
            label="Write a review"
          />
          <ReviewInvite
            textKey="reviewsReadText"
            text="See what schools, businesses and communities say about working with MySOS."
            labelKey="reviewsReadLabel"
            label="Read reviews on Google"
          />
        </>}
    </div>

    <div className="stories-reviews-actions">
      <div className="stories-reviews-arrows">
        <button type="button" aria-label="Previous reviews" disabled={!canMove.back} onClick={() => scrollByCard(-1)}><Icon name="chevronLeft" size={18} /></button>
        <button type="button" aria-label="Next reviews" disabled={!canMove.on} onClick={() => scrollByCard(1)}><Icon name="chevronRight" size={18} /></button>
      </div>
      <a className="stories-reviews-link" href={GOOGLE_REVIEWS_URL} target="_blank" rel="noreferrer">
        <span data-cms-path={cms(pagePath('stories', 'reviewsViewAllLabel'))}>{pageText('stories', 'reviewsViewAllLabel', 'View all Google reviews')}</span>
        <Icon name="arrowRight" size={15} className="inline-arrow" />
      </a>
    </div>
  </section>;
}

/* All Projects: one large project and four smaller ones, a page at a time. */
function ProjectMosaic({ stories, page, pages, onPage }) {
  const start = (page - 1) * PAGE_SIZE;
  const shown = stories.slice(start, start + PAGE_SIZE);
  return <div className="projects-panel">
    <div className="projects-mosaic">
      {shown.map((story, index) => <a key={story.slug} className={index === 0 ? 'project-tile is-large' : 'project-tile'} href={storyHref(story)}>
        <Photo style={story.imageStyle} label={`${story.title} project`} image={storyPicture(story)} imagePath={storyPath(story, 'image')} wide={index === 0} />
        <span className="project-tile-shade" aria-hidden="true" />
        <span className="project-tile-body">
          <span className="project-badge"><i aria-hidden="true" />{categoryName(story.category)}</span>
          <strong data-cms-path={cms(storyPath(story, 'title'))}>{story.title}</strong>
        </span>
        <span className="project-tile-arrow" aria-hidden="true"><Icon name="chevronRight" size={index === 0 ? 20 : 16} /></span>
      </a>)}
    </div>

    <div className="projects-footer">
      <p>{fill(pageText('stories', 'showingLabel', 'Showing {start}–{end} of {total} projects'), { start: start + 1, end: start + shown.length, total: stories.length })}</p>
      {pages > 1
        ? <div className="projects-dots">
          {Array.from({ length: pages }, (_, i) => <button
            key={i}
            className={i + 1 === page ? 'is-active' : ''}
            type="button"
            aria-label={`Page ${i + 1}`}
            aria-current={i + 1 === page ? 'page' : undefined}
            onClick={() => onPage(i + 1)}
          />)}
        </div>
        : <span />}
      <div className="projects-pager">
        <button className="projects-prev" type="button" disabled={page === 1} onClick={() => onPage(page - 1)}>
          <span data-cms-path={cms(pagePath('stories', 'previousPageLabel'))}>{pageText('stories', 'previousPageLabel', 'Previous')}</span>
        </button>
        <button className="projects-next" type="button" disabled={page === pages} onClick={() => onPage(page + 1)}>
          <span data-cms-path={cms(pagePath('stories', 'nextPageLabel'))}>{pageText('stories', 'nextPageLabel', 'Next')}</span>
        </button>
      </div>
    </div>
  </div>;
}

/*
 * A category tab: one project featured with its facts, and every project in
 * the category underneath to pick from.
 */
function CategoryShowcase({ stories }) {
  const [index, setIndex] = useState(0);
  const story = stories[Math.min(index, stories.length - 1)];
  const go = (next) => setIndex((next + stories.length) % stories.length);
  const highlights = story.highlights ?? [];

  return <div className="projects-panel">
    <article className="project-feature">
      <a className="project-feature-media" href={storyHref(story)} tabIndex={-1} aria-hidden="true">
        <Photo style={story.imageStyle} label={`${story.title} project`} image={storyPicture(story)} imagePath={storyPath(story, 'image')} wide />
      </a>
      <div className="project-feature-body">
        <span className="project-feature-badge">{categoryName(story.category)}</span>
        <h2 data-cms-path={cms(storyPath(story, 'title'))}>{story.title}</h2>
        <p data-cms-path={cms(storyPath(story, 'summary'))}>{story.summary}</p>
        {highlights.length > 0 && <ul className="project-facts">
          {highlights.map((fact, i) => <li key={`${fact.icon}-${i}`}>
            <Icon name={fact.icon} size={22} />
            <span data-cms-path={cms(storyPath(story, 'highlights', i, 'text'))}>{fact.text}</span>
          </li>)}
        </ul>}
        <a className="project-feature-link" href={storyHref(story)}>
          <span data-cms-path={cms(pagePath('stories', 'readFullStoryLabel'))}>{pageText('stories', 'readFullStoryLabel', 'Read Full Story')}</span>
          <Icon name="arrowRight" size={17} className="inline-arrow" />
        </a>
      </div>
    </article>

    <nav className="project-picker" aria-label="Projects in this category">
      <button className="project-picker-arrow" type="button" aria-label="Previous project" disabled={stories.length < 2} onClick={() => go(index - 1)}><Icon name="chevronLeft" size={18} /></button>
      <ol className="project-picker-list">
        {stories.map((item, i) => <li key={item.slug}>
          <button className={i === index ? 'project-picker-item is-active' : 'project-picker-item'} type="button" aria-current={i === index ? 'true' : undefined} onClick={() => setIndex(i)}>
            <span className="project-picker-thumb"><Photo style={item.imageStyle} label="" image={storyPicture(item)} /></span>
            <span className="project-picker-name">
              <small>{String(i + 1).padStart(2, '0')}</small>
              <strong>{item.title}</strong>
            </span>
          </button>
        </li>)}
      </ol>
      <span className="project-picker-hint" data-cms-path={cms(pagePath('stories', 'selectProjectLabel'))}>{pageText('stories', 'selectProjectLabel', 'Select a project')}</span>
      <button className="project-picker-arrow" type="button" aria-label="Next project" disabled={stories.length < 2} onClick={() => go(index + 1)}><Icon name="chevronRight" size={18} /></button>
    </nav>
  </div>;
}

export default function StoriesPage() {
  const params = new URLSearchParams(globalThis.location?.search ?? '');
  const [category, setCategory] = useState(params.get('category') || 'all');
  const [page, setPage] = useState(1);

  const stories = useMemo(() => getStories({ category }), [category]);
  const pages = Math.max(1, Math.ceil(stories.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const choose = (next) => { setCategory(next); setPage(1); };

  return <main>
    <section {...heroBackground(siteContent.scenes?.storiesHeroBackgroundImage, scenePath('storiesHeroBackgroundImage'), 'hero hero-compact hero-stories')}>
      <div className="hero-inner">
        <div>
          <h1>
            <span data-cms-path={cms(pagePath('stories', 'heroTitle'))}>{pageText('stories', 'heroTitle', 'Real Projects.')}</span>
            <em><span data-cms-path={cms(pagePath('stories', 'heroTitleAccent'))}>{pageText('stories', 'heroTitleAccent', 'Real Results.')}</span></em>
          </h1>
          <p className="hero-lead" data-cms-path={cms(pagePath('stories', 'heroLead'))}>{pageText('stories', 'heroLead')}</p>
        </div>
        <div className="hero-collage" aria-hidden="true">
          {['field', 'hall', 'office', 'stage', 'outdoor'].map((kind, i) => (
            <Photo
              key={kind}
              style={kind}
              image={picture(siteContent.scenes?.storiesHeroImages?.[i], `scenes/stories-hero-${i + 1}`)}
              imagePath={scenePath('storiesHeroImages', i)}
              eager
            />
          ))}
        </div>
      </div>
    </section>

    <section className="section stories-section">
      <StoryReviews />

      <div className="filter-row" role="group" aria-label="Filter success stories">
        <button className={category === 'all' ? 'is-active' : ''} type="button" aria-pressed={category === 'all'} onClick={() => choose('all')} data-cms-path={cms(pagePath('stories', 'allFilterLabel'))}>{pageText('stories', 'allFilterLabel', 'All Projects')}</button>
        {solutions.map((solution) => <button
          key={solution.id}
          className={category === solution.id ? 'is-active' : ''}
          type="button"
          aria-pressed={category === solution.id}
          onClick={() => choose(solution.id)}
          data-cms-path={cms(solutionPath(solution, 'name'))}
        >{solution.name.replace(' Organisations', '')}</button>)}
      </div>

      {stories.length === 0
        ? <div className="empty-state">
          <h3 data-cms-path={cms(pagePath('stories', 'emptyTitle'))}>{pageText('stories', 'emptyTitle')}</h3>
          <p data-cms-path={cms(pagePath('stories', 'emptyDescription'))}>{pageText('stories', 'emptyDescription')}</p>
        </div>
        : category === 'all'
          ? <ProjectMosaic stories={stories} page={current} pages={pages} onPage={setPage} />
          : <CategoryShowcase key={category} stories={stories} />}
    </section>

    <PageCTA
      title={pageText('stories', 'ctaTitle', 'Have a project in mind?')}
      titlePath={pagePath('stories', 'ctaTitle')}
      description={pageText('stories', 'ctaDescription', "Let's create something amazing together.")}
      descriptionPath={pagePath('stories', 'ctaDescription')}
    />
  </main>;
}
