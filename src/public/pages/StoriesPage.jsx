import { useMemo, useState } from 'react';
import siteContent from '../../data/siteContent.json';
import solutions from '../../data/solutions.json';
import { getStories } from '../../utils/catalogue';
import Icon from '../components/Icons';
import { PageCTA, Photo, StoryCard } from '../components/Ui';

const PAGE_SIZE = 8;

function QuotePanel() {
  const [index, setIndex] = useState(0);
  const testimonials = siteContent.testimonials;
  const active = testimonials[index];
  return <section className="quote-panel">
    <div className="quote-panel-inner">
      <Photo style="office" imageKey="scenes/testimonial" label="Client visiting the MySOS studio" />
      <div>
        <blockquote>&ldquo;{active.quote}&rdquo;</blockquote>
        <div className="quote-meta">
          <span><strong>{active.name}</strong><small>{active.role}</small></span>
          <button className="carousel-btn" type="button" aria-label="Next testimonial" onClick={() => setIndex((index + 1) % testimonials.length)}><Icon name="chevronRight" size={16} /></button>
        </div>
      </div>
    </div>
    <div className="quote-dots">
      {testimonials.map((item, i) => <button
        key={item.name}
        type="button"
        className={i === index ? 'is-active' : ''}
        aria-label={`Show testimonial ${i + 1}`}
        aria-current={i === index}
        onClick={() => setIndex(i)}
      />)}
    </div>
  </section>;
}

export default function StoriesPage() {
  const params = new URLSearchParams(globalThis.location?.search ?? '');
  const [category, setCategory] = useState(params.get('category') || 'all');
  const [sort, setSort] = useState('latest');
  const [page, setPage] = useState(1);

  const stories = useMemo(() => getStories({ category, sort }), [category, sort]);
  const totalPages = Math.max(1, Math.ceil(stories.length / PAGE_SIZE));
  const current = Math.min(page, totalPages);
  const visible = stories.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  const choose = (next) => { setCategory(next); setPage(1); };

  return <main>
    <section className="hero hero-compact">
      <div className="hero-inner">
        <div>
          <h1>Real Projects.<em>Real Results.</em></h1>
          <p className="hero-lead">See how we&apos;ve helped organisations bring their ideas to life.</p>
        </div>
        <div className="hero-collage" aria-hidden="true">
          {['field', 'hall', 'office', 'stage', 'outdoor'].map((kind, i) => (
            <Photo key={kind} style={kind} imageKey={`scenes/stories-hero-${i + 1}`} />
          ))}
        </div>
      </div>
    </section>

    <section className="section">
      <div className="story-controls">
        <div className="filter-row" role="group" aria-label="Filter success stories">
          <button className={category === 'all' ? 'is-active' : ''} type="button" onClick={() => choose('all')}>All Projects</button>
          {solutions.map((solution) => <button
            key={solution.id}
            className={category === solution.id ? 'is-active' : ''}
            type="button"
            onClick={() => choose(solution.id)}
          >{solution.name.replace(' Organisations', '')}</button>)}
        </div>
        <label className="sort-select">
          <span className="sr-only">Sort stories</span>
          <select value={sort} onChange={(event) => { setSort(event.target.value); setPage(1); }}>
            <option value="latest">Latest First</option>
            <option value="oldest">Oldest First</option>
          </select>
          <Icon name="chevronDown" size={14} />
        </label>
      </div>

      {visible.length > 0
        ? <div className="story-grid">{visible.map((story) => <StoryCard key={story.slug} story={story} />)}</div>
        : <div className="empty-state"><h3>No stories in this category yet.</h3><p>Add a matching entry to successStories.json to publish one.</p></div>}

      {totalPages > 1 && <nav className="pagination" aria-label="Success story pages">
        {Array.from({ length: totalPages }, (_, i) => <button
          key={i}
          type="button"
          className={current === i + 1 ? 'is-active' : ''}
          aria-current={current === i + 1 ? 'page' : undefined}
          onClick={() => setPage(i + 1)}
        >{i + 1}</button>)}
        <button type="button" disabled={current === totalPages} onClick={() => setPage(current + 1)}>Next</button>
      </nav>}
    </section>

    <QuotePanel />

    <PageCTA title="Have a project in mind?" description="Let's create something amazing together." />
  </main>;
}
