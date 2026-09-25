import { LocationCoordinates, RiskLevel } from './hazard';

/**
 * Operational dashboard and emergency responder view contracts.
 */

export interface DistrictBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface DistrictContext {
  districtName: string;
  state: string;
  incidentType: string;
  center: LocationCoordinates;
  bounds: DistrictBounds;
  talukas: string[];
}

export type AccessStatus = 'ACCESSIBLE' | 'AT_RISK' | 'ISOLATED';

export interface PrototypeSettlementItem {
  id: string;
  name: string;
  taluka: string;
  riskLevel: RiskLevel;
  estimatedPopulation: number;
  accessStatus: AccessStatus;
  note: string;
}

export interface PrototypePriorityItem {
  rank: number;
  settlementName: string;
  taluka: string;
  priorityScore: number;
  riskLevel: RiskLevel;
  accessStatus: AccessStatus;
  primaryRationale: string;
}
