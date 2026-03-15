import { useEffect, useState } from "react";
import "./letter-tile.css";

interface LetterTileProps {
  letter: string;
  revealed: boolean;
  delay?: number;
}

export const LetterTile = ({ letter, revealed, delay = 0 }: LetterTileProps) => {
  const [flipped, setFlipped] = useState(false);
  const isLetter = /[a-zA-Z]/.test(letter);

  useEffect(() => {
    if (revealed && !flipped) {
      const timer = setTimeout(() => setFlipped(true), delay);
      return () => clearTimeout(timer);
    }
  }, [revealed, flipped, delay]);

  if (!isLetter) {
    return <span className="letter-tile letter-tile--space" />;
  }

  return (
    <span
      className={`letter-tile ${flipped ? "letter-tile--flipped" : ""}`}
    >
      <span className="letter-tile__inner">
        <span className="letter-tile__front" />
        <span className="letter-tile__back">
          {letter.toUpperCase()}
        </span>
      </span>
    </span>
  );
};
