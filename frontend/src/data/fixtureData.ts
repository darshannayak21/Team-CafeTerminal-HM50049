import { DistrictContext, PrototypePriorityItem, PrototypeSettlementItem } from '@/types/operational';
import { HazardAssessment, RiskArea } from '@/types/hazard';

/**
 * PROTOTYPE FIXTURE DATA FOR MILESTONE 1 & 2.
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

/**
 * Prototype Risk Areas across Pune District for Milestone 2.
 * Polygons represent realistic geographic sectors across major river basins and catchment zones.
 */
export const PROTOTYPE_RISK_AREAS: RiskArea[] = [
  {
    id: "RA-PUNE-01",
    name: "Mula-Mutha Confluence Basin",
    taluka: "Haveli",
    riskLevel: "CRITICAL",
    hazardScore: 0.88,
    centroid: [18.5365, 73.8845],
    areaKm2: 34.2,
    summary: "High-density urban riverine corridor vulnerable to backwater inundation and rapid discharge overflow.",
    polygon: [
      [18.562, 73.855],
      [18.558, 73.892],
      [18.535, 73.928],
      [18.515, 73.918],
      [18.512, 73.875],
      [18.530, 73.842],
      [18.562, 73.855]
    ],
    componentScores: {
      rainfall_1h: 0.82,
      rainfall_24h: 0.89,
      rainfall_72h: 0.91,
      terrain_susceptibility: 0.78,
      historical_flood_proximity: 0.96
    },
    evidence: [
      "River confluence confluence bottleneck: Discharge threshold exceeded by 28%",
      "72-hour upstream catchment saturation index at 91%",
      "Historical high-water mark buffer intersects 6 high-density wards",
      "Short-term rainfall intensity elevated at 38.5 mm/h"
    ]
  },
  {
    id: "RA-PUNE-02",
    name: "Khadakwasla Dam Spillway Corridor",
    taluka: "Haveli",
    riskLevel: "HIGH",
    hazardScore: 0.76,
    centroid: [18.452, 73.782],
    areaKm2: 28.6,
    summary: "Downstream discharge corridor subject to rapid rise upon controlled spillway reservoir release.",
    polygon: [
      [18.475, 73.755],
      [18.482, 73.805],
      [18.448, 73.818],
      [18.422, 73.792],
      [18.428, 73.750],
      [18.475, 73.755]
    ],
    componentScores: {
      rainfall_1h: 0.71,
      rainfall_24h: 0.78,
      rainfall_72h: 0.84,
      terrain_susceptibility: 0.69,
      historical_flood_proximity: 0.82
    },
    evidence: [
      "Spillway release advisory in effect (simulated demo indicator)",
      "Low-lying riverbank causeways submerged at 3 transit junctions",
      "24-hour rainfall accumulation in reservoir catchment: 86.4 mm",
      "Soil moisture deficit < 8% indicating immediate runoff generation"
    ]
  },
  {
    id: "RA-PUNE-03",
    name: "Mulshi Catchment & Riverine Valley",
    taluka: "Mulshi",
    riskLevel: "CRITICAL",
    hazardScore: 0.92,
    centroid: [18.515, 73.535],
    areaKm2: 46.8,
    summary: "Steep Western Ghats catchment basin characterized by extreme precipitation and flash runoff risks.",
    polygon: [
      [18.548, 73.492],
      [18.552, 73.568],
      [18.520, 73.578],
      [18.485, 73.555],
      [18.480, 73.505],
      [18.548, 73.492]
    ],
    componentScores: {
      rainfall_1h: 0.94,
      rainfall_24h: 0.92,
      rainfall_72h: 0.96,
      terrain_susceptibility: 0.88,
      historical_flood_proximity: 0.90
    },
    evidence: [
      "Continuous orographic downpour: 1-hour burst recorded at 52.4 mm/h",
      "Steep slope convergence index > 22% in upper escarpment",
      "Culvert overflow on major rural approach route",
      "High probability of localized flash inundation in valley hamlets"
    ]
  },
  {
    id: "RA-PUNE-04",
    name: "Pawana River Basin Inundation Zone",
    taluka: "Maval",
    riskLevel: "MODERATE",
    hazardScore: 0.58,
    centroid: [18.702, 73.735],
    areaKm2: 38.5,
    summary: "Semi-urban lowland plain with moderate drainage capacity and localized water-logging exposure.",
    polygon: [
      [18.730, 73.705],
      [18.735, 73.765],
      [18.695, 73.785],
      [18.670, 73.750],
      [18.675, 73.698],
      [18.730, 73.705]
    ],
    componentScores: {
      rainfall_1h: 0.55,
      rainfall_24h: 0.60,
      rainfall_72h: 0.64,
      terrain_susceptibility: 0.52,
      historical_flood_proximity: 0.62
    },
    evidence: [
      "Moderate intermediate 24h rainfall (44.2 mm) within stormwater design limits",
      "Minor drainage sluggishness reported in low-lying industrial pockets",
      "Pawana river water level 1.4m below critical alert threshold",
      "Road network remains operational with caution advisories"
    ]
  },
  {
    id: "RA-PUNE-05",
    name: "Kukadi River Northern Floodplain",
    taluka: "Junnar",
    riskLevel: "LOW",
    hazardScore: 0.34,
    centroid: [19.195, 73.892],
    areaKm2: 52.1,
    summary: "Broad agricultural floodplain currently displaying baseline hydrological behavior.",
    polygon: [
      [19.230, 73.855],
      [19.235, 73.928],
      [19.185, 73.948],
      [19.160, 73.910],
      [19.168, 73.848],
      [19.230, 73.855]
    ],
    componentScores: {
      rainfall_1h: 0.30,
      rainfall_24h: 0.36,
      rainfall_72h: 0.40,
      terrain_susceptibility: 0.32,
      historical_flood_proximity: 0.35
    },
    evidence: [
      "Rainfall intensity light to moderate (< 12 mm/h)",
      "Channel banks clear with normal sediment transport",
      "Agricultural irrigation reservoirs at 62% storage capacity",
      "No structural or accessibility disruptions observed"
    ]
  }
];

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
