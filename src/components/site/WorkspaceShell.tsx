import { Activity, ArrowRight, Check, ChevronDown, CircleHelp, Cpu, Gauge, Github, Menu, ShieldCheck, Sparkles, X } from 'lucide-react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { DISCLAIMER } from '../../../shared/calibration';
import { useSession } from '../../lib/session';
import { workflowSteps, BrandLink } from './Shared';

function routeIndex(pathname: string) {
  return workflowSteps.findIndex(step => pathname.startsWith(step.path));
}

function completion(index: number, session: ReturnType<typeof useSession>) {
  if (index === 0) return session.points.length > 0;
  if (index === 1) return session.validation.success;
  if (index === 2) return Boolean(session.analysis);
  if (index === 3) return session.approved;
  return session.exported;
}

function GlobalError() {
  const { error, clearError } = useSession();
  if (!error) return null;
  return <div className="route-alert alert-error" role="alert" aria-live="assertive">
    <div><strong>Action needed</strong><p>{error}</p></div>
    <button type="button" aria-label="Dismiss error" onClick={clearError}><X size={16} /></button>
  </div>;
}

function WorkspaceNotice() {
  const location = useLocation();
  const notice = (location.state as { notice?: string } | null)?.notice;
  if (!notice) return null;
  return <div className="route-alert alert-notice" role="status"><Activity size={17} /><p>{notice}</p></div>;
}

function WorkspaceNav({ mobile, close }: { mobile?: boolean; close?: () => void }) {
  const { validation, analysis, approved, points } = useSession();
  const session = useSession();
  return <nav className={mobile ? 'workspace-nav mobile-open' : 'workspace-nav'} aria-label="Report workspace navigation">
    <div className="workspace-nav-label">REPORT WORKSPACE</div>
    {workflowSteps.map((step, index) => {
      const isComplete = completion(index, session);
      const accessible = index === 0 || (index === 1 && points.length > 0) || (index === 2 && validation.success) || (index === 3 && Boolean(analysis)) || (index === 4 && approved);
      return <NavLink key={step.path} to={accessible ? step.path : '/app/capture'} onClick={close} className={({ isActive }) => `workspace-nav-link ${isActive ? 'active' : ''} ${isComplete ? 'complete' : ''}`}>
        <span className="workspace-nav-index">{isComplete ? <Check size={14} /> : String(index + 1).padStart(2, '0')}</span>
        <span><strong>{step.title}</strong><small>{step.hint}</small></span>
        {!accessible && <span className="workspace-nav-lock" aria-label="Not available yet">•</span>}
      </NavLink>;
    })}
    <div className="workspace-nav-foot"><ShieldCheck size={15} /> Source evidence stays in this browser session only.</div>
  </nav>;
}

