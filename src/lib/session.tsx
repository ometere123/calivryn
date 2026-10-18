import { createContext, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { calculateReport, reportInputSchema, type Analysis, type Metadata, type Narrative, type PointInput } from '../../shared/calibration';
import { analyzeReport } from './api';
import { downloadCsvTemplate, parseCalibrationCsv } from './csv';
import { downloadReportPdf } from './pdf';
import { exampleMetadata, examplePoints, templateCsv } from './sample';

export const blankMetadata: Metadata = {
  client: '', project: '', instrumentId: '', instrumentType: '', technician: '',
  date: new Date().toISOString().slice(0, 10), unit: '', notes: '',
};

export const blankPoint = (index: number): PointInput => ({
  point_id: `P${String(index + 1).padStart(2, '0')}`,
  reference: '', as_found: '', as_left: '', tolerance: '',
});

export const fields = [
  { name: 'client', label: 'Client / company', example: 'e.g. Meridian Technical Services' },
  { name: 'project', label: 'Job / project', example: 'e.g. Pressure transmitter bench check' },
  { name: 'instrumentId', label: 'Instrument ID', example: 'e.g. PT-204' },
  { name: 'instrumentType', label: 'Instrument type', example: 'e.g. Pressure transmitter' },
  { name: 'technician', label: 'Technician', example: 'Full name' },
  { name: 'date', label: 'Service date', example: '' },
  { name: 'unit', label: 'Engineering unit (shared)', example: 'e.g. bar, kPa, V, °C' },
] as const;

export const pointFields = [
  { key: 'point_id', label: 'Point ID' },
  { key: 'reference', label: 'Reference' },
  { key: 'as_found', label: 'As-found' },
  { key: 'as_left', label: 'As-left' },
  { key: 'tolerance', label: '± Tolerance' },
] as const;

function stringifyError(cause: unknown) {
  return cause instanceof Error ? cause.message : 'Unexpected error. Please try again.';
}

type SessionContextValue = {
  metadata: Metadata;
  points: PointInput[];
  sourceName: string;
  isDemo: boolean;
  analysis: Analysis | null;
  edited: Narrative | null;
  approved: boolean;
  loading: boolean;
  error: string;
  exported: boolean;
  input: { metadata: Metadata; points: PointInput[] };
  validation: ReturnType<typeof reportInputSchema.safeParse>;
  calculations: ReturnType<typeof calculateReport> | null;
  issueSummary: string[];
  changeMetadata: (key: keyof Metadata, value: string) => void;
  changePoint: (index: number, key: keyof PointInput, value: string) => void;
  removePoint: (index: number) => void;
  addPoint: () => void;
  importCsv: (file: File | undefined) => Promise<boolean>;
  loadSample: () => void;
  downloadTemplate: () => void;
  requestAnalysis: () => Promise<boolean>;
  patchSummary: (value: string) => void;
  patchObservation: (index: number, value: string) => void;
  patchAction: (index: number, value: string) => void;
  acknowledgeReview: (value: boolean) => void;
  exportPdf: () => boolean;
  startAgain: () => void;
  setErrorMessage: (message: string) => void;
  clearError: () => void;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [metadata, setMetadata] = useState<Metadata>({ ...blankMetadata });
  const [points, setPoints] = useState<PointInput[]>([]);
  const [sourceName, setSourceName] = useState('No CSV selected');
  const [isDemo, setDemo] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [edited, setEdited] = useState<Narrative | null>(null);
  const [approved, setApproved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [exported, setExported] = useState(false);
  const requestVersion = useRef(0);
  const controllerRef = useRef<AbortController | null>(null);
  const input = useMemo(() => ({ metadata, points }), [metadata, points]);
  const validation = useMemo(() => reportInputSchema.safeParse(input), [input]);
  const calculations = useMemo(() => validation.success ? calculateReport(validation.data) : null, [validation]);
  const issueSummary = !validation.success
    ? validation.error.issues.slice(0, 5).map(issue => `${issue.path.join('.') || 'report'}: ${issue.message}`)
    : [];

  function invalidate() {
    requestVersion.current += 1;
    controllerRef.current?.abort();
    controllerRef.current = null;
    setLoading(false);
    setAnalysis(null);
    setEdited(null);
    setApproved(false);
    setExported(false);
    setError('');
  }

  function changeMetadata(key: keyof Metadata, value: string) {
    invalidate();
    setMetadata(previous => ({ ...previous, [key]: value }));
  }

  function changePoint(index: number, key: keyof PointInput, value: string) {
    invalidate();
    setPoints(previous => previous.map((row, rowIndex) => rowIndex === index ? { ...row, [key]: value } : row));
  }

  function removePoint(index: number) {
    invalidate();
    setPoints(previous => previous.filter((_, rowIndex) => rowIndex !== index));
  }

  function addPoint() {
    invalidate();
    setPoints(previous => [...previous, blankPoint(previous.length)]);
  }

  async function importCsv(file: File | undefined) {
    if (!file) return false;
    try {
      const imported = await parseCalibrationCsv(file);
      invalidate();
      setPoints(imported);
      setSourceName(file.name);
      setDemo(false);
      return true;
    } catch (cause) {
      setError(stringifyError(cause));
      return false;
    }
  }

  function loadSample() {
    invalidate();
    setMetadata({ ...exampleMetadata });
    setPoints(examplePoints.map(row => ({ ...row })));
    setSourceName('synthetic-demonstration.csv');
    setDemo(true);
  }

  async function requestAnalysis() {
    if (!validation.success || loading) return false;
    const version = ++requestVersion.current;
    const controller = new AbortController();
    controllerRef.current = controller;
    setError('');
    setLoading(true);
    setAnalysis(null);
    setEdited(null);
    setApproved(false);
    try {
      const result = await analyzeReport(validation.data, controller.signal);
      if (requestVersion.current !== version) return false;
      const calculatedAgain = calculateReport(validation.data);
      if (JSON.stringify(result.calculation) !== JSON.stringify(calculatedAgain)) {
        throw new Error('Server/client measurement results disagree. Do not export this report.');
      }
      setAnalysis(result);
      setEdited(structuredClone(result.narrative));
      return true;
    } catch (cause) {
      if (requestVersion.current === version && !(cause instanceof DOMException && cause.name === 'AbortError')) {
        setError(stringifyError(cause));
      }
      return false;
    } finally {
      if (requestVersion.current === version) {
        controllerRef.current = null;
        setLoading(false);
      }
    }
  }

  function patchSummary(value: string) {
    setEdited(previous => previous ? { ...previous, summary: value } : previous);
    setApproved(false);
    setExported(false);
  }

  function patchObservation(index: number, value: string) {
    setEdited(previous => previous ? {
      ...previous,
      observations: previous.observations.map((entry, entryIndex) => entryIndex === index ? { ...entry, text: value } : entry),
    } : previous);
    setApproved(false);
    setExported(false);
  }

  function patchAction(index: number, value: string) {
    setEdited(previous => previous ? {
      ...previous,
      reviewItems: previous.reviewItems.map((entry, entryIndex) => entryIndex === index ? { ...entry, action: value } : entry),
    } : previous);
    setApproved(false);
    setExported(false);
  }

  function exportPdf() {
    if (!validation.success || !analysis || !edited) return false;
    try {
      downloadReportPdf(validation.data, analysis, edited, approved);
      setExported(true);
      setError('');
      return true;
    } catch (cause) {
      setError(stringifyError(cause));
      return false;
    }
  }

  function startAgain() {
    invalidate();
    setMetadata({ ...blankMetadata });
    setPoints([]);
    setSourceName('No CSV selected');
    setDemo(false);
  }

  const value: SessionContextValue = {
    metadata, points, sourceName, isDemo, analysis, edited, approved, loading, error, exported,
    input, validation, calculations, issueSummary,
    changeMetadata, changePoint, removePoint, addPoint, importCsv, loadSample,
    downloadTemplate: () => downloadCsvTemplate(templateCsv), requestAnalysis,
    patchSummary, patchObservation, patchAction, acknowledgeReview: setApproved,
    exportPdf, startAgain, setErrorMessage: setError, clearError: () => setError(''),
  };

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession must be used inside SessionProvider');
  return value;
}
