import { Suit, Player } from "@/lib/types";
import SuitIcon from "./SuitIcon";

interface RoundHeaderProps {
  roundNumber: number;
  totalRounds: number;
  cardsPerPlayer: number;
  trumpSuit: Suit;
  firstBidder: Player;
}

export default function RoundHeader({
  roundNumber,
  totalRounds,
  cardsPerPlayer,
  trumpSuit,
  firstBidder,
}: RoundHeaderProps) {
  return (
    <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-lg font-bold">
            Round {roundNumber} of {totalRounds}
          </h2>
          <p className="text-sm text-zinc-500">
            {cardsPerPlayer} card{cardsPerPlayer !== 1 ? "s" : ""} per player
          </p>
        </div>
        <div className="flex flex-col items-center">
          <SuitIcon suit={trumpSuit} size="lg" />
          <span className="text-xs text-zinc-500 capitalize mt-1">Trump</span>
        </div>
      </div>
      <div className="text-sm text-zinc-500">
        First to bid: <span className="font-medium text-foreground">{firstBidder.name}</span>
      </div>
    </div>
  );
}
