import { TalukaDistrict } from '@/types/prototype';

export const PROTOTYPE_DISTRICTS: TalukaDistrict[] = [
  {
    id: 'mulshi',
    name: 'Mulshi',
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
      { factor: 'Environmental data', rating: 'Strong', detail: 'High-frequency telemetry from Tamhini automatic weather stations' },
      { factor: 'Historical evidence', rating: 'Moderate', detail: '2019 & 2021 ghat flash flood inundation records' },
      { factor: 'Ground reports', rating: 'Strong', detail: '14 confirmed local panchayat & citizen reports in past 90 mins' },
      { factor: 'Source agreement', rating: 'High', detail: 'Consistent sensor, satellite, and crowdsourced alert correlation' }
    ],
    evidence: [
      'High 1h rainfall (42 mm/hr convective downpour)',
      'High 24h accumulation exceeding ghat threshold (138 mm)',
      'High 72h accumulation saturation index (214 mm)',
      'High terrain susceptibility (steep western ghat slopes & runoff)',
      'Historical flood proximity (Mula River headwater surge corridor)'
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
    id: 'maval',
    name: 'Maval',
    riskLevel: 'HIGH',
    hazardScore: 0.74,
    rank: 2,
    affectedPopulation: 12800,
    atRiskRoadsCount: 4,
    disruptedRoadsCount: 1,
    rainfall1h: 28,
    rainfall24h: 104,
    rainfall72h: 168,
    terrainSusceptibility: 0.76,
    historicalFloodProximity: 0.65,
    confidence: 78,
    confidenceFactors: [
      { factor: 'Environmental data', rating: 'Strong', detail: 'Indrayani river gauge network reporting rapid elevation' },
      { factor: 'Historical evidence', rating: 'High', detail: 'Documented Lonavala-Talegaon reservoir spillback points' },
      { factor: 'Ground reports', rating: 'Moderate', detail: '6 field verification submissions logged' },
      { factor: 'Source agreement', rating: 'High', detail: 'IMD radar echo alignment with Indrayani sub-basin' }
    ],
    evidence: [
      'Elevated 1h rainfall rate (28 mm/hr)',
      'High 24h catchment inflow into Indrayani basin (104 mm)',
      'Steep sub-basin elevation gradient promoting rapid flash runoff',
      'Historical highway underpass chokepoints verified at risk'
    ],
    centerCoordinates: [18.750, 73.680],
    zoomLevel: 12,
    polygonCoordinates: [
      [18.84, 73.52],
      [18.85, 73.75],
      [18.72, 73.80],
      [18.66, 73.62],
      [18.71, 73.48]
    ]
  },
  {
    id: 'khed',
    name: 'Khed',
    riskLevel: 'HIGH',
    hazardScore: 0.68,
    rank: 3,
    affectedPopulation: 9600,
    atRiskRoadsCount: 3,
    disruptedRoadsCount: 1,
    rainfall1h: 22,
    rainfall24h: 88,
    rainfall72h: 142,
    terrainSusceptibility: 0.62,
    historicalFloodProximity: 0.58,
    confidence: 74,
    confidenceFactors: [
      { factor: 'Environmental data', rating: 'Moderate', detail: 'Bhima river tributary stage telemetry updating hourly' },
      { factor: 'Historical evidence', rating: 'Moderate', detail: 'Chakan low-lying industrial buffer spill risk history' },
      { factor: 'Ground reports', rating: 'Moderate', detail: '4 field team submissions verified by tehsil office' },
      { factor: 'Source agreement', rating: 'Moderate', detail: 'Radar rainfall model matches observed river gauges' }
    ],
    evidence: [
      'Sustained 24h rainfall over upper Bhima basin (88 mm)',
      'Saturated soil retention moisture index exceeding 78%',
      'Chakan bypass low-lying drainage backflow risk',
      'Downstream discharge alert from Chasakakar reservoir outflow'
    ],
    centerCoordinates: [18.850, 73.910],
    zoomLevel: 12,
    polygonCoordinates: [
      [18.96, 73.78],
      [18.98, 74.02],
      [18.80, 74.08],
      [18.74, 73.88],
      [18.82, 73.75]
    ]
  },
  {
    id: 'haveli',
    name: 'Haveli',
    riskLevel: 'MODERATE',
    hazardScore: 0.49,
    rank: 4,
    affectedPopulation: 6200,
    atRiskRoadsCount: 2,
    disruptedRoadsCount: 0,
    rainfall1h: 14,
    rainfall24h: 56,
    rainfall72h: 89,
    terrainSusceptibility: 0.45,
    historicalFloodProximity: 0.52,
    confidence: 86,
    confidenceFactors: [
      { factor: 'Environmental data', rating: 'Strong', detail: 'Dense municipal automated weather network coverage' },
      { factor: 'Historical evidence', rating: 'Strong', detail: 'Urban drainage and Mutha river discharge historical database' },
      { factor: 'Ground reports', rating: 'Strong', detail: 'High citizen reporting density with geolocated photos' },
      { factor: 'Source agreement', rating: 'High', detail: 'Consensus across civil sensors and automated hydrologic models' }
    ],
    evidence: [
      'Moderate localized rainband (14 mm in past hour)',
      'Stormwater canal capacity under watch near Sinhagad Road',
      'Moderate 24h accumulation with controlled Khadakwasla dam releases'
    ],
    centerCoordinates: [18.470, 73.850],
    zoomLevel: 11,
    polygonCoordinates: [
      [18.58, 73.76],
      [18.59, 73.98],
      [18.38, 74.02],
      [18.36, 73.78]
    ]
  },
  {
    id: 'baramati',
    name: 'Baramati',
    riskLevel: 'LOW',
    hazardScore: 0.21,
    rank: 5,
    affectedPopulation: 1100,
    atRiskRoadsCount: 1,
    disruptedRoadsCount: 0,
    rainfall1h: 4,
    rainfall24h: 19,
    rainfall72h: 34,
    terrainSusceptibility: 0.24,
    historicalFloodProximity: 0.28,
    confidence: 80,
    confidenceFactors: [
      { factor: 'Environmental data', rating: 'Strong', detail: 'Sub-divisional meteorological stations operational' },
      { factor: 'Historical evidence', rating: 'Moderate', detail: 'Karha basin seasonal channel historical metrics' },
      { factor: 'Ground reports', rating: 'Low', detail: 'Minimal incident activity reported' },
      { factor: 'Source agreement', rating: 'High', detail: 'Clear conditions confirmed by multi-sensor radar' }
    ],
    evidence: [
      'Low precipitation index (19 mm in 24h)',
      'Normal reservoir stage across local canals',
      'Road network fully accessible without structural risks'
    ],
    centerCoordinates: [18.150, 74.580],
    zoomLevel: 11,
    polygonCoordinates: [
      [18.30, 74.40],
      [18.32, 74.75],
      [18.02, 74.78],
      [18.00, 74.42]
    ]
  }
];
