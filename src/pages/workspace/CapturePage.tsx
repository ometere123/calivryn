import { ArrowRight, FileDown, FileText, Info, Layers3, ShieldCheck, Sparkles, UploadCloud } from 'lucide-react';
import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MAX_POINTS } from '../../../shared/calibration';
import { SectionHeading } from '../../components/site/Shared';
import { WorkspacePage } from '../../components/site/WorkspaceShell';
import { fields, useSession } from '../../lib/session';

export default function CapturePage() {
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const { metadata, changeMetadata, importCsv, loadSample, downloadTemplate, points, sourceName, isDemo, setErrorMessage } = useSession();
  async function onCsv(file: File | undefined) {
    if (await importCsv(file)) navigate('/app/verify');
  }
  function continueToVerify() {
    if (!points.length) {
      setErrorMessage('Add a CSV or load the synthetic dataset before opening Verify.');
      return;
    }
    navigate('/app/verify');
  }
  return <WorkspacePage activeStage={0}><div className="route-panel">
    <SectionHeading eyebrow="STAGE 01 / DATA CAPTURE" title="Start with trustworthy source data.">Upload readings or load the clearly labelled synthetic example. Job context and technician notes remain part of the report evidence.</SectionHeading>
    {isDemo && <div className="demo-banner" role="status"><Info size={17} /><p><strong>Synthetic demonstration:</strong> this dataset is fictional and does not document real equipment or accredited calibration.</p></div>}
    <input ref={fileRef} className="sr-only" type="file" accept=".csv,text/csv" onChange={event => { void onCsv(event.currentTarget.files?.[0]); event.currentTarget.value = ''; }} aria-label="Upload calibration CSV" />
    <button className="dropzone route-dropzone" onClick={() => fileRef.current?.click()} type="button"><span className="drop-icon"><UploadCloud size={27} /></span><strong>Import calibration CSV</strong><span>Choose a file with point IDs, references, readings and absolute tolerances</span><small>CSV format · 1–40 points · 30 KB maximum</small><span className="drop-button">Browse CSV files <ArrowRight size={15} /></span></button>
    <div className="import-actions"><button className="text-button" type="button" onClick={downloadTemplate}><FileDown size={16} /> Download CSV template</button><span>or</span><button className="text-button accent" type="button" onClick={() => { loadSample(); navigate('/app/verify'); }}><Sparkles size={16} /> Load complete sample dataset</button></div>
    <div className="capture-source-strip"><FileText size={17} /><div><strong>{sourceName}</strong><small>{points.length ? `${points.length} measurement point${points.length === 1 ? '' : 's'} loaded` : 'No source readings loaded yet'}</small></div></div>
    <div className="subsection"><div className="subsection-title"><Layers3 size={18} /><h3>Job information</h3></div><div className="field-grid">{fields.map(field => <label className={`form-field ${field.name === 'project' ? 'field-wide' : ''}`} key={field.name}><span>{field.label}<b> *</b></span><input type={field.name === 'date' ? 'date' : 'text'} value={metadata[field.name]} maxLength={field.name === 'client' || field.name === 'project' ? 90 : undefined} onChange={event => changeMetadata(field.name, event.target.value)} placeholder={field.example} /></label>)}</div></div>
    <label className="form-field notes-field"><span>Technician field notes <small>Unverified context</small></span><textarea rows={4} maxLength={2000} value={metadata.notes} onChange={event => changeMetadata('notes', event.target.value)} placeholder="Describe observed conditions, adjustments and items that require a technician's follow-up. Never include private customer secrets." /><small className="character-count">{metadata.notes.length}/2000 characters</small></label>
    <div className="capture-boundary"><ShieldCheck size={16} /><span>Readings and notes stay in this browser session until you request analysis. No report history is saved.</span></div>
    <div className="bottom-actions"><span className="quiet-note">{points.length} / {MAX_POINTS} maximum points</span><button className="button-primary" type="button" onClick={continueToVerify}>Continue to Verify <ArrowRight size={17} /></button></div>
  </div></WorkspacePage>;
}
