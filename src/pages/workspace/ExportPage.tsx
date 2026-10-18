import { ArrowLeft, ArrowRight, Check, CheckCircle2, Download, Gauge } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SectionHeading } from '../../components/site/Shared';
import { WorkspacePage } from '../../components/site/WorkspaceShell';
import { useSession } from '../../lib/session';

export default function ExportPage() {
  const navigate = useNavigate();
  const { metadata, analysis, exported, exportPdf, startAgain } = useSession();
  if (!analysis) return null;
  function newReport() {
    startAgain();
    navigate('/app/capture');
  }
  return <WorkspacePage activeStage={4}><div className="route-panel">
    <SectionHeading eyebrow="STAGE 05 / DOCUMENT EXPORT" title="Evidence, ready to deliver.">The PDF includes all source readings, calculated deviations, AI narrative and your review acknowledgement. It is generated in this browser.</SectionHeading>
    <div className="report-cover"><div className="report-cover-top"><span className="cover-logo"><Gauge size={18} /> CALIVRYN</span><span>CALIBRATION SERVICE REPORT</span></div><div className="cover-body"><div className="eyebrow">DOCUMENT PREVIEW</div><h3>{metadata.instrumentId}</h3><p>{metadata.instrumentType}</p><div className="cover-divider" /><div className="cover-meta"><div><span>CLIENT</span><strong>{metadata.client}</strong></div><div><span>TECHNICIAN</span><strong>{metadata.technician}</strong></div><div><span>SERVICE DATE</span><strong>{metadata.date}</strong></div><div><span>DATA POINTS</span><strong>{analysis.calculation.count}</strong></div></div><div className="cover-status"><span className={analysis.calculation.as_left_overall === 'WITHIN' ? 'good-dot' : 'red-dot'} /> {analysis.calculation.as_left_overall} USER-SUPPLIED TOLERANCE · AS-LEFT</div></div><div className="cover-footer">EXPLANATION BY GEMMA 4 <span>•</span> RESULTS BY DECIMAL.JS <span>•</span> HUMAN REVIEWED</div></div>
    <div className="final-includes"><h3>Included in your file</h3>{['All input measurements and precise signed errors', 'Individual and overall as-found/as-left checks', 'Gemma 4 technical interpretation and citations', 'Review actions and original field notes', 'AI provenance, review affirmation and safety limitations'].map(item => <div key={item}><Check size={17} />{item}</div>)}</div>
    <div className="bottom-actions"><button className="button-ghost" type="button" onClick={() => navigate('/app/review')}><ArrowLeft size={17} /> Back to Review</button><button className="button-primary" type="button" onClick={exportPdf}><Download size={18} /> Download PDF report</button></div>
    {exported && <div role="status" className="exported-notice"><CheckCircle2 size={18} /> Report generated in your browser. Check the saved file before sharing it.</div>}
    <button className="start-new" type="button" onClick={newReport}>Start a new report <ArrowRight size={15} /></button>
  </div></WorkspacePage>;
}
