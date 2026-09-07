import { useMemo } from 'react';
import siteConfig from '../../data/siteConfig.json';
import siteContent from '../../data/siteContent.json';
import solutions from '../../data/solutions.json';
import { cms, cmsAll, configPath, contentPath, headingPath, heroBackground, labelPath, pagePath, pageText, picture, scenePath, solutionPath } from '../cms';
import { getPublicProduct } from '../../utils/catalogue';
import Icon from '../components/Icons';
import { Product } from '../components/Visuals';
import { Button, heading, label, Photo, ProductCard, SectionHeading, SolutionCard } from '../components/Ui';

export default function SolutionsPage() {
  const industryId = new URLSearchParams(globalThis.location?.search ?? '').get('industry');
  const selected = solutions.find((item) => item.id === industryId) ?? null;
  const recommended = useMemo(
    () => selected?.recommendedProducts.map(getPublicProduct).filter(Boolean) ?? [],
    [selected],
  );

  return <main>
    <section {...heroBackground(siteContent.scenes?.solutionsHeroBackgroundImage, scenePath('solutionsHeroBackgroundImage'), 'hero hero-compact')}>
      <div className="hero-inner">
        <div>
          <h1>
            <span data-cms-path={cms(pagePath('solutions', 'heroTitle'))}>{pageText('solutions', 'heroTitle', 'Solutions Designed')}</span>
            <em><span data-cms-path={cms(pagePath('solutions', 'heroTitleAccent'))}>{pageText('solutions', 'heroTitleAccent', 'Around Your Needs')}</span></em>
          </h1>
          <p className="hero-lead" data-cms-path={cms(pagePath('solutions', 'heroLead'))}>{pageText('solutions', 'heroLead')}</p>
        </div>
        <div className="hero-scene"><Photo style="hall" image={picture(siteContent.scenes?.solutionsHeroImage, 'scenes/solutions-hero')} imagePath={scenePath('solutionsHeroImage')} label="Teams we work with" wide eager /></div>
      </div>
    </section>

    <section className="section section-tight">
      <SectionHeading eyebrow={heading('chooseIndustryHeading', 'Choose your industry')} eyebrowPath={headingPath('chooseIndustryHeading')} />
      <div className="browse-row">
        {solutions.map((solution) => <a
          key={solution.id}
          className={selected?.id === solution.id ? 'is-active' : ''}
          href={`/mySOS/solutions/?industry=${solution.id}`}
          aria-current={selected?.id === solution.id ? 'page' : undefined}
        >
          <Icon name={solution.imageStyle} size={26} />
          <span className="browse-label" data-cms-path={cms(solutionPath(solution, 'name'))}>{solution.name.replace(' Organisations', '')}</span>
        </a>)}
      </div>
    </section>

    <section className="section section-tight">
      <div className="solution-grid">
        {solutions.map((solution) => <SolutionCard key={solution.id} solution={solution} active={selected?.id === solution.id} />)}
      </div>
    </section>

    {selected && recommended.length > 0 && <section className="section">
      <SectionHeading eyebrow={`${pageText('solutions', 'recommendedPrefix', 'Recommended for')} ${selected.name}`} align="left" />
      <div className="product-grid product-grid-3">{recommended.map((product) => <ProductCard key={product.id} product={product} />)}</div>
    </section>}

    <section className="section">
      <SectionHeading eyebrow={heading('popularSolutionsHeading', 'Popular solutions')} eyebrowPath={headingPath('popularSolutionsHeading')} />
      <div className="popular-grid">
        {siteContent.popularSolutions.map((item, index) => <article key={item.name}>
          <Product type={item.visual} color={item.colour} mark="" />
          <h3 data-cms-path={cms(contentPath('popularSolutions', index, 'name'))}>{item.name}</h3>
        </article>)}
      </div>
      <div className="center-action"><Button href="/mySOS/products/" variant="outline"><span data-cms-path={cms(labelPath('viewAllSolutionsButton'))}>{label('viewAllSolutionsButton', 'View All Solutions')}</span> <Icon name="arrowRight" size={15} className="inline-arrow" /></Button></div>
    </section>

    <section className="promo-band">
      <div className="promo-copy">
        <span className="eyebrow" data-cms-path={cms(pagePath('solutions', 'promoEyebrow'))}>{pageText('solutions', 'promoEyebrow')}</span>
        <h2 data-cms-path={cms(pagePath('solutions', 'promoTitle'))}>{pageText('solutions', 'promoTitle')}</h2>
        <p data-cms-path={cms(pagePath('solutions', 'promoDescription'))}>{pageText('solutions', 'promoDescription')}</p>
        <Button href={siteConfig.quotationPath} data-cms-paths={cmsAll(configPath('quotationPath'))}><span data-cms-path={cms(labelPath('findMySolutionButton'))}>{label('findMySolutionButton', 'Find My Solution')}</span> <Icon name="arrowRight" size={15} className="inline-arrow" /></Button>
      </div>
      <div className="promo-art" aria-hidden="true"><Photo style="office" image={picture(siteContent.scenes?.solutionsPromoImage, 'scenes/solutions-promo')} imagePath={scenePath('solutionsPromoImage')} /></div>
    </section>
  </main>;
}
