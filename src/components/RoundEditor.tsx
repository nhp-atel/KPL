"use client";

import { useState } from "react";
import { Player, RoundRecord } from "@/lib/types";
import { calculatePoints } from "@/lib/game-logic";

interface RoundEditorProps {
  players: Player[];
  round: RoundRecord;
  onSave: (
    bids: { playerId: number; bid: number }[],
    actuals: { playerId: number; actual: number }[]
  ) => void;
  onCancel: () => void;
}

export default function RoundEditor({
  players,
  round,
  onSave,
  onCancel,
}: RoundEditorProps) {
  const cards = round.cardsPerPlayer;

  const [bids, setBids] = useState<Record<number, number>>(() =>
    Object.fromEntries(round.results.map((r) => [r.playerId, r.bid]))
  );
  const [actuals, setActuals] = useState<Record<number, number>>(() =>
    Object.fromEntries(round.results.map((r) => [r.playerId, r.actual]))
  );

  const clamp = (n: number) => Math.max(0, Math.min(cards, n));
  const updateBid = (id: number, v: number) =>
    setBids((p) => ({ ...p, [id]: clamp(v) }));
  const updateActual = (id: number, v: number) =>
    setActuals((p) => ({ ...p, [id]: clamp(v) }));

  const totalBids = Object.values(bids).reduce((a, b) => a + b, 0);
  const totalActuals = Object.values(actuals).reduce((a, b) => a + b, 0);
  const bidsValid = totalBids !== cards;
  const actualsValid = totalActuals === cards;
  const isValid = bidsValid && actualsValid;

  const handleSave = () => {
    if (!isValid) return;
    onSave(
      players.map((p) => ({ playerId: p.id, bid: bids[p.id] ?? 0 })),
      players.map((p) => ({ playerId: p.id, actual: actuals[p.id] ?? 0 }))
    );
  };

  return (
    <div className="mt-4 p-4 rounded-xl border-2 border-blue-300 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-900/10 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-bold">
          Editing Round {round.roundIndex + 1} ({cards} cards)
        </h4>
        <button
          onClick={onCancel}
          className="text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
        >
          Cancel
        </button>
      </div>

      <div className="space-y-2">
        {players.map((player) => {
          const bid = bids[player.id] ?? 0;
          const actual = actuals[player.id] ?? 0;
          const pts = calculatePoints(bid, actual);
          return (
            <div
              key={player.id}
              className="p-2 rounded-lg bg-white dark:bg-zinc-900 space-y-2"
            >
              <div className="font-medium">{player.name}</div>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-500 w-10">Bid:</span>
                  <button
                    onClick={() => updateBid(player.id, bid - 1)}
                    className="w-7 h-7 rounded-full bg-zinc-200 dark:bg-zinc-700 text-sm font-bold"
                  >
                    -
                  </button>
                  <span className="w-6 text-center font-bold">{bid}</span>
                  <button
                    onClick={() => updateBid(player.id, bid + 1)}
                    className="w-7 h-7 rounded-full bg-zinc-200 dark:bg-zinc-700 text-sm font-bold"
                  >
                    +
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-500 w-10">Actual:</span>
                  <button
                    onClick={() => updateActual(player.id, actual - 1)}
                    className="w-7 h-7 rounded-full bg-zinc-200 dark:bg-zinc-700 text-sm font-bold"
                  >
                    -
                  </button>
                  <span className="w-6 text-center font-bold">{actual}</span>
                  <button
                    onClick={() => updateActual(player.id, actual + 1)}
                    className="w-7 h-7 rounded-full bg-zinc-200 dark:bg-zinc-700 text-sm font-bold"
                  >
                    +
                  </button>
                </div>
              </div>
              <div className="text-right text-sm font-bold">
                {pts > 0 ? (
                  <span className="text-green-600">+{pts}</span>
                ) : (
                  <span className="text-zinc-400">0</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="text-xs text-center space-y-1">
        <div className={bidsValid ? "text-green-600" : "text-red-500"}>
          Total bids: {totalBids} {bidsValid ? "✓" : `(must not equal ${cards})`}
        </div>
        <div className={actualsValid ? "text-green-600" : "text-red-500"}>
          Total tricks: {totalActuals} / {cards} {actualsValid ? "✓" : ""}
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={!isValid}
        className="w-full py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Save changes
      </button>
    </div>
  );
}
