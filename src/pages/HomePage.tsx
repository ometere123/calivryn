import { Activity, ArrowRight, BarChart3, BookOpen, CheckCircle2, Cpu, FileCheck2, FileInput, Github, LockKeyhole, ShieldCheck, Sparkles } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { PublicHeader } from '../components/site/Shared';
import { useSession } from '../lib/session';

const stages = [
  { number: '01', title: 'Capture the facts', text: 'Import readings, instrument context and technician notes without losing the source record.', icon: FileInput },
  { number: '02', title: 'Verify the numbers', text: 'Use exact decimal arithmetic to calculate signed errors and tolerance outcomes.', icon: BarChart3 },
  { number: '03', title: 'Analyse with evidence', text: 'Ask Gemma for grounded technical language while mathematics stays authoritative.', icon: Sparkles },
  { number: '04', title: 'Review as a technician', text: 'Edit observations, check follow-up actions and accept responsibility for the report.', icon: ShieldCheck },
  { number: '05', title: 'Export the record', text: 'Create a complete browser PDF with readings, provenance and limitations.', icon: FileCheck2 },
];

export default function HomePage() {
  const navigate = useNavigate();
  const { loadSample } = useSession();
  function trySample() {
    loadSample();
    navigate('/app/verify');
  }
  return <div className="public-page home-page">
    <PublicHeader />
    <main>
      <section className="home-hero container">
        <div className="home-hero-copy">
          <div className="pill"><span className="pill-icon"><Activity size={13} /></span> MEASUREMENT INTEGRITY, BUILT IN</div>
          <h1>Precision is measured.<br /><em>Clarity is generated.</em></h1>
          <p className="hero-sub">Calivryn turns field readings into an evidence-linked, technician-reviewed service report. Mathematics makes the assessment. Gemma helps tell the story.</p>
          <div className="home-actions"><Link className="button-primary" to="/app/capture">Launch workspace <ArrowRight size={17} /></Link><button className="button-ghost" type="button" onClick={trySample}><Sparkles size={16} /> Try sample workflow</button></div>
          <div className="hero-trust"><span><ShieldCheck size={15} /> Deterministic verification</span><span><Cpu size={15} /> Open-weight Gemma 4</span><span><LockKeyhole size={15} /> No report database</span></div>
        </div>
        <div className="home-hero-panel" aria-label="Calivryn report boundary">
          <div className="home-panel-kicker"><span className="mini-square" /> THE REPORT BOUNDARY <span>01 — 03</span></div>
          <div className="home-panel-row"><span className="hero-card-index">01</span><div><strong>Authoritative maths</strong><small>decimal.js owns every tolerance result</small></div><BarChart3 size={20} /></div>
          <div className="home-panel-row"><span className="hero-card-index">02</span><div><strong>Grounded interpretation</strong><small>Gemma cites actual measurement points</small></div><BookOpen size={20} /></div>
          <div className="home-panel-row"><span className="hero-card-index">03</span><div><strong>Human responsibility</strong><small>Technician acknowledgement gates export</small></div><ShieldCheck size={20} /></div>
          <div className="home-panel-foot"><span>REAL CALCULATIONS. REAL INFERENCE.</span><span className="online-dot" /></div>
        </div>
      </section>

      <section className="home-section container">
        <div className="home-section-intro"><div><div className="eyebrow">A SMALL TOOL FOR A REAL WORKFLOW</div><h2>From field evidence to a credible service report.</h2></div><span className="home-section-note">FOR INDEPENDENT TECHNICIANS</span></div>
        <div className="home-problem-grid"><div className="home-problem-copy"><p>Independent calibration technicians often move from a field sheet to a client-facing report by copying values between spreadsheets, calculating deviations manually and writing the explanation from memory.</p><p>That is where a sign gets lost, an exact tolerance boundary gets misread or a confident sentence drifts away from the source evidence.</p><p>Calivryn keeps the measurement decision deterministic and gives the technician a focused place to review the language before export.</p></div><div className="home-boundary-card"><CheckCircle2 size={20} /><strong>What Calivryn will not do</strong><p>It will not choose an acceptance standard, certify equipment, invent readings or make a safety-to-operate decision.</p></div></div>
      </section>

      <section className="home-section home-process-section">
        <div className="container"><div className="eyebrow">THE FIVE-STAGE WORKSPACE</div><h2>One report, five deliberate decisions.</h2><div className="home-stage-grid">{stages.map(({ number, title, text, icon: Icon }) => <article className="home-stage-card" key={number}><div className="home-stage-top"><span>{number}</span><Icon size={19} /></div><h3>{title}</h3><p>{text}</p></article>)}</div></div>
      </section>

      <section className="home-section container home-open-section"><div className="home-open-card"><div><div className="eyebrow">OPEN-WEIGHT INTELLIGENCE</div><h2>Gemma explains. The evidence decides.</h2><p>Cloudflare Workers AI runs the exact `@cf/google/gemma-4-26b-a4b-it` model for a narrow, auditable language task. The browser and Worker independently calculate the result, and every cited observation must reference an existing point.</p></div><div className="home-open-actions"><Link className="button-primary" to="/methodology">Read the methodology <ArrowRight size={16} /></Link><a className="button-ghost" href="https://github.com/ometere123/Calivryn" target="_blank" rel="noopener noreferrer"><Github size={16} /> View source</a></div></div></section>
    </main>
    <footer className="public-footer"><div className="container"><span className="footer-brand"><Activity size={18} /> calivryn.</span><span>Evidence before explanation. No report history is stored.</span><Link to="/methodology">Methodology <ArrowRight size={14} /></Link></div></footer>
  </div>;
}
