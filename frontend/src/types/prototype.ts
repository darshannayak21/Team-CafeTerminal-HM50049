export type RiskSeverity = 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW';

export interface ConfidenceFactor {
  factor: string;
  rating: 'Strong' | 'Moderate' | 'High' | 'Low';
  detail: string;
}

export interface IncidentMarkerData {
  id: string;
  type: 'bridge' | 'road' | 'power' | 'people' | 'settlement';
  title: string;
  locationName: string;
  timestamp: string;
  description: string;
  source: string;
  coordinates: [number, number]; // [lat, lng]
  severity: RiskSeverity;
  talukaId: string;
}

export interface TalukaDistrict {
  id: string;
  name: string;
  riskLevel: RiskSeverity;
  hazardScore: number;
  rank: number;
  affectedPopulation: number;
  atRiskRoadsCount: number;
  disruptedRoadsCount: number;
  rainfall1h: number;   // mm
  rainfall24h: number;  // mm
  rainfall72h: number;  // mm
  terrainSusceptibility: number; // 0 - 1
  historicalFloodProximity: number; // 0 - 1
  confidence: number;   // percentage 0 - 100
  confidenceFactors: ConfidenceFactor[];
  evidence: string[];
  centerCoordinates: [number, number]; // [lat, lng]
  zoomLevel: number;
  polygonCoordinates?: [number, number][]; // optional polygon boundary
}

export interface RouteOption {
  id: string;
  fromName: string;
  toName: string;
  fromCoords: [number, number];
  toCoords: [number, number];
  distanceKm: number;
  durationMinutes: number;
  atRiskSegmentsCount: number;
  disruptedSegmentsAvoidedCount: number;
  waypoints: [number, number][];
  routeSummary: string;
}

export interface SimulatedUpdate {
  id: string;
  time: string;
  severity: RiskSeverity;
  eventDescription: string;
  location: string;
  talukaId?: string;
}

export interface GroundReport {
  id: string;
  incident_type: string;
  description: string;
  image_url?: string | null;
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  location_name?: string | null;
  timestamp: string;
  source: string;
  status: 'pending' | 'verified' | 'rejected' | string;
  created_at: string;
}

export interface NewsReport {
  id: string;
  title: string;
  description: string;
  source: string;
  category: string;
  location_name?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  timestamp: string;
  is_simulated: boolean | number;
  badge: string;
  created_at: string;
}

