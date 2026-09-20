import { useEffect, useMemo, useRef, useState } from 'react';
import solutions from '../../data/solutions.json';
import successStories from '../../data/successStories.json';
import { enquiryLinkProps } from '../../utils/catalogue';
import { firstImage } from '../../utils/imageRegistry';
import { productFor, requestHref } from '../../utils/solutionRequest';
import { cms, picture, solutionPath } from '../cms';
import Icon from '../components/Icons';
import RequestBuilder, { word, wordPath } from '../components/RequestBuilder';
import { Photo } from '../components/Ui';

/*
 * One solution, as the design draws it: a banner, the solution's use cases to
 * choose from, and a request builder for the chosen use case's recommended
 * package. The customer adjusts it and sends it to MySOS on WhatsApp.
 *
 * This is the customer's request, not a quotation: it shows no prices and
 * never links to the agents' quotation engine.
 */

const shortName = (solution) => solution.name.replace(' Organisations', '');

/* The banner's four pictures: chosen ones first, then MySOS's own photos of the same kind of work. */
function heroPictures(solution) {
  const stories = successStories.filter((story) => story.category === solution.id);
  const fallbacks = [
    `solutions/${solution.id}`,
    ...stories.map((story) => `stories/${story.slug}/cover`),
    ...solution.useCases.flatMap((useCase) => useCase.items.map((item) => productFor(item.productId)?.public?.slug)).filter(Boolean).map((slug) => `products/${slug}`),
  ];
  const used = new Set();
  return (solution.page?.heroImages ?? ['', '', '', '']).map((chosen, index) => {
    if (String(chosen || '').trim()) return chosen;
    const key = fallbacks.find((candidate) => !used.has(candidate) && firstImage(candidate));
    if (key) used.add(key);
    return key ? firstImage(key) : '';
  }).map((src, index) => ({ src, index }));
}

/*
 * Each card's picture: the one chosen for it, else a photo of one of its
 * products that no earlier card is already showing, else the solution's own.
 */
function useCasePictures(solution) {
  const used = new Set();
  return solution.useCases.map((useCase) => {
    const chosen = picture(useCase.image, `solutions/${solution.id}/${useCase.id}`);
    if (chosen) { used.add(chosen); return chosen; }
    const photos = useCase.items
      .map((item) => productFor(item.productId))
      .filter(Boolean)
      .map((product) => firstImage(`products/${product.public.slug}`))
      .filter(Boolean);
    const photo = photos.find((src) => !used.has(src)) ?? photos[0] ?? firstImage(`solutions/${solution.id}`);
    if (photo) used.add(photo);
    return photo;
  });
}

function Hero({ solution, solutionIndex }) {
  const discussHref = requestHref(`Hi MySOS, I'd like to discuss ${shortName(solution)} solutions.`, shortName(solution));
  const pictures = heroPictures(solution);
  return <section className="solution-hero">
    <div className="solution-hero-inner">
      <div className="solution-hero-copy">
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <a href="/mySOS/" aria-label={word('breadcrumbHome', 'Home')}><Icon name="home" size={15} /></a>
          <span aria-hidden="true">/</span>
          <a href="/mySOS/solutions/" data-cms-path={wordPath('breadcrumbSolutions')}>{word('breadcrumbSolutions', 'Solutions')}</a>
          <span aria-hidden="true">/</span>
          <span aria-current="page" data-cms-path={cms(solutionPath(solution, 'name'))}>{shortName(solution)}</span>
        </nav>
        <span className="eyebrow" data-cms-path={cms([...solutionPath(solution, 'page'), 'eyebrow'])}>{solution.page?.eyebrow}</span>
        <h1 data-cms-path={cms([...solutionPath(solution, 'page'), 'title'])}>{solution.page?.title}</h1>
        <p className="solution-hero-lead" data-cms-path={cms([...solutionPath(solution, 'page'), 'lead'])}>{solution.page?.lead}</p>
        {discussHref && <a className="btn btn-primary btn-whatsapp" href={discussHref} {...enquiryLinkProps(discussHref)}>
          <Icon name="whatsapp" size={20} />
          <span data-cms-path={wordPath('discussButton')}>{word('discussButton', 'Discuss on WhatsApp')}</span>
          <Icon name="arrowRight" size={16} />
        </a>}
      </div>
      <div className="solution-collage" aria-hidden="true">
        {pictures.map(({ src, index }) => <div className={`solution-collage-tile tile-${index + 1}`} key={index}>
          <Photo style={solution.imageStyle} image={src} imagePath={[...solutionPath(solution, 'page'), 'heroImages', index]} eager={index < 2} />
        </div>)}
      </div>
    </div>
    <span className="sr-only">{`Solution ${solutionIndex + 1} of ${solutions.length}`}</span>
  </section>;
}

