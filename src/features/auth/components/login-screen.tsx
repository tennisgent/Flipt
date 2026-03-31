import { useState, type FormEvent } from "react";
import { useAuthContext } from "./auth-provider";
import "./login-screen.css";

export const LoginScreen = () => {
  const { signIn, signInWithGoogle, loading, error } = useAuthContext();
  const [name, setName] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length >= 2) {
      signIn(trimmed);
    }
  };

  return (
    <div className="login-screen">
      <div className="login-screen__card">
        <h1 className="login-screen__logo">FLIPT</h1>
        <p className="login-screen__tagline">
          The async phrase-guessing game
        </p>

        <form className="login-screen__form" onSubmit={handleSubmit}>
          <label className="login-screen__label" htmlFor="display-name">
            What should we call you?
          </label>
          <input
            id="display-name"
            className="login-screen__input"
            type="text"
            placeholder="Enter your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={20}
            autoFocus
            disabled={loading}
          />
          <button
            className="login-screen__button"
            type="submit"
            disabled={name.trim().length < 2 || loading}
          >
            {loading ? "Joining..." : "Let's Play"}
          </button>
        </form>

        <div className="login-screen__divider">
          <span className="login-screen__divider-text">or</span>
        </div>

        <button
          className="login-screen__google-button"
          onClick={signInWithGoogle}
          disabled={loading}
          type="button"
        >
          <svg className="login-screen__google-icon" viewBox="0 0 24 24">
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
          Sign in with Google
        </button>

        {error && <p className="login-screen__error">{error}</p>}
      </div>
    </div>
  );
};
