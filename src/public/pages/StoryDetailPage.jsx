import { useEffect, useState } from 'react';
import { getPublicProduct, getStoryBySlug } from '../../utils/catalogue';
import Icon from '../components/Icons';
import { PageCTA, Photo, ProcessSteps, ProductShot } from '../components/Ui';

const sections = [
  { id: 'challenge', label: 'The Challenge' },
  { id: 'solution', label: 'Our Solution' },
  { id: 'process', label: 'The Process' },
  { id: 'outcome', label: 'The Outcome' },
  { id: 'feedback', label: 'Client Feedback' },
];

const processIcons = ['consult', 'design', 'sample', 'production', 'delivery'];

// The reference captions each process step. Keyed by the step names used across
// successStories.json, with a positional fallback for anything unrecognised.
const processCaptions = {
  Consultation: 'Understand needs & team identities',
  Consult: 'Understand needs & team identities',
  Brief: 'Understand needs & requirements',
  Planning: 'Map out sizes, groups & timelines',
  'Range Plan': 'Agree the range and quantities',
  Design: 'Custom designs for each team',
  Artwork: 'Artwork prepared & print-ready',
  Selection: 'Shortlist the right products',
  Sampling: 'Physical sample for approval',
  Sample: 'Physical sample for approval',
  Sizing: 'Size sets confirmed per group',
  Production: 'Quality production & strict QC',
  Produce: 'Quality production & strict QC',
  Packing: 'Sorted and labelled for handout',
  Delivery: 'On-time delivery before the date',
  Deliver: 'On-time delivery before the date',
};
const captionFallbacks = ['Understand your needs', 'Designs prepared for approval', 'Sample checked and signed off', 'Quality production & strict QC', 'On-time delivery'];

function paragraphs(text) {
  const parts = String(text).match(/[^.!?]+[.!?]+/g) ?? [text];
  if (parts.length < 2) return [text];
  const half = Math.ceil(parts.length / 2);
  return [parts.slice(0, half).join(' ').trim(), parts.slice(half).join(' ').trim()].filter(Boolean);
}

function useActiveSection() {
  const [active, setActive] = useState(sections[0].id);
  useEffect(() => {
    const nodes = sections.map((section) => document.getElementById(section.id)).filter(Boolean);
    if (!nodes.length || typeof IntersectionObserver === 'undefined') return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: '-92px 0px -55% 0px', threshold: 0 },
    );
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);
  return active;
}

export default function StoryDetailPage({ slug }) {
  const story = getStoryBySlug(slug);
  const active = useActiveSection();

  if (!story) {
    return <main className="not-found">
      <span>404</span>
      <h1>Story not found</h1>
      <p>This project may have moved or is not published yet.</p>
      <a className="btn btn-primary" href="/mySOS/success-stories/">View all success stories</a>
    </main>;
  }

  const products = story.products.map(getPublicProduct).filter(Boolean);
  const industry = story.category.replace('-', ' ');
  const gallery = story.gallery.slice(0, 4);
  const processSteps = story.process.map((title, index) => ({
    title,
    icon: processIcons[index % processIcons.length],
    description: processCaptions[title] ?? captionFallbacks[index % captionFallbacks.length],
  }));

  return <main>
    <nav className="breadcrumb" aria-label="Breadcrumb">
      <a href="/mySOS/">Home</a><i aria-hidden="true">›</i>
      <a href="/mySOS/success-stories/">Success Stories</a><i aria-hidden="true">›</i>
      <span aria-current="page">{story.title}</span>
    </nav>

    <section className="story-hero">
      <div className="story-hero-bg" aria-hidden="true"><Photo style={story.imageStyle} image={story.image} imageKey={`stories/${story.slug}/hero`} wide eager /></div>
      <div className="story-hero-inner">
        <a className="back-link" href="/mySOS/success-stories/"><Icon name="chevronLeft" size={14} /> Back to all stories</a>
        <div><span className="badge">{industry}</span></div>
        <h1>{story.title}</h1>
        <p>{story.summary}</p>
        <dl className="story-meta">
          <div><Icon name="business" size={22} /><span><dt>Industry</dt><dd>{industry}</dd></span></div>
          <div><Icon name="shirt" size={22} /><span><dt>Products</dt><dd>{products.map((item) => item.public.name).join(', ') || '—'}</dd></span></div>
          <div><Icon name="quantity" size={22} /><span><dt>Quantity</dt><dd>{story.quantity} pcs</dd></span></div>
          <div><Icon name="calendar" size={22} /><span><dt>Year</dt><dd>{story.year}</dd></span></div>
        </dl>
      </div>
    </section>

    <div className="gallery-strip">
      {gallery.map((style, index) => <Photo
        key={style}
        style={style}
        imageKey={`stories/${story.slug}/0${index + 1}`}
        className={index === 0 ? 'is-active' : ''}
        label={`${story.title} photo ${index + 1}`}
      />)}
      <span className="gallery-more"><Icon name="photos" size={20} />View All Photos ({story.gallery.length})</span>
    </div>

    <div className="story-body">
      <aside className="story-toc">
        <span>The Story</span>
        {sections.map((section, index) => <a
          key={section.id}
          className={active === section.id ? 'is-active' : ''}
          href={`#${section.id}`}
        >{String(index + 1).padStart(2, '0')}  {section.label}</a>)}
      </aside>

      <div className="story-narrative">
        <section className="narrative-block" id="challenge">
          <div>
            <div className="narrative-head"><span>01</span><h2>The Challenge</h2></div>
            {paragraphs(story.challenge).map((text) => <p key={text}>{text}</p>)}
          </div>
          <Photo style="sketch" imageKey={`stories/${story.slug}/challenge`} label="Early design sketches" />
        </section>

        <section className="narrative-block" id="solution">
          <div>
            <div className="narrative-head"><span>02</span><h2>Our Solution</h2></div>
            {paragraphs(story.solution).map((text) => <p key={text}>{text}</p>)}
          </div>
          {products[0]
            ? <ProductShot imageStyle={products[0].public.imageStyle} slug={products[0].public.slug} />
            : <Photo style="studio" imageKey={`stories/${story.slug}/solution`} label="Finished product" />}
        </section>

        <section className="narrative-block is-wide" id="process">
          <div className="narrative-head"><span>03</span><h2>The Process</h2></div>
          <ProcessSteps items={processSteps} variant="icon" />
        </section>

        <section className="narrative-block" id="outcome">
          <div>
            <div className="narrative-head"><span>04</span><h2>The Outcome</h2></div>
            <ul className="outcome-list">
              {story.outcomes.map((outcome) => <li key={outcome}><Icon name="check" size={16} />{outcome}</li>)}
            </ul>
          </div>
          <Photo style={story.gallery[1] ?? story.imageStyle} imageKey={`stories/${story.slug}/outcome`} label="The finished project" />
        </section>

        <section className="narrative-block is-wide" id="feedback">
          <div className="narrative-head"><span>05</span><h2>Client Feedback</h2></div>
          <div className="feedback-block">
            <p className="feedback-quote">&ldquo;{story.testimonial.quote}&rdquo;</p>
            <div className="feedback-author">
              <strong>{story.testimonial.name}</strong>
              <small>{story.testimonial.organisation}</small>
            </div>
          </div>
        </section>
      </div>
    </div>

    <PageCTA />
  </main>;
}
