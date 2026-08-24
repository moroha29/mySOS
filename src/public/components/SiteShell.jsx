import { useState } from 'react';
import siteConfig from '../../data/siteConfig.json';
import solutions from '../../data/solutions.json';

export function WhatsAppButton({ compact = false }) {
  const { whatsapp } = siteConfig;
  if (!whatsapp.enabled || !whatsapp.number) {
    return <span className={`whatsapp-button is-disabled ${compact ? 'is-compact' : ''}`} aria-label="WhatsApp enquiries are currently unavailable">WA</span>;
  }
  const href = `https://wa.me/${whatsapp.number}?text=${encodeURIComponent(whatsapp.defaultMessage)}`;
  return <a className={`whatsapp-button ${compact ? 'is-compact' : ''}`} href={href} target="_blank" rel="noreferrer" aria-label="Contact MySOS on WhatsApp">WA</a>;
}

const productLinks = [
  { label: 'Apparel', href: '/mySOS/products/?category=apparel' },
  { label: 'Bags', href: '/mySOS/products/?category=bags' },
  { label: 'Drinkware', href: '/mySOS/products/?category=drinkware' },
  { label: 'Corporate Gifts', href: '/mySOS/products/?category=corporate-gifts' },
];

function NavigationItem({ item, onNavigate }) {
  const dropdownLinks = item.label === 'Products' ? productLinks
    : item.label === 'Solutions' ? solutions.map((solution) => ({ label: solution.name, href: `/mySOS/solutions/?industry=${solution.id}` }))
      : item.label === 'Resources' ? [
        { label: 'Frequently Asked Questions', href: '/mySOS/products/#faq' },
        { label: 'Why MySOS', href: '/mySOS/why-mysos/' },
        { label: 'Success Stories', href: '/mySOS/success-stories/' },
      ] : null;
  if (!dropdownLinks) return <a href={item.href} onClick={onNavigate}>{item.label}</a>;
  return <div className="nav-group">
    <a href={item.href} onClick={onNavigate}>{item.label}<span className="nav-chevron" aria-hidden="true">⌄</span></a>
    <div className="nav-dropdown">{dropdownLinks.map((link) => <a key={link.href} href={link.href} onClick={onNavigate}>{link.label}</a>)}</div>
  </div>;
}

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  return <header className="site-header">
    <div className="site-header-inner">
      <a className="site-logo" href={siteConfig.basePath} aria-label="MySOS home">My<span>SOS</span></a>
      <button className="menu-toggle" type="button" aria-expanded={open} aria-controls="primary-navigation" onClick={() => setOpen(!open)}><span /><span /><span /><span className="sr-only">Menu</span></button>
      <nav id="primary-navigation" className={`primary-nav ${open ? 'is-open' : ''}`} aria-label="Main navigation">
        {siteConfig.navigation.map((item) => <NavigationItem key={item.label} item={item} onNavigate={() => setOpen(false)} />)}
        <a className="button button-small mobile-quote" href={siteConfig.quotationPath}>Get a Quote</a>
      </nav>
      <div className="header-actions"><a className="button button-small" href={siteConfig.quotationPath}>Get a Quote</a><WhatsAppButton compact /></div>
    </div>
  </header>;
}

export function SiteFooter() {
  return <footer className="site-footer">
    <div className="footer-cta">
      <div><h2>Bring your ideas to life with MySOS.</h2><p>We are ready to help.</p></div>
      <div className="footer-cta-actions"><a className="button" href={siteConfig.quotationPath}>Get a Quote</a><WhatsAppButton /></div>
    </div>
    <div className="footer-grid">
      <div><a className="site-logo footer-logo" href={siteConfig.basePath}>My<span>SOS</span></a><p>{siteConfig.tagline}</p></div>
      <div><h3>Products</h3><a href="/mySOS/products/?category=apparel">Apparel</a><a href="/mySOS/products/?category=bags">Bags</a><a href="/mySOS/products/?category=drinkware">Drinkware</a><a href="/mySOS/products/">View all</a></div>
      <div><h3>Solutions</h3>{solutions.slice(0, 4).map((item) => <a key={item.id} href={`/mySOS/solutions/?industry=${item.id}`}>{item.name}</a>)}</div>
      <div><h3>Resources</h3><a href="/mySOS/why-mysos/">Why MySOS</a><a href="/mySOS/success-stories/">Success Stories</a><a href="/mySOS/products/#faq">FAQs</a></div>
      <div><h3>Connect with us</h3><a href={`https://wa.me/${siteConfig.whatsapp.number}?text=${encodeURIComponent(siteConfig.whatsapp.defaultMessage)}`} target="_blank" rel="noreferrer">WhatsApp {siteConfig.whatsapp.displayNumber}</a>{siteConfig.email && <a href={`mailto:${siteConfig.email}`}>{siteConfig.email}</a>}</div>
    </div>
    <div className="footer-bottom"><span>© 2026 MySOS. All rights reserved.</span><span>Static site · No customer data is collected here.</span></div>
  </footer>;
}

export default function SiteShell({ children }) {
  return <div className="site-app"><SiteHeader />{children}<SiteFooter /></div>;
}
