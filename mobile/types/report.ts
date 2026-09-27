export type IncidentType =
  | "Flooded Road"
  | "Road Blocked"
  | "Bridge Damage"
  | "Waterlogging"
  | "Landslide"
  | "Power Infrastructure Damage"
  | "Other";

export interface GeoCoordinates {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  altitude: number | null;
  timestamp: number;
  formattedAddress?: string | null;
  districtOrSubdivision?: string | null;
}

export interface Report {
  id: string;
  type: IncidentType | string;
  description: string;
  imageUri: string | null;
  latitude: number | null;
  longitude: number | null;
  accuracy?: number | null;
  locationName?: string | null;
  timestamp: string;
  status: "captured_locally" | "queued_for_sync";
}

export interface FormValidationErrors {
  type?: string;
  location?: string;
  general?: string;
}
