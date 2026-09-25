import { DistrictContext, PrototypePriorityItem, PrototypeSettlementItem } from '@/types/operational';
import { HazardAssessment, RiskArea } from '@/types/hazard';
import { AffectedSettlement } from '@/types/settlement';
import { RoadRiskItem } from '@/types/road';
import { ResponsePriorityItem } from '@/types/priority';

/**
 * PROTOTYPE FIXTURE DATA — MILESTONES 1, 2, 3 & 4.
 *
 * NOTE: All values are explicitly fictional/demo fixture data.
 * This data is NOT connected to a live backend API.
 * It does NOT represent verified real-world statistics or live emergency dispatches.
 */

export const IS_PROTOTYPE_MODE = true;
export const PROTOTYPE_NOTICE = 'PROTOTYPE FIXTURE DATA — NOT LIVE OPERATIONAL FEED';

export const PUNE_DISTRICT_CONTEXT: DistrictContext = {
  districtName: 'Pune District',
  state: 'Maharashtra',
  incidentType: 'Monsoon Flood & Inundation Risk',
  center: {
    lat: 18.5204,
    lon: 73.8567,
    label: 'Pune District HQ (Haveli)',
  },
  bounds: {
    north: 19.38,
    south: 18.05,
    east: 75.17,
    west: 73.32,
  },
  talukas: [
    'All Talukas',
    'Haveli',
    'Mulshi',
    'Maval',
    'Junnar',
    'Indapur',
    'Khed',
    'Ambegaon',
    'Shirur',
    'Daund',
    'Baramati',
    'Purandar',
    'Bhor',
    'Velhe',
  ],
};

export const PROTOTYPE_HAZARD_ASSESSMENT: HazardAssessment = {
  hazardScore: 0.74,
  riskLevel: 'HIGH',
  evaluatedAt: '2026-09-25T07:15:00Z',
  evidence: [
    '72h cumulative precipitation exceeds regional absorption baseline (>110mm)',
    'Short-term convective rainfall burst detected (34.2 mm/h)',
    'Elevated terrain slope runoff converging toward lower riverine basin',
    'Proximity index < 1.8km to known historical flood inundation channel',
  ],
  componentScores: {
    rainfall_1h: 0.68,
    rainfall_24h: 0.72,
    rainfall_72h: 0.81,
    terrain_susceptibility: 0.65,
    historical_flood_proximity: 0.85,
  },
};

/**
 * Prototype Risk Areas — Milestones 2 & 4
 */
