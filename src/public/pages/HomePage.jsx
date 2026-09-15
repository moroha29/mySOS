import siteContent from '../../data/siteContent.json';
import solutions from '../../data/solutions.json';
import { cms, cmsAll, configPath, contentPath, headingPath, heroBackground, labelPath, picture, scenePath, solutionPath } from '../cms';
import { getStories } from '../../utils/catalogue';
import Icon from '../components/Icons';
import { Product } from '../components/Visuals';
import { Button, CategoryCard, heading, label, PageCTA, ProcessSteps, SectionHeading, StoryCard, Testimonials, TextLink, QUOTE_HREF } from '../components/Ui';

const MARQUEE_SPEED = 34; // px per second — slow enough to read each mark
const CARD_WIDTH = 186;   // keep in sync with .trust-logo width in public.css

function LogoCard({ logo, index, duplicate = false }) {
  const src = picture(logo.image, `logos/${logo.key}`);
  // Only the first pass is annotated: the duplicate is decorative, and marking
  // it would give the manager two elements claiming the same field.
  const namePath = duplicate ? undefined : cms(contentPath('trustedBy', index, 'name'));
  return <div className="trust-logo" style={{ '--logo-scale': logo.scale ?? 1 }} aria-hidden={duplicate || undefined}>
    {src
      ? <img className="crest-img" src={src} alt={duplicate ? '' : logo.name} loading="lazy" data-cms-path={duplicate ? undefined : cms(contentPath('trustedBy', index, 'image'))} />
      : <span className="crest-fallback" aria-label={duplicate ? undefined : logo.name} role={duplicate ? undefined : 'img'}><b data-cms-path={namePath}>{logo.name}</b></span>}
  </div>;
}

/*
 * Continuous marquee. The list is rendered twice and the track slides exactly
 * -50%, so the wrap is seamless. Driven by a CSS animation rather than a rAF
 * loop: it runs on the compositor, survives tab throttling without jumping,
 * and pauses on hover/focus purely declaratively.
 */
function TrustStrip() {
  const logos = siteContent.trustedBy;
  // Duration derived from the track length so the speed stays constant as
  // logos are added or removed.
  const duration = Math.round((logos.length * CARD_WIDTH) / MARQUEE_SPEED);

  return <section className="trust-strip">
    <p className="mini-title" data-cms-path={cms(headingPath('trustedByHeading'))}>{heading('trustedByHeading', 'Trusted by organisations across Singapore')}</p>
    <div className="trust-row">
      <div className="trust-viewport">
        <div className="trust-track" style={{ '--marquee-duration': `${duration}s` }}>
          {logos.map((logo, index) => <LogoCard key={logo.key} logo={logo} index={index} />)}
          {/* duplicate pass, hidden from assistive tech, purely for the seamless wrap */}
          {logos.map((logo, index) => <LogoCard key={`dup-${logo.key}`} logo={logo} index={index} duplicate />)}
        </div>
      </div>
    </div>
  </section>;
}

