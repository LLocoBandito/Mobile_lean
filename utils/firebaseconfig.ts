// utils/firebaseConfig.ts
import { getApp, getApps, initializeApp } from "firebase/app";
import { initializeFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDZtM8-T7ry_l6NJ7xNe4gwlOTmB4M8rl4",
  authDomain: "leanmonitorapp-1f503.firebaseapp.com",
  projectId: "leanmonitorapp-1f503",
  storageBucket: "leanmonitorapp-1f503.appspot.com", // ✅ gunakan .appspot.com
  messagingSenderId: "209930100873",
  appId: "1:209930100873:web:71469f396cd2abea712658",
};

// 🔥 Gunakan instance yang sudah ada, atau buat baru jika belum
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// ✅ Gunakan long-polling biar stabil di Expo & mobile
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
});

export const storage = getStorage(app);
export default app;