export const PROTOTYPE_RISK_AREAS: RiskArea[] = [
  {
    id: 'RA-PUNE-01',
    name: 'Mula-Mutha Confluence Basin',
    taluka: 'Haveli',
    riskLevel: 'CRITICAL',
    hazardScore: 0.88,
    centroid: [18.5365, 73.8845],
    areaKm2: 34.2,
    summary:
      'High-density urban riverine corridor vulnerable to backwater inundation and rapid discharge overflow.',
    polygon: [
      [18.562, 73.855],
      [18.558, 73.892],
      [18.535, 73.928],
      [18.515, 73.918],
      [18.512, 73.875],
      [18.530, 73.842],
      [18.562, 73.855],
    ],
    componentScores: {
      rainfall_1h: 0.82,
      rainfall_24h: 0.89,
      rainfall_72h: 0.91,
      terrain_susceptibility: 0.78,
      historical_flood_proximity: 0.96,
    },
    evidence: [
      'River confluence bottleneck: Discharge threshold exceeded by 28%',
      '72-hour upstream catchment saturation index at 91%',
      'Historical high-water mark buffer intersects 6 high-density wards',
      'Short-term rainfall intensity elevated at 38.5 mm/h',
    ],
  },
  {
    id: 'RA-PUNE-02',
    name: 'Khadakwasla Dam Spillway Corridor',
    taluka: 'Haveli',
    riskLevel: 'HIGH',
    hazardScore: 0.76,
    centroid: [18.452, 73.782],
    areaKm2: 28.6,
    summary:
      'Downstream discharge corridor subject to rapid rise upon controlled spillway reservoir release.',
    polygon: [
      [18.475, 73.755],
      [18.482, 73.805],
      [18.448, 73.818],
      [18.422, 73.792],
      [18.428, 73.750],
      [18.475, 73.755],
    ],
    componentScores: {
      rainfall_1h: 0.71,
      rainfall_24h: 0.78,
      rainfall_72h: 0.84,
      terrain_susceptibility: 0.69,
      historical_flood_proximity: 0.82,
    },
    evidence: [
      'Spillway release advisory in effect (simulated demo indicator)',
      'Low-lying riverbank causeways submerged at 3 transit junctions',
      '24-hour rainfall accumulation in reservoir catchment: 86.4 mm',
      'Soil moisture deficit < 8% indicating immediate runoff generation',
    ],
  },
  {
    id: 'RA-PUNE-03',
    name: 'Mulshi Catchment & Riverine Valley',
    taluka: 'Mulshi',
    riskLevel: 'CRITICAL',
    hazardScore: 0.92,
    centroid: [18.515, 73.535],
    areaKm2: 46.8,
    summary:
      'Steep Western Ghats catchment basin characterized by extreme precipitation and flash runoff risks.',
    polygon: [
      [18.548, 73.492],
      [18.552, 73.568],
      [18.520, 73.578],
      [18.485, 73.555],
      [18.480, 73.505],
      [18.548, 73.492],
    ],
    componentScores: {
      rainfall_1h: 0.94,
      rainfall_24h: 0.92,
      rainfall_72h: 0.96,
      terrain_susceptibility: 0.88,
      historical_flood_proximity: 0.90,
    },
    evidence: [
      'Continuous orographic downpour: 1-hour burst recorded at 52.4 mm/h',
      'Steep slope convergence index > 22% in upper escarpment',
      'Culvert overflow on major rural approach route',
      'High probability of localized flash inundation in valley hamlets',
    ],
  },
  {
    id: 'RA-PUNE-04',
    name: 'Pawana River Basin Inundation Zone',
    taluka: 'Maval',
    riskLevel: 'MODERATE',
    hazardScore: 0.58,
    centroid: [18.702, 73.735],
    areaKm2: 38.5,
    summary:
      'Semi-urban lowland plain with moderate drainage capacity and localized water-logging exposure.',
    polygon: [
      [18.730, 73.705],
      [18.735, 73.765],
      [18.695, 73.785],
      [18.670, 73.750],
      [18.675, 73.698],
      [18.730, 73.705],
    ],
    componentScores: {
      rainfall_1h: 0.55,
      rainfall_24h: 0.60,
      rainfall_72h: 0.64,
      terrain_susceptibility: 0.52,
      historical_flood_proximity: 0.62,
    },
    evidence: [
      'Moderate intermediate 24h rainfall (44.2 mm) within stormwater design limits',
      'Minor drainage sluggishness reported in low-lying industrial pockets',
      'Pawana river water level 1.4m below critical alert threshold',
      'Road network remains operational with caution advisories',
    ],
  },
  {
    id: 'RA-PUNE-05',
    name: 'Kukadi River Northern Floodplain',
    taluka: 'Junnar',
    riskLevel: 'LOW',
    hazardScore: 0.34,
    centroid: [19.195, 73.892],
    areaKm2: 52.1,
    summary: 'Broad agricultural floodplain currently displaying baseline hydrological behavior.',
    polygon: [
      [19.230, 73.855],
      [19.235, 73.928],
      [19.185, 73.948],
      [19.160, 73.910],
      [19.168, 73.848],
      [19.230, 73.855],
    ],
    componentScores: {
      rainfall_1h: 0.30,
      rainfall_24h: 0.36,
      rainfall_72h: 0.40,
      terrain_susceptibility: 0.32,
      historical_flood_proximity: 0.35,
    },
    evidence: [
      'Rainfall intensity light to moderate (< 12 mm/h)',
      'Channel banks clear with normal sediment transport',
      'Agricultural irrigation reservoirs at 62% storage capacity',
      'No structural or accessibility disruptions observed',
    ],
  },
  {
    id: 'RA-PUNE-06',
    name: 'Indapur Wetland Basin',
    taluka: 'Indapur',
    riskLevel: 'LOW',
    hazardScore: 0.28,
    centroid: [18.115, 75.025],
    areaKm2: 41.2,
    summary:
      'Distal agricultural depression with natural backwater buffering; no active road network hazard intersections recorded in prototype telemetry.',
    polygon: [
      [18.145, 74.995],
      [18.150, 75.055],
      [18.110, 75.068],
      [18.085, 75.035],
      [18.090, 74.990],
      [18.145, 74.995],
    ],
    componentScores: {
      rainfall_1h: 0.22,
      rainfall_24h: 0.28,
      rainfall_72h: 0.31,
      terrain_susceptibility: 0.24,
      historical_flood_proximity: 0.30,
    },
    evidence: [
      'Low runoff accumulation; local irrigation canal gates operating normally',
      'No critical transportation infrastructure intersections mapped',
      'Historical inundation frequency < 1 event per decade',
    ],
  },
];

