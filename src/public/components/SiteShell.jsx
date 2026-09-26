import { Fragment, useState } from 'react';
import siteConfig from '../../data/siteConfig.json';
import siteContent from '../../data/siteContent.json';
import solutions from '../../data/solutions.json';
import { REQUEST_PATH } from '../../utils/catalogue';
import { categoryPath, cms, cmsAll, configPath, contentPath, labelPath, picture, solutionPath } from '../cms';
import Icon from './Icons';

const label = (key, fallback) => siteContent.labels?.[key] ?? fallback;

// Real wordmark when supplied; the lettered fallback keeps the header intact otherwise.
function Wordmark({ variant = 'dark', className = '' }) {
  const light = variant === 'light';
  const field = light ? 'wordmarkLightImage' : 'wordmarkImage';
  const src = picture(siteContent.brand?.[field], light ? 'brand/wordmark-light' : 'brand/wordmark');
  if (src) return <img className={`wordmark ${className}`.trim()} src={src} alt="MySOS" data-cms-path={cms(contentPath('brand', field))} />;
  return <span className={`site-logo-text ${className}`.trim()}>My<span>SOS</span></span>;
}

const whatsappHref = () => {
  const { whatsapp } = siteConfig;
  if (!whatsapp.enabled || !whatsapp.number) return null;
  return `https://wa.me/${whatsapp.number}?text=${encodeURIComponent(whatsapp.defaultMessage)}`;
};

/*
 * The WhatsApp link is built from the number and the greeting, so a manager
 * clicking it needs those two fields — a URL box would edit nothing.
 */
const whatsAppPaths = cmsAll(configPath('whatsapp', 'number'), configPath('whatsapp', 'defaultMessage'));

export function WhatsAppButton({ className = '' }) {
  const href = whatsappHref();
  const content = <Icon name="whatsapp" size={20} />;
  return href
    ? <a className={`wa-circle ${className}`.trim()} href={href} target="_blank" rel="noreferrer" aria-label="Contact MySOS on WhatsApp" data-cms-paths={whatsAppPaths}>{content}</a>
    : <span className={`wa-circle is-disabled ${className}`.trim()} aria-label="WhatsApp enquiries are currently unavailable">{content}</span>;
}

export function WhatsAppBubble() {
  const href = whatsappHref();
  if (!href) return null;
  return <a className="wa-bubble" href={href} target="_blank" rel="noreferrer" aria-label="Chat with MySOS on WhatsApp" data-cms-paths={whatsAppPaths}><Icon name="whatsapp" size={30} /></a>;
}

/*
 * Footer wording lives in siteContent so it can be edited in the manager.
 *
 * It used to be written here, and the manager had no field to attach it to: it
 * matched "Buying Guides" and the "Products" column heading to the main
 * navigation instead, so editing the footer would have rewritten the site's own
 * nav. The fallbacks keep the footer intact if an entry is ever removed.
 */
const footer = siteContent.footer ?? {};
const footerText = (key, fallback) => footer[key] ?? fallback;
const resourceLinks = footer.resourceLinks ?? [];
const legalLinks = footer.legalLinks ?? [];

// `path` is the draft location of a dropdown entry's wording, where that
// wording is content. The Resources list is written here, so it has none.
function dropdownFor(label) {
  if (label === 'Products') {
    return siteContent.categories.map((item) => ({ label: item.name, href: `/mySOS/products/?category=${item.id}`, path: categoryPath(item, 'name') }));
  }
  if (label === 'Solutions') {
    return solutions.map((item) => ({ label: item.name, href: `/mySOS/solutions/${item.id}/`, path: solutionPath(item, 'name') }));
  }
  if (label === 'Resources') {
    // Wording and destination: these entries are content, unlike the product
    // and industry links whose URLs are built from an id.
    return resourceLinks.map((item, index) => ({
      ...item,
      paths: [contentPath('footer', 'resourceLinks', index, 'label'), contentPath('footer', 'resourceLinks', index, 'href')],
    }));
  }
  return null;
}

function NavigationItem({ item, index, onNavigate }) {
  const links = dropdownFor(item.label);
  // The entry carries both its wording and its destination, so selecting it in
  // the manager offers the pair.
  const entry = cmsAll(configPath('navigation', index, 'label'), configPath('navigation', index, 'href'));
  if (!links) return <a className="nav-link" href={item.href} onClick={onNavigate} data-cms-paths={entry}>{item.label}</a>;
  return <div className="nav-group">
    <a className="nav-link" href={item.href} onClick={onNavigate} data-cms-paths={entry}>{item.label}<Icon name="chevronDown" size={13} className="nav-chevron" /></a>
    <div className="nav-dropdown">{links.map((link) => <a
      key={link.label}
      href={link.href}
      onClick={onNavigate}
      data-cms-path={link.path && cms(link.path)}
      data-cms-paths={link.paths && cmsAll(...link.paths)}
    >{link.label}</a>)}</div>
  </div>;
}

// "Get a Quote" opens the site's own request page, where a customer says what
// they need. Never the agents' quotation engine.
const quoteButtonPaths = cmsAll(labelPath('headerQuoteButton'));
const quoteLink = { href: REQUEST_PATH };

