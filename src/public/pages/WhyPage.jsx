import siteContent from '../../data/siteContent.json';
import Icon from '../components/Icons';
import { Button, heading, label, PageCTA, Photo, ProcessSteps, SectionHeading, Testimonials } from '../components/Ui';

export default function WhyPage() {
  return <main>
    <section className="hero hero-compact">
      <div className="hero-inner">
        <div>
          <h1>Why MySOS</h1>
          <p className="hero-lead">One Supplier. Endless Possibilities.</p>
        </div>
        <div className="hero-scene"><Photo style="office" imageKey="scenes/why-hero" label="The MySOS team at work" wide eager /></div>
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
      <SectionHeading eyebrow={heading('whyProcessHeading', 'Our process')} />
      <ProcessSteps items={siteContent.process} />
    </section>

    <Testimonials action={<Button href="/mySOS/success-stories/" variant="outline">{label('viewAllReviewsButton', 'View All Reviews')} <Icon name="arrowRight" size={15} className="inline-arrow" /></Button>} />

    <PageCTA title="Bring your ideas to life with MySOS." description="We're ready to help." />
  </main>;
}
