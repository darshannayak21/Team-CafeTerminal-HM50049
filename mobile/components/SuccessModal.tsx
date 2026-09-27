import React from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  ScrollView,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Report } from "../types/report";
import { PALETTE, SPACING } from "../constants/theme";
import { reportService } from "../services/reportService";

interface SuccessModalProps {
  visible: boolean;
  report: Report | null;
  onDismiss: () => void;
}

export const SuccessModal: React.FC<SuccessModalProps> = ({
  visible,
  report,
  onDismiss,
}) => {
  if (!report) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Success Header Indicator */}
            <View style={styles.iconCircle}>
              <MaterialCommunityIcons name="check-circle-outline" size={44} color={PALETTE.success} />
            </View>

            <Text style={styles.successTitle}>Report captured</Text>
            <Text style={styles.successSubtitle}>
              Your incident report is ready to be sent to the RainGuard response dashboard.
            </Text>

            {/* Prototype Local Storage Notice */}
            <View style={styles.prototypeNotice}>
              <View style={styles.noticeHeader}>
                <MaterialCommunityIcons name="information-outline" size={15} color={PALETTE.warning} />
                <Text style={styles.noticeHeading}>LOCAL PROTOTYPE MODE</Text>
              </View>
              <Text style={styles.noticeBody}>
                This incident record has been validated and saved to this device. In upcoming phases, it will automatically synchronize to the live RainGuard dispatcher console.
              </Text>
            </View>

            {/* Report Summary Card */}
            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>TRACKING ID</Text>
                <Text style={styles.summaryId}>{report.id}</Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>TYPE</Text>
                <Text style={styles.summaryValue}>{report.type}</Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>COORDINATES</Text>
                <Text style={styles.summaryValue}>
                  {report.latitude?.toFixed(5)}°, {report.longitude?.toFixed(5)}°
                </Text>
              </View>

              {report.locationName ? (
                <>
                  <View style={styles.divider} />
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>LOCATION</Text>
                    <Text style={[styles.summaryValue, styles.locationText]}>
                      {report.locationName}
                    </Text>
                  </View>
                </>
              ) : null}

              <View style={styles.divider} />

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>TIMESTAMP</Text>
                <Text style={styles.summaryValue}>
                  {reportService.formatTimestamp(report.timestamp)}
                </Text>
              </View>

              {report.imageUri && (
                <>
                  <View style={styles.divider} />
                  <View style={styles.photoSummarySection}>
                    <Text style={styles.summaryLabel}>ATTACHED EVIDENCE</Text>
                    <Image
                      source={{ uri: report.imageUri }}
                      style={styles.thumbnail}
                      resizeMode="cover"
                    />
                  </View>
                </>
              )}

              {Boolean(report.description) && (
                <>
                  <View style={styles.divider} />
                  <View style={styles.descSection}>
                    <Text style={styles.summaryLabel}>DESCRIPTION</Text>
                    <Text style={styles.descText}>{report.description}</Text>
                  </View>
                </>
              )}
            </View>

            {/* Action Buttons */}
            <TouchableOpacity style={styles.actionButton} onPress={onDismiss} activeOpacity={0.8}>
              <MaterialCommunityIcons name="plus-circle-outline" size={20} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>Report Another Incident</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.75)",
    justifyContent: "center",
    alignItems: "center",
    padding: SPACING.lg,
  },
  modalCard: {
    backgroundColor: PALETTE.surface,
    borderRadius: 14,
    width: "100%",
    maxHeight: "90%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  scrollContent: {
    padding: SPACING.xl,
    alignItems: "center",
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: PALETTE.successLight,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: PALETTE.successBorder,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: PALETTE.textPrimary,
    textAlign: "center",
  },
  successSubtitle: {
    fontSize: 13,
    color: PALETTE.textSecondary,
    textAlign: "center",
    marginTop: 6,
    lineHeight: 18,
    marginBottom: SPACING.lg,
  },
  prototypeNotice: {
    backgroundColor: PALETTE.warningLight,
    borderWidth: 1,
    borderColor: PALETTE.warningBorder,
    borderRadius: 8,
    padding: SPACING.md,
    width: "100%",
    marginBottom: SPACING.md,
  },
  noticeHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  noticeHeading: {
    fontSize: 11,
    fontWeight: "800",
    color: PALETTE.warning,
    letterSpacing: 0.5,
  },
  noticeBody: {
    fontSize: 11,
    color: "#92400E",
    lineHeight: 16,
  },
  summaryCard: {
    backgroundColor: PALETTE.surfaceSecondary,
    borderWidth: 1,
    borderColor: PALETTE.borderMedium,
    borderRadius: 8,
    padding: SPACING.md,
    width: "100%",
    marginBottom: SPACING.lg,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: PALETTE.textMuted,
    letterSpacing: 0.5,
  },
  summaryId: {
    fontSize: 12,
    fontWeight: "700",
    color: PALETTE.primaryBlue,
    fontVariant: ["tabular-nums"],
  },
  summaryValue: {
    fontSize: 12,
    fontWeight: "600",
    color: PALETTE.textPrimary,
  },
  locationText: {
    maxWidth: "60%",
    textAlign: "right",
  },
  divider: {
    height: 1,
    backgroundColor: PALETTE.borderLight,
    marginVertical: 6,
  },
  photoSummarySection: {
    paddingVertical: 4,
    gap: 6,
  },
  thumbnail: {
    width: "100%",
    height: 120,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: PALETTE.borderLight,
  },
  descSection: {
    paddingVertical: 4,
    gap: 4,
  },
  descText: {
    fontSize: 12,
    color: PALETTE.textSecondary,
    lineHeight: 16,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: PALETTE.primaryDark,
    borderRadius: 8,
    paddingVertical: 14,
    width: "100%",
    gap: SPACING.sm,
  },
  actionButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
});
