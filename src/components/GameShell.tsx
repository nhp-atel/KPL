"use client";

import { useGameState } from "@/hooks/useGameState";
import SetupScreen from "./SetupScreen";
import InitialDraw from "./InitialDraw";
import GameBoard from "./GameBoard";
import Scoreboard from "./Scoreboard";

export default function GameShell() {
  const { state, dispatch, resetGame } = useGameState();

  return (
    <div className="flex flex-col min-h-screen p-4 sm:p-6">
      {/* Header with reset */}
      {state.phase !== "setup" && (
        <div className="flex items-center justify-between mb-6 max-w-lg mx-auto w-full">
          <h1 className="text-xl font-bold">KaChuFul</h1>
          <button
            onClick={resetGame}
            className="text-sm px-3 py-1 rounded-lg bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 transition"
          >
            New Game
          </button>
        </div>
      )}

      <div className="flex-1 flex flex-col items-center justify-center">
        {state.phase === "setup" && <SetupScreen dispatch={dispatch} />}

        {state.phase === "draw" && (
          <InitialDraw players={state.players} dispatch={dispatch} />
        )}

        {state.phase === "playing" && (
          <GameBoard state={state} dispatch={dispatch} />
        )}

        {state.phase === "gameOver" && (
          <div className="w-full max-w-lg mx-auto space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-bold">Game Over!</h2>
              {(() => {
                const sorted = [...state.players].sort(
                  (a, b) =>
                    (state.cumulativeScores[b.id] || 0) -
                    (state.cumulativeScores[a.id] || 0)
                );
                const winner = sorted[0];
                return (
                  <p className="text-xl">
                    <span className="font-bold text-yellow-500">
                      {winner.name}
                    </span>{" "}
                    wins with{" "}
                    <span className="font-bold">
                      {state.cumulativeScores[winner.id]} points
                    </span>
                    !
                  </p>
                );
              })()}
            </div>

            <Scoreboard
              players={state.players}
              roundHistory={state.roundHistory}
              cumulativeScores={state.cumulativeScores}
              currentRoundIndex={state.currentRoundIndex}
              suitSequence={state.suitSequence}
              roundSequence={state.roundSequence}
            />

            <button
              onClick={resetGame}
              className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold text-lg hover:bg-blue-700 transition"
            >
              Play Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
