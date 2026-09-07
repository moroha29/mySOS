import siteContent from '../../data/siteContent.json';
import { cms, contentPath, headingPath, labelPath, pagePath, pageText, picture, scenePath } from '../cms';
import Icon from '../components/Icons';
import { Button, heading, label, PageCTA, Photo, ProcessSteps, SectionHeading, Testimonials } from '../components/Ui';

export default function WhyPage() {
  return <main>
    <section className="hero hero-compact">
      <div className="hero-inner">
        <div>
          <h1 data-cms-path={cms(pagePath('why', 'heroTitle'))}>{pageText('why', 'heroTitle', 'Why MySOS')}</h1>
          <p className="hero-lead" data-cms-path={cms(pagePath('why', 'heroLead'))}>{pageText('why', 'heroLead', 'One Supplier. Endless Possibilities.')}</p>
        </div>
        <div className="hero-scene"><Photo style="office" image={picture(siteContent.scenes?.whyHeroImage, 'scenes/why-hero')} imagePath={scenePath('whyHeroImage')} label="The MySOS team at work" wide eager /></div>
      </div>
    </section>

    <section className="section">
      <div className="why-list">
        {siteContent.benefits.map((benefit, index) => <article className="why-row" key={benefit.title}>
          <span className="benefit-icon"><Icon name={benefit.icon} size={22} /></span>
          <div>
            <h3 data-cms-path={cms(contentPath('benefits', index, 'shortTitle'))}>{benefit.shortTitle}</h3>
            <p data-cms-path={cms(contentPath('benefits', index, 'longDescription'))}>{benefit.longDescription}</p>
          </div>
          <Photo
            style={benefit.scene}
            image={picture(benefit.image, `benefits/${benefit.icon}`)}
            imagePath={contentPath('benefits', index, 'image')}
            label={`${benefit.title} illustration`}
            className={`why-photo-${index + 1}`}
            wide
          />
        </article>)}
      </div>
    </section>

    <section className="section">
      <SectionHeading eyebrow={heading('whyProcessHeading', 'Our process')} eyebrowPath={headingPath('whyProcessHeading')} />
      <ProcessSteps items={siteContent.process} pathAt={(index, key) => contentPath('process', index, key)} />
    </section>

    <Testimonials action={<Button href="/mySOS/success-stories/" variant="outline"><span data-cms-path={cms(labelPath('viewAllReviewsButton'))}>{label('viewAllReviewsButton', 'View All Reviews')}</span> <Icon name="arrowRight" size={15} className="inline-arrow" /></Button>} />

    <PageCTA
      title={pageText('why', 'ctaTitle', 'Bring your ideas to life with MySOS.')}
      titlePath={pagePath('why', 'ctaTitle')}
      description={pageText('why', 'ctaDescription', "We're ready to help.")}
      descriptionPath={pagePath('why', 'ctaDescription')}
    />
  </main>;
}
