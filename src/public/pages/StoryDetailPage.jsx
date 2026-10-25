import { useEffect, useRef, useState } from 'react';
import siteContent from '../../data/siteContent.json';
import { cms, cmsAll, configPath, pagePath, pageText, picture, storyPath } from '../cms';
import { getPublicProduct, getStoryBySlug } from '../../utils/catalogue';
import Icon from '../components/Icons';
import { PageCTA, Photo, ProcessSteps, ProductShot } from '../components/Ui';

// Section wording is content; the ids stay here because the anchors and the
// scroll spy match on them.
const sections = [
  { id: 'challenge', key: 'challengeLabel', fallback: 'The Challenge' },
  { id: 'solution', key: 'solutionLabel', fallback: 'Our Solution' },
  { id: 'process', key: 'processLabel', fallback: 'The Process' },
  { id: 'outcome', key: 'outcomeLabel', fallback: 'The Outcome' },
  { id: 'feedback', key: 'feedbackLabel', fallback: 'Client Feedback' },
];
const sectionLabel = (section) => pageText('story', section.key, section.fallback);
const sectionPath = (section) => pagePath('story', section.key);

/*
 * How a list of lines is set: as sentences, or with a tick in front of each.
 * Anything the manager does not offer reads as sentences, so a value that is
 * missing, empty or misspelt can never leave the page looking broken.
 */
export const LIST_STYLES = ['paragraphs', 'bullets'];
const listStyle = (chosen) => (LIST_STYLES.includes(chosen) ? chosen : 'paragraphs');

const processIcons = ['consult', 'design', 'sample', 'production', 'delivery'];

/*
 * The caption under each process step. Keyed by the step names used across
 * successStories.json, with a positional fallback for anything unrecognised.
 * Both lists are content, so the wording can be edited; these are the shipped
 * defaults for a site whose content predates them.
 */
