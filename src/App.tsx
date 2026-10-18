import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import './styles.css';
import './multipage.css';
import { SessionProvider } from './lib/session';
import WorkspaceShell from './components/site/WorkspaceShell';
import { StageGuard } from './components/site/RouteGuard';
import HomePage from './pages/HomePage';
import MethodologyPage from './pages/MethodologyPage';
import CapturePage from './pages/workspace/CapturePage';
import VerifyPage from './pages/workspace/VerifyPage';
import AnalysePage from './pages/workspace/AnalysePage';
import ReviewPage from './pages/workspace/ReviewPage';
import ExportPage from './pages/workspace/ExportPage';

export default function App() {
  return <BrowserRouter>
    <SessionProvider>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/methodology" element={<MethodologyPage />} />
        <Route path="/app" element={<WorkspaceShell />}>
          <Route index element={<Navigate replace to="/app/capture" />} />
          <Route path="capture" element={<CapturePage />} />
          <Route path="verify" element={<StageGuard stage="verify"><VerifyPage /></StageGuard>} />
          <Route path="analyse" element={<StageGuard stage="analyse"><AnalysePage /></StageGuard>} />
          <Route path="review" element={<StageGuard stage="review"><ReviewPage /></StageGuard>} />
          <Route path="export" element={<StageGuard stage="export"><ExportPage /></StageGuard>} />
        </Route>
      </Routes>
    </SessionProvider>
  </BrowserRouter>;
}
