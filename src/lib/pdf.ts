import { jsPDF } from 'jspdf';
import { calculateReport, DISCLAIMER, MODEL_ID, validateNarrative, type Analysis, type Narrative, type ReportInput } from '../../shared/calibration';

const PAGE_W = 210;
const LEFT = 17;
const RIGHT = 193;
const WIDTH = RIGHT - LEFT;
const BOTTOM = 278;
const INK: [number, number, number] = [19, 45, 52];
const MUTED: [number, number, number] = [94, 111, 117];
const GREEN: [number, number, number] = [47, 123, 91];
const RED: [number, number, number] = [178, 76, 59];

export function createReportPdf(input: ReportInput, analysis: Analysis, editable: Narrative, approved: boolean): jsPDF {
  if (!approved) throw new Error('Technician review acknowledgement is required');
  const authoritative = calculateReport(input);
  if (JSON.stringify(authoritative) !== JSON.stringify(analysis.calculation)) {
    throw new Error('Measurement data changed after analysis; rerun the analysis');
  }
  if (analysis.model !== MODEL_ID) throw new Error('The expected live model result is missing');
  const narrative = validateNarrative(editable, authoritative.rows);
  const pdf = new jsPDF({ format: 'a4', unit: 'mm', compress: true });
  let y = 24;

  function pageHeading() {
    pdf.setFillColor(...INK);
    pdf.rect(0, 0, PAGE_W, 15, 'F');
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(9);
    pdf.setTextColor(226, 242, 220); pdf.text('CALIVRYN', LEFT, 9.8);
    pdf.setFont('helvetica', 'normal'); pdf.setTextColor(255, 255, 255);
    pdf.text('EVIDENCE-LED SERVICE REPORT', RIGHT, 9.8, { align: 'right' });
    y = 24;
  }
  function ensure(space: number) {
    if (y + space > BOTTOM) { pdf.addPage(); pageHeading(); }
  }
  function heading(text: string) {
    ensure(16);
    y += 4;
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(11.5); pdf.setTextColor(...INK);
    pdf.text(text.toUpperCase(), LEFT, y); y += 3;
    pdf.setDrawColor(214, 226, 224); pdf.line(LEFT, y, RIGHT, y); y += 6;
  }
  function paragraph(text: string, size = 9, color = INK) {
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(size); pdf.setTextColor(...color);
    const lines = pdf.splitTextToSize(text || 'Not provided.', WIDTH) as string[];
    const height = size * 0.44 + 2.0;
    for (const line of lines) { ensure(height + 1); pdf.text(line, LEFT, y); y += height; }
    y += 2;
  }
  pageHeading();
  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(22); pdf.setTextColor(...INK);
  pdf.text('Calibration service report', LEFT, y + 3); y += 14;
  pdf.setFont('helvetica', 'normal'); pdf.setFontSize(9); pdf.setTextColor(...MUTED);
  pdf.text('AI-assisted interpretation  /  Deterministic tolerance checks  /  Technician-reviewed', LEFT, y); y += 10;

  heading('Instrument and job context');
  paragraph(`Client: ${input.metadata.client}  |  Project: ${input.metadata.project}`);
  paragraph(`Instrument: ${input.metadata.instrumentId}  |  Type: ${input.metadata.instrumentType}`);
  paragraph(`Technician: ${input.metadata.technician}  |  Service date: ${input.metadata.date}`);
  paragraph(`Engineering unit (common): ${input.metadata.unit}  |  Measurement points: ${authoritative.count}`);

  heading('Tolerance assessment');
  const resultText = `As-found: ${authoritative.as_found_passed}/${authoritative.count} inside supplied tolerance (${authoritative.as_found_overall}). As-left: ${authoritative.as_left_passed}/${authoritative.count} inside supplied tolerance (${authoritative.as_left_overall}). Improved: ${authoritative.improved}; unchanged: ${authoritative.unchanged}; deteriorated: ${authoritative.deteriorated}.`;
  paragraph(resultText);
  paragraph('Acceptance basis: absolute measured-minus-reference error <= the positive per-point, technician-supplied tolerance. This is not an accredited uncertainty or conformance determination.', 8, MUTED);

  heading('Measurements and computed deviations');
  // Full-precision values are never truncated, rounded or silently hidden in this report.
  for (const [index, point] of authoritative.rows.entries()) {
    ensure(24);
    if (index % 2 === 0) { pdf.setFillColor(247, 250, 247); pdf.roundedRect(LEFT, y - 5, WIDTH, 20.5, 2, 2, 'F'); }
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(8.3); pdf.setTextColor(...INK);
    pdf.text(`POINT ${point.point_id}  |  Reference ${point.reference} ${input.metadata.unit}  |  Tolerance +/- ${point.tolerance} ${input.metadata.unit}`, LEFT + 3, y);
    y += 6;
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8); pdf.setTextColor(...(point.as_found_pass ? GREEN : RED));
    pdf.text(`FOUND   ${point.as_found} ${input.metadata.unit}   |   signed error ${point.as_found_error}   |   ${point.as_found_pass ? 'WITHIN' : 'OUTSIDE'} tolerance`, LEFT + 3, y);
    y += 5.5;
    pdf.setTextColor(...(point.as_left_pass ? GREEN : RED));
    pdf.text(`LEFT        ${point.as_left} ${input.metadata.unit}   |   signed error ${point.as_left_error}   |   ${point.as_left_pass ? 'WITHIN' : 'OUTSIDE'} tolerance`, LEFT + 3, y);
    y += 10;
  }
  paragraph('Each error is measurement minus reference; absolute error is compared to the per-point absolute tolerance. All values are printed as entered or calculated, without rounding. No uncertainty or traceability claim is made.', 7.7, MUTED);

  heading('AI-assisted summary (technician reviewed)');
  paragraph(narrative.summary);
  heading('Evidence-linked observations');
  for (const item of narrative.observations) paragraph(`[${item.pointIds.join(', ')}] ${item.text}`);
  heading('Recommended technician checks');
  for (const item of narrative.reviewItems) paragraph(`[${item.pointIds.join(', ')}] ${item.action}`);
  heading('Original technician field notes (unverified)');
  paragraph(input.metadata.notes.trim() || 'No technician notes were provided.');
  heading('Provenance and sign-off');
  paragraph(`Deterministic arithmetic: decimal.js (client preview and independently recalculated server-side). AI provider: Cloudflare Workers AI. Model: ${MODEL_ID}. AI narrative reviewed and acknowledged by the operator prior to export.`);
  paragraph(`Generated: ${analysis.generatedAt}. PDF exported: ${new Date().toISOString()}. Technician identified in report: ${input.metadata.technician}. Acknowledgement is not a cryptographic signature or accreditation.`);
  heading('Important limitations');
  paragraph(DISCLAIMER, 8, RED);

  const pages = pdf.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    pdf.setPage(page);
    pdf.setDrawColor(214, 226, 224); pdf.line(LEFT, 285, RIGHT, 285);
    pdf.setFontSize(7); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(...MUTED);
    pdf.text('CALIVRYN  /  INTERNAL SERVICE REPORT PREPARATION  /  NOT AN ACCREDITED CERTIFICATE', LEFT, 290);
    pdf.text(`${page} / ${pages}`, RIGHT, 290, { align: 'right' });
  }
  return pdf;
}

export function downloadReportPdf(input: ReportInput, analysis: Analysis, narrative: Narrative, approved: boolean): void {
  const document = createReportPdf(input, analysis, narrative, approved);
  const slug = input.metadata.instrumentId.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 48);
  document.save(`calivryn-${slug}-${input.metadata.date}.pdf`);
}