export function WorkspaceAside({ activeStage }: { activeStage: number }) {
  const { points, validation, analysis, approved, calculations, metadata } = useSession();
  const [expanded, setExpanded] = useState(false);
  const progress = Math.round(((activeStage + 1) / workflowSteps.length) * 100);
  return <aside className="context-sidebar route-context-sidebar" aria-label="Evidence and report context">
    <div className="sidebar-heading"><span>SESSION STATUS</span><span className="sidebar-indicator" /></div>
    <div className="sidebar-card">
      <div className="sidebar-card-head"><span><Gauge size={18} /> Workspace snapshot</span><span className="sidebar-live">IN MEMORY</span></div>
      <div className="sidebar-stat"><span>Measurement points</span><strong>{points.length || '—'}</strong></div>
      <div className="sidebar-stat"><span>Validation</span><strong className={validation.success ? 'state-good' : 'state-neutral'}>{validation.success ? 'Passed' : points.length ? 'Incomplete' : 'Awaiting'}</strong></div>
      <div className="sidebar-stat"><span>AI narrative</span><strong className={analysis ? 'state-good' : 'state-neutral'}>{analysis ? 'Generated' : 'Awaiting'}</strong></div>
      <div className="sidebar-stat"><span>Review sign-off</span><strong className={approved ? 'state-good' : 'state-neutral'}>{approved ? 'Acknowledged' : 'Pending'}</strong></div>
      <div className="sidebar-progress"><span>Workflow progress</span><strong>{progress}%</strong><div><i style={{ width: `${progress}%` }} /></div></div>
    </div>
    <div className="sidebar-card sidebar-guidance">
      <div className="sidebar-card-head"><span><ShieldCheck size={18} /> The calibration boundary</span></div>
      <p>Calivryn compares measurements only to <strong>tolerances you supply</strong>. It does not establish measurement uncertainty, traceability or accredited calibration status.</p>
      <button type="button" className="text-button" onClick={() => setExpanded(value => !value)} aria-expanded={expanded}>Read safety limitations <ChevronDown size={16} className={expanded ? 'rotate' : ''} /></button>
      {expanded && <p className="expanded-safety">{DISCLAIMER}</p>}
    </div>
    <div className="sidebar-ai"><div className="sidebar-ai-icon"><Sparkles size={19} /></div><span>OPEN-WEIGHT INTELLIGENCE</span><h3>Grounded AI.<br />Auditable facts.</h3><p>Human review remains the final authority. No raw calibration report is saved to a Calivryn database.</p><div className="ai-sidebar-foot"><span>GEMMA 4 · 26B A4B</span><span>CF WORKERS AI</span></div></div>
    <div className="sidebar-footnote"><CircleHelp size={15} /><span>Data is sent to Cloudflare to run inference. Avoid uploading sensitive personal or proprietary records without permission.</span></div>
    {calculations && <div className="sidebar-mini-stat"><Cpu size={14} /> {metadata.unit} · {calculations.as_left_overall} as-left</div>}
  </aside>;
}

export function WorkspacePage({ activeStage, children }: { activeStage: number; children: React.ReactNode }) {
  return <div className="workspace-page"><div className="workspace-page-main">{children}</div><WorkspaceAside activeStage={activeStage} /></div>;
}

export default function WorkspaceShell() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
    setMobileOpen(false);
  }, [location.pathname]);
  return <div className="app-shell">
    <header className="app-topbar">
      <div className="app-topbar-left"><button type="button" className="mobile-menu-button" aria-label="Open workspace navigation" aria-expanded={mobileOpen} onClick={() => setMobileOpen(value => !value)}>{mobileOpen ? <X size={21} /> : <Menu size={21} />}</button><BrandLink to="/" /><span className="app-breadcrumb"><span>Workspace</span><b>/</b><strong>{workflowSteps[routeIndex(location.pathname)]?.title || 'Overview'}</strong></span></div>
      <div className="app-topbar-right"><span className="app-status"><span className="status-pulse" /> IN-MEMORY SESSION</span><a className="app-source-link" href="https://github.com/ometere123/Calivryn" target="_blank" rel="noopener noreferrer"><Github size={16} /> Source</a></div>
    </header>
    <aside className="app-sidebar"><WorkspaceNav /></aside>
    {mobileOpen && <div className="mobile-nav-backdrop" onClick={() => setMobileOpen(false)} aria-hidden="true" />}
    {mobileOpen && <div className="mobile-nav-panel"><div className="mobile-nav-heading"><span>Workspace navigation</span><button type="button" aria-label="Close workspace navigation" onClick={() => setMobileOpen(false)}><X size={18} /></button></div><WorkspaceNav mobile close={() => setMobileOpen(false)} /></div>}
    <div className="app-main"><main className="app-content"><WorkspaceNotice /><GlobalError /><Outlet /></main><footer className="app-footer"><span><Gauge size={16} /> calivryn.</span><span>Evidence before explanation. No report history is stored.</span><Link to="/methodology">Methodology <ArrowRight size={13} /></Link></footer></div>
  </div>;
}
