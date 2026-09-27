import { Report, IncidentType } from "../types/report";

// In-memory local report registry for offline/prototype execution
const inMemoryReports: Report[] = [];

export interface CreateReportInput {
  type: IncidentType | string;
  description: string;
  imageUri: string | null;
  latitude: number | null;
  longitude: number | null;
  accuracy?: number | null;
  locationName?: string | null;
}

/**
 * Generates a unique incident tracking ID with timestamp prefix
 */
function generateIncidentId(): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const randSuffix = Math.floor(1000 + Math.random() * 9000);
  return `RG-${dateStr}-${randSuffix}`;
}

export const reportService = {
  /**
   * Stores an incident report locally in memory for prototype testing.
   * Ready for future async storage or sync endpoint integration.
   */
  async saveLocalReport(input: CreateReportInput): Promise<Report> {
    // Simulate brief device-level processing
    await new Promise((resolve) => setTimeout(resolve, 600));

    const newReport: Report = {
      id: generateIncidentId(),
      type: input.type,
      description: input.description.trim(),
      imageUri: input.imageUri,
      latitude: input.latitude,
      longitude: input.longitude,
      accuracy: input.accuracy ?? null,
      locationName: input.locationName ?? null,
      timestamp: new Date().toISOString(),
      status: "captured_locally",
    };

    inMemoryReports.unshift(newReport);
    return newReport;
  },

  /**
   * Retrieves locally stored reports
   */
  async getLocalReports(): Promise<Report[]> {
    return [...inMemoryReports];
  },

  /**
   * Formats ISO timestamp for field reports
   */
  formatTimestamp(isoString: string): string {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      });
    } catch {
      return isoString;
    }
  },
};
