/**
 * Data contracts for hazard scoring, environmental telemetry, and spatial risk areas.
 * Aligned with backend domain contracts in backend/models/schemas.py.
 */

export type RiskLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';

export interface LocationCoordinates {
  lat: number;
  lon: number;
  label?: string;
}

export interface HazardComponentScores {
  rainfall_1h: number;
  rainfall_24h: number;
  rainfall_72h: number;
  terrain_susceptibility: number;
  historical_flood_proximity: number;
}

export interface HazardAssessment {
  hazardScore: number;
  riskLevel: RiskLevel;
  evidence: string[];
  componentScores: HazardComponentScores;
  evaluatedAt: string;
}

/**
 * Spatial risk area contract for Milestone 2 polygon layers.
 */
export interface RiskArea {
  id: string;
  name: string;
  taluka: string;
  riskLevel: RiskLevel;
  hazardScore: number;
  polygon: [number, number][]; // [lat, lon] coordinate rings
  centroid: [number, number]; // [lat, lon]
  areaKm2: number;
  summary: string;
  evidence: string[];
  componentScores: HazardComponentScores;
}
