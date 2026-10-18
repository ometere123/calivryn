import { ArrowLeft, ArrowRight, BookOpen, CheckCircle2, ShieldAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SectionHeading } from '../../components/site/Shared';
import { WorkspacePage } from '../../components/site/WorkspaceShell';
import { useSession } from '../../lib/session';

export default function ReviewPage() {
  const navigate = useNavigate();
  const { analysis, edited, approved, acknowledgeReview, patchSummary, patchObservation, patchAction } = useSession();
  if (!analysis || !edited) return null;
  return <WorkspacePage activeStage={3}><div className="route-panel">
    <SectionHeading eyebrow="STAGE 04 / TECHNICIAN REVIEW" title="Intelligence meets accountability.">Gemma's interpretation is editable. A qualified person must confirm that it agrees with the measurements and observed conditions before export.</SectionHeading>
    <div className="success-bar"><CheckCircle2 size={20} /><div><strong>Live AI analysis received and validated</strong><small>{analysis.model} · Generated {new Date(analysis.generatedAt).toLocaleString()}</small></div></div>
    <label className="form-field report-textarea"><span>Executive summary <small>AI drafted, technician editable</small></span><textarea rows={6} maxLength={900} value={edited.summary} onChange={event => patchSummary(event.target.value)} /><small className="character-count">{edited.summary.length}/900</small></label>
    <div className="subsection review-group"><div className="subsection-title"><BookOpen size={18} /><h3>Evidence-linked observations</h3></div>{edited.observations.map((item, index) => <div className="editable-card" key={index}><div className="reference-tag">MEASUREMENT SOURCE <span>{item.pointIds.join(' · ')}</span></div><textarea aria-label={`Observation ${index + 1}`} maxLength={500} value={item.text} rows={3} onChange={event => patchObservation(index, event.target.value)} /></div>)}</div>
    <div className="subsection review-group"><div className="subsection-title"><ShieldAlert size={18} /><h3>Items for qualified technician review</h3></div>{edited.reviewItems.map((item, index) => <div className="editable-card" key={index}><div className="reference-tag">REVIEW SOURCE <span>{item.pointIds.join(' · ')}</span></div><textarea aria-label={`Follow-up action ${index + 1}`} maxLength={350} value={item.action} rows={2} onChange={event => patchAction(index, event.target.value)} /></div>)}</div>
    <div className="approval-box"><label><input type="checkbox" checked={approved} onChange={event => acknowledgeReview(event.target.checked)} /><span><strong>I have independently reviewed this service report.</strong><small>I understand the calculation basis, have checked the AI narrative against source evidence and accept responsibility for its accuracy. This is not a digital signature or accreditation.</small></span></label></div>
    <div className="bottom-actions"><button className="button-ghost" type="button" onClick={() => navigate('/app/analyse')}><ArrowLeft size={17} /> Back to Analyse</button><button disabled={!approved} className="button-primary" type="button" onClick={() => navigate('/app/export')}>Prepare final report <ArrowRight size={17} /></button></div>
  </div></WorkspacePage>;
}
