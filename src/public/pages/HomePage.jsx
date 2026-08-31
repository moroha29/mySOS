import { useState } from 'react';
import siteContent from '../../data/siteContent.json';
import solutions from '../../data/solutions.json';
import { getStories } from '../../utils/catalogue';
import { getImage } from '../../utils/imageRegistry';
import Icon from '../components/Icons';
import { Product } from '../components/Visuals';
import { Button, CategoryCard, PageCTA, ProcessSteps, SectionHeading, StoryCard, TextLink, QUOTE_HREF } from '../components/Ui';

const PER_VIEW = 5;

function TrustStrip() {
  const logos = siteContent.trustedBy;
  const [start, setStart] = useState(0);
  // Only a longer list than fits on screen is worth scrolling.
  const scrollable = logos.length > PER_VIEW;
  const visible = scrollable
    ? Array.from({ length: PER_VIEW }, (_, i) => logos[(start + i) % logos.length])
    : logos;
  const step = (delta) => setStart((start + delta + logos.length) % logos.length);

  return <section className="trust-strip">
    <p className="mini-title">Trusted by organisations across Singapore</p>
    <div className="trust-row">
      <button className="carousel-btn" type="button" aria-label="Previous logos" disabled={!scrollable} onClick={() => step(-1)}><Icon name="chevronLeft" size={16} /></button>
      <div className="trust-track" style={{ '--per-view': Math.min(PER_VIEW, logos.length) }}>
        {visible.map((logo) => {
          const src = getImage(`logos/${logo.short.toLowerCase()}`);
          return <div className="trust-logo" key={logo.name} style={{ '--logo-scale': logo.scale ?? 1 }}>
            {src
              ? <img className="crest-img" src={src} alt={logo.name} loading="lazy" />
              : <span className="crest-fallback" aria-label={logo.name} role="img"><b>{logo.short}</b><small>{logo.sub}</small></span>}
          </div>;
        })}
      </div>
      <button className="carousel-btn" type="button" aria-label="Next logos" disabled={!scrollable} onClick={() => step(1)}><Icon name="chevronRight" size={16} /></button>
    </div>
  </section>;
}

export default function HomePage() {
  const featuredStories = getStories().filter((story) => story.featured).slice(0, 4);
  const heroShot = getImage('scenes/home-hero');
  return <main>
    <section className="hero">
      <div className="hero-inner">
        <div>
          <h1>Custom Merchandise,<em>Made Simple.</em></h1>
          <p className="hero-lead">We source, customise and deliver premium merchandise for your organisation, event or business.</p>
          <div className="hero-actions">
            <Button href={QUOTE_HREF}>Get a Quote</Button>
            <Button href="/mySOS/products/" variant="ghost">Explore Products <Icon name="arrowRight" size={15} className="inline-arrow" /></Button>
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
      <SectionHeading eyebrow="What can we make for you?" />
      <div className="category-grid">
        {siteContent.categories.map((category) => <CategoryCard key={category.id} category={category} />)}
        <div className="grid-action"><TextLink href="/mySOS/products/">View All Products</TextLink></div>
      </div>
    </section>

    <section className="industry-band">
      <div className="section">
        <SectionHeading eyebrow="Don't know what you need?" description="Tell us what you're planning. We'll help you with the rest." />
        <div className="industry-nav">
          {solutions.map((solution) => <a key={solution.id} href={`/mySOS/solutions/?industry=${solution.id}`}>
            <Icon name={solution.imageStyle} size={26} />
            <span>{solution.name.replace(' Organisations', '')}</span>
          </a>)}
        </div>
        <div className="center-action"><Button href="/mySOS/solutions/">Find My Solution <Icon name="arrowRight" size={15} className="inline-arrow" /></Button></div>
      </div>
    </section>

    <section className="section">
      <SectionHeading eyebrow="Why choose MySOS?" />
      <div className="benefit-grid">
        {siteContent.benefits.map((benefit) => <article key={benefit.title}>
          <span className="benefit-icon"><Icon name={benefit.icon} size={22} /></span>
          <h3>{benefit.title}</h3>
          <p>{benefit.description}</p>
        </article>)}
      </div>
    </section>

    <section className="section">
      <SectionHeading eyebrow="How it works" />
      <ProcessSteps items={siteContent.process} />
    </section>

    <section className="section">
      <SectionHeading eyebrow="Real projects. Real results." />
      <div className="story-grid">
        {featuredStories.map((story) => <StoryCard key={story.slug} story={story} showBadge={false} />)}
      </div>
      <div className="center-action"><Button href="/mySOS/success-stories/" variant="outline">View All Success Stories <Icon name="arrowRight" size={15} className="inline-arrow" /></Button></div>
    </section>

    <PageCTA title="Bring your ideas to life with MySOS." description="We're ready to help." />
  </main>;
}
