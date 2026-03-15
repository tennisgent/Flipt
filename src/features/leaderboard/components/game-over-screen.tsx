import type { Game } from "../../../lib/types";
import "./game-over-screen.css";

interface GameOverScreenProps {
  game: Game;
  playerUid: string;
  onPlayAgain: () => void;
}

export const GameOverScreen = ({
  game,
  playerUid,
  onPlayAgain,
}: GameOverScreenProps) => {
  const players = Object.values(game.players).sort(
    (a, b) => b.totalScore - a.totalScore,
  );
  const winner = players[0];
  const isWinner = winner?.uid === playerUid;

  return (
    <div className="game-over">
      <div className="game-over__card">
        <h1 className="game-over__title">Game Over!</h1>

        <div className="game-over__winner">
          <span className="game-over__winner-crown">
            {isWinner ? "You Win!" : `${winner.displayName} Wins!`}
          </span>
          <span className="game-over__winner-score">
            {winner.totalScore} pts
          </span>
        </div>

        <ol className="game-over__standings">
          {players.map((player, index) => {
            const isMe = player.uid === playerUid;
            return (
              <li
                key={player.uid}
                className={`game-over__player ${isMe ? "game-over__player--me" : ""}`}
              >
                <span className="game-over__player-position">
                  {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `${index + 1}`}
                </span>
                <span className="game-over__player-name">
                  {player.displayName}
                  {isMe && " (you)"}
                </span>
                <span className="game-over__player-rounds">
                  {player.roundsCompleted} rounds
                </span>
                <span className="game-over__player-score">
                  {player.totalScore} pts
                </span>
              </li>
            );
          })}
        </ol>

        <button className="game-over__play-again" onClick={onPlayAgain}>
          Play Again
        </button>
      </div>
    </div>
  );
};
