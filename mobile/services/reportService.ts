import { Platform } from "react-native";
import { Report, IncidentType } from "../types/report";
import { API_BASE_URL, REQUEST_TIMEOUT_MS } from "../constants/config";

// In-memory cache of submitted reports for the mobile session
const localSessionReports: Report[] = [];

export interface CreateReportInput {
  type: IncidentType | string;
  description: string;
  imageUri: string | null;
  latitude: number | null;
  longitude: number | null;
  accuracy?: number | null;
  locationName?: string | null;
}

export const reportService = {
  /**
   * Submits a real-time incident report to the RainGuard Flask Backend API.
   * Transmits GPS coordinates, hazard category, description, and attached photo.
   */
  async submitReportToBackend(input: CreateReportInput): Promise<Report> {
    const endpoint = `${API_BASE_URL}/api/reports`;

    // Construct React Native & Expo-safe FormData
    // NOTE: In React Native, all non-file values MUST be primitive strings.
    // Passing raw numbers or null causes "Unsupported FormData part implementation".
    const formData = new FormData();
    formData.append("incident_type", String(input.type || ""));
    formData.append("description", String(input.description || "").trim());
    formData.append("latitude", input.latitude !== null && input.latitude !== undefined ? String(input.latitude) : "");
    formData.append("longitude", input.longitude !== null && input.longitude !== undefined ? String(input.longitude) : "");

    if (input.accuracy !== undefined && input.accuracy !== null) {
      formData.append("accuracy", String(input.accuracy));
    }
    if (input.locationName) {
      formData.append("location_name", String(input.locationName));
    }
    formData.append("timestamp", new Date().toISOString());

    // Handle photo attachment in React Native compatible format
    if (input.imageUri && typeof input.imageUri === "string") {
      const uri = input.imageUri;
      const filename = uri.split("/").pop() || `report_${Date.now()}.jpg`;
      const match = /\.(\w+)$/.exec(filename);
      const ext = match ? match[1].toLowerCase() : "jpg";
      const mimeType = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";

      // React Native native networking multipart representation
      const filePart = {
        uri: uri,
        name: filename,
        type: mimeType,
      };

      formData.append("image", filePart as any);
    }

    // Using XMLHttpRequest to bypass Expo Winter fetch polyfill limitation with native file parts
    return new Promise<Report>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", endpoint);
      xhr.timeout = REQUEST_TIMEOUT_MS;
      xhr.setRequestHeader("Accept", "application/json");

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const result = JSON.parse(xhr.responseText);
            const rawReport = result.report || result.data;

            const createdReport: Report = {
              id: rawReport.id,
              type: rawReport.incident_type || input.type,
              description: rawReport.description || input.description,
              imageUri: rawReport.image_url ? `${API_BASE_URL}${rawReport.image_url}` : input.imageUri,
              latitude: rawReport.latitude,
              longitude: rawReport.longitude,
              accuracy: rawReport.accuracy,
              locationName: rawReport.location_name || input.locationName,
              timestamp: rawReport.timestamp,
              status: "captured_locally",
            };

            localSessionReports.unshift(createdReport);
            resolve(createdReport);
          } catch (e) {
            reject(new Error("Failed to parse response from RainGuard backend"));
          }
        } else {
          let errorMsg = `Server error (HTTP ${xhr.status})`;
          try {
            const errJson = JSON.parse(xhr.responseText);
            if (errJson.error) errorMsg = errJson.error;
          } catch {
            // ignore
          }
          reject(new Error(errorMsg));
        }
      };

      xhr.onerror = () => {
        reject(
          new Error(
            `Could not connect to RainGuard backend at ${API_BASE_URL}. Ensure your phone and laptop are on the same Wi-Fi network.`
          )
        );
      };

      xhr.ontimeout = () => {
        reject(
          new Error(
            `Connection timed out after ${REQUEST_TIMEOUT_MS / 1000}s. Please verify your laptop backend is running at ${API_BASE_URL}`
          )
        );
      };

      xhr.send(formData);
    });
  },

  /**
   * Retrieves reports stored in session memory
   */
  async getLocalReports(): Promise<Report[]> {
    return [...localSessionReports];
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
