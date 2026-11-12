import { ArrowUpRight } from './icons';
import GlossyButton from './GlossyButton';

const sections = [
  { label: 'Explore', links: [['Sources', '#intelligence'], ['Approach', '#approach'], ['Devices', '#devices']] },
  { label: 'About', links: [['Why Rengera', '#contact'], ['Questions', '#faq'], ['Urgent help', '#urgent-help']] },
];

export default function Footer({ onLogin, onEnterApp }: { onLogin: () => void; onEnterApp: () => void }) {
  return (
    <footer className="site-footer">
      <div className="site-footer__cta">
        <div className="site-footer__cta-copy">
          <h2>Bring the next<br />question into <em>focus.</em></h2>
        </div>
        <div className="site-footer__actions">
          <GlossyButton as="button" type="button" onClick={onEnterApp} tone="light" className="site-footer__start" orb={<ArrowUpRight />}>Ask your first question</GlossyButton>
        </div>
      </div>
      <div className="site-footer__grid">
        {sections.map((section) => (
          <nav className="site-footer__col" key={section.label} aria-label={section.label}>
            <span>{section.label}</span>
            {section.links.map(([label, href]) => <a key={href} href={href}>{label}</a>)}
          </nav>
        ))}
        <nav className="site-footer__col" aria-label="Account">
          <span>Account</span>
          <button type="button" className="site-footer__nav-link" onClick={onLogin}>Sign in</button>
        </nav>
        <div className="site-footer__note">
          <span>Rengera</span>
          <p>A legal information tool for wasm_edge_mesh.</p>
          <p className="site-footer__disclaimer">For legal advice, consult a qualified professional.</p>
        </div>
      </div>
      <div className="site-footer__mark-row">
        <p className="site-footer__wordmark" aria-hidden="true">Rengera</p>
      </div>
      <div className="site-footer__base">
        <a className="site-footer__brand" href="#top"><span className="site-footer__logo" aria-hidden="true" />Rengera</a>
        <div className="site-footer__legal"><a href="#top">Back to top <span aria-hidden="true">↑</span></a></div>
      </div>
    </footer>
  );
}