/**
 * Prototype Affected Settlements — Milestones 3 & 4.
 * riskAreaId links each settlement to its parent risk zone.
 */
export const PROTOTYPE_SETTLEMENTS: AffectedSettlement[] = [
  // RA-PUNE-01 — Mula-Mutha Confluence Basin (Haveli)
  {
    id: 'SET-M3-01',
    name: 'Mundhwa Riverside Colony',
    riskAreaId: 'RA-PUNE-01',
    taluka: 'Haveli',
    population: 8400,
    impactLevel: 'CRITICAL',
    affectedHouseholds: 2100,
    latitude: 18.5302,
    longitude: 73.9012,
    vulnerabilityContext:
      'Low-lying residential pocket adjacent to river bend; historically inundated during high-discharge events. Demo fixture only.',
  },
  {
    id: 'SET-M3-02',
    name: 'Kharadi Floodplain Ward',
    riskAreaId: 'RA-PUNE-01',
    taluka: 'Haveli',
    population: 5200,
    impactLevel: 'HIGH',
    affectedHouseholds: 1280,
    latitude: 18.5510,
    longitude: 73.9155,
    vulnerabilityContext:
      'Informal settlement cluster on reclaimed floodplain; limited drainage infrastructure. Demo fixture only.',
  },

  // RA-PUNE-02 — Khadakwasla Spillway Corridor (Haveli)
  {
    id: 'SET-M3-03',
    name: 'Nandoshi Village',
    riskAreaId: 'RA-PUNE-02',
    taluka: 'Haveli',
    population: 1840,
    impactLevel: 'HIGH',
    affectedHouseholds: 460,
    latitude: 18.4415,
    longitude: 73.7738,
    vulnerabilityContext:
      'Downstream of reservoir spillway path; elevation within 0.8m of projected release water-surface profile. Demo fixture only.',
  },

  // RA-PUNE-03 — Mulshi Catchment (Mulshi)
  {
    id: 'SET-M3-04',
    name: 'Paud Valley Hamlet Cluster',
    riskAreaId: 'RA-PUNE-03',
    taluka: 'Mulshi',
    population: 3100,
    impactLevel: 'CRITICAL',
    affectedHouseholds: 720,
    latitude: 18.5180,
    longitude: 73.5310,
    vulnerabilityContext:
      'Isolated Ghats hamlet; sole approach road crosses low-flow culvert rated for 15-year storm return period. Demo fixture only.',
  },
  {
    id: 'SET-M3-05',
    name: 'Tamhini Settlement',
    riskAreaId: 'RA-PUNE-03',
    taluka: 'Mulshi',
    population: 980,
    impactLevel: 'HIGH',
    affectedHouseholds: 240,
    latitude: 18.4890,
    longitude: 73.5055,
    vulnerabilityContext:
      'Steep terrain settlement; upstream flash-catchment drains directly through habitation zone. Demo fixture only.',
  },

  // RA-PUNE-04 — Pawana Basin (Maval)
  {
    id: 'SET-M3-06',
    name: 'Talegaon Lowland Quarter',
    riskAreaId: 'RA-PUNE-04',
    taluka: 'Maval',
    population: 6300,
    impactLevel: 'MODERATE',
    affectedHouseholds: 1540,
    latitude: 18.7008,
    longitude: 73.7282,
    vulnerabilityContext:
      'Semi-urban area with moderate drainage; waterlogging risk in sub-grade streets during sustained rainfall. Demo fixture only.',
  },

  // RA-PUNE-05 — Kukadi Floodplain (Junnar)
  {
    id: 'SET-M3-07',
    name: 'Narayangaon Riverside Zone',
    riskAreaId: 'RA-PUNE-05',
    taluka: 'Junnar',
    population: 4100,
    impactLevel: 'LOW',
    affectedHouseholds: 980,
    latitude: 19.1742,
    longitude: 73.9005,
    vulnerabilityContext:
      'Agricultural plain with seasonal water-table variability; no structural inundation risk at current hydrology. Demo fixture only.',
  },

  // RA-PUNE-06 — Indapur Basin (Indapur) — explicitly has NO intersecting road hazard
  {
    id: 'SET-M3-08',
    name: 'Indapur Border Hamlet',
    riskAreaId: 'RA-PUNE-06',
    taluka: 'Indapur',
    population: 1450,
    impactLevel: 'LOW',
    affectedHouseholds: 310,
    latitude: 18.1120,
    longitude: 75.0210,
    vulnerabilityContext:
      'Isolated agricultural settlement located in natural depression; no road network disruptions recorded in prototype telemetry.',
  },
];

