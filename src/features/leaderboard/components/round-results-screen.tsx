import { useRoundResults } from "../hooks/use-round-results";
import type { Game } from "../../../lib/types";
import "./round-results-screen.css";

interface RoundResultsScreenProps {
  game: Game;
  roundId: string;
  roundNumber: number;
  playerUid: string;
  onContinue: () => void;
  isLastRound: boolean;
}

export const RoundResultsScreen = ({
  game,
  roundId,
  roundNumber,
  playerUid,
  onContinue,
  isLastRound,
}: RoundResultsScreenProps) => {
  const { results, loading } = useRoundResults(roundId);

  const totalPlayers = Object.keys(game.players).length;
  const allFinished = results.length >= totalPlayers;
  const myResult = results.find((r) => r.playerUid === playerUid);

  if (loading) {
    return (
      <div className="round-results">
        <p className="round-results__loading">Waiting for results...</p>
      </div>
    );
  }

  return (
    <div className="round-results">
      <div className="round-results__card">
        <h2 className="round-results__title">
          Round {roundNumber} Results
        </h2>

        {myResult && (
          <div className="round-results__my-score">
            <span className="round-results__my-score-label">Your Score</span>
            <span className="round-results__my-score-value">
              {myResult.score >= 0 ? "+" : ""}
              {myResult.score}
            </span>
            <div className="round-results__my-details">
              {myResult.solved && (
                <span className="round-results__badge round-results__badge--solved">
                  Solved
                </span>
              )}
              {!myResult.usedHint && (
                <span className="round-results__badge round-results__badge--no-hint">
                  No Hint
                </span>
              )}
            </div>
          </div>
        )}

        <div className="round-results__list">
          <h3 className="round-results__list-title">
            {allFinished
              ? "Final Standings"
              : `Waiting for players... (${results.length}/${totalPlayers})`}
          </h3>
          <ol className="round-results__rankings">
            {results.map((result, index) => {
              const player = game.players[result.playerUid];
              const isMe = result.playerUid === playerUid;
              return (
                <li
                  key={result.id}
                  className={`round-results__rank ${isMe ? "round-results__rank--me" : ""}`}
                >
                  <span className="round-results__rank-position">
                    {index + 1}
                  </span>
                  <span className="round-results__rank-name">
                    {player?.displayName || "Unknown"}
                    {isMe && " (you)"}
                  </span>
                  <span className="round-results__rank-details">
                    {result.solved ? "Solved" : "Unsolved"}
                  </span>
                  <span className="round-results__rank-score">
                    {result.score >= 0 ? "+" : ""}
                    {result.score}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>

        {allFinished && (
          <button
            className="round-results__continue"
            onClick={onContinue}
          >
            {isLastRound ? "See Final Results" : "Next Round"}
          </button>
        )}

        {!allFinished && (
          <p className="round-results__waiting-hint">
            Results will update live as players finish
          </p>
        )}
      </div>
    </div>
  );
};
