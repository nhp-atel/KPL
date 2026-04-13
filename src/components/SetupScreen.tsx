"use client";

import { useState } from "react";
import { Player, GameAction } from "@/lib/types";
import { getMaxCardsPerPlayer } from "@/lib/deck";
import { generateRoundSequence } from "@/lib/game-logic";

interface SetupScreenProps {
  dispatch: (action: GameAction) => void;
}

export default function SetupScreen({ dispatch }: SetupScreenProps) {
  const [numPlayers, setNumPlayers] = useState(5);
  const [names, setNames] = useState<string[]>(
    Array.from({ length: 8 }, (_, i) => `Player ${i + 1}`)
  );

  const max = getMaxCardsPerPlayer(numPlayers);
  const totalRounds = generateRoundSequence(max).length;
  const remainder = 52 % numPlayers;

  const handleStart = () => {
    const players: Player[] = Array.from({ length: numPlayers }, (_, i) => ({
      id: i,
      name: names[i].trim() || `Player ${i + 1}`,
    }));
    dispatch({ type: "SET_PLAYERS", players });
  };

  const updateName = (index: number, value: string) => {
    const updated = [...names];
    updated[index] = value;
    setNames(updated);
  };

  return (
    <div className="flex flex-col items-center gap-8 w-full max-w-md mx-auto">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-2">KaChuFuL</h1>
        <p className="text-zinc-500">Card Game Score Tracker</p>
      </div>

      {/* Player count */}
      <div className="w-full">
        <label className="block text-sm font-medium mb-2">Number of Players</label>
        <div className="flex items-center gap-4 justify-center">
          <button
            onClick={() => setNumPlayers(Math.max(3, numPlayers - 1))}
            className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-700 text-xl font-bold hover:bg-zinc-300 dark:hover:bg-zinc-600 transition"
          >
            -
          </button>
          <span className="text-3xl font-bold w-12 text-center">{numPlayers}</span>
          <button
            onClick={() => setNumPlayers(Math.min(8, numPlayers + 1))}
            className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-700 text-xl font-bold hover:bg-zinc-300 dark:hover:bg-zinc-600 transition"
          >
            +
          </button>
        </div>
      </div>

      {/* Game info preview */}
      <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-lg p-4 text-sm space-y-1">
        <div className="flex justify-between">
          <span className="text-zinc-500">Cards removed:</span>
          <span className="font-medium">{remainder}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-zinc-500">Deck size:</span>
          <span className="font-medium">{52 - remainder}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-zinc-500">Max cards/player:</span>
          <span className="font-medium">{max}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-zinc-500">Total rounds:</span>
          <span className="font-medium">{totalRounds}</span>
        </div>
      </div>

      {/* Player names */}
      <div className="w-full space-y-3">
        <label className="block text-sm font-medium">Player Names</label>
        {Array.from({ length: numPlayers }, (_, i) => (
          <input
            key={i}
            type="text"
            value={names[i]}
            onChange={(e) => updateName(i, e.target.value)}
            placeholder={`Player ${i + 1}`}
            className="w-full px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        ))}
      </div>

      <button
        onClick={handleStart}
        className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold text-lg hover:bg-blue-700 transition"
      >
        Start Game
      </button>
    </div>
  );
}
