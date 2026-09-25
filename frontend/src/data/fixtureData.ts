import { DistrictContext, PrototypePriorityItem, PrototypeSettlementItem } from '@/types/operational';
import { HazardAssessment } from '@/types/hazard';

/**
 * PROTOTYPE FIXTURE DATA FOR MILESTONE 1 FOUNDATION.
 *
 * NOTE: This data is explicitly flagged as prototype/demonstration fixtures.
 * It is not connected to a live backend API and does not represent live emergency dispatches.
 */

export const IS_PROTOTYPE_MODE = true;
export const PROTOTYPE_NOTICE = "PROTOTYPE FIXTURE DATA — NOT LIVE OPERATIONAL FEED";

export const PUNE_DISTRICT_CONTEXT: DistrictContext = {
  districtName: "Pune District",
  state: "Maharashtra",
  incidentType: "Monsoon Flood & Inundation Risk",
  center: {
    lat: 18.5204,
    lon: 73.8567,
    label: "Pune District HQ (Haveli)"
  },
  bounds: {
    north: 19.38,
    south: 18.05,
    east: 75.17,
    west: 73.32
  },
  talukas: [
    "All Talukas",
    "Haveli",
    "Mulshi",
    "Maval",
    "Junnar",
    "Khed",
    "Ambegaon",
    "Shirur",
    "Daund",
    "Indapur",
    "Baramati",
    "Purandar",
    "Bhor",
    "Velhe"
  ]
};

export const PROTOTYPE_HAZARD_ASSESSMENT: HazardAssessment = {
  hazardScore: 0.74,
  riskLevel: 'HIGH',
  evaluatedAt: "2026-09-25T07:15:00Z",
  evidence: [
    "72h cumulative precipitation exceeds regional absorption baseline (>110mm)",
    "Short-term convective rainfall burst detected (34.2 mm/h)",
    "Elevated terrain slope runoff converging toward lower riverine basin",
    "Proximity index < 1.8km to known historical flood inundation channel"
  ],
  componentScores: {
    rainfall_1h: 0.68,
    rainfall_24h: 0.72,
    rainfall_72h: 0.81,
    terrain_susceptibility: 0.65,
    historical_flood_proximity: 0.85
  }
};

export const PROTOTYPE_SETTLEMENT_SAMPLES: PrototypeSettlementItem[] = [
  {
    id: "SET-01",
    name: "Mulshi Downstream Basin",
    taluka: "Mulshi",
    riskLevel: 'CRITICAL',
    estimatedPopulation: 4200,
    accessStatus: 'AT_RISK',
    note: "Demo record: Culvert water levels rising near secondary access road."
  },
  {
    id: "SET-02",
    name: "Maval Lowland Hamlet",
    taluka: "Maval",
    riskLevel: 'HIGH',
    estimatedPopulation: 2750,
    accessStatus: 'ISOLATED',
    note: "Demo record: Primary approach causeway submerged under 0.6m overflow."
  },
  {
    id: "SET-03",
    name: "Haveli Riverside Ward 4",
    taluka: "Haveli",
    riskLevel: 'MODERATE',
    estimatedPopulation: 14800,
    accessStatus: 'ACCESSIBLE',
    note: "Demo record: Embankment holding; drainage operating within threshold."
  }
];

export const PROTOTYPE_PRIORITY_SAMPLES: PrototypePriorityItem[] = [
  {
    rank: 1,
    settlementName: "Maval Lowland Hamlet",
    taluka: "Maval",
    priorityScore: 0.88,
    riskLevel: 'HIGH',
    accessStatus: 'ISOLATED',
    primaryRationale: "Isolation factor: Access road cutoff combined with high hazard score."
  },
  {
    rank: 2,
    settlementName: "Mulshi Downstream Basin",
    taluka: "Mulshi",
    priorityScore: 0.82,
    riskLevel: 'CRITICAL',
    accessStatus: 'AT_RISK',
    primaryRationale: "Exposure factor: Critical terrain runoff convergence into inhabited zone."
  },
  {
    rank: 3,
    settlementName: "Haveli Riverside Ward 4",
    taluka: "Haveli",
    priorityScore: 0.49,
    riskLevel: 'MODERATE',
    accessStatus: 'ACCESSIBLE',
    primaryRationale: "Monitoring status: Roadways open; perimeter inspection scheduled."
  }
];
