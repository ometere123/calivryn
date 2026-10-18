import { useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Activity, AlertCircle, ArrowLeft, ArrowRight, BadgeCheck, BarChart3, BookOpen,
  Check, CheckCircle2, ChevronDown, CircleHelp, ClipboardCheck, Cloud,
  Cpu, Download, FileCheck2, FileDown, FileInput, FileText,
  Gauge, Github, Info, Layers3, LoaderCircle, LockKeyhole, Plus,
  RefreshCw, ShieldAlert, ShieldCheck, Sparkles, Trash2, UploadCloud, X,
} from 'lucide-react';
import { calculateReport, DISCLAIMER, MAX_POINTS, MODEL_ID, reportInputSchema, type Analysis, type Metadata, type Narrative, type PointInput } from '../shared/calibration';
import { analyzeReport } from './lib/api';
import { downloadCsvTemplate, parseCalibrationCsv } from './lib/csv';
import { downloadReportPdf } from './lib/pdf';
import { exampleMetadata, examplePoints, templateCsv } from './lib/sample';
import './styles.css';

const steps = [
  { title: 'Capture', hint: 'Upload & details' },
  { title: 'Verify', hint: 'Deterministic checks' },
  { title: 'Analyse', hint: 'Real model inference' },
  { title: 'Review', hint: 'Human approval' },
  { title: 'Export', hint: 'Your PDF report' },
] as const;
const blankMetadata: Metadata = {
  client: '', project: '', instrumentId: '', instrumentType: '', technician: '',
  date: new Date().toISOString().slice(0, 10), unit: '', notes: '',
};
const blankPoint = (index: number): PointInput => ({ point_id: `P${String(index + 1).padStart(2, '0')}`, reference: '', as_found: '', as_left: '', tolerance: '' });
const fields = [
  { name: 'client', label: 'Client / company', example: 'e.g. Meridian Technical Services' },
  { name: 'project', label: 'Job / project', example: 'e.g. Pressure transmitter bench check' },
  { name: 'instrumentId', label: 'Instrument ID', example: 'e.g. PT-204' },
  { name: 'instrumentType', label: 'Instrument type', example: 'e.g. Pressure transmitter' },
  { name: 'technician', label: 'Technician', example: 'Full name' },
  { name: 'date', label: 'Service date', example: '' },
  { name: 'unit', label: 'Engineering unit (shared)', example: 'e.g. bar, kPa, V, °C' },
] as const;
const pointFields = [
  { key: 'point_id', label: 'Point ID' },
  { key: 'reference', label: 'Reference' },
  { key: 'as_found', label: 'As-found' },
  { key: 'as_left', label: 'As-left' },
  { key: 'tolerance', label: '± Tolerance' },
] as const;

function downloadLocalTemplate() { downloadCsvTemplate(templateCsv); }
function stringifyError(cause: unknown) { return cause instanceof Error ? cause.message : 'Unexpected error. Please try again.'; }
function Metric({ label, value, tone = 'neutral' }: { label: string; value: string; tone?: 'neutral' | 'good' | 'warn' }) {
  return <div className={`metric metric-${tone}`}><span>{label}</span><strong>{value}</strong></div>;
}
function SectionHeading({ eyebrow, title, children }: { eyebrow: string; title: string; children: ReactNode }) {
  return <header className="section-heading"><div className="eyebrow">{eyebrow}</div><h2>{title}</h2><p>{children}</p></header>;
}

