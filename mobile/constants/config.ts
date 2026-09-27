/**
 * Mobile App Configuration
 *
 * NOTE FOR PHYSICAL PHONE (Expo Go):
 * When running Expo Go on a physical phone, 'localhost' refers to the phone itself.
 * Ensure your phone and laptop are connected to the same Wi-Fi / LAN network,
 * and set API_BASE_URL to your laptop's LAN IP address (e.g. http://10.132.64.194:5000 or http://192.168.x.x:5000).
 */

import { Platform } from "react-native";

// Change this LAN IP if your laptop's IP address changes on your local network
export const DEFAULT_LAN_IP = "10.132.64.194";
export const BACKEND_PORT = 5000;

// Auto-selects appropriate host for Android emulator, iOS simulator, or physical phone
export const API_BASE_URL = (() => {
  // If running on a physical device or Expo Go over LAN:
  return `http://${DEFAULT_LAN_IP}:${BACKEND_PORT}`;
})();

export const REQUEST_TIMEOUT_MS = 15000;
