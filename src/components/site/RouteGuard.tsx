import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useSession } from '../../lib/session';

type Stage = 'verify' | 'analyse' | 'review' | 'export';

export function StageGuard({ stage, children }: { stage: Stage; children: ReactNode }) {
  const { points, validation, analysis, approved } = useSession();
  if (stage === 'verify' && points.length === 0) {
    return <Navigate replace to="/app/capture" state={{ notice: 'This verification view needs source readings. Start at Capture or load the synthetic dataset. Report data is held only in this in-memory session.' }} />;
  }
  if ((stage === 'analyse' || stage === 'review' || stage === 'export') && points.length === 0) {
    return <Navigate replace to="/app/capture" state={{ notice: 'This workspace session has no source readings. Start at Capture; report data is intentionally held only in memory.' }} />;
  }
  if ((stage === 'analyse' || stage === 'review' || stage === 'export') && !validation.success) {
    return <Navigate replace to="/app/verify" state={{ notice: 'Verify every required field before analysis can run. Your source values are still available for editing.' }} />;
  }
  if ((stage === 'review' || stage === 'export') && !analysis) {
    return <Navigate replace to="/app/analyse" state={{ notice: 'Generate and validate a real analysis before opening technician review.' }} />;
  }
  if (stage === 'export' && !approved) {
    return <Navigate replace to="/app/review" state={{ notice: 'Export is locked until a technician acknowledges the reviewed narrative.' }} />;
  }
  return <>{children}</>;
}