export default function App() {
  const [step, setStep] = useState(0);
  const [metadata, setMetadata] = useState<Metadata>(blankMetadata);
  const [points, setPoints] = useState<PointInput[]>([]);
  const [sourceName, setSourceName] = useState('No CSV selected');
  const [isDemo, setDemo] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [edited, setEdited] = useState<Narrative | null>(null);
  const [approved, setApproved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expandedSafety, setExpandedSafety] = useState(false);
  const [exported, setExported] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const requestVersion = useRef(0);
  const input = useMemo(() => ({ metadata, points }), [metadata, points]);
  const validation = useMemo(() => reportInputSchema.safeParse(input), [input]);
  const calculations = useMemo(() => validation.success ? calculateReport(validation.data) : null, [validation]);
  const issueSummary = !validation.success ? validation.error.issues.slice(0, 5).map(issue => `${issue.path.join('.') || 'report'}: ${issue.message}`) : [];

  function invalidate() {
    requestVersion.current += 1;
    setAnalysis(null); setEdited(null); setApproved(false); setExported(false); setError('');
  }
  function changeMetadata(key: keyof Metadata, value: string) {
    invalidate(); setMetadata(previous => ({ ...previous, [key]: value }));
  }
  function changePoint(index: number, key: keyof PointInput, value: string) {
    invalidate(); setPoints(previous => previous.map((row, n) => n === index ? { ...row, [key]: value } : row));
  }
  async function onCsv(file: File | undefined) {
    if (!file) return;
    try {
      const imported = await parseCalibrationCsv(file);
      invalidate(); setPoints(imported); setSourceName(file.name); setDemo(false); setStep(1);
    } catch (cause) { setError(stringifyError(cause)); }
  }
  function loadSample() {
    invalidate(); setMetadata({ ...exampleMetadata }); setPoints(examplePoints.map(row => ({ ...row })));
    setSourceName('synthetic-demonstration.csv'); setDemo(true); setStep(1);
  }
  async function requestAnalysis() {
    if (!validation.success || loading) return;
    const version = ++requestVersion.current;
    setError(''); setLoading(true); setAnalysis(null); setEdited(null); setApproved(false);
    try {
      const result = await analyzeReport(validation.data);
      if (requestVersion.current !== version) return;
      const calculatedAgain = calculateReport(validation.data);
      if (JSON.stringify(result.calculation) !== JSON.stringify(calculatedAgain)) throw new Error('Server/client measurement results disagree. Do not export this report.');
      setAnalysis(result); setEdited(structuredClone(result.narrative)); setStep(3);
    } catch (cause) { if (requestVersion.current === version) setError(stringifyError(cause)); }
    finally { setLoading(false); }
  }
  function patchObservation(index: number, value: string) {
    setEdited(previous => previous ? ({ ...previous, observations: previous.observations.map((entry, n) => n === index ? { ...entry, text: value } : entry) }) : previous);
    setApproved(false); setExported(false);
  }
  function patchAction(index: number, value: string) {
    setEdited(previous => previous ? ({ ...previous, reviewItems: previous.reviewItems.map((entry, n) => n === index ? { ...entry, action: value } : entry) }) : previous);
    setApproved(false); setExported(false);
  }
  function exportPdf() {
    if (!validation.success || !analysis || !edited) return;
    try { downloadReportPdf(validation.data, analysis, edited, approved); setExported(true); setError(''); }
    catch (cause) { setError(stringifyError(cause)); }
  }
  function startAgain() {
    invalidate(); setPoints([]); setMetadata({ ...blankMetadata }); setSourceName('No CSV selected'); setDemo(false); setStep(0);
  }
  function goStep(next: number) {
    if (next > 2 && !analysis) return;
    if (next === 4 && !approved) return;
    if (next < 0 || next >= steps.length) return;
    setError(''); setStep(next);
  }
  return (
    <div className="site-shell">
      <header className="topbar">
        <div className="topbar-inner">
          <a className="brand" href="#top" aria-label="Calivryn home"><span className="brand-mark"><Gauge size={23} strokeWidth={2.6} /></span><span>calivryn<span className="brand-dot">.</span></span></a>
          <div className="topbar-status"><span className="status-pulse" /> ENGINEERING INTELLIGENCE <span className="status-separator" /> <span className="topbar-desktop">AI-ASSISTED REPORTS</span></div>
          <a className="nav-github" href="https://github.com/ometere123/Calivryn" target="_blank" rel="noopener noreferrer"><Github size={17} /> <span>Source code</span></a>
        </div>
      </header>

      <main id="top" className="container">
        <div className="hero-wrap">
          <div className="hero-main">
            <div className="pill"><span className="pill-icon"><Activity size={13} /></span> MEASUREMENT INTEGRITY, BUILT IN</div>
            <h1>Precision is measured.<br /><em>Clarity is generated.</em></h1>
            <p className="hero-sub">Turn raw calibration readings into evidence-linked, technician-reviewed service reports. Mathematics makes the assessment. Gemma helps tell the story.</p>
            <div className="hero-trust"><span><ShieldCheck size={15}/> Deterministic verification</span><span><Cpu size={15}/> Open-weight Gemma 4</span><span><LockKeyhole size={15}/> No report database</span></div>
          </div>
          <div className="hero-aside" aria-label="Workflow overview">
            <div className="hero-card-label"><span className="mini-square"/> THE EVIDENCE STANDARD <span>01 — 03</span></div>
            <div className="hero-card-item"><span className="hero-card-index">01</span><div><strong>Import the facts</strong><small>Instrument data + field context</small></div><FileInput size={20}/></div>
            <div className="hero-card-item"><span className="hero-card-index">02</span><div><strong>Verify the numbers</strong><small>Independent decimal arithmetic</small></div><BarChart3 size={20}/></div>
            <div className="hero-card-item"><span className="hero-card-index">03</span><div><strong>Explain with evidence</strong><small>Human-approved AI narrative</small></div><Sparkles size={20}/></div>
            <div className="hero-aside-foot"><span>REAL CALCULATIONS. REAL INFERENCE.</span><span className="online-dot"/></div>
          </div>
        </div>

        <div className="workflow-intro"><div><span className="eyebrow">REPORT WORKSPACE</span><h2>Build a defensible report.</h2></div><span className="workspace-count">5 STAGES <span className="count-slash">/</span> 1 COMPLETE WORKFLOW</span></div>
        <nav className="stepper" aria-label="Report workflow steps">
          {steps.map((item, index) => {
            const reachable = index <= 2 || (!!analysis && (index < 4 || approved));
            return <button type="button" className={`step-pill ${step === index ? 'current' : ''} ${step > index ? 'past' : ''}`} key={item.title} disabled={!reachable || loading} onClick={() => goStep(index)} aria-current={step === index ? 'step' : undefined}>
              <span className="step-index">{step > index ? <Check size={15}/> : String(index + 1).padStart(2, '0')}</span>
              <span className="step-copy"><strong>{item.title}</strong><small>{item.hint}</small></span>
              {step === index && <div className="step-current-mark"/>}
            </button>;
          })}
        </nav>

        {error && <div role="alert" className="alert alert-error"><AlertCircle size={19}/><div><strong>Action needed</strong><p>{error}</p></div><button aria-label="Dismiss error" onClick={() => setError('')}><X size={16}/></button></div>}
        {isDemo && <div role="status" className="alert alert-demo"><Info size={18}/><p><strong>Synthetic demonstration:</strong> This dataset is fictional and does not document real equipment or accredited calibration.</p></div>}

        <div className="work-layout">
          <section className="work-panel" aria-label="Report workspace">
            {step === 0 && <>
              <SectionHeading eyebrow="STEP 01 / DATA CAPTURE" title="Start with trustworthy source data.">Upload your existing measurement readings, or explore the entire workflow with a clearly labelled synthetic example.</SectionHeading>
              <input ref={fileRef} className="sr-only" type="file" accept=".csv,text/csv" onChange={event => { void onCsv(event.currentTarget.files?.[0]); event.currentTarget.value = ''; }} aria-label="Upload calibration CSV" />
              <button className="dropzone" onClick={() => fileRef.current?.click()} type="button"><span className="drop-icon"><UploadCloud size={27}/></span><strong>Import calibration CSV</strong><span>Choose a file with point IDs, references, readings and absolute tolerances</span><small>CSV format · 1–40 points · 30 KB maximum</small><span className="drop-button">Browse CSV files <ArrowRight size={15}/></span></button>
              <div className="import-actions"><button className="text-button" onClick={downloadLocalTemplate}><FileDown size={16}/> Download CSV template</button><span>or</span><button className="text-button accent" onClick={loadSample}><Sparkles size={16}/> Load complete sample dataset</button></div>
              <div className="subsection"><div className="subsection-title"><Layers3 size={18}/><h3>Job information</h3></div><div className="field-grid">{fields.map(field => <label className={`form-field ${field.name === 'project' ? 'field-wide' : ''}`} key={field.name}><span>{field.label}<b> *</b></span><input type={field.name === 'date' ? 'date' : 'text'} value={metadata[field.name]} maxLength={field.name === 'client' || field.name === 'project' ? 90 : undefined} onChange={event => changeMetadata(field.name, event.target.value)} placeholder={field.example}/></label>)}</div></div>
              <label className="form-field notes-field"><span>Technician field notes <small>Unverified context</small></span><textarea rows={4} maxLength={2000} value={metadata.notes} onChange={event => changeMetadata('notes', event.target.value)} placeholder="Describe observed conditions, adjustments and items that require a technician's follow-up. Never include private customer secrets."/><small className="character-count">{metadata.notes.length}/2000 characters</small></label>
              <div className="bottom-actions"><span className="quiet-note"><ShieldCheck size={15}/> No report history is saved by this app.</span><button className="button-primary" onClick={() => { setError(''); setStep(1); }}>Verify readings <ArrowRight size={17}/></button></div>
            </>}

            {step === 1 && <>
              <SectionHeading eyebrow="STEP 02 / MEASUREMENT VERIFICATION" title="Every number earns its place.">Edit the measurements below. Checks use exact decimal arithmetic against your explicitly provided absolute tolerances.</SectionHeading>
              <div className="source-bar"><div><FileText size={19}/><div><strong>{sourceName}</strong><small>{points.length} measurement point{points.length === 1 ? '' : 's'} · Unit: {metadata.unit || 'not specified'}</small></div></div><button className="text-button" onClick={() => fileRef.current?.click()}><RefreshCw size={15}/> Replace CSV</button></div>
              <input ref={fileRef} className="sr-only" type="file" accept=".csv,text/csv" onChange={event => { void onCsv(event.currentTarget.files?.[0]); event.currentTarget.value = ''; }} aria-label="Replace calibration CSV" />
              <div className="table-scroll"><table className="point-table"><thead><tr><th>#</th>{pointFields.map(field => <th key={field.key}>{field.label}</th>)}<th aria-label="Remove"/></tr></thead><tbody>{points.map((point, index) => <tr key={index}><td className="point-count">{String(index + 1).padStart(2, '0')}</td>{pointFields.map(field => <td key={field.key}><input aria-label={`Reading ${index + 1} ${field.label}`} value={point[field.key]} onChange={event => changePoint(index, field.key, event.target.value)} inputMode={field.key === 'point_id' ? 'text' : 'decimal'} spellCheck={false}/></td>)}<td><button aria-label={`Remove reading ${index + 1}`} className="remove-button" onClick={() => { invalidate(); setPoints(current => current.filter((_, number) => number !== index)); }}><Trash2 size={17}/></button></td></tr>)}</tbody></table></div>
              <div className="table-toolbar"><button className="text-button" disabled={points.length >= MAX_POINTS} onClick={() => { invalidate(); setPoints(current => [...current, blankPoint(current.length)]); }}><Plus size={16}/> Add measurement</button><span>{points.length} / {MAX_POINTS} maximum</span></div>
              {issueSummary.length > 0 && <div className="validation-list"><strong><AlertCircle size={16}/> Verification incomplete</strong><ul>{issueSummary.map((issue, index) => <li key={index}>{issue}</li>)}</ul></div>}
              {calculations && <><div className="result-metrics"><Metric label="As-found within tol." value={`${calculations.as_found_passed}/${calculations.count}`} tone={calculations.as_found_overall === 'WITHIN' ? 'good' : 'warn'}/><Metric label="As-left within tol." value={`${calculations.as_left_passed}/${calculations.count}`} tone={calculations.as_left_overall === 'WITHIN' ? 'good' : 'warn'}/><Metric label="Points improved" value={String(calculations.improved)}/></div><div className="result-breakdown"><div className="subsection-title"><ClipboardCheck size={18}/><h3>Computed measurement results</h3></div><div className="computed-scroll"><table className="computed-table"><thead><tr><th>Point</th><th>Found error</th><th>Left error</th><th>Found status</th><th>Left status</th><th>Change</th></tr></thead><tbody>{calculations.rows.map(row => <tr key={row.point_id}><td className="mono">{row.point_id}</td><td className="mono">{row.as_found_error} {metadata.unit}</td><td className="mono">{row.as_left_error} {metadata.unit}</td><td><span className={`result-tag ${row.as_found_pass ? 'pass' : 'fail'}`}>{row.as_found_pass ? 'WITHIN' : 'OUTSIDE'}</span></td><td><span className={`result-tag ${row.as_left_pass ? 'pass' : 'fail'}`}>{row.as_left_pass ? 'WITHIN' : 'OUTSIDE'}</span></td><td>{row.change}</td></tr>)}</tbody></table></div></div></>}
              <div className="bottom-actions"><button className="button-ghost" onClick={() => goStep(0)}><ArrowLeft size={17}/> Back to details</button><button className="button-primary" disabled={!validation.success} onClick={() => goStep(2)}>Continue to AI analysis <ArrowRight size={17}/></button></div>
            </>}

            {step === 2 && <>
              <SectionHeading eyebrow="STEP 03 / OPEN-WEIGHT AI" title="Interpretation without invention.">We send the validated results and your field notes to Cloudflare's hosted Gemma 4 model. Numerical assessments stay deterministic.</SectionHeading>
              <div className="ai-model-card"><div className="ai-model-mark"><Cpu size={27}/></div><div><span className="eyebrow">INFERENCE ENGINE</span><h3>Gemma 4 · 26B A4B</h3><p>Hosted on Cloudflare Workers AI · Real model execution</p><code>{MODEL_ID}</code></div><span className="model-verified"><Cloud size={15}/> CLOUD INFERENCE</span></div>
              <div className="transparency-grid"><div><ShieldCheck size={21}/><strong>Non-negotiable math</strong><span>Pass/fail and deviations are never authored by AI.</span></div><div><FileCheck2 size={21}/><strong>Grounded citations</strong><span>AI observations must cite actual measurement point IDs.</span></div><div><LockKeyhole size={21}/><strong>Privacy disclosed</strong><span>Inputs are transmitted to Cloudflare for inference.</span></div></div>
              <div className="ai-facts"><div><span>Instrument</span><strong>{metadata.instrumentId}</strong></div><div><span>Assessment source</span><strong>Technician-defined tolerances</strong></div><div><span>Point count</span><strong>{points.length}</strong></div><div><span>Expected output</span><strong>Summary + observations + review actions</strong></div></div>
              <div className="callout"><Info size={17}/><span>Inference uses free-plan resources and may be unavailable or rate-limited. We never display fabricated placeholder model output.</span></div>
              <div className="bottom-actions"><button className="button-ghost" disabled={loading} onClick={() => goStep(1)}><ArrowLeft size={17}/> Back to measurements</button><button className="button-primary" disabled={loading || !validation.success} onClick={() => void requestAnalysis()}>{loading ? <><LoaderCircle size={17} className="spin"/> Running genuine inference...</> : <><Sparkles size={17}/> Generate evidence narrative <ArrowRight size={17}/></>}</button></div>
            </>}

            {step === 3 && analysis && edited && <>
              <SectionHeading eyebrow="STEP 04 / TECHNICIAN REVIEW" title="Intelligence meets accountability.">Gemma's interpretation is editable. A qualified person must confirm that it agrees with the measurements and observed conditions.</SectionHeading>
              <div className="success-bar"><CheckCircle2 size={20}/><div><strong>Live AI analysis received and validated</strong><small>{analysis.model} · Generated {new Date(analysis.generatedAt).toLocaleString()}</small></div></div>
              <label className="form-field report-textarea"><span>Executive summary <small>AI drafted, technician editable</small></span><textarea rows={6} maxLength={900} value={edited.summary} onChange={event => { setEdited(current => current ? { ...current, summary: event.target.value } : current); setApproved(false); setExported(false); }}/><small className="character-count">{edited.summary.length}/900</small></label>
              <div className="subsection review-group"><div className="subsection-title"><BookOpen size={18}/><h3>Evidence-linked observations</h3></div>{edited.observations.map((item, index) => <div className="editable-card" key={index}><div className="reference-tag">MEASUREMENT SOURCE <span>{item.pointIds.join(' · ')}</span></div><textarea aria-label={`Observation ${index + 1}`} maxLength={500} value={item.text} rows={3} onChange={event => patchObservation(index, event.target.value)}/></div>)}</div>
              <div className="subsection review-group"><div className="subsection-title"><ShieldAlert size={18}/><h3>Items for qualified technician review</h3></div>{edited.reviewItems.map((item, index) => <div className="editable-card" key={index}><div className="reference-tag">REVIEW SOURCE <span>{item.pointIds.join(' · ')}</span></div><textarea aria-label={`Follow-up action ${index + 1}`} maxLength={350} value={item.action} rows={2} onChange={event => patchAction(index, event.target.value)}/></div>)}</div>
              <div className="approval-box"><label><input type="checkbox" checked={approved} onChange={event => setApproved(event.target.checked)}/><span><strong>I have independently reviewed this service report.</strong><small>I understand the calculation basis, have checked the AI narrative against source evidence and accept responsibility for its accuracy. This is not a digital signature or accreditation.</small></span></label></div>
              <div className="bottom-actions"><button className="button-ghost" onClick={() => goStep(2)}><ArrowLeft size={17}/> Regenerate narrative</button><button disabled={!approved} className="button-primary" onClick={() => goStep(4)}>Prepare final report <ArrowRight size={17}/></button></div>
            </>}

            {step === 4 && analysis && edited && <>
              <SectionHeading eyebrow="STEP 05 / DOCUMENT EXPORT" title="Evidence, ready to deliver.">The PDF includes all source readings, calculated deviations, AI narrative and your review acknowledgement.</SectionHeading>
              <div className="report-cover"><div className="report-cover-top"><span className="cover-logo"><Gauge size={18}/> CALIVRYN</span><span>CALIBRATION SERVICE REPORT</span></div><div className="cover-body"><div className="eyebrow">DOCUMENT PREVIEW</div><h3>{metadata.instrumentId}</h3><p>{metadata.instrumentType}</p><div className="cover-divider"/><div className="cover-meta"><div><span>CLIENT</span><strong>{metadata.client}</strong></div><div><span>TECHNICIAN</span><strong>{metadata.technician}</strong></div><div><span>SERVICE DATE</span><strong>{metadata.date}</strong></div><div><span>DATA POINTS</span><strong>{analysis.calculation.count}</strong></div></div><div className="cover-status"><span className={analysis.calculation.as_left_overall === 'WITHIN' ? 'good-dot' : 'red-dot'}/> {analysis.calculation.as_left_overall} USER-SUPPLIED TOLERANCE · AS-LEFT</div></div><div className="cover-footer">EXPLANATION BY GEMMA 4 <span>•</span> RESULTS BY DECIMAL.JS <span>•</span> HUMAN REVIEWED</div></div>
              <div className="final-includes"><h3>Included in your file</h3>{['All input measurements and precise signed errors','Individual and overall as-found/as-left checks','Gemma 4 technical interpretation and citations','Review actions and original field notes','AI provenance, review affirmation and safety limitations'].map(item => <div key={item}><Check size={17}/>{item}</div>)}</div>
              <div className="bottom-actions"><button className="button-ghost" onClick={() => goStep(3)}><ArrowLeft size={17}/> Review narrative</button><button className="button-primary" onClick={exportPdf}><Download size={18}/> Download PDF report</button></div>
              {exported && <div role="status" className="exported-notice"><CheckCircle2 size={18}/> Report generated in your browser. Check the saved file before sharing it.</div>}
              <button className="start-new" onClick={startAgain}>Start a new report <ArrowRight size={15}/></button>
            </>}
          </section>

          <aside className="context-sidebar" aria-label="Evidence and report context">
            <div className="sidebar-heading"><span>YOUR WORKSPACE</span><span className="sidebar-indicator"/></div>
            <div className="sidebar-card"><div className="sidebar-card-head"><span><Gauge size={18}/> Session snapshot</span><span className="sidebar-live">LIVE</span></div><div className="sidebar-stat"><span>Measurement points</span><strong>{points.length}</strong></div><div className="sidebar-stat"><span>Validation</span><strong className={validation.success ? 'state-good' : 'state-neutral'}>{validation.success ? 'Passed' : 'Incomplete'}</strong></div><div className="sidebar-stat"><span>AI narrative</span><strong className={analysis ? 'state-good' : 'state-neutral'}>{analysis ? 'Generated' : 'Awaiting'}</strong></div><div className="sidebar-stat"><span>Review sign-off</span><strong className={approved ? 'state-good' : 'state-neutral'}>{approved ? 'Acknowledged' : 'Pending'}</strong></div><div className="sidebar-progress"><span>Workflow progress</span><strong>{Math.round(((step + 1) / 5) * 100)}%</strong><div><i style={{ width: `${((step + 1) / 5) * 100}%` }}/></div></div></div>
            <div className="sidebar-card sidebar-guidance"><div className="sidebar-card-head"><span><ShieldCheck size={18}/> The calibration boundary</span></div><p>Calivryn compares measurements only to <strong>tolerances you supply</strong>. It does not establish measurement uncertainty, traceability or accredited calibration status.</p><button className="text-button" onClick={() => setExpandedSafety(value => !value)} aria-expanded={expandedSafety}>Read safety limitations <ChevronDown size={16} className={expandedSafety ? 'rotate' : ''}/></button>{expandedSafety && <p className="expanded-safety">{DISCLAIMER}</p>}</div>
            <div className="sidebar-ai"><div className="sidebar-ai-icon"><Sparkles size={19}/></div><span>OPEN-WEIGHT INTELLIGENCE</span><h3>Grounded AI.<br/>Auditable facts.</h3><p>Human review remains the final authority. No raw calibration report is saved to a Calivryn database.</p><div className="ai-sidebar-foot"><span>GEMMA 4 · 26B A4B</span><span>CF WORKERS AI</span></div></div>
            <div className="sidebar-footnote"><CircleHelp size={15}/><span>Data is sent to Cloudflare to run inference. Avoid uploading sensitive personal or proprietary records without permission.</span></div>
          </aside>
        </div>

        <div className="values-strip"><div><BadgeCheck size={19}/><span>Transparent math</span></div><div><FileCheck2 size={19}/><span>Evidence-based language</span></div><div><ShieldCheck size={19}/><span>Human final authority</span></div><div><Cloud size={19}/><span>Open-weight cloud inference</span></div></div>
      </main>
      <footer className="footer"><div className="container footer-inner"><span className="footer-brand"><Gauge size={18}/> calivryn.</span><span>Evidence before explanation. © 2026</span><a href="https://github.com/ometere123/Calivryn" target="_blank" rel="noopener noreferrer">Open source <ArrowRight size={14}/></a></div></footer>
    </div>
  );
}
