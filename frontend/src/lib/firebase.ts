import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDc6wv-69xeG5hShd4Ac4yP4A6OffAm64M",
  authDomain: "rainguard-87587.firebaseapp.com",
  projectId: "rainguard-87587",
  storageBucket: "rainguard-87587.firebasestorage.app",
  messagingSenderId: "222733816856",
  appId: "1:222733816856:web:f49f80e04ce9b1facfdf6d",
  measurementId: "G-JFMTEKDL26"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);

export { app, auth };
