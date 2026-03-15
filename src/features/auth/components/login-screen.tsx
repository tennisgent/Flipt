import { useState, type FormEvent } from "react";
import { useAuthContext } from "./auth-provider";
import "./login-screen.css";

export const LoginScreen = () => {
  const { signIn, loading, error } = useAuthContext();
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
          {error && <p className="login-screen__error">{error}</p>}
        </form>
      </div>
    </div>
  );
};
