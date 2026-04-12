"use client";

import { useState } from "react";
import { Player, GameAction } from "@/lib/types";
import { dealInitialCards } from "@/lib/initial-draw";
import SuitIcon from "./SuitIcon";

interface InitialDrawProps {
  players: Player[];
  dispatch: React.Dispatch<GameAction>;
}

export default function InitialDraw({ players, dispatch }: InitialDrawProps) {
  const [drawResult, setDrawResult] = useState<{
    playersWithCards: Player[];
    playerOrder: number[];
  } | null>(null);
  const [isShuffling, setIsShuffling] = useState(false);

  const handleDraw = () => {
    setIsShuffling(true);
    // Brief delay for dramatic effect
    setTimeout(() => {
      const result = dealInitialCards(players);
      setDrawResult(result);
      setIsShuffling(false);
    }, 800);
  };

  const handleBegin = () => {
    if (!drawResult) return;
    dispatch({
      type: "COMPLETE_DRAW",
      playerOrder: drawResult.playerOrder,
      players: drawResult.playersWithCards,
    });
  };

  if (!drawResult) {
    return (
      <div className="flex flex-col items-center gap-8 w-full max-w-md mx-auto">
        <h2 className="text-2xl font-bold">Initial Card Draw</h2>
        <p className="text-zinc-500 text-center">
          Each player will draw a card. The highest card determines who bids first.
        </p>
        <button
          onClick={handleDraw}
          disabled={isShuffling}
          className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold text-lg hover:bg-blue-700 transition disabled:opacity-50"
        >
          {isShuffling ? "Shuffling..." : "Draw Cards"}
        </button>
      </div>
    );
  }

  const firstPlayerId = drawResult.playerOrder[0];

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-md mx-auto">
      <h2 className="text-2xl font-bold">Draw Results</h2>

      <div className="w-full space-y-3">
        {drawResult.playersWithCards.map((player) => {
          const isFirst = player.id === firstPlayerId;
          return (
            <div
              key={player.id}
              className={`flex items-center justify-between p-3 rounded-lg border ${
                isFirst
                  ? "border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20"
                  : "border-zinc-200 dark:border-zinc-700"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="font-medium">{player.name}</span>
                {isFirst && (
                  <span className="text-xs bg-yellow-400 text-yellow-900 px-2 py-0.5 rounded-full font-bold">
                    FIRST
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-lg">
                  {player.drawnCard?.label}
                </span>
                <SuitIcon suit={player.drawnCard!.suit} size="sm" />
              </div>
            </div>
          );
        })}
      </div>

      <div className="text-center text-sm text-zinc-500">
        <p>Play order (starting from highest card):</p>
        <p className="font-medium text-foreground mt-1">
          {drawResult.playerOrder
            .map((id) => drawResult.playersWithCards.find((p) => p.id === id)!.name)
            .join(" → ")}
        </p>
      </div>

      <button
        onClick={handleBegin}
        className="w-full py-3 bg-green-600 text-white rounded-lg font-semibold text-lg hover:bg-green-700 transition"
      >
        Begin Game
      </button>
    </div>
  );
}
