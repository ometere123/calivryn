import { describe, expect, it } from 'vitest';
import { parseCalibrationCsv } from '../src/lib/csv';

function csvFile(text: string, name = 'readings.csv'): File {
  return new File([text], name, { type: 'text/csv' });
}

describe('CSV input handling', () => {
  it('accepts the required fields in any column order and preserves decimal strings', async () => {
    const points = await parseCalibrationCsv(csvFile(' tolerance ,as_left,point_id,reference,as_found\n0.00000001,0.00000000,TINY,-0.00000001,0.00000000\n'));
    expect(points).toEqual([{ tolerance: '0.00000001', as_left: '0.00000000', point_id: 'TINY', reference: '-0.00000001', as_found: '0.00000000' }]);
  });

  it('rejects wrong headers, duplicate IDs and rows outside 1–40', async () => {
    await expect(parseCalibrationCsv(csvFile('point_id,reference,as_found,as_left,tolerance,extra\nA,0,0,0,1,x\n'))).rejects.toThrow(/headers must be exactly/i);
    await expect(parseCalibrationCsv(csvFile('point_id,reference,as_found,as_left,tolerance\nA,0,0,0,1\na,1,1,1,1\n'))).rejects.toThrow(/duplicate point id/i);
    const rows = Array.from({ length: 41 }, (_, index) => `P${index},${index},${index},${index},1`).join('\n');
    await expect(parseCalibrationCsv(csvFile(`point_id,reference,as_found,as_left,tolerance\n${rows}\n`))).rejects.toThrow(/between 1 and 40/i);
  });

  it('rejects blank, scientific, non-finite and non-positive values', async () => {
    for (const row of ['A,,0,0,1', 'A,0,1e-3,0,1', 'A,0,NaN,0,1', 'A,0,0,0,0', 'A,0,0,0,-1']) {
      await expect(parseCalibrationCsv(csvFile(`point_id,reference,as_found,as_left,tolerance\n${row}\n`))).rejects.toThrow(/row 2/i);
    }
  });
});