// Several fields hold "/mySOS/" — the site's base path and the placeholder
// legal links — so the manager cannot tell them apart from the URL alone.
// Naming the field here is what stops it guessing.
const logoPaths = cmsAll(configPath('basePath'));

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  return <header className="site-header">
    <div className="site-header-inner">
      <a className="site-logo" href={siteConfig.basePath} aria-label="MySOS home" data-cms-paths={logoPaths}><Wordmark /></a>
      <button className="menu-toggle" type="button" aria-expanded={open} aria-controls="primary-navigation" onClick={() => setOpen(!open)}>
        <span /><span /><span /><span className="sr-only" data-cms-path={cms(labelPath('menuToggleLabel'))}>{label('menuToggleLabel', 'Menu')}</span>
      </button>
      <nav id="primary-navigation" className={`primary-nav ${open ? 'is-open' : ''}`.trim()} aria-label="Main navigation">
        {siteConfig.navigation.map((item, index) => <NavigationItem key={item.label} item={item} index={index} onNavigate={() => setOpen(false)} />)}
        <a className="btn btn-primary btn-sm mobile-quote" {...quoteLink} data-cms-paths={quoteButtonPaths}>{label('headerQuoteButton', 'Get a Quote')}</a>
      </nav>
      <div className="header-actions">
        <a className="btn btn-primary btn-sm" {...quoteLink} data-cms-paths={quoteButtonPaths}>{label('headerQuoteButton', 'Get a Quote')}</a>
        <WhatsAppButton />
      </div>
    </div>
  </header>;
}

const socials = [
  { id: 'facebook', label: 'Facebook' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'linkedin', label: 'LinkedIn' },
  { id: 'youtube', label: 'YouTube' },
];

export function SiteFooter() {
  const { socialLinks = {} } = siteConfig;
  return <footer className="site-footer">
    <div className="footer-grid">
      <div className="footer-brand">
        <a className="site-logo" href={siteConfig.basePath} aria-label="MySOS home" data-cms-paths={logoPaths}><Wordmark variant="light" /></a>
        <p data-cms-path={cms(configPath('tagline'))}>{siteConfig.tagline}</p>
      </div>
      <div>
        <h3 data-cms-path={cms(contentPath('footer', 'productsHeading'))}>{footerText('productsHeading', 'Products')}</h3>
        {siteContent.categories.map((item) => <a key={item.id} href={`/mySOS/products/?category=${item.id}`} data-cms-path={cms(categoryPath(item, 'name'))}>{item.name}</a>)}
      </div>
      <div>
        <h3 data-cms-path={cms(contentPath('footer', 'solutionsHeading'))}>{footerText('solutionsHeading', 'Solutions')}</h3>
        {solutions.map((item) => <a key={item.id} href={`/mySOS/solutions/${item.id}/`} data-cms-path={cms(solutionPath(item, 'name'))}>{item.name.replace(' Organisations', '')}</a>)}
      </div>
      <div>
        <h3 data-cms-path={cms(contentPath('footer', 'resourcesHeading'))}>{footerText('resourcesHeading', 'Resources')}</h3>
        {resourceLinks.map((item, index) => <a
          key={item.label}
          href={item.href}
          data-cms-paths={cmsAll(contentPath('footer', 'resourceLinks', index, 'label'), contentPath('footer', 'resourceLinks', index, 'href'))}
        >{item.label}</a>)}
      </div>
      <div>
        <h3 data-cms-path={cms(contentPath('footer', 'connectHeading'))}>{footerText('connectHeading', 'Connect with us')}</h3>
        <div className="footer-socials">
          {socials.map((social) => {
            const href = socialLinks[social.id];
            return href
              ? <a key={social.id} href={href} target="_blank" rel="noreferrer" aria-label={social.label} data-cms-paths={cmsAll(configPath('socialLinks', social.id))}><Icon name={social.id} size={18} /></a>
              : <span key={social.id} aria-label={`${social.label} (coming soon)`} role="img"><Icon name={social.id} size={18} /></span>;
          })}
        </div>
        {siteConfig.whatsapp.displayNumber && <a className="footer-contact" href={whatsappHref() ?? '#'} data-cms-path={cms(configPath('whatsapp', 'displayNumber'))}>{siteConfig.whatsapp.displayNumber}</a>}
        {siteConfig.email && <a className="footer-contact" href={`mailto:${siteConfig.email}`} data-cms-path={cms(configPath('email'))}>{siteConfig.email}</a>}
      </div>
    </div>
    <div className="footer-bottom">
      <span>
        © 2026 <span data-cms-path={cms(configPath('legalName'))}>{siteConfig.legalName ?? 'MySOS'}</span>. All rights reserved.
        {siteConfig.companyRegistration ? <> Company Registration No. <span data-cms-path={cms(configPath('companyRegistration'))}>{siteConfig.companyRegistration}</span></> : ''}
      </span>
      <span className="footer-legal">
        {legalLinks.map((item, index) => <Fragment key={item.label}>
          {index > 0 && <i aria-hidden="true">|</i>}
          <a
            href={item.href}
            data-cms-paths={cmsAll(contentPath('footer', 'legalLinks', index, 'label'), contentPath('footer', 'legalLinks', index, 'href'))}
          >{item.label}</a>
        </Fragment>)}
      </span>
    </div>
  </footer>;
}

/*
 * The line across the very top of every page. It sits outside the page's own
 * column so it runs the full width of the screen, however wide that is — inside
 * it, it stopped at the edge of the column and looked cut off.
 */
function Announcement() {
  const text = String(siteContent.announcement ?? '').trim();
  if (!text) return null;
  return <p className="site-announce" data-cms-path={cms(contentPath('announcement'))}>{text}</p>;
}

export default function SiteShell({ children }) {
  // The strip is a sibling of the page column, not a child of it: that is what
  // lets it run the full width of the screen without a 100vw trick, which
  // would overflow by the width of the scrollbar.
  return <>
    <Announcement />
    <div className="site-app">
      <SiteHeader />
      {children}
      <SiteFooter />
      <WhatsAppBubble />
    </div>
  </>;
}
