import { LetterTile } from "./letter-tile";
import "./phrase-display.css";

interface PhraseDisplayProps {
  phrase: string;
  revealedLetters: Set<string>;
  solved: boolean;
}

export const PhraseDisplay = ({
  phrase,
  revealedLetters,
  solved,
}: PhraseDisplayProps) => {
  const words = phrase.split(" ");
  let letterIndex = 0;

  return (
    <div className="phrase-display">
      {words.map((word, wordIdx) => (
        <div key={wordIdx} className="phrase-display__word">
          {[...word].map((char, charIdx) => {
            const idx = letterIndex++;
            const isRevealed =
              solved || revealedLetters.has(char.toLowerCase());
            return (
              <LetterTile
                key={`${wordIdx}-${charIdx}`}
                letter={char}
                revealed={isRevealed}
                delay={solved ? idx * 80 : 0}
              />
            );
          })}
          {/* account for space between words */}
          {wordIdx < words.length - 1 && (letterIndex++, null)}
        </div>
      ))}
    </div>
  );
};
