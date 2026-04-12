"use client";

import { GameState, GameAction } from "@/lib/types";
import { getRotatedPlayerOrder } from "@/lib/game-logic";
import RoundHeader from "./RoundHeader";
import BiddingPhase from "./BiddingPhase";
import ScoringPhase from "./ScoringPhase";
import Scoreboard from "./Scoreboard";

interface GameBoardProps {
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
}

export default function GameBoard({ state, dispatch }: GameBoardProps) {
  const {
    players,
    playerOrder,
    currentRoundIndex,
    roundSequence,
    suitSequence,
    subPhase,
    bids,
    roundHistory,
    cumulativeScores,
  } = state;

  const cardsPerPlayer = roundSequence[currentRoundIndex];
  const trumpSuit = suitSequence[currentRoundIndex];
  const totalRounds = roundSequence.length;

  // Rotate player order for this round
  const rotatedOrder = getRotatedPlayerOrder(playerOrder, currentRoundIndex);
  const orderedPlayers = rotatedOrder.map(
    (id) => players.find((p) => p.id === id)!
  );
  const firstBidder = orderedPlayers[0];

  return (
    <div className="w-full max-w-lg mx-auto space-y-6">
      <RoundHeader
        roundNumber={currentRoundIndex + 1}
        totalRounds={totalRounds}
        cardsPerPlayer={cardsPerPlayer}
        trumpSuit={trumpSuit}
        firstBidder={firstBidder}
      />

      {subPhase === "bidding" ? (
        <BiddingPhase
          players={orderedPlayers}
          cardsPerPlayer={cardsPerPlayer}
          totalPlayers={players.length}
          dispatch={dispatch}
        />
      ) : (
        <ScoringPhase
          players={orderedPlayers}
          cardsPerPlayer={cardsPerPlayer}
          bids={bids}
          dispatch={dispatch}
        />
      )}

      <Scoreboard
        players={players}
        roundHistory={roundHistory}
        cumulativeScores={cumulativeScores}
        currentRoundIndex={currentRoundIndex}
        suitSequence={suitSequence}
        roundSequence={roundSequence}
      />
    </div>
  );
}
