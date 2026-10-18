import type { Metadata, PointInput } from '../../shared/calibration';

export const exampleMetadata: Metadata = {
  client: 'Harbour Industrial Services (fictional)',
  project: 'Pressure transmitter service — synthetic demonstration',
  instrumentId: 'PT-204-DEMO',
  instrumentType: 'Pressure transmitter',
  technician: 'Demo technician',
  date: '2026-10-18',
  unit: 'bar',
  notes: 'Synthetic training dataset only. Device was inspected during a simulated bench check. Sensor appeared stable after a notional span adjustment. No actual instrument was used and no compliance claim is made.',
};

export const examplePoints: PointInput[] = [
  { point_id: 'P00', reference: '0', as_found: '0.11', as_left: '0.01', tolerance: '0.05' },
  { point_id: 'P25', reference: '2.5', as_found: '2.59', as_left: '2.52', tolerance: '0.05' },
  { point_id: 'P50', reference: '5', as_found: '5.06', as_left: '5.01', tolerance: '0.05' },
  { point_id: 'P75', reference: '7.5', as_found: '7.52', as_left: '7.50', tolerance: '0.05' },
  { point_id: 'P100', reference: '10', as_found: '9.92', as_left: '9.98', tolerance: '0.05' },
];

export const templateCsv = 'point_id,reference,as_found,as_left,tolerance\nP00,0,0.02,0.01,0.05\nP50,5,5.03,5.01,0.05\nP100,10,9.96,9.99,0.05\n';
