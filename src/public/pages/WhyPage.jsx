import siteContent from '../../data/siteContent.json';
import Icon from '../components/Icons';
import { Button, PageCTA, Photo, ProcessSteps, SectionHeading } from '../components/Ui';

export default function WhyPage() {
  const { rating, count } = siteContent.reviewSummary;
  return <main>
    <section className="hero hero-compact">
      <div className="hero-inner">
        <div>
          <h1>Why MySOS</h1>
          <p className="hero-lead">One Supplier. Endless Possibilities.</p>
        </div>
        <div className="hero-scene"><Photo style="office" imageKey="scenes/why-hero" label="The MySOS team at work" wide /></div>
      </div>
    </section>

    <section className="section">
      <div className="why-list">
        {siteContent.benefits.map((benefit, index) => <article className="why-row" key={benefit.title}>
          <span className="benefit-icon"><Icon name={benefit.icon} size={22} /></span>
          <div>
            <h3>{benefit.shortTitle}</h3>
            <p>{benefit.longDescription}</p>
          </div>
          <Photo style={benefit.scene} imageKey={`benefits/${benefit.icon}`} label={`${benefit.title} illustration`} className={`why-photo-${index + 1}`} wide />
        </article>)}
      </div>
    </section>

    <section className="section">
      <SectionHeading eyebrow="Our process" />
      <ProcessSteps items={siteContent.process} />
    </section>

    <section className="section">
      <SectionHeading eyebrow="What our clients say" />
      <div className="review-summary">
        <Icon name="google" size={26} />
        <span className="rating-value">{rating}</span>
        <span className="stars" aria-label={`${rating} out of 5`}>{Array.from({ length: 5 }, (_, i) => <Icon key={i} name="star" size={14} />)}</span>
        <small>Based on {count} reviews</small>
      </div>
      <div className="testimonial-grid">
        {siteContent.testimonials.map((testimonial) => <blockquote key={testimonial.name}>
          <span className="stars" aria-label={`${testimonial.rating} out of 5 stars`}>{Array.from({ length: testimonial.rating }, (_, i) => <Icon key={i} name="star" size={13} />)}</span>
          <p>&ldquo;{testimonial.quote}&rdquo;</p>
          <footer>
            <span className="avatar">{testimonial.name.split(' ').map((part) => part[0]).join('')}</span>
            <span><strong>{testimonial.name}</strong><small>{testimonial.role}</small></span>
          </footer>
        </blockquote>)}
      </div>
      <div className="center-action"><Button href="/mySOS/success-stories/" variant="outline">View All Reviews <Icon name="arrowRight" size={15} className="inline-arrow" /></Button></div>
    </section>

    <PageCTA title="Bring your ideas to life with MySOS." description="We're ready to help." />
  </main>;
}
