import siteContent from '../../data/siteContent.json';
import solutions from '../../data/solutions.json';
import { getStories } from '../../utils/catalogue';
import { getImage } from '../../utils/imageRegistry';
import Icon from '../components/Icons';
import { Product } from '../components/Visuals';
import { Button, CategoryCard, heading, label, PageCTA, ProcessSteps, SectionHeading, StoryCard, Testimonials, TextLink, QUOTE_HREF } from '../components/Ui';

const MARQUEE_SPEED = 34; // px per second — slow enough to read each mark
const CARD_WIDTH = 186;   // keep in sync with .trust-logo width in public.css

function LogoCard({ logo, duplicate = false }) {
  const src = getImage(`logos/${logo.key}`);
  return <div className="trust-logo" style={{ '--logo-scale': logo.scale ?? 1 }} aria-hidden={duplicate || undefined}>
    {src
      ? <img className="crest-img" src={src} alt={duplicate ? '' : logo.name} loading="lazy" />
      : <span className="crest-fallback" aria-label={duplicate ? undefined : logo.name} role={duplicate ? undefined : 'img'}><b>{logo.name}</b></span>}
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
    <p className="mini-title">{heading('trustedByHeading', 'Trusted by organisations across Singapore')}</p>
    <div className="trust-row">
      <div className="trust-viewport">
        <div className="trust-track" style={{ '--marquee-duration': `${duration}s` }}>
          {logos.map((logo) => <LogoCard key={logo.key} logo={logo} />)}
          {/* duplicate pass, hidden from assistive tech, purely for the seamless wrap */}
          {logos.map((logo) => <LogoCard key={`dup-${logo.key}`} logo={logo} duplicate />)}
        </div>
      </div>
    </div>
  </section>;
}

export default function HomePage() {
  const featuredStories = getStories().filter((story) => story.featured).slice(0, 4);
  const heroShot = getImage('scenes/home-hero');
  const bandBg = getImage('scenes/band-industry');
  return <main>
    <section className="hero">
      <div className="hero-inner">
        <div>
          <h1>{heading('heroTitle', 'Custom Merchandise,')}<em>{heading('heroTitleAccent', 'Made Simple.')}</em></h1>
          <p className="hero-lead">{heading('heroLead')}</p>
          <div className="hero-actions">
            <Button href={QUOTE_HREF}>{label('heroQuoteButton', 'Get a Quote')}</Button>
            <Button href="/mySOS/products/" variant="ghost">{label('heroExploreButton', 'Explore Products')} <Icon name="arrowRight" size={15} className="inline-arrow" /></Button>
          </div>
          <ul className="hero-promises">
            {siteContent.heroPromises.map((promise) => <li key={promise}><Icon name="check" size={15} />{promise}</li>)}
          </ul>
        </div>
        <div className="hero-art" aria-hidden="true">
          {heroShot
            ? <img className="hero-shot" src={heroShot} alt="" />
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

    <TrustStrip />

    <section className="section">
      <SectionHeading eyebrow={heading('categoriesHeading', 'What can we make for you?')} />
      <div className="category-grid">
        {siteContent.categories.map((category) => <CategoryCard key={category.id} category={category} />)}
        <div className="grid-action"><TextLink href="/mySOS/products/">{label('viewAllProductsLink', 'View All Products')}</TextLink></div>
      </div>
    </section>

    <section className="industry-band" style={bandBg ? { '--band-bg': `url(${bandBg})` } : undefined}>
      <div className="section">
        <SectionHeading eyebrow={heading('industryHeading')} description={heading('industryDescription')} />
        <div className="industry-nav">
          {solutions.map((solution) => <a key={solution.id} href={`/mySOS/solutions/?industry=${solution.id}`}>
            <Icon name={solution.imageStyle} size={26} />
            <span>{solution.name.replace(' Organisations', '')}</span>
          </a>)}
        </div>
        <div className="center-action"><Button href="/mySOS/solutions/">{label('findMySolutionButton', 'Find My Solution')} <Icon name="arrowRight" size={15} className="inline-arrow" /></Button></div>
      </div>
    </section>

    <section className="section">
      <SectionHeading eyebrow={heading('benefitsHeading', 'Why choose MySOS?')} />
      <div className="benefit-grid">
        {siteContent.benefits.map((benefit) => <article key={benefit.title}>
          <span className="benefit-icon"><Icon name={benefit.icon} size={22} /></span>
          <h3>{benefit.title}</h3>
          <p>{benefit.description}</p>
        </article>)}
      </div>
    </section>

    <section className="section">
      <SectionHeading eyebrow={heading('processHeading', 'How it works')} />
      <ProcessSteps items={siteContent.process} />
    </section>

    <section className="section">
      <SectionHeading eyebrow={heading('storiesHeading', 'Real projects. Real results.')} />
      <div className="story-grid">
        {featuredStories.map((story) => <StoryCard key={story.slug} story={story} showBadge={false} />)}
      </div>
      <div className="center-action"><Button href="/mySOS/success-stories/" variant="outline">{label('viewAllStoriesButton', 'View All Success Stories')} <Icon name="arrowRight" size={15} className="inline-arrow" /></Button></div>
    </section>

    <Testimonials action={<Button href="/mySOS/success-stories/" variant="outline">{label('viewAllStoriesButton', 'View All Success Stories')} <Icon name="arrowRight" size={15} className="inline-arrow" /></Button>} />

    <PageCTA title={heading('closingCtaTitle')} description={heading('closingCtaDescription')} />
  </main>;
}
