import React, { useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { IncidentType, GeoCoordinates, Report, FormValidationErrors } from "./types/report";
import { PALETTE, SPACING } from "./constants/theme";
import { reportService } from "./services/reportService";

import { Header } from "./components/Header";
import { IncidentTypeSelector } from "./components/IncidentTypeSelector";
import { PhotoPicker } from "./components/PhotoPicker";
import { LocationCapture } from "./components/LocationCapture";
import { SuccessModal } from "./components/SuccessModal";

export default function App() {
  // Form State
  const [incidentType, setIncidentType] = useState<IncidentType | "">("");
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [description, setDescription] = useState<string>("");
  const [location, setLocation] = useState<GeoCoordinates | null>(null);

  // Status & Validation State
  const [errors, setErrors] = useState<FormValidationErrors>({});
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submittedReport, setSubmittedReport] = useState<Report | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);

  // Validation Logic
  const validateForm = (): boolean => {
    const newErrors: FormValidationErrors = {};

    if (!incidentType) {
      newErrors.type = "Please select an incident type.";
    }

    if (!location) {
      newErrors.location = "Current GPS location is required to map this incident.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Form Submission
  const handleSubmit = async () => {
    if (!validateForm()) {
      Alert.alert(
        "Incomplete Incident Report",
        "Please fill in all required fields (Incident Type and GPS Location) before submitting.",
        [{ text: "Review Form" }]
      );
      return;
    }

    try {
      setSubmitting(true);

      const savedReport = await reportService.submitReportToBackend({
        type: incidentType,
        description,
        imageUri: photoUri,
        latitude: location ? location.latitude : null,
        longitude: location ? location.longitude : null,
        accuracy: location ? location.accuracy : null,
        locationName: location?.formattedAddress || location?.districtOrSubdivision || null,
      });

      setSubmittedReport(savedReport);
      setShowSuccessModal(true);
    } catch (err: any) {
      console.error("Submission failed:", err);
      Alert.alert(
        "Transmission Failed",
        err.message || "Could not reach RainGuard backend. Please verify your connection and try again.",
        [{ text: "OK" }]
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Reset form for subsequent reporting
  const handleResetForm = () => {
    setShowSuccessModal(false);
    setSubmittedReport(null);
    setIncidentType("");
    setPhotoUri(null);
    setDescription("");
    setLocation(null);
    setErrors({});
  };

  return (
    <KeyboardAvoidingView
      style={styles.rootContainer}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <StatusBar style="light" />

      {/* RainGuard Incident Header */}
      <Header />

      {/* Main Scrollable Form */}
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Form Card Container */}
        <View style={styles.formCard}>
          {/* Section 1: Incident Type */}
          <IncidentTypeSelector
            value={incidentType}
            onSelect={(val) => {
              setIncidentType(val);
              if (errors.type) {
                setErrors((prev) => ({ ...prev, type: undefined }));
              }
            }}
            error={errors.type}
          />

          {/* Section 2: Photo Evidence */}
          <PhotoPicker imageUri={photoUri} onChangeImage={setPhotoUri} />

          {/* Section 3: Description Input */}
          <View style={styles.fieldSection}>
            <View style={styles.labelRow}>
              <Text style={styles.fieldLabel}>INCIDENT DESCRIPTION</Text>
              <Text style={styles.optionalNotice}>Optional</Text>
            </View>

            <TextInput
              style={styles.textArea}
              placeholder="Describe what you are seeing (e.g. Water level has risen above the road and vehicles are unable to pass)..."
              placeholderTextColor={PALETTE.textMuted}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              value={description}
              onChangeText={setDescription}
            />
          </View>

          {/* Section 4: Current Location */}
          <LocationCapture
            location={location}
            onLocationCaptured={(coords) => {
              setLocation(coords);
              if (coords && errors.location) {
                setErrors((prev) => ({ ...prev, location: undefined }));
              }
            }}
            error={errors.location}
          />

          {/* Section 5: Submit Primary Action */}
          <TouchableOpacity
            style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
            activeOpacity={0.85}
          >
            {submitting ? (
              <View style={styles.submitLoadingRow}>
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text style={styles.submitButtonText}>Validating & Storing Report...</Text>
              </View>
            ) : (
              <View style={styles.submitContentRow}>
                <MaterialCommunityIcons name="send" size={20} color="#FFFFFF" />
                <Text style={styles.submitButtonText}>Submit Report</Text>
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.footerNotice}>
            <MaterialCommunityIcons name="shield-check-outline" size={14} color={PALETTE.textMuted} />
            <Text style={styles.footerNoticeText}>
              RainGuard Emergency GIS Response System
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Success Submission Modal */}
      <SuccessModal
        visible={showSuccessModal}
        report={submittedReport}
        onDismiss={handleResetForm}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: PALETTE.background,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xxxl,
  },
  formCard: {
    backgroundColor: PALETTE.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: PALETTE.borderLight,
    padding: SPACING.lg,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  fieldSection: {
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
  optionalNotice: {
    fontSize: 11,
    color: PALETTE.textMuted,
  },
  textArea: {
    backgroundColor: PALETTE.surfaceSecondary,
    borderWidth: 1.5,
    borderColor: PALETTE.borderMedium,
    borderRadius: 8,
    padding: SPACING.md,
    fontSize: 14,
    color: PALETTE.textPrimary,
    minHeight: 90,
    lineHeight: 20,
  },
  submitButton: {
    backgroundColor: PALETTE.primaryDark,
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: SPACING.sm,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  submitButtonDisabled: {
    backgroundColor: "#475569",
  },
  submitContentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
  submitLoadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
  footerNotice: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: SPACING.lg,
  },
  footerNoticeText: {
    fontSize: 11,
    color: PALETTE.textMuted,
    fontWeight: "600",
  },
});
