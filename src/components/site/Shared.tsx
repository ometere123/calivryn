import { ArrowRight, Gauge, Github } from 'lucide-react';
import { Link, NavLink } from 'react-router-dom';
import type { ReactNode } from 'react';

export const workflowSteps = [
  { title: 'Capture', hint: 'Upload & details', path: '/app/capture' },
  { title: 'Verify', hint: 'Deterministic checks', path: '/app/verify' },
  { title: 'Analyse', hint: 'Real model inference', path: '/app/analyse' },
  { title: 'Review', hint: 'Human approval', path: '/app/review' },
  { title: 'Export', hint: 'Your PDF report', path: '/app/export' },
] as const;

export function BrandLink({ to = '/' }: { to?: string }) {
  return <Link className="brand multipage-brand" to={to} aria-label="Calivryn home">
    <span className="brand-mark"><Gauge size={22} strokeWidth={2.6} /></span>
    <span>calivryn<span className="brand-dot">.</span></span>
  </Link>;
}

export function PublicHeader() {
  return <header className="public-header">
    <div className="public-header-inner">
      <BrandLink />
      <div className="public-header-status"><span className="status-pulse" /> ENGINEERING INTELLIGENCE <span className="status-separator" /> <span className="public-header-desktop">AI-ASSISTED REPORTS</span></div>
      <nav className="public-nav" aria-label="Public navigation">
        <NavLink to="/methodology" className={({ isActive }) => isActive ? 'public-nav-link active' : 'public-nav-link'}>Methodology</NavLink>
        <a className="public-nav-link source-link" href="https://github.com/ometere123/Calivryn" target="_blank" rel="noopener noreferrer"><Github size={16} /> <span>Source code</span></a>
        <Link className="button-primary public-cta" to="/app/capture">Launch workspace <ArrowRight size={15} /></Link>
      </nav>
    </div>
  </header>;
}

export function PageHeading({ eyebrow, title, children }: { eyebrow: string; title: string; children: ReactNode }) {
  return <header className="route-heading"><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{children}</p></header>;
}

export function SectionHeading({ eyebrow, title, children }: { eyebrow: string; title: string; children: ReactNode }) {
  return <header className="section-heading"><div className="eyebrow">{eyebrow}</div><h2>{title}</h2><p>{children}</p></header>;
}

export function Metric({ label, value, tone = 'neutral' }: { label: string; value: string; tone?: 'neutral' | 'good' | 'warn' }) {
  return <div className={`metric metric-${tone}`}><span>{label}</span><strong>{value}</strong></div>;
}

export function StepStatus({ complete, label }: { complete: boolean; label: string }) {
  return <span className={complete ? 'step-status complete' : 'step-status'}>{complete ? 'Complete' : label}</span>;
}
