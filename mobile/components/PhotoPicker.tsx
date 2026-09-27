import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
  ActionSheetIOS,
  Platform,
  ActivityIndicator,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { PALETTE, SPACING } from "../constants/theme";

interface PhotoPickerProps {
  imageUri: string | null;
  onChangeImage: (uri: string | null) => void;
}

export const PhotoPicker: React.FC<PhotoPickerProps> = ({
  imageUri,
  onChangeImage,
}) => {
  const [loading, setLoading] = useState(false);

  const requestCameraPermission = async (): Promise<boolean> => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Camera Permission Required",
        "RainGuard needs camera access so you can capture evidence photos of disaster incidents directly in the field.",
        [{ text: "OK" }]
      );
      return false;
    }
    return true;
  };

  const requestMediaLibraryPermission = async (): Promise<boolean> => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Gallery Permission Required",
        "RainGuard needs gallery access to attach stored incident photos from your device.",
        [{ text: "OK" }]
      );
      return false;
    }
    return true;
  };

  const handleTakePhoto = async () => {
    try {
      const hasPermission = await requestCameraPermission();
      if (!hasPermission) return;

      setLoading(true);
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        onChangeImage(result.assets[0].uri);
      }
    } catch (err) {
      console.error("Camera capture error:", err);
      Alert.alert("Camera Error", "Could not take photo. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handlePickFromGallery = async () => {
    try {
      const hasPermission = await requestMediaLibraryPermission();
      if (!hasPermission) return;

      setLoading(true);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        onChangeImage(result.assets[0].uri);
      }
    } catch (err) {
      console.error("Gallery picker error:", err);
      Alert.alert("Gallery Error", "Could not load image from gallery.");
    } finally {
      setLoading(false);
    }
  };

  const showPickerOptions = () => {
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ["Cancel", "Take Photo with Camera", "Choose from Gallery"],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) handleTakePhoto();
          if (buttonIndex === 2) handlePickFromGallery();
        }
      );
    } else {
      Alert.alert(
        "Add Incident Photo",
        "Capture live field photo or attach from photo library",
        [
          { text: "Take Photo", onPress: handleTakePhoto },
          { text: "Choose from Gallery", onPress: handlePickFromGallery },
          { text: "Cancel", style: "cancel" },
        ]
      );
    }
  };

  const handleRemovePhoto = () => {
    Alert.alert(
      "Remove Photo",
      "Are you sure you want to remove this attached image?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Remove", style: "destructive", onPress: () => onChangeImage(null) },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={styles.fieldLabel}>INCIDENT PHOTO</Text>
        {imageUri ? (
          <View style={styles.attachedPill}>
            <MaterialCommunityIcons name="check" size={12} color={PALETTE.success} />
            <Text style={styles.attachedText}>PHOTO ATTACHED</Text>
          </View>
        ) : (
          <Text style={styles.optionalNotice}>Recommended</Text>
        )}
      </View>

      {imageUri ? (
        <View style={styles.previewCard}>
          <Image source={{ uri: imageUri }} style={styles.previewImage} resizeMode="cover" />
          
          <View style={styles.imageOverlayFooter}>
            <View style={styles.imageTag}>
              <MaterialCommunityIcons name="shield-check" size={14} color="#FFFFFF" />
              <Text style={styles.imageTagText}>Field Evidence</Text>
            </View>

            <View style={styles.imageActionButtons}>
              <TouchableOpacity
                style={[styles.smallActionButton, styles.replaceButton]}
                onPress={showPickerOptions}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons name="camera-retake-outline" size={16} color="#FFFFFF" />
                <Text style={styles.smallActionText}>Replace</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.smallActionButton, styles.removeButton]}
                onPress={handleRemovePhoto}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons name="trash-can-outline" size={16} color="#FFFFFF" />
                <Text style={styles.smallActionText}>Remove</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ) : (
        <View style={styles.emptyContainer}>
          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="small" color={PALETTE.primaryBlue} />
              <Text style={styles.loadingText}>Accessing camera/gallery...</Text>
            </View>
          ) : (
            <View style={styles.actionsContainer}>
              <TouchableOpacity
                style={styles.primaryAddButton}
                onPress={handleTakePhoto}
                activeOpacity={0.7}
              >
                <View style={styles.buttonIconCircle}>
                  <MaterialCommunityIcons name="camera" size={24} color={PALETTE.primaryBlue} />
                </View>
                <View style={styles.buttonTextWrapper}>
                  <Text style={styles.primaryAddButtonTitle}>Take Field Photo</Text>
                  <Text style={styles.primaryAddButtonSub}>Capture live photo via camera</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryAddButton}
                onPress={handlePickFromGallery}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons name="image-outline" size={18} color={PALETTE.textSecondary} />
                <Text style={styles.secondaryButtonText}>Choose from Gallery</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
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
  optionalNotice: {
    fontSize: 11,
    color: PALETTE.textMuted,
  },
  attachedPill: {
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
  attachedText: {
    fontSize: 9,
    fontWeight: "700",
    color: PALETTE.success,
    letterSpacing: 0.5,
  },
  emptyContainer: {
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: PALETTE.borderMedium,
    borderRadius: 10,
    backgroundColor: PALETTE.surface,
    padding: SPACING.md,
  },
  actionsContainer: {
    gap: SPACING.sm,
  },
  primaryAddButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0F7FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    borderRadius: 8,
    padding: SPACING.md,
    gap: SPACING.md,
  },
  buttonIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#DBEAFE",
    justifyContent: "center",
    alignItems: "center",
  },
  buttonTextWrapper: {
    flex: 1,
  },
  primaryAddButtonTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: PALETTE.primaryBlue,
  },
  primaryAddButtonSub: {
    fontSize: 11,
    color: PALETTE.textMuted,
    marginTop: 1,
  },
  secondaryAddButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: PALETTE.surfaceSecondary,
    borderWidth: 1,
    borderColor: PALETTE.borderLight,
    borderRadius: 8,
    paddingVertical: SPACING.sm,
    gap: SPACING.xs,
  },
  secondaryButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: PALETTE.textSecondary,
  },
  previewCard: {
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 1.5,
    borderColor: PALETTE.borderMedium,
    backgroundColor: "#000000",
  },
  previewImage: {
    width: "100%",
    height: 210,
  },
  imageOverlayFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(15, 23, 42, 0.9)",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  imageTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  imageTagText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  imageActionButtons: {
    flexDirection: "row",
    gap: SPACING.xs,
  },
  smallActionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 4,
    gap: 4,
  },
  replaceButton: {
    backgroundColor: "#334155",
  },
  removeButton: {
    backgroundColor: PALETTE.danger,
  },
  smallActionText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "600",
  },
  loadingBox: {
    paddingVertical: SPACING.xl,
    alignItems: "center",
    gap: SPACING.xs,
  },
  loadingText: {
    fontSize: 13,
    color: PALETTE.textMuted,
  },
});
