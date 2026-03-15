import { createContext, useContext, type ReactNode } from "react";
import { type User } from "firebase/auth";
import { useAuth } from "../hooks/use-auth";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  error: string | null;
  signIn: (displayName: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const useAuthContext = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuthContext must be used within AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const auth = useAuth();

  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
};
