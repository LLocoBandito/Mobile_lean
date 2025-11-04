import { FirebaseApp, getApp, getApps, initializeApp } from "firebase/app";
// Reverting to simple getAuth() due to persistent TypeScript errors with persistence utilities in this environment.
// Jika error 'auth/configuration-not-found' kembali, mohon pastikan kembali (triple-check) apiKey dan authDomain di Firebase console.
import { Auth, getAuth } from "firebase/auth";
import { Firestore, initializeFirestore } from "firebase/firestore";
import { FirebaseStorage, getStorage } from "firebase/storage";

// ========================
// 1. Firebase Config
// ========================
const firebaseConfig = {
  apiKey: "AIzaSyDZtM8-T7ry_l6NJ7xNe4gwlOTmB4M8rl4",
  authDomain: "leanmonitorapp-1f503.firebaseapp.com",
  projectId: "leanmonitorapp-1f503",
  storageBucket: "leanmonitorapp-1f503.appspot.com",
  messagingSenderId: "209930100873",
  appId: "1:209930100873:web:71469f396cd2abea712658",
};

// ========================
// 2. Initialize Firebase App
// ========================
const app: FirebaseApp =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// ========================
// 3. Initialize Firestore
// ========================
export const db: Firestore = initializeFirestore(app, {
  experimentalForceLongPolling: true,
});

// ========================
// 4. Initialize Storage
// ========================
export const storage: FirebaseStorage = getStorage(app);

// ========================
// 5. Initialize Auth (Clean setup, relying on Firebase defaults)
// Mengembalikan inisialisasi Auth ke pola dasar (getAuth(app)) untuk menghindari error build.
// ========================
export const auth: Auth = getAuth(app);

// ========================
// 6. Export app
// ========================
export { app };
export default app;
