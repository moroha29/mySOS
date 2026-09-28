import { useEffect, useMemo } from 'react';
import siteContent from '../../data/siteContent.json';
import solutions from '../../data/solutions.json';
import { cms, contentPath, headingPath, heroBackground, labelPath, pagePath, pageText, picture, scenePath, solutionPath } from '../cms';
import { getPublicProduct } from '../../utils/catalogue';
import Icon from '../components/Icons';
import { Product } from '../components/Visuals';
import { Button, heading, label, Photo, ProductCard, QuoteButton, SectionHeading, SolutionCard } from '../components/Ui';

export default function SolutionsPage() {
  const industryId = new URLSearchParams(globalThis.location?.search ?? '').get('industry');
  const selected = solutions.find((item) => item.id === industryId) ?? null;
  const recommended = useMemo(
    () => selected?.recommendedProducts.map(getPublicProduct).filter(Boolean) ?? [],
    [selected],
  );
  // Each solution has its own page now; links in the old ?industry= form go there.
  useEffect(() => {
    if (selected) globalThis.location?.replace?.(`/mySOS/solutions/${selected.id}/`);
  }, [selected]);

  return <main>
    <section {...heroBackground(siteContent.scenes?.solutionsHeroBackgroundImage, scenePath('solutionsHeroBackgroundImage'), 'hero hero-compact')}>
      <div className="hero-inner">
        <div>
          <span className="eyebrow" data-reveal data-cms-path={cms(headingPath('heroEyebrow'))}>{heading('heroEyebrow')}</span>
          <h1>
            <span data-reveal style={{ '--reveal-delay': '70ms' }} data-cms-path={cms(pagePath('solutions', 'heroTitle'))}>{pageText('solutions', 'heroTitle', 'Solutions Designed')}</span>
            <em data-reveal style={{ '--reveal-delay': '160ms' }}><span data-cms-path={cms(pagePath('solutions', 'heroTitleAccent'))}>{pageText('solutions', 'heroTitleAccent', 'Around Your Needs')}</span></em>
          </h1>
          <p className="hero-lead" data-reveal style={{ '--reveal-delay': '250ms' }} data-cms-path={cms(pagePath('solutions', 'heroLead'))}>{pageText('solutions', 'heroLead')}</p>
          <div className="hero-actions" data-reveal style={{ '--reveal-delay': '330ms' }}>
            <QuoteButton showArrow />
            <Button href="/mySOS/products/" variant="ghost">
              <span data-cms-path={cms(labelPath('heroExploreButton'))}>{label('heroExploreButton', 'Explore Products')}</span>
              <Icon name="arrowRight" size={19} className="inline-arrow" />
            </Button>
          </div>
        </div>
        <div className="hero-scene"><Photo style="hall" image={picture(siteContent.scenes?.solutionsHeroImage, 'scenes/solutions-hero')} imagePath={scenePath('solutionsHeroImage')} label="Teams we work with" wide eager /></div>
      </div>
    </section>

    <section className="section section-tight">
      <SectionHeading
        eyebrow={heading('chooseIndustryHeading', 'Find solutions for your industry')}
        eyebrowPath={headingPath('chooseIndustryHeading')}
        description={pageText('solutions', 'industryLead')}
        descriptionPath={pagePath('solutions', 'industryLead')}
        align="left"
      />
      <div className="solution-grid">
        {solutions.map((solution, index) => <SolutionCard key={solution.id} solution={solution} active={selected?.id === solution.id} reveal={index} />)}
      </div>
    </section>

    {selected && recommended.length > 0 && <section className="section">
      <SectionHeading eyebrow={`${pageText('solutions', 'recommendedPrefix', 'Recommended for')} ${selected.name}`} align="left" />
      <div className="product-grid product-grid-3">{recommended.map((product) => <ProductCard key={product.id} product={product} />)}</div>
    </section>}

    <section className="section">
      <SectionHeading eyebrow={heading('popularSolutionsHeading', 'Popular solutions')} eyebrowPath={headingPath('popularSolutionsHeading')} align="left" />
      <div className="popular-grid">
        {siteContent.popularSolutions.map((item, index) => <article key={item.name}>
          <Product type={item.visual} color={item.colour} mark="" />
          <h3 data-cms-path={cms(contentPath('popularSolutions', index, 'name'))}>{item.name}</h3>
        </article>)}
      </div>
      {/* Somewhere to go for a reader who knows the product and not the
          package — it used to be a button back to the page they were on. */}
      <div className="solution-products" data-reveal>
        <div>
          <strong data-cms-path={cms(pagePath('solutions', 'productsBandTitle'))}>{pageText('solutions', 'productsBandTitle', 'Have a specific product in mind?')}</strong>
          <p data-cms-path={cms(pagePath('solutions', 'productsBandLead'))}>{pageText('solutions', 'productsBandLead')}</p>
        </div>
        <Button href="/mySOS/products/" variant="primary">
          <span data-cms-path={cms(labelPath('viewAllProductsLabel'))}>{label('viewAllProductsLabel', 'View All Products')}</span>
          <Icon name="arrowRight" size={18} className="inline-arrow" />
        </Button>
      </div>
    </section>

    <section className="promo-band">
      <div className="promo-copy" data-reveal>
        <span className="eyebrow" data-cms-path={cms(pagePath('solutions', 'promoEyebrow'))}>{pageText('solutions', 'promoEyebrow')}</span>
        <h2 data-cms-path={cms(pagePath('solutions', 'promoTitle'))}>{pageText('solutions', 'promoTitle')}</h2>
        <p data-cms-path={cms(pagePath('solutions', 'promoDescription'))}>{pageText('solutions', 'promoDescription')}</p>
        <QuoteButton showArrow />
      </div>
      <div className="promo-art" aria-hidden="true"><Photo style="office" image={picture(siteContent.scenes?.solutionsPromoImage, 'scenes/solutions-promo')} imagePath={scenePath('solutionsPromoImage')} /></div>
    </section>
  </main>;
}
