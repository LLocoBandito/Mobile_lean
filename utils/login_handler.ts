import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { auth } from "./firebaseconfig";

/**
 * Fungsi untuk mendaftarkan user baru dengan Email dan Password.
 * @param email Email user
 * @param password Password user
 */
export const handleRegister = async (email: string, password: string) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );
    console.log("Pendaftaran Berhasil:", userCredential.user.uid);
    return userCredential.user;
  } catch (error) {
    // Log error untuk debugging
    console.error("Firebase Registration Error:", error);
    // Lempar error agar bisa ditangkap oleh komponen RegisterScreen
    throw error;
  }
};

/**
 * Fungsi untuk melakukan Login user dengan Email dan Password.
 * @param email Email user
 * @param password Password user
 */
export const handleLogin = async (email: string, password: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );
    console.log("Login Berhasil:", userCredential.user.uid);
    return userCredential.user;
  } catch (error) {
    // Log error untuk debugging
    console.error("Firebase Login Error:", error);
    // Lempar error agar bisa ditangkap oleh komponen LoginScreen
    throw error;
  }
};

/**
 * Fungsi untuk mengirim email reset password.
 * @param email Email user yang ingin direset passwordnya
 */
export const handlePasswordReset = async (email: string) => {
  try {
    await sendPasswordResetEmail(auth, email);
    console.log("Email reset password berhasil dikirim ke:", email);
  } catch (error) {
    console.error("Firebase Password Reset Error:", error);
    throw error;
  }
};
