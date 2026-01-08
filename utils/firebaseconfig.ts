// utils/firebaseConfig.ts
import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDZtM8-T7ry_l6NJ7xNe4gwlOTmB4M8rl4",
  authDomain: "leanmonitorapp-1f503.firebaseapp.com",
  projectId: "leanmonitorapp-1f503",
  storageBucket: "leanmonitorapp-1f503.appspot.com",
  messagingSenderId: "209930100873",
  appId: "1:209930100873:web:71469f396cd2abea712658",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export { app };
export default app;
