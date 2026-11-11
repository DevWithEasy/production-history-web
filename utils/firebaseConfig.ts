import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Firebase web config is NOT a secret. It always ships to the browser bundle,
// so keeping it here is safe (and means no env vars are needed on Cloudflare).
// Real security lives in Firestore Security Rules + API key restrictions.
const firebaseConfig = {
  apiKey: "AIzaSyBXmrrsQUBXFfiSza0A009tFDg76FOtX2o",
  authDomain: "production-history.firebaseapp.com",
  projectId: "production-history",
  storageBucket: "production-history.firebasestorage.app",
  messagingSenderId: "666462613698",
  appId: "1:666462613698:web:9e59d50aac76042721cb5b",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
