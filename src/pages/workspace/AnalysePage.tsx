import { ArrowLeft, ArrowRight, Cloud, Cpu, FileCheck2, Info, LoaderCircle, LockKeyhole, ShieldCheck, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { MODEL_ID } from '../../../shared/calibration';
import { SectionHeading } from '../../components/site/Shared';
import { WorkspacePage } from '../../components/site/WorkspaceShell';
import { useSession } from '../../lib/session';

export default function AnalysePage() {
  const navigate = useNavigate();
  const { metadata, points, calculations, loading, requestAnalysis } = useSession();
  async function generate() {
    if (await requestAnalysis()) navigate('/app/review');
  }
  return <WorkspacePage activeStage={2}><div className="route-panel">
    <SectionHeading eyebrow="STAGE 03 / OPEN-WEIGHT AI" title="Interpretation without invention.">Validated evidence and untrusted field notes go to Cloudflare's hosted Gemma 4 model. Numerical assessments remain deterministic and are checked again when the response returns.</SectionHeading>
    <div className="ai-model-card"><div className="ai-model-mark"><Cpu size={27} /></div><div><span className="eyebrow">INFERENCE ENGINE</span><h3>Gemma 4 · 26B A4B</h3><p>Hosted on Cloudflare Workers AI · Real model execution</p><code>{MODEL_ID}</code></div><span className="model-verified"><Cloud size={15} /> CLOUD INFERENCE</span></div>
    <div className="transparency-grid"><div><ShieldCheck size={21} /><strong>Non-negotiable math</strong><span>Pass/fail and deviations are never authored by AI.</span></div><div><FileCheck2 size={21} /><strong>Grounded citations</strong><span>AI observations must cite actual measurement point IDs.</span></div><div><LockKeyhole size={21} /><strong>Privacy disclosed</strong><span>Inputs are transmitted to Cloudflare for inference.</span></div></div>
    <div className="ai-facts"><div><span>Instrument</span><strong>{metadata.instrumentId}</strong></div><div><span>Assessment source</span><strong>Technician-defined tolerances</strong></div><div><span>Point count</span><strong>{points.length}</strong></div><div><span>Verified as-left result</span><strong>{calculations?.as_left_overall}</strong></div></div>
    <div className="callout"><Info size={17} /><span>Only a successful, schema-validated response with existing point references can proceed to Review. Provider failures remain visible and produce no placeholder narrative.</span></div>
    <div className="bottom-actions"><button className="button-ghost" type="button" disabled={loading} onClick={() => navigate('/app/verify')}><ArrowLeft size={17} /> Back to Verify</button><button className="button-primary" type="button" disabled={loading} onClick={() => void generate()}>{loading ? <><LoaderCircle size={17} className="spin" /> Running genuine inference...</> : <><Sparkles size={17} /> Generate evidence narrative <ArrowRight size={17} /></>}</button></div>
  </div></WorkspacePage>;
}
