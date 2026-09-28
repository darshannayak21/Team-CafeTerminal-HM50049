import { TalukaDistrict } from '@/types/prototype';

export const PROTOTYPE_DISTRICTS: TalukaDistrict[] = [
  {
    id: 'mulshi',
    name: 'Mulshi Catchment',
    riskLevel: 'CRITICAL',
    hazardScore: 0.86,
    rank: 1,
    affectedPopulation: 18400,
    atRiskRoadsCount: 5,
    disruptedRoadsCount: 3,
    rainfall1h: 42,
    rainfall24h: 138,
    rainfall72h: 214,
    terrainSusceptibility: 0.81,
    historicalFloodProximity: 0.74,
    confidence: 82,
    confidenceFactors: [
      { factor: 'Environmental data', rating: 'Strong', detail: 'High-frequency telemetry from Tamhini' },
      { factor: 'Ground reports', rating: 'Strong', detail: '14 confirmed local reports in past 90 mins' }
    ],
    evidence: [
      'High 1h rainfall (42 mm/hr convective downpour)',
      'High terrain susceptibility (steep western ghat slopes)'
    ],
    centerCoordinates: [18.528, 73.518],
    zoomLevel: 12,
    polygonCoordinates: [
      [18.63, 73.40],
      [18.65, 73.57],
      [18.55, 73.65],
      [18.44, 73.58],
      [18.42, 73.43],
      [18.52, 73.38]
    ]
  },
  {
    id: 'kothrud',
    name: 'Kothrud Urban Basin',
    riskLevel: 'HIGH',
    hazardScore: 0.74,
    rank: 2,
    affectedPopulation: 12500,
    atRiskRoadsCount: 2,
    disruptedRoadsCount: 1,
    rainfall1h: 28,
    rainfall24h: 104,
    rainfall72h: 168,
    terrainSusceptibility: 0.65,
    historicalFloodProximity: 0.85,
    confidence: 88,
    confidenceFactors: [
      { factor: 'Urban Drainage', rating: 'Strong', detail: 'Stormwater capacity exceeded' }
    ],
    evidence: [
      'Elevated 1h rainfall rate (28 mm/hr)',
      'Historical underpass chokepoints verified at risk'
    ],
    centerCoordinates: [18.5074, 73.8197],
    zoomLevel: 13,
    polygonCoordinates: [
      [18.52, 73.80],
      [18.52, 73.83],
      [18.49, 73.83],
      [18.49, 73.80]
    ]
  }
];
