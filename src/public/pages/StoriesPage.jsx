import { useState } from 'react';
import solutions from '../../data/solutions.json';
import { getStories } from '../../utils/catalogue';
import { PageCTA, SectionHeading, SuccessStoryCard } from '../components/Ui';

export default function StoriesPage() {
  const params = new URLSearchParams(globalThis.location?.search ?? '');
  const [category, setCategory] = useState(params.get('category') || 'all');
  const [sort, setSort] = useState('latest');
  const stories = getStories({ category, sort });
  return <main>
    <section className="stories-hero"><div><span className="eyebrow">Real work. Real impact.</span><h1>Success Stories</h1><p>Real projects from real clients.</p></div><div className="story-strip" aria-hidden="true"><span /><span /><span /></div></section>
    <section className="section stories-list"><SectionHeading title="Real projects. Real results." />
      <div className="story-controls"><div className="filter-row" role="group" aria-label="Filter success stories"><button className={category === 'all' ? 'is-active' : ''} type="button" onClick={() => setCategory('all')}>All</button>{solutions.map((solution) => <button className={category === solution.id ? 'is-active' : ''} key={solution.id} type="button" onClick={() => setCategory(solution.id)}>{solution.name.replace(' Organisations', '')}</button>)}</div><label>Sort stories<span className="sr-only">Sort stories</span><select value={sort} onChange={(event) => setSort(event.target.value)}><option value="latest">Latest first</option><option value="oldest">Oldest first</option></select></label></div>
      <div className="story-grid">{stories.map((story) => <SuccessStoryCard key={story.slug} story={story} />)}</div>
      {stories.length === 0 && <div className="empty-state"><h2>No stories in this category yet.</h2><p>Add a matching entry to successStories.json to publish one.</p></div>}
    </section>
    <PageCTA title="Have a project in mind?" description="Let's create something amazing together." />
  </main>;
}
