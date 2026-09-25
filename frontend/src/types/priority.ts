import { RiskLevel } from './hazard';
import { AccessStatus } from './operational';
import { RoadStatus } from './road';

/**
 * Response urgency classification for operational decision-making.
 */
export type ResponseUrgency = 'IMMEDIATE' | 'HIGH' | 'ELEVATED' | 'ROUTINE';

/**
 * Response priority item representing an operationally prioritized intervention target.
 * Synchronizes with riskAreaId to unify the map, settlement, and road-risk layers.
 */
export interface ResponsePriorityItem {
  id: string;
  rank: number;
  priorityScore: number; // 0.00 to 1.00
  urgency: ResponseUrgency;
  riskLevel: RiskLevel;
  riskAreaId: string;
  riskAreaName: string;
  settlementId: string;
  settlementName: string;
  taluka: string;
  population: number;
  affectedHouseholds: number;
  accessStatus: AccessStatus;
  roadStatus: RoadStatus | 'NO_DATA';
  primaryRoadName?: string;
  primaryRationale: string;
  recommendedAction: string;
}
