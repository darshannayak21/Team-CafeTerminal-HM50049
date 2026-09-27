import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  StyleSheet,
  Pressable,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { IncidentType } from "../types/report";
import { PALETTE, SPACING } from "../constants/theme";

interface Option {
  label: IncidentType;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  description: string;
}

const INCIDENT_OPTIONS: Option[] = [
  {
    label: "Flooded Road",
    icon: "water-alert",
    description: "Roadway submerged or water flow exceeding safe traversal limits.",
  },
  {
    label: "Road Blocked",
    icon: "road-variant",
    description: "Debris, fallen trees, or barriers preventing vehicle movement.",
  },
  {
    label: "Bridge Damage",
    icon: "bridge",
    description: "Structural fracture, scouring, or bridge approach erosion.",
  },
  {
    label: "Waterlogging",
    icon: "waves",
    description: "Localized standing water affecting settlements or transit corridors.",
  },
  {
    label: "Landslide",
    icon: "terrain",
    description: "Slope failure, rockfall, or mud movement across roadway.",
  },
  {
    label: "Power Infrastructure Damage",
    icon: "flash-alert",
    description: "Downed power lines, damaged transformers, or exposed cables.",
  },
  {
    label: "Other",
    icon: "alert-circle-outline",
    description: "Any other critical hazard or infrastructure disruption.",
  },
];

interface IncidentTypeSelectorProps {
  value: IncidentType | "";
  onSelect: (value: IncidentType) => void;
  error?: string;
}

export const IncidentTypeSelector: React.FC<IncidentTypeSelectorProps> = ({
  value,
  onSelect,
  error,
}) => {
  const [modalVisible, setModalVisible] = useState(false);

  const selectedOption = INCIDENT_OPTIONS.find((opt) => opt.label === value);

  const handleSelect = (item: Option) => {
    onSelect(item.label);
    setModalVisible(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={styles.fieldLabel}>
          INCIDENT TYPE <Text style={styles.requiredStar}>*</Text>
        </Text>
        {value ? (
          <View style={styles.selectedPill}>
            <Text style={styles.selectedPillText}>SELECTED</Text>
          </View>
        ) : (
          <Text style={styles.requiredNotice}>Required</Text>
        )}
      </View>

      <TouchableOpacity
        style={[
          styles.triggerButton,
          Boolean(error) && styles.triggerError,
          Boolean(value) && styles.triggerActive,
        ]}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.7}
      >
        <View style={styles.triggerLeft}>
          <View style={[styles.iconBox, Boolean(value) && styles.iconBoxActive]}>
            <MaterialCommunityIcons
              name={selectedOption ? selectedOption.icon : "format-list-bulleted"}
              size={20}
              color={value ? PALETTE.primaryBlue : PALETTE.textMuted}
            />
          </View>
          <View style={styles.triggerTextContainer}>
            <Text style={value ? styles.triggerTextValue : styles.triggerTextPlaceholder}>
              {value || "Select incident type..."}
            </Text>
          </View>
        </View>

        <MaterialCommunityIcons
          name="chevron-down"
          size={22}
          color={value ? PALETTE.textSecondary : PALETTE.textMuted}
        />
      </TouchableOpacity>

      {error ? (
        <View style={styles.errorRow}>
          <MaterialCommunityIcons name="alert-circle" size={14} color={PALETTE.danger} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {/* Modal Dropdown Picker */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setModalVisible(false)}>
          <Pressable style={styles.sheetContainer} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHeader}>
              <View style={styles.dragHandle} />
              <View style={styles.sheetHeaderRow}>
                <View>
                  <Text style={styles.sheetTitle}>Select Incident Type</Text>
                  <Text style={styles.sheetSubtitle}>Choose the hazard category that best matches</Text>
                </View>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setModalVisible(false)}
                >
                  <MaterialCommunityIcons name="close" size={20} color={PALETTE.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>

            <FlatList
              data={INCIDENT_OPTIONS}
              keyExtractor={(item) => item.label}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              renderItem={({ item }) => {
                const isSelected = item.label === value;
                return (
                  <TouchableOpacity
                    style={[styles.optionItem, isSelected && styles.optionItemSelected]}
                    onPress={() => handleSelect(item)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.optionIconBox, isSelected && styles.optionIconBoxSelected]}>
                      <MaterialCommunityIcons
                        name={item.icon}
                        size={22}
                        color={isSelected ? "#FFFFFF" : PALETTE.textSecondary}
                      />
                    </View>
                    <View style={styles.optionContent}>
                      <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>
                        {item.label}
                      </Text>
                      <Text style={styles.optionDescription}>{item.description}</Text>
                    </View>
                    {isSelected && (
                      <MaterialCommunityIcons
                        name="check-circle"
                        size={22}
                        color={PALETTE.primaryBlue}
                      />
                    )}
                  </TouchableOpacity>
                );
              }}
              contentContainerStyle={styles.listContent}
            />
          </Pressable>
        </Pressable>
      </Modal>
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
    fontWeight: "500",
  },
  selectedPill: {
    backgroundColor: PALETTE.successLight,
    borderColor: PALETTE.successBorder,
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
  },
  selectedPillText: {
    fontSize: 9,
    fontWeight: "700",
    color: PALETTE.success,
    letterSpacing: 0.5,
  },
  triggerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: PALETTE.surface,
    borderWidth: 1.5,
    borderColor: PALETTE.borderMedium,
    borderRadius: 8,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    minHeight: 52,
  },
  triggerActive: {
    borderColor: PALETTE.primaryBlue,
    backgroundColor: "#FFFFFF",
  },
  triggerError: {
    borderColor: PALETTE.danger,
    backgroundColor: PALETTE.dangerLight,
  },
  triggerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: SPACING.sm,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: PALETTE.surfaceSecondary,
    justifyContent: "center",
    alignItems: "center",
  },
  iconBoxActive: {
    backgroundColor: "#EFF6FF",
  },
  triggerTextContainer: {
    flex: 1,
  },
  triggerTextValue: {
    fontSize: 15,
    fontWeight: "700",
    color: PALETTE.textPrimary,
  },
  triggerTextPlaceholder: {
    fontSize: 15,
    fontWeight: "400",
    color: PALETTE.textMuted,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    justifyContent: "flex-end",
  },
  sheetContainer: {
    backgroundColor: PALETTE.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: "80%",
    paddingBottom: SPACING.xxl,
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: PALETTE.borderDark,
    alignSelf: "center",
    marginTop: 8,
    marginBottom: 8,
  },
  sheetHeader: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: PALETTE.borderLight,
  },
  sheetHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: PALETTE.textPrimary,
  },
  sheetSubtitle: {
    fontSize: 12,
    color: PALETTE.textMuted,
    marginTop: 2,
  },
  closeButton: {
    padding: 4,
  },
  listContent: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
  },
  separator: {
    height: 1,
    backgroundColor: PALETTE.borderLight,
  },
  optionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: SPACING.md,
    gap: SPACING.md,
  },
  optionItemSelected: {
    backgroundColor: "#F8FAFC",
  },
  optionIconBox: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: PALETTE.surfaceSecondary,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: PALETTE.borderLight,
  },
  optionIconBoxSelected: {
    backgroundColor: PALETTE.primaryBlue,
    borderColor: PALETTE.primaryBlue,
  },
  optionContent: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: PALETTE.textPrimary,
    marginBottom: 2,
  },
  optionLabelSelected: {
    color: PALETTE.primaryBlue,
    fontWeight: "700",
  },
  optionDescription: {
    fontSize: 11,
    color: PALETTE.textMuted,
    lineHeight: 15,
  },
});
