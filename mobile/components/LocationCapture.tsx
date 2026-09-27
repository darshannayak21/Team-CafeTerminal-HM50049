import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from "react-native";
import * as Location from "expo-location";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { GeoCoordinates } from "../types/report";
import { PALETTE, SPACING } from "../constants/theme";

interface LocationCaptureProps {
  location: GeoCoordinates | null;
  onLocationCaptured: (coords: GeoCoordinates | null) => void;
  error?: string;
}

export const LocationCapture: React.FC<LocationCaptureProps> = ({
  location,
  onLocationCaptured,
  error,
}) => {
  const [loading, setLoading] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);

  const handleCaptureLocation = async () => {
    try {
      setLoading(true);
      setPermissionDenied(false);

      // Check if location services are enabled
      const enabled = await Location.hasServicesEnabledAsync();
      if (!enabled) {
        Alert.alert(
          "Location Services Disabled",
          "Please enable GPS / Location services in your device settings to capture your current incident coordinates.",
          [{ text: "OK" }]
        );
        setLoading(false);
        return;
      }

      // Request foreground permission
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setPermissionDenied(true);
        Alert.alert(
          "Permission Denied",
          "Location access is necessary to geocode disaster reports for field response teams. Please allow location permissions in app settings.",
          [{ text: "OK" }]
        );
        setLoading(false);
        return;
      }

      // Obtain current position with high accuracy
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      let formattedAddress: string | null = null;
      let districtOrSubdivision: string | null = null;

      // Attempt reverse geocode for human readability
      try {
        const reverseResults = await Location.reverseGeocodeAsync({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });

        if (reverseResults && reverseResults.length > 0) {
          const res = reverseResults[0];
          const parts = [
            res.name || res.street,
            res.district || res.subregion || res.city,
            res.region,
          ].filter(Boolean);

          formattedAddress = parts.join(", ");
          districtOrSubdivision = res.district || res.city || res.subregion || null;
        }
      } catch (geocodeErr) {
        // Reverse geocoding failure is non-fatal; raw GPS is primary
        console.log("Reverse geocode notice:", geocodeErr);
      }

      const coords: GeoCoordinates = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy ? Math.round(position.coords.accuracy) : null,
        altitude: position.coords.altitude ? Math.round(position.coords.altitude) : null,
        timestamp: position.timestamp,
        formattedAddress,
        districtOrSubdivision,
      };

      onLocationCaptured(coords);
    } catch (err: any) {
      console.error("Location capture error:", err);
      Alert.alert(
        "Location Unavailable",
        "Could not determine current GPS coordinates. Ensure high-accuracy GPS is enabled and try again.",
        [{ text: "Retry", onPress: handleCaptureLocation }, { text: "Cancel", style: "cancel" }]
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClearLocation = () => {
    onLocationCaptured(null);
  };

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={styles.fieldLabel}>
          CURRENT LOCATION <Text style={styles.requiredStar}>*</Text>
        </Text>
        {location ? (
          <View style={styles.capturedBadge}>
            <MaterialCommunityIcons name="check-circle" size={12} color={PALETTE.success} />
            <Text style={styles.capturedBadgeText}>LOCATION CAPTURED</Text>
          </View>
        ) : (
          <Text style={styles.requiredNotice}>Required for GIS dispatch</Text>
        )}
      </View>

      {location ? (
        <View style={styles.coordsCard}>
          <View style={styles.cardHeader}>
            <View style={styles.signalHeader}>
              <View style={styles.gpsPulseDot} />
              <Text style={styles.signalText}>GPS Lock Active</Text>
              {location.accuracy !== null && (
                <Text style={styles.accuracyText}>(±{location.accuracy}m)</Text>
              )}
            </View>
            <TouchableOpacity onPress={handleClearLocation} style={styles.clearButton}>
              <MaterialCommunityIcons name="refresh" size={16} color={PALETTE.textMuted} />
              <Text style={styles.clearText}>Recapture</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.rawCoordsGrid}>
            <View style={styles.coordBox}>
              <Text style={styles.coordLabel}>LATITUDE</Text>
              <Text style={styles.coordValue}>{location.latitude.toFixed(6)}° N</Text>
            </View>
            <View style={styles.coordDivider} />
            <View style={styles.coordBox}>
              <Text style={styles.coordLabel}>LONGITUDE</Text>
              <Text style={styles.coordValue}>{location.longitude.toFixed(6)}° E</Text>
            </View>
          </View>

          {location.formattedAddress ? (
            <View style={styles.addressRow}>
              <MaterialCommunityIcons name="map-marker" size={16} color={PALETTE.primaryBlue} />
              <Text style={styles.addressText} numberOfLines={2}>
                {location.formattedAddress}
              </Text>
            </View>
          ) : null}
        </View>
      ) : (
        <View style={[styles.actionWrapper, Boolean(error) && styles.actionWrapperError]}>
          <TouchableOpacity
            style={[styles.captureButton, loading && styles.captureButtonLoading]}
            onPress={handleCaptureLocation}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <View style={styles.buttonContent}>
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text style={styles.buttonText}>Acquiring GPS Signal...</Text>
              </View>
            ) : (
              <View style={styles.buttonContent}>
                <MaterialCommunityIcons name="crosshairs-gps" size={20} color="#FFFFFF" />
                <Text style={styles.buttonText}>Use Current Location</Text>
              </View>
            )}
          </TouchableOpacity>

          {permissionDenied && (
            <View style={styles.deniedBanner}>
              <MaterialCommunityIcons name="map-marker-off" size={16} color={PALETTE.danger} />
              <Text style={styles.deniedText}>
                Permission denied. Please grant location permissions in Settings.
              </Text>
            </View>
          )}
        </View>
      )}

      {error && !location ? (
        <View style={styles.errorRow}>
          <MaterialCommunityIcons name="alert-circle" size={14} color={PALETTE.danger} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.lg,
  },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.xs,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: PALETTE.textSecondary,
    letterSpacing: 0.8,
  },
  requiredStar: {
    color: PALETTE.danger,
    fontWeight: "900",
  },
  requiredNotice: {
    fontSize: 11,
    color: PALETTE.textMuted,
  },
  capturedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: PALETTE.successLight,
    borderWidth: 1,
    borderColor: PALETTE.successBorder,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
    gap: 3,
  },
  capturedBadgeText: {
    fontSize: 9,
    fontWeight: "700",
    color: PALETTE.success,
    letterSpacing: 0.5,
  },
  actionWrapper: {
    borderRadius: 8,
  },
  actionWrapperError: {
    borderWidth: 1,
    borderColor: PALETTE.danger,
    borderRadius: 8,
    padding: 2,
  },
  captureButton: {
    backgroundColor: PALETTE.primaryBlue,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  captureButtonLoading: {
    backgroundColor: "#3B82F6",
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  coordsCard: {
    backgroundColor: PALETTE.surface,
    borderWidth: 1.5,
    borderColor: PALETTE.borderMedium,
    borderRadius: 8,
    padding: SPACING.md,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.sm,
    paddingBottom: SPACING.xs,
    borderBottomWidth: 1,
    borderBottomColor: PALETTE.borderLight,
  },
  signalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  gpsPulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: PALETTE.success,
  },
  signalText: {
    fontSize: 12,
    fontWeight: "700",
    color: PALETTE.textPrimary,
  },
  accuracyText: {
    fontSize: 11,
    color: PALETTE.textMuted,
  },
  clearButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  clearText: {
    fontSize: 11,
    color: PALETTE.textMuted,
    fontWeight: "600",
  },
  rawCoordsGrid: {
    flexDirection: "row",
    backgroundColor: PALETTE.surfaceSecondary,
    borderRadius: 6,
    padding: SPACING.sm,
    alignItems: "center",
    borderWidth: 1,
    borderColor: PALETTE.borderLight,
  },
  coordBox: {
    flex: 1,
    alignItems: "center",
  },
  coordDivider: {
    width: 1,
    height: 28,
    backgroundColor: PALETTE.borderMedium,
  },
  coordLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: PALETTE.textMuted,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  coordValue: {
    fontSize: 14,
    fontWeight: "700",
    color: PALETTE.textPrimary,
    fontVariant: ["tabular-nums"],
  },
  addressRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: SPACING.sm,
    gap: 6,
    paddingHorizontal: 2,
  },
  addressText: {
    fontSize: 12,
    color: PALETTE.textSecondary,
    flex: 1,
    lineHeight: 16,
  },
  deniedBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: PALETTE.dangerLight,
    borderWidth: 1,
    borderColor: PALETTE.dangerBorder,
    borderRadius: 6,
    padding: SPACING.sm,
    marginTop: SPACING.sm,
    gap: SPACING.xs,
  },
  deniedText: {
    fontSize: 12,
    color: PALETTE.danger,
    flex: 1,
    fontWeight: "500",
  },
  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
  },
  errorText: {
    fontSize: 12,
    color: PALETTE.danger,
    fontWeight: "600",
  },
});
