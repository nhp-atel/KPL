"use client";

import { useState } from "react";
import { Player, RoundRecord, Suit, GameAction } from "@/lib/types";
import SuitIcon from "./SuitIcon";
import RoundEditor from "./RoundEditor";

interface ScoreboardProps {
  players: Player[];
  roundHistory: RoundRecord[];
  cumulativeScores: Record<number, number>;
  currentRoundIndex: number;
  suitSequence: Suit[];
  roundSequence: number[];
  dispatch?: React.Dispatch<GameAction>;
}

export default function Scoreboard({
  players,
  roundHistory,
  cumulativeScores,
  currentRoundIndex,
  suitSequence,
  roundSequence,
  dispatch,
}: ScoreboardProps) {
  const [expandedRoundIndex, setExpandedRoundIndex] = useState<number | null>(
    null
  );

  if (roundHistory.length === 0) return null;

  const ranked = [...players].sort(
    (a, b) => (cumulativeScores[b.id] || 0) - (cumulativeScores[a.id] || 0)
  );

  const expandedRound =
    expandedRoundIndex !== null
      ? roundHistory.find((r) => r.roundIndex === expandedRoundIndex) ?? null
      : null;

  const toggleExpand = (roundIndex: number) => {
    setExpandedRoundIndex((curr) => (curr === roundIndex ? null : roundIndex));
  };

  const handleSave = (
    bids: { playerId: number; bid: number }[],
    actuals: { playerId: number; actual: number }[]
  ) => {
    if (!dispatch || expandedRoundIndex === null) return;
    dispatch({
      type: "EDIT_ROUND",
      roundIndex: expandedRoundIndex,
      bids,
      actuals,
    });
    setExpandedRoundIndex(null);
  };

  return (
    <div className="w-full space-y-3">
      <h3 className="text-lg font-bold">Scoreboard</h3>

      {/* Compact standings */}
      <div className="space-y-1">
        {ranked.map((player, i) => (
          <div
            key={player.id}
            className={`flex items-center justify-between p-2 rounded-lg ${
              i === 0
                ? "bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700"
                : "bg-zinc-50 dark:bg-zinc-800"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold w-6 text-center text-zinc-400">
                #{i + 1}
              </span>
              <span className="font-medium">{player.name}</span>
            </div>
            <span className="font-bold text-lg">
              {cumulativeScores[player.id] || 0}
            </span>
          </div>
        ))}
      </div>

      {/* Round history table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-700">
              <th className="text-left py-2 pr-2 sticky left-0 bg-white dark:bg-black">
                Player
              </th>
              {roundHistory.map((round) => {
                const isExpanded = round.roundIndex === expandedRoundIndex;
                const headerInner = (
                  <div className="flex flex-col items-center">
                    <SuitIcon suit={suitSequence[round.roundIndex]} size="sm" />
                    <span className="text-xs text-zinc-400">
                      {roundSequence[round.roundIndex]}
                    </span>
                  </div>
                );
                return (
                  <th
                    key={round.roundIndex}
                    className={`text-center px-2 py-2 min-w-[48px] ${
                      isExpanded ? "bg-blue-100 dark:bg-blue-900/40" : ""
                    }`}
                  >
                    {dispatch ? (
                      <button
                        onClick={() => toggleExpand(round.roundIndex)}
                        className="w-full hover:opacity-70 transition"
                        aria-label={`Edit round ${round.roundIndex + 1}`}
                      >
                        {headerInner}
                      </button>
                    ) : (
                      headerInner
                    )}
                  </th>
                );
              })}
              <th className="text-center px-2 py-2 font-bold">Total</th>
            </tr>
          </thead>
          <tbody>
            {players.map((player) => (
              <tr
                key={player.id}
                className="border-b border-zinc-100 dark:border-zinc-800"
              >
                <td className="py-2 pr-2 font-medium sticky left-0 bg-white dark:bg-black">
                  {player.name}
                </td>
                {roundHistory.map((round) => {
                  const result = round.results.find(
                    (r) => r.playerId === player.id
                  );
                  const pts = result?.points || 0;
                  const isExpanded = round.roundIndex === expandedRoundIndex;
                  return (
                    <td
                      key={round.roundIndex}
                      className={`text-center px-2 py-2 ${
                        pts > 0
                          ? "text-green-600 font-medium"
                          : "text-zinc-400"
                      } ${
                        isExpanded
                          ? "bg-blue-50 dark:bg-blue-900/20"
                          : round.roundIndex === currentRoundIndex - 1
                            ? "bg-blue-50 dark:bg-blue-900/10"
                            : ""
                      }`}
                    >
                      {pts}
                    </td>
                  );
                })}
                <td className="text-center px-2 py-2 font-bold">
                  {cumulativeScores[player.id] || 0}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {dispatch && expandedRound && (
        <RoundEditor
          players={players}
          round={expandedRound}
          onSave={handleSave}
          onCancel={() => setExpandedRoundIndex(null)}
        />
      )}
    </div>
  );
}
