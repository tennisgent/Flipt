import { useState, type FormEvent } from "react";
import "./solve-input.css";

interface SolveInputProps {
  onSolve: (guess: string) => void;
  disabled: boolean;
  attemptsLeft: number;
}

export const SolveInput = ({
  onSolve,
  disabled,
}: SolveInputProps) => {
  const [guess, setGuess] = useState("");
  const [open, setOpen] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (guess.trim().length > 0) {
      onSolve(guess);
      setGuess("");
    }
  };

  if (!open) {
    return (
      <button
        className="solve-input__toggle"
        onClick={() => setOpen(true)}
        disabled={disabled}
      >
        Solve the Puzzle
      </button>
    );
  }

  return (
    <form className="solve-input" onSubmit={handleSubmit}>
      <input
        className="solve-input__field"
        type="text"
        placeholder="Type your guess..."
        value={guess}
        onChange={(e) => setGuess(e.target.value.toUpperCase())}
        autoFocus
        disabled={disabled}
      />
      <div className="solve-input__actions">
        <button
          className="solve-input__submit"
          type="submit"
          disabled={guess.trim().length === 0 || disabled}
        >
          Submit
        </button>
        <button
          className="solve-input__cancel"
          type="button"
          onClick={() => {
            setOpen(false);
            setGuess("");
          }}
        >
          Cancel
        </button>
      </div>
      <p className="solve-input__warning">
        Wrong guesses cost 3 points
      </p>
    </form>
  );
};