const defaultProcessCaptions = {
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
const defaultCaptionFallbacks = ['Understand your needs', 'Designs prepared for approval', 'Sample checked and signed off', 'Quality production & strict QC', 'On-time delivery'];
const processCaptions = () => siteContent.pages?.story?.processCaptions ?? defaultProcessCaptions;
const captionFallbacks = () => siteContent.pages?.story?.processCaptionFallbacks ?? defaultCaptionFallbacks;

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

/*
 * Keep the chapter being read in view along the row.
 *
 * Pinned under the header on a narrow screen, the row is wider than the
 * screen: by the fourth chapter the one marked as yours was off the right-hand
 * end, so the row said you were on the first. The row is scrolled, never the
 * page — scrollIntoView would carry the whole page with it.
 */
function useChapterInView(active) {
  const rail = useRef(null);
  useEffect(() => {
    const row = rail.current;
    const marked = row?.querySelector('a.is-active');
    if (!row || !marked) return;
    const room = row.scrollWidth - row.clientWidth;
    if (room < 4) return;
    const middle = marked.offsetLeft - (row.clientWidth - marked.offsetWidth) / 2;
    const to = Math.max(0, Math.min(room, middle));
    if (Math.abs(to - row.scrollLeft) < 4) return;
    row.scrollTo({ left: to, behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }, [active]);
  return rail;
}

/*
 * One photograph at full size, with the rest a key away.
 *
 * The strip used to end in a tile reading "View All Photos (4)" that was a
 * span: it looked like a button, and clicking it did nothing at all. The
 * photographs were never shown larger than a thumbnail anywhere on the site.
 *
 * A dialog rather than a page of its own, because the reader is partway
 * through a story and should come back to where they were -- the same way the
 * size guide opens on a product. Escape closes it, the backdrop closes it, and
 * the arrows move along the strip without leaving.
 */
function PhotoViewer({ story, photos, styles, at, onMove, onClose }) {
  const ref = useRef(null);
  const open = Number.isInteger(at) && at >= 0 && at < photos.length;
  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;
    if (open && !node.open) node.showModal();
    if (!open && node.open) node.close();
    return undefined;
  }, [open, at]);
  if (!photos.length) return null;

  const step = (by) => onMove((at + by + photos.length) % photos.length);
  const label = pageText('story', 'galleryLabel', 'View All Photos');
  return <dialog
    className="photo-viewer"
    ref={ref}
    aria-label={`${story.title}: ${label}`}
    onClose={onClose}
    onClick={(event) => { if (event.target === ref.current) onClose(); }}
    onKeyDown={(event) => {
      if (event.key === 'ArrowRight') { event.preventDefault(); step(1); }
      if (event.key === 'ArrowLeft') { event.preventDefault(); step(-1); }
    }}
  >
    <div className="photo-viewer-head">
      <p>{story.title}</p>
      <button type="button" className="photo-viewer-close" aria-label="Close" onClick={onClose}><Icon name="close" size={22} /></button>
    </div>
    {open && <Photo
      style={styles[at] ?? story.imageStyle}
      image={picture(photos[at], `stories/${story.slug}/0${at + 1}`)}
      className="photo-viewer-shot"
      label={`${story.title} photo ${at + 1}`}
      wide
    />}
    <div className="photo-viewer-foot">
      <button type="button" aria-label="Previous photo" onClick={() => step(-1)} disabled={photos.length < 2}><Icon name="chevronLeft" size={22} /></button>
      <span>{open ? at + 1 : 0} / {photos.length}</span>
      <button type="button" aria-label="Next photo" onClick={() => step(1)} disabled={photos.length < 2}><Icon name="chevronRight" size={22} /></button>
    </div>
  </dialog>;
}

export default function StoryDetailPage({ slug }) {
  const story = getStoryBySlug(slug);
  const active = useActiveSection();
  const tocRef = useChapterInView(active);
  // Which photograph is open, or null for none. Null on the server and on the
  // first render in the browser alike, so the two agree.
  const [viewing, setViewing] = useState(null);

  if (!story) {
    return <main className="not-found">
      <span>404</span>
      <h1 data-cms-path={cms(pagePath('story', 'missingTitle'))}>{pageText('story', 'missingTitle', 'Story not found')}</h1>
      <p data-cms-path={cms(pagePath('story', 'missingDescription'))}>{pageText('story', 'missingDescription')}</p>
      <a className="btn btn-primary" href="/success-stories/"><span data-cms-path={cms(pagePath('story', 'missingButtonLabel'))}>{pageText('story', 'missingButtonLabel', 'View all success stories')}</span></a>
    </main>;
  }

  const products = story.products.map(getPublicProduct).filter(Boolean);
  const industry = story.category.replace('-', ' ');
  const gallery = story.gallery.slice(0, 4);
  // The photographs the strip shows, one picture each. A story written before
  // they were pictures has a slot for every drawing it was using.
  const photos = story.galleryImages ?? gallery.map(() => '');
  // Each step carries where its caption came from, so the manager edits the
  // entry that actually produced the words on screen.
  const captions = processCaptions();
  const fallbacks = captionFallbacks();
  const processSteps = story.process.map((title, index) => {
    const named = Object.prototype.hasOwnProperty.call(captions, title);
    const fallbackIndex = index % fallbacks.length;
    return {
      title,
      icon: processIcons[index % processIcons.length],
      description: named ? captions[title] : fallbacks[fallbackIndex],
      descriptionPath: named
        ? pagePath('story', 'processCaptions', title)
        : pagePath('story', 'processCaptionFallbacks', fallbackIndex),
    };
  });

  return <main>
    <nav className="breadcrumb" aria-label="Breadcrumb">
      {/* Names the field, so the manager does not match this to one of the
        * placeholder legal links, which point at "/" too. */}
      <a href="/" data-cms-paths={cmsAll(configPath('basePath'))}><span data-cms-path={cms(pagePath('story', 'homeCrumbLabel'))}>{pageText('story', 'homeCrumbLabel', 'Home')}</span></a><i aria-hidden="true">›</i>
      <a href="/success-stories/"><span data-cms-path={cms(pagePath('story', 'storiesCrumbLabel'))}>{pageText('story', 'storiesCrumbLabel', 'Success Stories')}</span></a><i aria-hidden="true">›</i>
      <span aria-current="page" data-cms-path={cms(storyPath(story, 'title'))}>{story.title}</span>
    </nav>

    <section className="story-hero">
      <div className="story-hero-bg" aria-hidden="true" data-reveal><Photo style={story.imageStyle} image={picture(story.image, `stories/${story.slug}/hero`)} imagePath={storyPath(story, 'image')} wide eager /></div>
      <div className="story-hero-inner" data-reveal>
        <a className="back-link" href="/success-stories/"><Icon name="chevronLeft" size={18} /> <span data-cms-path={cms(pagePath('story', 'backLabel'))}>{pageText('story', 'backLabel', 'Back to all stories')}</span></a>
        <div><span className="badge">{industry}</span></div>
        <h1 data-cms-path={cms(storyPath(story, 'title'))}>{story.title}</h1>
        <p data-cms-path={cms(storyPath(story, 'summary'))}>{story.summary}</p>
        <dl className="story-meta">
          {/* The industry carries its own address, as the label beside it
              always has. Without one, clicking "schools" in the manager
              selected the word "Industry" above it and there was no way to
              say which industry the story belongs to. */}
          <div><Icon name="business" size={25} /><span><dt data-cms-path={cms(pagePath('story', 'industryLabel'))}>{pageText('story', 'industryLabel', 'Industry')}</dt><dd className="story-industry" data-cms-path={cms(storyPath(story, 'category'))}>{industry}</dd></span></div>
          <div><Icon name="shirt" size={25} /><span><dt data-cms-path={cms(pagePath('story', 'productsLabel'))}>{pageText('story', 'productsLabel', 'Products')}</dt><dd>{products.map((item) => item.public.name).join(', ') || '—'}</dd></span></div>
          <div><Icon name="quantity" size={25} /><span><dt data-cms-path={cms(pagePath('story', 'quantityLabel'))}>{pageText('story', 'quantityLabel', 'Quantity')}</dt><dd><span data-cms-path={cms(storyPath(story, 'quantity'))}>{story.quantity}</span> <span data-cms-path={cms(pagePath('story', 'quantitySuffix'))}>{pageText('story', 'quantitySuffix', 'pcs')}</span></dd></span></div>
          <div><Icon name="calendar" size={25} /><span><dt data-cms-path={cms(pagePath('story', 'yearLabel'))}>{pageText('story', 'yearLabel', 'Year')}</dt><dd data-cms-path={cms(storyPath(story, 'year'))}>{story.year}</dd></span></div>
        </dl>
      </div>
    </section>

    {/* Each photograph is its own picture, so it can be clicked in the manager
        and changed like every other picture on the page. Before this the four
        were the only pictures on a story nobody could touch: they carried no
        address at all, so clicking one selected nothing.

        The row is as wide as there are photographs, up to five across, so
        taking one out does not leave a hole at the end of it. */}
    <div className="gallery-strip" data-reveal style={{ '--tiles': Math.min(5, photos.length + 1) }}>
      {photos.map((photo, index) => <button
        type="button"
        className="gallery-tile"
        key={`photo-${index}`}
        onClick={() => setViewing(index)}
        aria-label={`${story.title} photo ${index + 1} of ${photos.length}. Open larger`}
      >
        <Photo
          style={gallery[index] ?? story.imageStyle}
          image={picture(photo, `stories/${story.slug}/0${index + 1}`)}
          imagePath={storyPath(story, 'galleryImages', index)}
          className={index === 0 ? 'is-active' : ''}
          label={`${story.title} photo ${index + 1}`}
        />
      </button>)}
      <button type="button" className="gallery-more" onClick={() => setViewing(0)} disabled={!photos.length}>
        <Icon name="photos" size={24} />
        <span data-cms-path={cms(pagePath('story', 'galleryLabel'))}>{pageText('story', 'galleryLabel', 'View All Photos')}</span> ({photos.length})
      </button>
    </div>

    <PhotoViewer
      story={story}
      photos={photos}
      styles={gallery}
      at={viewing}
      onMove={setViewing}
      onClose={() => setViewing(null)}
    />

    <div className="story-body">
      <aside className="story-toc" ref={tocRef}>
        <span data-cms-path={cms(pagePath('story', 'tocLabel'))}>{pageText('story', 'tocLabel', 'The Story')}</span>
        {sections.map((section, index) => <a
          key={section.id}
          className={active === section.id ? 'is-active' : ''}
          href={`#${section.id}`}
        >{String(index + 1).padStart(2, '0')}  <span data-cms-path={cms(sectionPath(section))}>{sectionLabel(section)}</span></a>)}
      </aside>

      <div className="story-narrative">
        <section data-reveal className="narrative-block" id="challenge">
          <div>
            <div className="narrative-head"><span>01</span><h2 data-cms-path={cms(sectionPath(sections[0]))}>{sectionLabel(sections[0])}</h2></div>
            {/*
              * One stored string can render as two paragraphs, so no single
              * element holds the whole value. data-cms-paths still makes the
              * field selectable without letting the manager rewrite half of it.
              */}
            {paragraphs(story.challenge).map((text) => <p key={text} data-cms-paths={cmsAll(storyPath(story, 'challenge'))}>{text}</p>)}
          </div>
          <Photo style="sketch" imageKey={`stories/${story.slug}/challenge`} label="Early design sketches" />
        </section>

        <section data-reveal className="narrative-block" id="solution">
          <div>
            <div className="narrative-head"><span>02</span><h2 data-cms-path={cms(sectionPath(sections[1]))}>{sectionLabel(sections[1])}</h2></div>
            {paragraphs(story.solution).map((text) => <p key={text} data-cms-paths={cmsAll(storyPath(story, 'solution'))}>{text}</p>)}
          </div>
          {products[0]
            ? <ProductShot imageStyle={products[0].public.imageStyle} slug={products[0].public.slug} />
            : <Photo style="studio" imageKey={`stories/${story.slug}/solution`} label="Finished product" />}
        </section>

        <section data-reveal className="narrative-block is-wide" id="process">
          <div className="narrative-head"><span>03</span><h2 data-cms-path={cms(sectionPath(sections[2]))}>{sectionLabel(sections[2])}</h2></div>
          {/* Only the step titles are content; the captions are written above. */}
          <ProcessSteps items={processSteps} variant="icon" pathAt={(index, key) => (key === 'title' ? storyPath(story, 'process', index) : processSteps[index]?.descriptionPath)} />
        </section>

        <section data-reveal className="narrative-block" id="outcome">
          <div>
            <div className="narrative-head"><span>04</span><h2 data-cms-path={cms(sectionPath(sections[3]))}>{sectionLabel(sections[3])}</h2></div>
            {/* Sentences or a ticked list, whichever MySOS chose for this
                story. The tick is drawn either way and hidden by the choice,
                so changing it is a change of style and not of the page: the
                manager's preview can show it without redrawing anything.

                One outcome still empty is not drawn, or adding an outcome in
                the manager leaves a line with nothing on it until the first
                word is typed. It keeps its place in the list, because that
                place is the address the manager writes to. */}
            <div
              className="outcome-copy"
              data-list-style={listStyle(story.outcomesStyle)}
              data-cms-path={cms(storyPath(story, 'outcomesStyle'))}
            >
              {story.outcomes.map((outcome, index) => [outcome, index])
                .filter(([outcome]) => String(outcome ?? '').trim())
                .map(([outcome, index]) => <p key={index}>
                  <Icon name="check" size={19} />
                  <span data-cms-path={cms(storyPath(story, 'outcomes', index))}>{outcome}</span>
                </p>)}
            </div>
          </div>
          <Photo style={story.gallery[1] ?? story.imageStyle} imageKey={`stories/${story.slug}/outcome`} label="The finished project" />
        </section>

        <section data-reveal className="narrative-block is-wide" id="feedback">
          <div className="narrative-head"><span>05</span><h2 data-cms-path={cms(sectionPath(sections[4]))}>{sectionLabel(sections[4])}</h2></div>
          <div className="feedback-block">
            <p className="feedback-quote">&ldquo;<span data-cms-path={cms(storyPath(story, 'testimonial', 'quote'))}>{story.testimonial.quote}</span>&rdquo;</p>
            <div className="feedback-author">
              <strong data-cms-path={cms(storyPath(story, 'testimonial', 'name'))}>{story.testimonial.name}</strong>
              <small><span data-cms-path={cms(storyPath(story, 'testimonial', 'organisation'))}>{story.testimonial.organisation}</span></small>
            </div>
          </div>
        </section>
      </div>
    </div>

    <PageCTA
      title={pageText('story', 'ctaTitle', 'Need something similar?')}
      titlePath={pagePath('story', 'ctaTitle')}
      description={pageText('story', 'ctaDescription', "Let's create something amazing together.")}
      descriptionPath={pagePath('story', 'ctaDescription')}
    />
  </main>;
}