export default function HomePage() {
  const featuredStories = getStories().filter((story) => story.featured).slice(0, 4);
  const heroShot = picture(siteContent.scenes?.homeHeroImage, 'scenes/home-hero');
  const bandBg = picture(siteContent.scenes?.industryBandImage, 'scenes/band-industry');
  return <main>
    <section {...heroBackground(siteContent.scenes?.homeHeroBackgroundImage, scenePath('homeHeroBackgroundImage'), 'hero')}>
      <div className="hero-inner">
        <div>
          <h1>
            <span data-cms-path={cms(headingPath('heroTitle'))}>{heading('heroTitle', 'Custom Merchandise,')}</span>
            <em><span data-cms-path={cms(headingPath('heroTitleAccent'))}>{heading('heroTitleAccent', 'Made Simple.')}</span></em>
          </h1>
          <p className="hero-lead" data-cms-path={cms(headingPath('heroLead'))}>{heading('heroLead')}</p>
          <div className="hero-actions">
            <Button href={QUOTE_HREF} data-cms-paths={cmsAll(configPath('quotationPath'))}><span data-cms-path={cms(labelPath('heroQuoteButton'))}>{label('heroQuoteButton', 'Get a Quote')}</span></Button>
            <Button href="/mySOS/products/" variant="ghost"><span data-cms-path={cms(labelPath('heroExploreButton'))}>{label('heroExploreButton', 'Explore Products')}</span> <Icon name="arrowRight" size={15} className="inline-arrow" /></Button>
          </div>
          <ul className="hero-promises">
            {siteContent.heroPromises.map((promise, index) => <li key={promise}>
              <Icon name="check" size={15} />
              <span data-cms-path={cms(contentPath('heroPromises', index))}>{promise}</span>
            </li>)}
          </ul>
        </div>
        <div className="hero-art" aria-hidden="true">
          {heroShot
            ? <img className="hero-shot" src={heroShot} alt="" data-cms-path={cms(scenePath('homeHeroImage'))} />
            : <>
          <Product type="tote" color="sand" className="ha-3" />
          <Product type="jersey" color="green" className="ha-1" />
          <Product type="polo" color="navy" className="ha-2" />
          <Product type="bottle" color="teal" className="ha-4" />
          <Product type="lanyard" color="blue" className="ha-5" />
            </>}
        </div>
      </div>
    </section>

    {/* Reviews sit directly under the banner. */}
    <Testimonials action={<Button href="/mySOS/success-stories/" variant="outline"><span data-cms-path={cms(labelPath('viewAllStoriesButton'))}>{label('viewAllStoriesButton', 'View All Success Stories')}</span> <Icon name="arrowRight" size={15} className="inline-arrow" /></Button>} />

    <TrustStrip />

    <section className="section">
      <SectionHeading eyebrow={heading('categoriesHeading', 'What can we make for you?')} eyebrowPath={headingPath('categoriesHeading')} />
      <div className="category-grid">
        {siteContent.categories.map((category) => <CategoryCard key={category.id} category={category} />)}
        <div className="grid-action"><TextLink href="/mySOS/products/"><span data-cms-path={cms(labelPath('viewAllProductsLabel'))}>{label('viewAllProductsLabel', 'View All Products')}</span></TextLink></div>
      </div>
    </section>

    <section className="industry-band" style={bandBg ? { '--band-bg': `url(${bandBg})` } : undefined}>
      <div className="section">
        <SectionHeading
          eyebrow={heading('industryHeading')}
          eyebrowPath={headingPath('industryHeading')}
          description={heading('industryDescription')}
          descriptionPath={headingPath('industryDescription')}
        />
        <div className="industry-nav">
          {solutions.map((solution) => <a key={solution.id} href={`/mySOS/solutions/?industry=${solution.id}`}>
            <Icon name={solution.imageStyle} size={26} />
            <span data-cms-path={cms(solutionPath(solution, 'name'))}>{solution.name.replace(' Organisations', '')}</span>
          </a>)}
        </div>
        <div className="center-action"><Button href="/mySOS/solutions/"><span data-cms-path={cms(labelPath('findMySolutionButton'))}>{label('findMySolutionButton', 'Find My Solution')}</span> <Icon name="arrowRight" size={15} className="inline-arrow" /></Button></div>
      </div>
    </section>

    <section className="section">
      <SectionHeading eyebrow={heading('benefitsHeading', 'Why choose MySOS?')} eyebrowPath={headingPath('benefitsHeading')} />
      <div className="benefit-grid">
        {siteContent.benefits.map((benefit, index) => <article key={benefit.title}>
          <span className="benefit-icon"><Icon name={benefit.icon} size={22} /></span>
          <h3 data-cms-path={cms(contentPath('benefits', index, 'title'))}>{benefit.title}</h3>
          <p data-cms-path={cms(contentPath('benefits', index, 'description'))}>{benefit.description}</p>
        </article>)}
      </div>
    </section>

    <section className="section">
      <SectionHeading eyebrow={heading('processHeading', 'How it works')} eyebrowPath={headingPath('processHeading')} />
      <ProcessSteps items={siteContent.process} pathAt={(index, key) => contentPath('process', index, key)} />
    </section>

    <section className="section">
      <SectionHeading eyebrow={heading('storiesHeading', 'Real projects. Real results.')} eyebrowPath={headingPath('storiesHeading')} />
      <div className="story-grid">
        {featuredStories.map((story) => <StoryCard key={story.slug} story={story} showBadge={false} />)}
      </div>
      <div className="center-action"><Button href="/mySOS/success-stories/" variant="outline"><span data-cms-path={cms(labelPath('viewAllStoriesButton'))}>{label('viewAllStoriesButton', 'View All Success Stories')}</span> <Icon name="arrowRight" size={15} className="inline-arrow" /></Button></div>
    </section>

    <PageCTA
      title={heading('closingCtaTitle')}
      titlePath={headingPath('closingCtaTitle')}
      description={heading('closingCtaDescription')}
      descriptionPath={headingPath('closingCtaDescription')}
    />
  </main>;
}
