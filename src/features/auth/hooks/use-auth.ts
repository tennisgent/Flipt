import { useState, useEffect, useCallback } from "react";
import {
  signInAnonymously,
  signInWithPopup,
  signInWithCredential,
  linkWithPopup,
  onAuthStateChanged,
  updateProfile,
  GoogleAuthProvider,
  type User,
  type AuthCredential,
} from "firebase/auth";
import { auth, googleProvider } from "../../../lib/firebase";

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
  isAnonymous: boolean;
  isGoogleLinked: boolean;
}

export interface LinkResult {
  success: boolean;
  error?: string;
  conflictCredential?: AuthCredential;
}

const hasGoogleProvider = (user: User): boolean =>
  user.providerData.some((p) => p.providerId === "google.com");

export const useAuth = () => {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
    isAnonymous: true,
    isGoogleLinked: false,
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        setState({
          user,
          loading: false,
          error: null,
          isAnonymous: user?.isAnonymous ?? true,
          isGoogleLinked: user ? hasGoogleProvider(user) : false,
        });
      },
      (error) => {
        setState({
          user: null,
          loading: false,
          error: error.message,
          isAnonymous: true,
          isGoogleLinked: false,
        });
      },
    );
    return unsubscribe;
  }, []);

  // Anonymous sign-in (existing flow)
  const signIn = useCallback(async (displayName: string) => {
    try {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      const credential = await signInAnonymously(auth);
      await updateProfile(credential.user, { displayName });
      setState({
        user: credential.user,
        loading: false,
        error: null,
        isAnonymous: true,
        isGoogleLinked: false,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to sign in";
      setState((prev) => ({ ...prev, loading: false, error: message }));
    }
  }, []);

  // Google sign-in (for login screen — new or returning Google users)
  const signInWithGoogle = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      const result = await signInWithPopup(auth, googleProvider);
      setState({
        user: result.user,
        loading: false,
        error: null,
        isAnonymous: false,
        isGoogleLinked: true,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Google sign-in failed";
      setState((prev) => ({ ...prev, loading: false, error: message }));
    }
  }, []);

  // Link anonymous account to Google (preserves uid)
  const linkGoogleAccount = useCallback(async (): Promise<LinkResult> => {
    const currentUser = auth.currentUser;
    if (!currentUser || !currentUser.isAnonymous) {
      return { success: false, error: "No anonymous account to link" };
    }

    try {
      const result = await linkWithPopup(currentUser, googleProvider);
      // Update profile with Google info
      const googleName = result.user.displayName;
      const googlePhoto = result.user.photoURL;
      if (googleName || googlePhoto) {
        await updateProfile(result.user, {
          displayName: googleName ?? currentUser.displayName,
          photoURL: googlePhoto ?? undefined,
        });
      }
      setState({
        user: result.user,
        loading: false,
        error: null,
        isAnonymous: false,
        isGoogleLinked: true,
      });
      return { success: true };
    } catch (error: unknown) {
      // Google account already linked to a different anonymous uid
      const firebaseError = error as { code?: string };
      if (firebaseError.code === "auth/credential-already-in-use") {
        const credential = GoogleAuthProvider.credentialFromError(
          error as Parameters<typeof GoogleAuthProvider.credentialFromError>[0],
        );
        return {
          success: false,
          error: "credential-already-in-use",
          conflictCredential: credential ?? undefined,
        };
      }
      const message =
        error instanceof Error ? error.message : "Failed to link account";
      return { success: false, error: message };
    }
  }, []);

  // Sign in with an existing Google credential (after conflict resolution)
  const resolveGoogleConflict = useCallback(
    async (credential: AuthCredential) => {
      try {
        setState((prev) => ({ ...prev, loading: true, error: null }));
        const result = await signInWithCredential(auth, credential);
        setState({
          user: result.user,
          loading: false,
          error: null,
          isAnonymous: false,
          isGoogleLinked: true,
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to sign in";
        setState((prev) => ({ ...prev, loading: false, error: message }));
      }
    },
    [],
  );

  // Sign out
  const handleSignOut = useCallback(async () => {
    try {
      await auth.signOut();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to sign out";
      setState((prev) => ({ ...prev, error: message }));
    }
  }, []);

  return {
    ...state,
    signIn,
    signInWithGoogle,
    linkGoogleAccount,
    resolveGoogleConflict,
    signOut: handleSignOut,
  };
};