/**
 * Prototype Road Risk Items — Milestones 3 & 4.
 *
 * Status semantics:
 *   "AT RISK"           — inferred/intersecting hazard only; NOT confirmed blocked.
 *   "CONFIRMED BLOCKED" — used only where the fixture explicitly records confirmed blockage evidence.
 *   "MONITORING"        — under observation; no current operational restriction.
 */
export const PROTOTYPE_ROADS: RoadRiskItem[] = [
  // RA-PUNE-01 — Mula-Mutha Basin
  {
    id: 'RD-M3-01',
    name: 'Mundhwa–Kharadi Riverside Road',
    riskAreaId: 'RA-PUNE-01',
    taluka: 'Haveli',
    status: 'AT RISK',
    severity: 'CRITICAL',
    riskReason: 'Route traverses riverbank at elevation matching projected backwater inundation level.',
    operationalNote:
      'Prototype indicator: Intersection with flood-risk zone inferred from terrain data. Not a confirmed blockage report.',
    coordinates: [
      [18.528, 73.896],
      [18.536, 73.908],
      [18.545, 73.915],
    ],
  },
  {
    id: 'RD-M3-02',
    name: 'Yerawada Access Causeway',
    riskAreaId: 'RA-PUNE-01',
    taluka: 'Haveli',
    status: 'CONFIRMED BLOCKED',
    severity: 'CRITICAL',
    riskReason:
      'Causeway deck submerged under confirmed 0.7m overflow; emergency barrier placed by local body.',
    operationalNote:
      'Prototype fixture: This road entry represents a scenario where local body confirmed the blockage. Demo data only.',
    coordinates: [
      [18.521, 73.875],
      [18.515, 73.882],
    ],
  },

  // RA-PUNE-02 — Khadakwasla Spillway
  {
    id: 'RD-M3-03',
    name: 'Sinhagad Road (Lower Section)',
    riskAreaId: 'RA-PUNE-02',
    taluka: 'Haveli',
    status: 'AT RISK',
    severity: 'HIGH',
    riskReason:
      'Lower carriageway runs parallel to spillway discharge channel; lateral inundation possible if release sustained.',
    operationalNote:
      'Prototype indicator: Risk inferred from proximity to discharge path. No confirmed closure as of fixture time.',
    coordinates: [
      [18.450, 73.762],
      [18.442, 73.775],
      [18.432, 73.785],
    ],
  },

  // RA-PUNE-03 — Mulshi Catchment
  {
    id: 'RD-M3-04',
    name: 'Paud–Mulshi Valley Road (NH Spur)',
    riskAreaId: 'RA-PUNE-03',
    taluka: 'Mulshi',
    status: 'CONFIRMED BLOCKED',
    severity: 'CRITICAL',
    riskReason:
      'Culvert at chainage 4.2km overflowed; approach washed out over 30m section per prototype fixture record.',
    operationalNote:
      'Prototype fixture: Culvert failure scenario used for demonstration of confirmed blockage state. Demo data only.',
    coordinates: [
      [18.540, 73.510],
      [18.528, 73.520],
      [18.518, 73.528],
    ],
  },
  {
    id: 'RD-M3-05',
    name: 'Tamhini Ghat Road',
    riskAreaId: 'RA-PUNE-03',
    taluka: 'Mulshi',
    status: 'AT RISK',
    severity: 'HIGH',
    riskReason:
      'Narrow Ghat road susceptible to debris flow from escarpment face during sustained orographic precipitation.',
    operationalNote:
      'Prototype indicator: Flash debris risk inferred from slope susceptibility model. Route not confirmed closed.',
    coordinates: [
      [18.493, 73.508],
      [18.488, 73.516],
    ],
  },

  // RA-PUNE-04 — Pawana Basin
  {
    id: 'RD-M3-06',
    name: 'Talegaon–Maval District Road',
    riskAreaId: 'RA-PUNE-04',
    taluka: 'Maval',
    status: 'MONITORING',
    severity: 'MODERATE',
    riskReason: 'Low-lying section subject to intermittent waterlogging; operating below disruption threshold.',
    operationalNote:
      'Prototype indicator: Road currently passable; monitoring continues. Fixture represents caution-advisory status.',
    coordinates: [
      [18.710, 73.718],
      [18.700, 73.732],
      [18.690, 73.748],
    ],
  },

  // RA-PUNE-05 — Kukadi Floodplain
  {
    id: 'RD-M3-07',
    name: 'Narayangaon–Junnar State Highway',
    riskAreaId: 'RA-PUNE-05',
    taluka: 'Junnar',
    status: 'MONITORING',
    severity: 'LOW',
    riskReason: 'Route crosses seasonal drainage nala; currently within normal flow parameters.',
    operationalNote:
      'Prototype indicator: No disruption. Routine monitoring in active monsoon cycle. Demo data only.',
    coordinates: [
      [19.175, 73.890],
      [19.185, 73.902],
      [19.195, 73.915],
    ],
  },
  // NOTE: RA-PUNE-06 has NO road entries, deliberately verifying the No-Road-Data state!
];

