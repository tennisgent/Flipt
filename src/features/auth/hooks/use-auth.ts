import { useState, useEffect, useCallback } from "react";
import {
  signInAnonymously,
  onAuthStateChanged,
  updateProfile,
  type User,
} from "firebase/auth";
import { auth } from "../../../lib/firebase";

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

export const useAuth = () => {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        setState({ user, loading: false, error: null });
      },
      (error) => {
        setState({ user: null, loading: false, error: error.message });
      },
    );
    return unsubscribe;
  }, []);

  const signIn = useCallback(async (displayName: string) => {
    try {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      const credential = await signInAnonymously(auth);
      await updateProfile(credential.user, { displayName });
      setState({ user: credential.user, loading: false, error: null });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to sign in";
      setState((prev) => ({ ...prev, loading: false, error: message }));
    }
  }, []);

  return { ...state, signIn };
};
