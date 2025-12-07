import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  updateProfile, // Diperlukan untuk setting displayName
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore"; // Diperlukan untuk menyimpan ke Firestore
import { auth, db } from "./firebaseConfig"; // Pastikan 'db' diimpor dari file config Anda

/**
 * Fungsi untuk mendaftarkan user baru dengan Email, Password, dan Nama.
 * Dokumen profil awal akan dibuat di Firestore.
 * @param email Email user
 * @param password Password user
 * @param name Nama lengkap user (tambahan)
 */
export const handleRegister = async (
  email: string,
  password: string,
  name: string // <<< PARAMETER BARU DITAMBAHKAN
) => {
  try {
    // 1. Buat User di Firebase Authentication
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );
    const user = userCredential.user;

    // 2. Update Display Name (Opsional, tapi bagus)
    await updateProfile(user, { displayName: name });

    // 3. Buat Dokumen Profil Awal di Firestore
    const userDocRef = doc(db, "users", user.uid);

    await setDoc(
      userDocRef,
      {
        uid: user.uid,
        email: user.email,
        name: name, // Simpan nama yang diinput
        createdAt: new Date().toISOString(),
        photoURL: null, // Setel awal photoURL menjadi null
      },
      { merge: true } // Gunakan merge: true
    );

    console.log("Pendaftaran Berhasil & Dokumen Profil Dibuat:", user.uid);
    return user;
  } catch (error) {
    console.error("Firebase Registration Error:", error);
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
    console.error("Firebase Login Error:", error);
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
