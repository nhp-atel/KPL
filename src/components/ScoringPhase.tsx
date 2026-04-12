"use client";

import { useState } from "react";
import { Player, GameAction, RoundBid } from "@/lib/types";
import { calculatePoints } from "@/lib/game-logic";

interface ScoringPhaseProps {
  players: Player[]; // in current round's order
  cardsPerPlayer: number;
  bids: RoundBid[];
  dispatch: React.Dispatch<GameAction>;
}

export default function ScoringPhase({
  players,
  cardsPerPlayer,
  bids,
  dispatch,
}: ScoringPhaseProps) {
  const [actuals, setActuals] = useState<Record<number, number>>(
    Object.fromEntries(players.map((p) => [p.id, 0]))
  );

  const totalActual = Object.values(actuals).reduce((a, b) => a + b, 0);
  const isValid = totalActual === cardsPerPlayer;

  const updateActual = (playerId: number, value: number) => {
    setActuals((prev) => ({
      ...prev,
      [playerId]: Math.max(0, Math.min(cardsPerPlayer, value)),
    }));
  };

  const handleComplete = () => {
    dispatch({
      type: "SUBMIT_RESULTS",
      results: players.map((p) => ({
        playerId: p.id,
        actual: actuals[p.id],
      })),
    });
  };

  return (
    <div className="w-full space-y-4">
      <h3 className="text-lg font-bold">Scoring Phase</h3>
      <p className="text-sm text-zinc-500">
        Enter how many tricks each player actually won.
      </p>

      <div className="space-y-3">
        {players.map((player) => {
          const bid = bids.find((b) => b.playerId === player.id)!;
          const actual = actuals[player.id];
          const points = calculatePoints(bid.bid, actual);
          const isExact = bid.bid === actual;

          return (
            <div
              key={player.id}
              className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-700 space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">{player.name}</span>
                <span className="text-sm text-zinc-500">
                  Bid: <span className="font-bold text-foreground">{bid.bid}</span>
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-zinc-500">Actual:</span>
                  <button
                    onClick={() => updateActual(player.id, actual - 1)}
                    className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-700 text-sm font-bold hover:bg-zinc-300 dark:hover:bg-zinc-600 transition"
                  >
                    -
                  </button>
                  <span className="text-xl font-bold w-8 text-center">
                    {actual}
                  </span>
                  <button
                    onClick={() => updateActual(player.id, actual + 1)}
                    className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-700 text-sm font-bold hover:bg-zinc-300 dark:hover:bg-zinc-600 transition"
                  >
                    +
                  </button>
                </div>
                <span
                  className={`font-bold text-lg ${
                    isExact
                      ? "text-green-600"
                      : actual === 0 && bid.bid === 0
                        ? "text-green-600"
                        : "text-red-500"
                  }`}
                >
                  {points > 0 ? `+${points}` : points}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div
        className={`text-sm text-center font-medium ${
          isValid ? "text-green-600" : "text-red-500"
        }`}
      >
        Total tricks: {totalActual} / {cardsPerPlayer}
        {!isValid && " (must equal cards per player)"}
      </div>

      <button
        onClick={handleComplete}
        disabled={!isValid}
        className="w-full py-3 bg-green-600 text-white rounded-lg font-semibold text-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Complete Round
      </button>
    </div>
  );
}
