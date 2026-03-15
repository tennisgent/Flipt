import "./keyboard.css";

const ROWS = [
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
  ["Z", "X", "C", "V", "B", "N", "M"],
];

interface KeyboardProps {
  correctLetters: Set<string>;
  wrongLetters: Set<string>;
  onKeyPress: (letter: string) => void;
  disabled: boolean;
}

export const Keyboard = ({
  correctLetters,
  wrongLetters,
  onKeyPress,
  disabled,
}: KeyboardProps) => {
  const getKeyState = (letter: string): string => {
    const lower = letter.toLowerCase();
    if (correctLetters.has(lower)) return "keyboard__key--correct";
    if (wrongLetters.has(lower)) return "keyboard__key--wrong";
    return "";
  };

  return (
    <div className="keyboard">
      {ROWS.map((row, rowIdx) => (
        <div key={rowIdx} className="keyboard__row">
          {row.map((letter) => (
            <button
              key={letter}
              className={`keyboard__key ${getKeyState(letter)}`}
              onClick={() => onKeyPress(letter.toLowerCase())}
              disabled={
                disabled ||
                correctLetters.has(letter.toLowerCase()) ||
                wrongLetters.has(letter.toLowerCase())
              }
            >
              {letter}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
};
