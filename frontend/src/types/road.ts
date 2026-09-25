import { RiskLevel } from './hazard';

/**
 * Contract for road-risk fixture data in Milestone 3.
 *
 * Status semantics:
 *   "AT RISK"          – inferred/intersecting risk only; not confirmed blocked.
 *   "CONFIRMED BLOCKED" – only used when the fixture explicitly contains confirmed blockage evidence.
 */
export type RoadStatus = 'AT RISK' | 'CONFIRMED BLOCKED' | 'MONITORING';

export interface RoadRiskItem {
  id: string;
  name: string;
  riskAreaId: string;
  taluka: string;
  status: RoadStatus;
  severity: RiskLevel;
  riskReason: string;
  operationalNote: string;
  /** Route geometry as [lat, lon] pairs for map rendering */
  coordinates: [number, number][];
}
