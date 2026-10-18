import Papa from 'papaparse';
import { MAX_CSV_BYTES, MAX_POINTS, pointSchema, REQUIRED_CSV_HEADERS, type PointInput } from '../../shared/calibration';

export async function parseCalibrationCsv(file: File): Promise<PointInput[]> {
  if (file.size > MAX_CSV_BYTES) throw new Error('CSV exceeds the 30 KB limit');
  if (file.size === 0) throw new Error('CSV file is empty');
  const text = await file.text();
  // PapaParse works with quoting/CRLF. Reject extra fields and every parse error.
  const parsed = Papa.parse<Record<string, string>>(text.replace(/^\uFEFF/, ''), {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (header: string) => header.trim(),
    dynamicTyping: false,
  });
  if (parsed.errors.length) throw new Error(`CSV error on row ${parsed.errors[0].row + 2}: ${parsed.errors[0].message}`);
  const headers = parsed.meta.fields ?? [];
  if (new Set(headers).size !== headers.length || headers.length !== REQUIRED_CSV_HEADERS.length ||
      !REQUIRED_CSV_HEADERS.every(header => headers.includes(header))) {
    throw new Error(`CSV headers must be exactly: ${REQUIRED_CSV_HEADERS.join(', ')}`);
  }
  if (parsed.data.length < 1 || parsed.data.length > MAX_POINTS) {
    throw new Error(`CSV must contain between 1 and ${MAX_POINTS} readings`);
  }
  return parsed.data.map((row, index) => {
    const result = pointSchema.safeParse(row);
    if (!result.success) throw new Error(`CSV row ${index + 2}: ${result.error.issues[0].path.join('.')}: ${result.error.issues[0].message}`);
    return result.data;
  });
}

export function downloadCsvTemplate(content: string) {
  const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'calivryn-template.csv';
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
