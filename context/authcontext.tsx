import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
// 👉 sesuaikan import auth kamu
// contoh Firebase:
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "../utils/firebaseConfig";

/**
 * DATA USER
 */
export type UserProfile = {
  uid: string;
  email: string | null;
  name?: string | null;
  photoURL?: string | null;
  phone?: string;
};

/**
 * CONTEXT TYPE
 */
type AuthContextType = {
  user: UserProfile | null;
  loading: boolean;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => void;
};

/**
 * CONTEXT
 */
const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * HOOK
 */
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return ctx;
};

/**
 * PROVIDER
 */
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  /**
   * LISTEN AUTH STATE (Email & Google)
   */
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          name: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  /**
   * UPDATE DATA PROFILE (apply / editprofile)
   */
  const updateProfile = (data: Partial<UserProfile>) => {
    setUser((prev) => {
      if (!prev) return prev;
      return { ...prev, ...data };
    });
  };

  /**
   * LOGOUT
   */
  const logout = async () => {
    await signOut(auth);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        logout,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