/**
 * Milestone 4: Operational Response Priority Queue Items.
 * Strictly linked to riskAreaId, settlements, and verified road-risk conditions.
 */
export const PROTOTYPE_PRIORITY_ITEMS: ResponsePriorityItem[] = [
  {
    id: 'PRIORITY-01',
    rank: 1,
    priorityScore: 0.94,
    urgency: 'IMMEDIATE',
    riskLevel: 'CRITICAL',
    riskAreaId: 'RA-PUNE-03',
    riskAreaName: 'Mulshi Catchment & Riverine Valley',
    settlementId: 'SET-M3-04',
    settlementName: 'Paud Valley Hamlet Cluster',
    taluka: 'Mulshi',
    population: 3100,
    affectedHouseholds: 720,
    accessStatus: 'ISOLATED',
    roadStatus: 'CONFIRMED BLOCKED',
    primaryRoadName: 'Paud–Mulshi Valley Road (NH Spur)',
    primaryRationale:
      'Critical terrain runoff convergence (>0.92 hazard score) coupled with confirmed culvert washout at chainage 4.2km cutting off primary vehicular ingress.',
    recommendedAction:
      'Dispatch swift-water rescue reconnaissance; mobilize secondary foot-approach supply line from Paud outpost.',
  },
  {
    id: 'PRIORITY-02',
    rank: 2,
    priorityScore: 0.88,
    urgency: 'IMMEDIATE',
    riskLevel: 'CRITICAL',
    riskAreaId: 'RA-PUNE-01',
    riskAreaName: 'Mula-Mutha Confluence Basin',
    settlementId: 'SET-M3-01',
    settlementName: 'Mundhwa Riverside Colony',
    taluka: 'Haveli',
    population: 8400,
    affectedHouseholds: 2100,
    accessStatus: 'AT_RISK',
    roadStatus: 'CONFIRMED BLOCKED',
    primaryRoadName: 'Yerawada Access Causeway',
    primaryRationale:
      'High-density urban river corridor with backwater surge exceeding threshold by 28%. Confirmed 0.7m causeway submergence with municipal barriers in place.',
    recommendedAction:
      'Deploy municipal relief barriers; initiate staged ground-floor evacuation alert for riverside wards.',
  },
  {
    id: 'PRIORITY-03',
    rank: 3,
    priorityScore: 0.78,
    urgency: 'ELEVATED',
    riskLevel: 'HIGH',
    riskAreaId: 'RA-PUNE-02',
    riskAreaName: 'Khadakwasla Dam Spillway Corridor',
    settlementId: 'SET-M3-03',
    settlementName: 'Nandoshi Village',
    taluka: 'Haveli',
    population: 1840,
    affectedHouseholds: 460,
    accessStatus: 'AT_RISK',
    roadStatus: 'AT RISK',
    primaryRoadName: 'Sinhagad Road (Lower Section)',
    primaryRationale:
      'Downstream of dam spillway release channel. Roadway elevation within 0.8m of discharge envelope (inferred hazard, route not confirmed closed).',
    recommendedAction:
      'Stage rescue inflatable craft at Haveli depot; issue early surge warning to village administration.',
  },
  {
    id: 'PRIORITY-04',
    rank: 4,
    priorityScore: 0.62,
    urgency: 'ELEVATED',
    riskLevel: 'MODERATE',
    riskAreaId: 'RA-PUNE-04',
    riskAreaName: 'Pawana River Basin Inundation Zone',
    settlementId: 'SET-M3-06',
    settlementName: 'Talegaon Lowland Quarter',
    taluka: 'Maval',
    population: 6300,
    affectedHouseholds: 1540,
    accessStatus: 'ACCESSIBLE',
    roadStatus: 'MONITORING',
    primaryRoadName: 'Talegaon–Maval District Road',
    primaryRationale:
      'Semi-urban lowland plain with localized street waterlogging. Arterial road network operational below critical alert threshold.',
    recommendedAction:
      'Inspect stormwater pumps at industrial culverts; log hourly water level readings at Pawana bridge gauge.',
  },
  {
    id: 'PRIORITY-05',
    rank: 5,
    priorityScore: 0.35,
    urgency: 'ROUTINE',
    riskLevel: 'LOW',
    riskAreaId: 'RA-PUNE-05',
    riskAreaName: 'Kukadi River Northern Floodplain',
    settlementId: 'SET-M3-07',
    settlementName: 'Narayangaon Riverside Zone',
    taluka: 'Junnar',
    population: 4100,
    affectedHouseholds: 980,
    accessStatus: 'ACCESSIBLE',
    roadStatus: 'MONITORING',
    primaryRoadName: 'Narayangaon–Junnar State Highway',
    primaryRationale:
      'Broad agricultural floodplain exhibiting baseline hydrological flow. Drainage nala within design tolerances.',
    recommendedAction:
      'Standard meteorological monitoring; routine verification of reservoir outflow telemetry.',
  },
  {
    id: 'PRIORITY-06',
    rank: 6,
    priorityScore: 0.28,
    urgency: 'ROUTINE',
    riskLevel: 'LOW',
    riskAreaId: 'RA-PUNE-06',
    riskAreaName: 'Indapur Wetland Basin',
    settlementId: 'SET-M3-08',
    settlementName: 'Indapur Border Hamlet',
    taluka: 'Indapur',
    population: 1450,
    affectedHouseholds: 310,
    accessStatus: 'ACCESSIBLE',
    roadStatus: 'NO_DATA',
    primaryRationale:
      'Distal agricultural depression without active flood threat. No intersecting road network hazards mapped in prototype telemetry.',
    recommendedAction:
      'Baseline observational monitoring only; verify local nala bank stability on next routine survey.',
  },
];

