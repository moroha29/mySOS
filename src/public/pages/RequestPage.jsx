import siteContent from '../../data/siteContent.json';
import { cms, heroBackground, pagePath, pageText, picture, scenePath } from '../cms';
import Icon from '../components/Icons';
import RequestBuilder from '../components/RequestBuilder';
import { Photo } from '../components/Ui';

/*
 * "Get a Quote": the customer's own request, starting from nothing.
 *
 * The solution pages open the same builder with a recommended package already
 * in it; here the customer searches the catalogue and builds their own. A
 * product card links in with ?product=<id>, so the product they were looking at
 * is already the first row.
 *
 * This is the customer's side. The quotation engine, where MySOS's agents price
 * a job, is a separate application and is never linked from here.
 */
export default function RequestPage() {
  const params = new URLSearchParams(globalThis.location?.search ?? '');
  const wanted = params.get('product');
  // What someone typed into the homepage's search arrives here as their note.
  const asked = (params.get('ask') ?? '').slice(0, 500);
  return <main className="solution-page request-page">
    <section {...heroBackground(siteContent.scenes?.requestHeroBackgroundImage, scenePath('requestHeroBackgroundImage'), 'hero hero-compact')}>
      <div className="hero-inner">
        <div>
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <a href="/mySOS/" aria-label="Home"><Icon name="home" size={15} /></a>
            <span aria-hidden="true">/</span>
            <span aria-current="page" data-cms-path={cms(pagePath('request', 'breadcrumb'))}>{pageText('request', 'breadcrumb', 'Get a Quote')}</span>
          </nav>
          <h1 data-cms-path={cms(pagePath('request', 'heroTitle'))}>{pageText('request', 'heroTitle', 'Tell Us What You Need')}</h1>
          <p className="hero-lead" data-cms-path={cms(pagePath('request', 'heroLead'))}>{pageText('request', 'heroLead')}</p>
        </div>
        <div className="hero-scene">
          <Photo
            style="workshop"
            image={picture(siteContent.scenes?.requestHeroImage, 'scenes/products-promo')}
            imagePath={scenePath('requestHeroImage')}
            label="MySOS at work"
            wide
            eager
          />
        </div>
      </div>
    </section>

    <RequestBuilder
      startWith={wanted ? [{ productId: wanted }] : []}
      startNotes={asked}
      title={pageText('request', 'builderTitle', 'Build Your Request')}
      titlePath={cms(pagePath('request', 'builderTitle'))}
      lead={pageText('request', 'builderLead')}
      leadPath={cms(pagePath('request', 'builderLead'))}
      includedTitle={pageText('request', 'includedTitle', 'Your Products')}
    />
  </main>;
}
