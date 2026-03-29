import { useGameContext } from "./game-layout";
import { WaitingRoom } from "../../lobby/components/waiting-room";
import { DailyRoundList } from "./daily-round-list";

export const GameIndex = () => {
  const { game } = useGameContext();
  return game.type === "daily" ? <DailyRoundList /> : <WaitingRoom />;
};
