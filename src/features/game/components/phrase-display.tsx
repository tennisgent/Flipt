import { useEffect, useRef } from "react";
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
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const words = phrase.split(" ");
  const longestWordLength = Math.max(...words.map((w) => w.length));

  useEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;

    let lastWidth = 0;

    const update = () => {
      const style = getComputedStyle(outer);
      const available =
        outer.clientWidth -
        parseFloat(style.paddingLeft) -
        parseFloat(style.paddingRight);

      if (available === lastWidth) return;
      lastWidth = available;

      // Read the actual card-width and card-gap from CSS
      const rootFs = parseFloat(
        getComputedStyle(document.documentElement).fontSize,
      );
      const cardWidthStr = getComputedStyle(inner).getPropertyValue(
        "--card-width",
      );
      const cardGapStr =
        getComputedStyle(inner).getPropertyValue("--card-gap");
      const cardW = parseFloat(cardWidthStr) * rootFs;
      const gap = parseFloat(cardGapStr) * rootFs;
      const naturalWordWidth =
        longestWordLength * cardW + (longestWordLength - 1) * gap;

      const scale = Math.min(1, available / naturalWordWidth);

      if (scale < 1) {
        // Let layout happen at the full (unscaled) width, then scale down
        inner.style.width = `${available / scale}px`;
        inner.style.transform = `scale(${scale})`;
        // Negative margin compensates for transform not affecting layout
        const contentHeight = inner.scrollHeight;
        inner.style.marginBottom = `${contentHeight * (scale - 1)}px`;
      } else {
        inner.style.width = "100%";
        inner.style.transform = "none";
        inner.style.marginBottom = "0";
      }
    };

    const observer = new ResizeObserver(update);
    observer.observe(outer);
    return () => observer.disconnect();
  }, [longestWordLength]);

  let letterIndex = 0;

  return (
    <div ref={outerRef} className="phrase-display">
      <div ref={innerRef} className="phrase-display__inner">
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
    </div>
  );
};
