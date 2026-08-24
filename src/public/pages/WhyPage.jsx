import siteContent from '../../data/siteContent.json';
import { PageCTA, ProcessSteps, SectionHeading, StoryVisual } from '../components/Ui';

export default function WhyPage() {
  return <main>
    <section className="simple-hero why-hero"><div><span className="eyebrow">The MySOS difference</span><h1>Why MySOS</h1><p>One supplier. Endless possibilities. Thoughtful recommendations, clear pricing and dependable delivery.</p></div><div className="brand-orbit" aria-hidden="true">MySOS</div></section>
    <section className="section why-benefits"><SectionHeading eyebrow="Why choose MySOS?" title="Everything works better with one reliable partner." />
      <div className="why-list">{siteContent.benefits.map((benefit, index) => <article key={benefit.title}><span>{String(index + 1).padStart(2, '0')}</span><div><h3>{benefit.shortTitle}</h3><p>{benefit.description}</p></div><StoryVisual style={`benefit-${index + 1}`} title={benefit.title} /></article>)}</div>
    </section>
    <section className="section process-section"><SectionHeading eyebrow="Our process" title="Clear from first brief to final delivery." /><ProcessSteps items={siteContent.process} /></section>
    <section className="section testimonials"><SectionHeading eyebrow="What our clients say" title="Trusted service, measured in real outcomes." />
      <div className="testimonial-grid">{siteContent.testimonials.map((testimonial) => <blockquote key={testimonial.name}><div className="rating" aria-label={`${testimonial.rating} out of 5 stars`}>{'★'.repeat(testimonial.rating)}</div><p>“{testimonial.quote}”</p><footer><span className="avatar">{testimonial.name.split(' ').map((part) => part[0]).join('')}</span><span><strong>{testimonial.name}</strong><small>{testimonial.role}</small></span></footer></blockquote>)}</div>
    </section>
    <PageCTA title="Bring your ideas to life with MySOS." description="We are ready to help." />
  </main>;
}
