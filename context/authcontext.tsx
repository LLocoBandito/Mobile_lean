import React, { createContext, ReactNode, useContext, useState } from "react";

type AuthContextType = {
  user: any;
  loading: boolean;
  login: (email: string, password: string) => void;
  logout: () => void;
  register: (email: string, password: string) => void;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: false,
  login: () => {},
  logout: () => {},
  register: () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const login = (email: string, password: string) => {
    setLoading(true);
    // Simulasi login UI (tanpa Firebase)
    setTimeout(() => {
      setUser({ email });
      setLoading(false);
    }, 1000);
  };

  const logout = () => {
    setUser(null);
  };

  const register = (email: string, password: string) => {
    // Simulasi register (tanpa Firebase)
    setUser({ email });
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, register }}>
      {children}
    </AuthContext.Provider>
  );
};