function UseCasePicker({ solution, activeId, onChoose }) {
  const trackRef = useRef(null);
  const sectionRef = useRef(null);
  const [showAll, setShowAll] = useState(false);
  const [pages, setPages] = useState({ count: 1, current: 0 });

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return undefined;
    const measure = () => {
      const count = Math.max(1, Math.ceil(track.scrollWidth / Math.max(1, track.clientWidth) - 0.05));
      const current = Math.min(count - 1, Math.round(track.scrollLeft / Math.max(1, track.clientWidth)));
      setPages({ count, current });
    };
    measure();
    track.addEventListener('scroll', measure, { passive: true });
    window.addEventListener('resize', measure);
    return () => {
      track.removeEventListener('scroll', measure);
      window.removeEventListener('resize', measure);
    };
  }, [showAll]);

  const pictures = useMemo(() => useCasePictures(solution), [solution]);
  /*
   * Showing everything can make the list several rows tall, so folding it back
   * takes the reader to the top of the list rather than leaving them below
   * where it used to end.
   */
  const toggleAll = () => setShowAll((open) => {
    if (open) sectionRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
    return !open;
  });
  const move = (direction) => trackRef.current?.scrollBy({ left: direction * trackRef.current.clientWidth * 0.8, behavior: 'smooth' });
  const toPage = (page) => trackRef.current?.scrollTo({ left: page * trackRef.current.clientWidth, behavior: 'smooth' });

  return <section className="use-cases" aria-labelledby="use-cases-title" ref={sectionRef}>
    <div className="section-heading align-center">
      <div>
        <h2 id="use-cases-title" data-cms-path={cms([...solutionPath(solution, 'page'), 'exploreTitle'])}>{solution.page?.exploreTitle}</h2>
        <p data-cms-path={wordPath('exploreLead')}>{word('exploreLead')}</p>
      </div>
    </div>
    <div className={showAll ? 'use-case-rail is-all' : 'use-case-rail'}>
      {!showAll && <button className="use-case-arrow" type="button" aria-label="Previous" disabled={pages.current === 0} onClick={() => move(-1)}><Icon name="chevronLeft" size={20} /></button>}
      <ul className="use-case-track" ref={trackRef}>
        {solution.useCases.map((useCase, index) => {
          const active = useCase.id === activeId;
          return <li key={useCase.id}>
            <button type="button" className={active ? 'use-case-card is-active' : 'use-case-card'} aria-pressed={active} onClick={() => onChoose(useCase.id)}>
              <span className="use-case-photo"><Photo style={solution.imageStyle} image={pictures[index]} imagePath={[...solutionPath(solution, 'useCases', index), 'image']} /></span>
              {active && <span className="use-case-selected"><Icon name="check" size={14} /><span data-cms-path={wordPath('selectedLabel')}>{word('selectedLabel', 'Selected')}</span></span>}
              <span className="use-case-name">
                <Icon name={useCase.icon} size={30} cmsPath={[...solutionPath(solution, 'useCases', index), 'icon']} />
                <span data-cms-path={cms([...solutionPath(solution, 'useCases', index), 'name'])}>{useCase.name}</span>
              </span>
            </button>
          </li>;
        })}
      </ul>
      {!showAll && <button className="use-case-arrow" type="button" aria-label="Next" disabled={pages.current >= pages.count - 1} onClick={() => move(1)}><Icon name="chevronRight" size={20} /></button>}
    </div>
    <div className="use-case-foot">
      {!showAll && pages.count > 1 ? <div className="use-case-dots">
        {Array.from({ length: pages.count }, (_, page) => <button key={page} type="button" className={page === pages.current ? 'is-active' : ''} aria-label={`Page ${page + 1}`} onClick={() => toPage(page)} />)}
      </div> : <span />}
      <button className="use-case-all" type="button" aria-expanded={showAll} onClick={toggleAll}>
        {showAll
          ? <span data-cms-path={wordPath('showFewerLabel')}>{word('showFewerLabel', 'Show fewer')}</span>
          : <span data-cms-path={wordPath('viewAllLabel')}>{word('viewAllLabel', 'View all solutions')}</span>}
        <Icon name={showAll ? 'chevronUp' : 'chevronDown'} size={16} />
      </button>
    </div>
  </section>;
}

export default function SolutionDetailPage({ solutionId }) {
  const solutionIndex = solutions.findIndex((item) => item.id === solutionId);
  const solution = solutions[solutionIndex];
  const requested = new URLSearchParams(globalThis.location?.search ?? '').get('use');
  const [useCaseId, setUseCaseId] = useState(() => (solution?.useCases.some((item) => item.id === requested) ? requested : solution?.defaultUseCase ?? solution?.useCases[0]?.id));
  const useCase = solution?.useCases.find((item) => item.id === useCaseId) ?? solution?.useCases[0];

  if (!solution) return null;
  return <main className="solution-page">
    <Hero solution={solution} solutionIndex={solutionIndex} />
    {solution.useCases.length > 0 && <UseCasePicker solution={solution} activeId={useCase?.id} onChoose={setUseCaseId} />}
    {useCase && <RequestBuilder topic={shortName(solution)} useCase={useCase} />}
  </main>;
}