/**
 * Milestone 4: Historical Event Replay Scenario metadata.
 * Clearly demarcated as archived/replay data — not live.
 */
export interface HistoricalScenario {
  id: string;
  name: string;
  scenarioDate: string;
  description: string;
  baselineScore: number;
  criticalTaluka: string;
  archivedNotice: string;
}

export const HISTORICAL_REPLAY_SCENARIO: HistoricalScenario = {
  id: 'SCENARIO-2025-AUG',
  name: 'Pune August 2025 Monsoon Peak Flood (Archived Replay)',
  scenarioDate: '2025-08-04 · 14:30 IST (Archived)',
  description:
    'Post-incident simulation replay reconstructing the August 2025 Western Ghats flash runoff and urban backwater event. Frozen telemetry displayed for training and dispatch evaluation.',
  baselineScore: 0.91,
  criticalTaluka: 'Mulshi',
  archivedNotice:
    'HISTORICAL REPLAY MODE · ARCHIVED SCENARIO: PUNE MONSOON 2025 · TELEMETRY FROZEN FOR POST-INCIDENT REVIEW',
};

// ── Legacy fixture samples (retained from Milestone 1) ───────────────────────

export const PROTOTYPE_SETTLEMENT_SAMPLES: PrototypeSettlementItem[] = [
  {
    id: 'SET-01',
    name: 'Mulshi Downstream Basin',
    taluka: 'Mulshi',
    riskLevel: 'CRITICAL',
    estimatedPopulation: 4200,
    accessStatus: 'AT_RISK',
    note: 'Demo record: Culvert water levels rising near secondary access road.',
  },
  {
    id: 'SET-02',
    name: 'Maval Lowland Hamlet',
    taluka: 'Maval',
    riskLevel: 'HIGH',
    estimatedPopulation: 2750,
    accessStatus: 'ISOLATED',
    note: 'Demo record: Primary approach causeway submerged under 0.6m overflow.',
  },
  {
    id: 'SET-03',
    name: 'Haveli Riverside Ward 4',
    taluka: 'Haveli',
    riskLevel: 'MODERATE',
    estimatedPopulation: 14800,
    accessStatus: 'ACCESSIBLE',
    note: 'Demo record: Embankment holding; drainage operating within threshold.',
  },
];

export const PROTOTYPE_PRIORITY_SAMPLES: PrototypePriorityItem[] = [
  {
    rank: 1,
    settlementName: 'Maval Lowland Hamlet',
    taluka: 'Maval',
    priorityScore: 0.88,
    riskLevel: 'HIGH',
    accessStatus: 'ISOLATED',
    primaryRationale: 'Isolation factor: Access road cutoff combined with high hazard score.',
  },
  {
    rank: 2,
    settlementName: 'Mulshi Downstream Basin',
    taluka: 'Mulshi',
    priorityScore: 0.82,
    riskLevel: 'CRITICAL',
    accessStatus: 'AT_RISK',
    primaryRationale: 'Exposure factor: Critical terrain runoff convergence into inhabited zone.',
  },
  {
    rank: 3,
    settlementName: 'Haveli Riverside Ward 4',
    taluka: 'Haveli',
    priorityScore: 0.49,
    riskLevel: 'MODERATE',
    accessStatus: 'ACCESSIBLE',
    primaryRationale: 'Monitoring status: Roadways open; perimeter inspection scheduled.',
  },
];
