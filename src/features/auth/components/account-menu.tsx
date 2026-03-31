import { useState, useRef, useEffect, useCallback } from "react";
import { type AuthCredential } from "firebase/auth";
import { useAuthContext } from "./auth-provider";
import "./account-menu.css";

export const AccountMenu = () => {
  const {
    user,
    isAnonymous,
    isGoogleLinked,
    linkGoogleAccount,
    resolveGoogleConflict,
    signOut,
  } = useAuthContext();
  const [open, setOpen] = useState(false);
  const [linking, setLinking] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [conflictCredential, setConflictCredential] =
    useState<AuthCredential | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  const handleLink = useCallback(async () => {
    setLinking(true);
    setLinkError(null);
    setConflictCredential(null);

    const result = await linkGoogleAccount();

    if (result.success) {
      setLinking(false);
      return;
    }

    if (
      result.error === "credential-already-in-use" &&
      result.conflictCredential
    ) {
      setConflictCredential(result.conflictCredential);
      setLinkError(null);
      setLinking(false);
      return;
    }

    setLinkError(result.error ?? "Failed to link account");
    setLinking(false);
  }, [linkGoogleAccount]);

  const handleResolveConflict = useCallback(async () => {
    if (!conflictCredential) return;
    setLinking(true);
    await resolveGoogleConflict(conflictCredential);
    setConflictCredential(null);
    setLinking(false);
    setOpen(false);
  }, [conflictCredential, resolveGoogleConflict]);

  if (!user) return null;

  const initial = (user.displayName || "?")[0].toUpperCase();
  const photoURL = user.photoURL;
  const email = user.providerData.find(
    (p) => p.providerId === "google.com",
  )?.email;

  return (
    <div className="account-menu" ref={menuRef}>
      <button
        className="account-menu__trigger"
        onClick={() => setOpen(!open)}
        aria-label="Account menu"
      >
        {photoURL ? (
          <img
            className="account-menu__avatar"
            src={photoURL}
            alt={user.displayName || "Avatar"}
            referrerPolicy="no-referrer"
          />
        ) : (
          <span className="account-menu__initial">{initial}</span>
        )}
      </button>

      {open && (
        <div className="account-menu__dropdown">
          <div className="account-menu__info">
            <span className="account-menu__name">
              {user.displayName || "Player"}
            </span>
            <span className="account-menu__status">
              {isGoogleLinked ? email || "Google account" : "Guest account"}
            </span>
          </div>

          {isAnonymous && !conflictCredential && (
            <button
              className="account-menu__action account-menu__action--link"
              onClick={handleLink}
              disabled={linking}
            >
              <svg className="account-menu__google-icon" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              {linking ? "Linking..." : "Link Google Account"}
            </button>
          )}

          {isGoogleLinked && (
            <div className="account-menu__linked">
              <svg
                className="account-menu__check-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Google linked
            </div>
          )}

          {conflictCredential && (
            <div className="account-menu__conflict">
              <p className="account-menu__conflict-text">
                This Google account is already linked to another player. Sign in
                as that player instead?
              </p>
              <div className="account-menu__conflict-actions">
                <button
                  className="account-menu__action account-menu__action--confirm"
                  onClick={handleResolveConflict}
                  disabled={linking}
                >
                  {linking ? "Switching..." : "Yes, switch"}
                </button>
                <button
                  className="account-menu__action account-menu__action--cancel"
                  onClick={() => setConflictCredential(null)}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {linkError && (
            <p className="account-menu__error">{linkError}</p>
          )}

          <button
            className="account-menu__action account-menu__action--signout"
            onClick={signOut}
          >
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
};
