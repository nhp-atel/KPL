"use client";

import { GameState } from "@/lib/types";
import { getRotatedPlayerOrder } from "@/lib/game-logic";
import RoundHeader from "./RoundHeader";
import Scoreboard from "./Scoreboard";
import SuitIcon from "./SuitIcon";

interface ViewerBoardProps {
  state: GameState;
  roomCode: string;
}

export default function ViewerBoard({ state, roomCode }: ViewerBoardProps) {
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

  if (state.phase === "setup") {
    return (
      <div className="text-center space-y-4">
        <div className="text-6xl">🃏</div>
        <h2 className="text-xl font-bold">Waiting for host to set up the game...</h2>
        <p className="text-zinc-500">Room: <span className="font-mono font-bold">{roomCode}</span></p>
      </div>
    );
  }

  if (state.phase === "draw") {
    return (
      <div className="text-center space-y-4">
        <div className="text-6xl">🎴</div>
        <h2 className="text-xl font-bold">Drawing cards to determine play order...</h2>
        <p className="text-zinc-500">Room: <span className="font-mono font-bold">{roomCode}</span></p>
      </div>
    );
  }

  if (state.phase === "gameOver") {
    const sorted = [...players].sort(
      (a, b) => (cumulativeScores[b.id] || 0) - (cumulativeScores[a.id] || 0)
    );
    const winner = sorted[0];

    return (
      <div className="w-full max-w-lg mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-bold">Game Over!</h2>
          <p className="text-xl">
            <span className="font-bold text-yellow-500">{winner.name}</span>{" "}
            wins with{" "}
            <span className="font-bold">{cumulativeScores[winner.id]} points</span>!
          </p>
        </div>
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

  // Playing phase
  const cardsPerPlayer = roundSequence[currentRoundIndex];
  const trumpSuit = suitSequence[currentRoundIndex];
  const rotatedOrder = getRotatedPlayerOrder(playerOrder, currentRoundIndex);
  const orderedPlayers = rotatedOrder.map(
    (id) => players.find((p) => p.id === id)!
  );
  const firstBidder = orderedPlayers[0];

  return (
    <div className="w-full max-w-lg mx-auto space-y-6">
      <RoundHeader
        roundNumber={currentRoundIndex + 1}
        totalRounds={roundSequence.length}
        cardsPerPlayer={cardsPerPlayer}
        trumpSuit={trumpSuit}
        firstBidder={firstBidder}
      />

      {/* Current phase info */}
      <div className="p-4 rounded-xl bg-zinc-100 dark:bg-zinc-800 space-y-3">
        <h3 className="text-lg font-bold">
          {subPhase === "bidding" ? "Bidding in Progress" : "Scoring in Progress"}
        </h3>

        {subPhase === "bidding" && bids.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm text-zinc-500">Bids placed so far:</p>
            {bids.map((b) => {
              const player = players.find((p) => p.id === b.playerId)!;
              return (
                <div
                  key={b.playerId}
                  className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-zinc-900"
                >
                  <span className="font-medium">{player.name}</span>
                  <span className="font-bold">{b.bid}</span>
                </div>
              );
            })}
            <p className="text-sm text-zinc-500 text-center">
              {bids.length} of {players.length} bids placed
            </p>
          </div>
        )}

        {subPhase === "bidding" && bids.length === 0 && (
          <p className="text-sm text-zinc-500">Waiting for bids...</p>
        )}

        {subPhase === "scoring" && (
          <div className="space-y-2">
            <p className="text-sm text-zinc-500">Bids for this round:</p>
            {orderedPlayers.map((player) => {
              const bid = bids.find((b) => b.playerId === player.id);
              return (
                <div
                  key={player.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-zinc-900"
                >
                  <span className="font-medium">{player.name}</span>
                  <span className="font-bold">{bid?.bid ?? "-"}</span>
                </div>
              );
            })}
            <p className="text-sm text-zinc-500 text-center">
              Waiting for host to enter results...
            </p>
          </div>
        )}
      </div>

      {/* Trump suit display */}
      <div className="flex items-center justify-center gap-3 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900">
        <span className="text-sm text-zinc-500">Trump:</span>
        <SuitIcon suit={trumpSuit} size="lg" showLabel />
      </div>

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
