import { AlertCircle, ArrowLeft, ArrowRight, FileText, Plus, RefreshCw, Trash2, ClipboardCheck } from 'lucide-react';
import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MAX_POINTS } from '../../../shared/calibration';
import { Metric, SectionHeading } from '../../components/site/Shared';
import { WorkspacePage } from '../../components/site/WorkspaceShell';
import { pointFields, useSession } from '../../lib/session';

export default function VerifyPage() {
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const { points, metadata, sourceName, changePoint, removePoint, addPoint, importCsv, validation, calculations, issueSummary } = useSession();
  async function replaceCsv(file: File | undefined) {
    await importCsv(file);
  }
  return <WorkspacePage activeStage={1}><div className="route-panel">
    <SectionHeading eyebrow="STAGE 02 / MEASUREMENT VERIFICATION" title="Every number earns its place.">Edit the measurements below. Checks use exact decimal arithmetic against your explicitly provided positive tolerances.</SectionHeading>
    <div className="source-bar"><div><FileText size={19} /><div><strong>{sourceName}</strong><small>{points.length} measurement point{points.length === 1 ? '' : 's'} · Unit: {metadata.unit || 'not specified'}</small></div></div><button className="text-button" type="button" onClick={() => fileRef.current?.click()}><RefreshCw size={15} /> Replace CSV</button></div>
    <input ref={fileRef} className="sr-only" type="file" accept=".csv,text/csv" onChange={event => { void replaceCsv(event.currentTarget.files?.[0]); event.currentTarget.value = ''; }} aria-label="Replace calibration CSV" />
    <div className="table-scroll" role="region" aria-label="Editable measurement table" tabIndex={0}><table className="point-table"><thead><tr><th>#</th>{pointFields.map(field => <th key={field.key}>{field.label}</th>)}<th aria-label="Remove" /></tr></thead><tbody>{points.map((point, index) => <tr key={`${point.point_id}-${index}`}><td className="point-count">{String(index + 1).padStart(2, '0')}</td>{pointFields.map(field => <td key={field.key}><input aria-label={`Reading ${index + 1} ${field.label}`} value={point[field.key]} onChange={event => changePoint(index, field.key, event.target.value)} inputMode={field.key === 'point_id' ? 'text' : 'decimal'} spellCheck={false} /></td>)}<td><button type="button" aria-label={`Remove reading ${index + 1}`} className="remove-button" onClick={() => removePoint(index)}><Trash2 size={17} /></button></td></tr>)}</tbody></table></div>
    <p className="table-hint">Scroll horizontally on narrow screens to inspect every measurement column.</p>
    <div className="table-toolbar"><button className="text-button" type="button" disabled={points.length >= MAX_POINTS} onClick={addPoint}><Plus size={16} /> Add measurement</button><span>{points.length} / {MAX_POINTS} maximum</span></div>
    {issueSummary.length > 0 && <div className="validation-list" role="alert"><strong><AlertCircle size={16} /> Verification incomplete</strong><ul>{issueSummary.map((issue, index) => <li key={index}>{issue}</li>)}</ul></div>}
    {calculations && <><div className="result-metrics"><Metric label="As-found within tol." value={`${calculations.as_found_passed}/${calculations.count}`} tone={calculations.as_found_overall === 'WITHIN' ? 'good' : 'warn'} /><Metric label="As-left within tol." value={`${calculations.as_left_passed}/${calculations.count}`} tone={calculations.as_left_overall === 'WITHIN' ? 'good' : 'warn'} /><Metric label="Points improved" value={String(calculations.improved)} /></div><div className="result-breakdown"><div className="subsection-title"><ClipboardCheck size={18} /><h3>Computed measurement results</h3></div><div className="computed-scroll" role="region" aria-label="Computed measurement results" tabIndex={0}><table className="computed-table"><thead><tr><th>Point</th><th>Found error</th><th>Left error</th><th>Found status</th><th>Left status</th><th>Change</th></tr></thead><tbody>{calculations.rows.map(row => <tr key={row.point_id}><td className="mono">{row.point_id}</td><td className="mono">{row.as_found_error} {metadata.unit}</td><td className="mono">{row.as_left_error} {metadata.unit}</td><td><span className={`result-tag ${row.as_found_pass ? 'pass' : 'fail'}`}>{row.as_found_pass ? 'WITHIN' : 'OUTSIDE'}</span></td><td><span className={`result-tag ${row.as_left_pass ? 'pass' : 'fail'}`}>{row.as_left_pass ? 'WITHIN' : 'OUTSIDE'}</span></td><td>{row.change}</td></tr>)}</tbody></table></div></div></>}
    <div className="bottom-actions"><button className="button-ghost" type="button" onClick={() => navigate('/app/capture')}><ArrowLeft size={17} /> Back to Capture</button><button className="button-primary" type="button" disabled={!validation.success} onClick={() => navigate('/app/analyse')}>Continue to Analyse <ArrowRight size={17} /></button></div>
  </div></WorkspacePage>;
}
