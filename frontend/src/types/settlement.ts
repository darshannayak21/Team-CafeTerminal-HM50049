import { RiskLevel } from './hazard';

/**
 * Contract for affected settlement fixture data in Milestone 3.
 */
export interface AffectedSettlement {
  id: string;
  name: string;
  riskAreaId: string;
  taluka: string;
  population: number;
  impactLevel: RiskLevel;
  affectedHouseholds: number;
  latitude: number;
  longitude: number;
  vulnerabilityContext: string;
}
