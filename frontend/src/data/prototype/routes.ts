import { RouteOption } from '@/types/prototype';

export const PROTOTYPE_ROUTES: RouteOption[] = [
  {
    id: 'pune-mulshi',
    fromName: 'Pune City',
    toName: 'Mulshi (Paud)',
    fromCoords: [18.5204, 73.8567],
    toCoords: [18.532, 73.612],
    distanceKm: 42.8,
    durationMinutes: 78, // ~1h 18m
    atRiskSegmentsCount: 2,
    disruptedSegmentsAvoidedCount: 1,
    routeSummary: 'Via Chandani Chowk → Lavale Link Road → bypasses Pirangut flooded bridge',
    waypoints: [
      [18.5204, 73.8567], // Pune Swargate / Central
      [18.5085, 73.8115], // Kothrud
      [18.5060, 73.7845], // Chandani Chowk
      [18.5170, 73.7420], // Bhugaon High Ground
      [18.5430, 73.7150], // Lavale Bypass (avoids Mutha River low bridge)
      [18.5480, 73.6650], // Kasar Amboli
      [18.5320, 73.6120]  // Paud (Mulshi Center)
    ]
  },
  {
    id: 'pune-maval',
    fromName: 'Pune City',
    toName: 'Maval (Talegaon)',
    fromCoords: [18.5204, 73.8567],
    toCoords: [18.730, 73.675],
    distanceKm: 38.4,
    durationMinutes: 62, // ~1h 02m
    atRiskSegmentsCount: 1,
    disruptedSegmentsAvoidedCount: 1,
    routeSummary: 'Via Wakad → Dehu Road bypass → avoids low-elevation Kamshet underpass',
    waypoints: [
      [18.5204, 73.8567], // Pune
      [18.5980, 73.7630], // Wakad
      [18.6650, 73.7220], // Dehu Road
      [18.7120, 73.6980], // Somatane Toll
      [18.7300, 73.6750]  // Talegaon (Maval)
    ]
  },
  {
    id: 'pune-khed',
    fromName: 'Pune City',
    toName: 'Khed (Rajgurunagar)',
    fromCoords: [18.5204, 73.8567],
    toCoords: [18.861, 73.918],
    distanceKm: 46.2,
    durationMinutes: 84, // ~1h 24m
    atRiskSegmentsCount: 3,
    disruptedSegmentsAvoidedCount: 1,
    routeSummary: 'Via Bhosari → Chakan Ring Bypass → avoids flooded MIDC culvert sector',
    waypoints: [
      [18.5204, 73.8567],
      [18.6180, 73.8420], // Bhosari
      [18.7200, 73.8480], // Moshi
      [18.7850, 73.8820], // Chakan Outer Link
      [18.8610, 73.9180]  // Rajgurunagar (Khed)
    ]
  },
  {
    id: 'mulshi-maval',
    fromName: 'Mulshi (Paud)',
    toName: 'Maval (Lonavala)',
    fromCoords: [18.532, 73.612],
    toCoords: [18.755, 73.408],
    distanceKm: 49.5,
    durationMinutes: 95,
    atRiskSegmentsCount: 3,
    disruptedSegmentsAvoidedCount: 2,
    routeSummary: 'Via Paud North Ridge → Kolwan Valley → Lonavala East flank',
    waypoints: [
      [18.532, 73.612],
      [18.582, 73.590],
      [18.648, 73.535],
      [18.710, 73.465],
      [18.755, 73.408]
    ]
  }
];

export const PREDEFINED_LOCATIONS = [
  { id: 'pune', name: 'Pune City' },
  { id: 'mulshi', name: 'Mulshi (Paud)' },
  { id: 'maval', name: 'Maval (Talegaon)' },
  { id: 'khed', name: 'Khed (Rajgurunagar)' },
  { id: 'haveli', name: 'Haveli' },
  { id: 'baramati', name: 'Baramati' }
];
