import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";

import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "./firebaseConfig";

/**
 * REGISTER
 */
export const handleRegister = async (
  email: string,
  password: string,
  name: string
) => {
  try {
    // 1. Create account
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );

    const user = userCredential.user;

    // 2. Set display name
    await updateProfile(user, {
      displayName: name,
    });

    // 3. Send email verification
    await sendEmailVerification(user);

    // 4. Save user profile to Firestore
    await setDoc(
      doc(db, "users", user.uid),
      {
        uid: user.uid,
        email: user.email,
        name,
        emailVerified: false,
        createdAt: new Date().toISOString(),
        photoURL: null,
      },
      { merge: true }
    );

    console.log("REGISTER SUCCESS + EMAIL VERIFICATION SENT");
    return user;
  } catch (error) {
    console.error("REGISTER ERROR:", error);
    throw error;
  }
};

/**
 * LOGIN (BLOCK IF EMAIL NOT VERIFIED)
 */
export const handleLogin = async (email: string, password: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );

    const user = userCredential.user;

    if (!user.emailVerified) {
      throw new Error("Email belum diverifikasi. Silakan cek email Anda.");
    }

    // Optional: sync emailVerified to Firestore
    const userRef = doc(db, "users", user.uid);
    const snap = await getDoc(userRef);

    if (snap.exists()) {
      await setDoc(userRef, { emailVerified: true }, { merge: true });
    }

    console.log("LOGIN SUCCESS:", user.uid);
    return user;
  } catch (error) {
    console.error("LOGIN ERROR:", error);
    throw error;
  }
};

/**
 * RESET PASSWORD
 */
export const handlePasswordReset = async (email: string) => {
  try {
    await sendPasswordResetEmail(auth, email);
    console.log("RESET PASSWORD EMAIL SENT:", email);
  } catch (error) {
    console.error("RESET PASSWORD ERROR:", error);
    throw error;
  }
};
