import { useState } from 'react';
import siteConfig from '../../data/siteConfig.json';
import { getImage } from '../../utils/imageRegistry';
import siteContent from '../../data/siteContent.json';
import solutions from '../../data/solutions.json';
import Icon from './Icons';

// Real wordmark when supplied; the lettered fallback keeps the header intact otherwise.
function Wordmark({ variant = 'dark', className = '' }) {
  const src = getImage(variant === 'light' ? 'brand/wordmark-light' : 'brand/wordmark');
  if (src) return <img className={`wordmark ${className}`.trim()} src={src} alt="MySOS" />;
  return <span className={`site-logo-text ${className}`.trim()}>My<span>SOS</span></span>;
}

const whatsappHref = () => {
  const { whatsapp } = siteConfig;
  if (!whatsapp.enabled || !whatsapp.number) return null;
  return `https://wa.me/${whatsapp.number}?text=${encodeURIComponent(whatsapp.defaultMessage)}`;
};

export function WhatsAppButton({ className = '' }) {
  const href = whatsappHref();
  const content = <Icon name="whatsapp" size={20} />;
  return href
    ? <a className={`wa-circle ${className}`.trim()} href={href} target="_blank" rel="noreferrer" aria-label="Contact MySOS on WhatsApp">{content}</a>
    : <span className={`wa-circle is-disabled ${className}`.trim()} aria-label="WhatsApp enquiries are currently unavailable">{content}</span>;
}

export function WhatsAppBubble() {
  const href = whatsappHref();
  if (!href) return null;
  return <a className="wa-bubble" href={href} target="_blank" rel="noreferrer" aria-label="Chat with MySOS on WhatsApp"><Icon name="whatsapp" size={30} /></a>;
}

const resourceLinks = [
  { label: 'Printing Guides', href: '/mySOS/products/#faq' },
  { label: 'Materials', href: '/mySOS/products/#printing' },
  { label: 'Design Tips', href: '/mySOS/why-mysos/' },
  { label: 'Buying Guides', href: '/mySOS/products/' },
  { label: 'Case Studies', href: '/mySOS/success-stories/' },
];

function dropdownFor(label) {
  if (label === 'Products') return siteContent.categories.map((item) => ({ label: item.name, href: `/mySOS/products/?category=${item.id}` }));
  if (label === 'Solutions') return solutions.map((item) => ({ label: item.name, href: `/mySOS/solutions/?industry=${item.id}` }));
  if (label === 'Resources') return resourceLinks;
  return null;
}

function NavigationItem({ item, onNavigate }) {
  const links = dropdownFor(item.label);
  if (!links) return <a className="nav-link" href={item.href} onClick={onNavigate}>{item.label}</a>;
  return <div className="nav-group">
    <a className="nav-link" href={item.href} onClick={onNavigate}>{item.label}<Icon name="chevronDown" size={13} className="nav-chevron" /></a>
    <div className="nav-dropdown">{links.map((link) => <a key={link.label} href={link.href} onClick={onNavigate}>{link.label}</a>)}</div>
  </div>;
}

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  return <header className="site-header">
    <div className="site-header-inner">
      <a className="site-logo" href={siteConfig.basePath} aria-label="MySOS home"><Wordmark /></a>
      <button className="menu-toggle" type="button" aria-expanded={open} aria-controls="primary-navigation" onClick={() => setOpen(!open)}>
        <span /><span /><span /><span className="sr-only">Menu</span>
      </button>
      <nav id="primary-navigation" className={`primary-nav ${open ? 'is-open' : ''}`.trim()} aria-label="Main navigation">
        {siteConfig.navigation.map((item) => <NavigationItem key={item.label} item={item} onNavigate={() => setOpen(false)} />)}
        <a className="btn btn-primary btn-sm mobile-quote" href={siteConfig.quotationPath}>Get a Quote</a>
      </nav>
      <div className="header-actions">
        <a className="btn btn-primary btn-sm" href={siteConfig.quotationPath}>Get a Quote</a>
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
        <a className="site-logo" href={siteConfig.basePath} aria-label="MySOS home"><Wordmark variant="light" /></a>
        <p>{siteConfig.tagline}</p>
      </div>
      <div>
        <h3>Products</h3>
        {siteContent.categories.map((item) => <a key={item.id} href={`/mySOS/products/?category=${item.id}`}>{item.name}</a>)}
      </div>
      <div>
        <h3>Solutions</h3>
        {solutions.map((item) => <a key={item.id} href={`/mySOS/solutions/?industry=${item.id}`}>{item.name.replace(' Organisations', '')}</a>)}
      </div>
      <div>
        <h3>Resources</h3>
        {resourceLinks.map((item) => <a key={item.label} href={item.href}>{item.label}</a>)}
      </div>
      <div>
        <h3>Connect with us</h3>
        <div className="footer-socials">
          {socials.map((social) => {
            const href = socialLinks[social.id];
            return href
              ? <a key={social.id} href={href} target="_blank" rel="noreferrer" aria-label={social.label}><Icon name={social.id} size={18} /></a>
              : <span key={social.id} aria-label={`${social.label} (coming soon)`} role="img"><Icon name={social.id} size={18} /></span>;
          })}
        </div>
        {siteConfig.whatsapp.displayNumber && <a className="footer-contact" href={whatsappHref() ?? '#'}>{siteConfig.whatsapp.displayNumber}</a>}
        {siteConfig.email && <a className="footer-contact" href={`mailto:${siteConfig.email}`}>{siteConfig.email}</a>}
      </div>
    </div>
    <div className="footer-bottom">
      <span>© 2026 {siteConfig.legalName ?? 'MySOS'}. All rights reserved.{siteConfig.companyRegistration ? ` Company Registration No. ${siteConfig.companyRegistration}` : ''}</span>
      <span className="footer-legal">
        <a href="/mySOS/">Privacy Policy</a><i aria-hidden="true">|</i>
        <a href="/mySOS/">Terms &amp; Conditions</a><i aria-hidden="true">|</i>
        <a href="/mySOS/">Refund Policy</a>
      </span>
    </div>
  </footer>;
}

export default function SiteShell({ children }) {
  return <div className="site-app">
    <SiteHeader />
    {children}
    <SiteFooter />
    <WhatsAppBubble />
  </div>;
}
