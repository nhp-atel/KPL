"use client";

import { useState, useCallback } from "react";
import { useGameState } from "@/hooks/useGameState";
import { GameAction } from "@/lib/types";
import Lobby from "./Lobby";
import SetupScreen from "./SetupScreen";
import InitialDraw from "./InitialDraw";
import GameBoard from "./GameBoard";
import ViewerBoard from "./ViewerBoard";
import Scoreboard from "./Scoreboard";

type Role = "none" | "admin" | "viewer";

export default function GameShell() {
  const [role, setRole] = useState<Role>("none");
  const [roomCode, setRoomCode] = useState<string | null>(null);

  const { state, dispatch, resetGame } = useGameState(
    role !== "none" ? roomCode : null,
    role === "viewer"
  );

  const handleCreateRoom = useCallback(async () => {
    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phase: "setup" }),
      });
      const data = await res.json();
      setRoomCode(data.code);
      setRole("admin");
    } catch {
      // If room creation fails, still let them play locally
      setRole("admin");
    }
  }, []);

  const handleJoinRoom = useCallback((code: string) => {
    setRoomCode(code);
    setRole("viewer");
  }, []);

  const handleBackToLobby = useCallback(() => {
    resetGame();
    setRole("none");
    setRoomCode(null);
  }, [resetGame]);

  const adminDispatch = useCallback(
    (action: GameAction) => {
      dispatch(action);
    },
    [dispatch]
  );

  // Lobby screen
  if (role === "none") {
    return (
      <div className="flex flex-col min-h-screen p-4 sm:p-6">
        <div className="flex-1 flex flex-col items-center justify-center">
          <Lobby onCreateRoom={handleCreateRoom} onJoinRoom={handleJoinRoom} />
        </div>
      </div>
    );
  }

  // Viewer mode
  if (role === "viewer" && roomCode) {
    return (
      <div className="flex flex-col min-h-screen p-4 sm:p-6">
        <div className="flex items-center justify-between mb-6 max-w-lg mx-auto w-full">
          <h1 className="text-xl font-bold">KaChuFul</h1>
          <div className="flex items-center gap-3">
            <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-1 rounded-full font-medium">
              LIVE
            </span>
            <span className="text-sm font-mono text-zinc-500">{roomCode}</span>
            <button
              onClick={handleBackToLobby}
              className="text-sm px-3 py-1 rounded-lg bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 transition"
            >
              Leave
            </button>
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center">
          <ViewerBoard state={state} roomCode={roomCode} />
        </div>
      </div>
    );
  }

  // Admin mode
  return (
    <div className="flex flex-col min-h-screen p-4 sm:p-6">
      {/* Header with room code */}
      <div className="flex items-center justify-between mb-6 max-w-lg mx-auto w-full">
        <h1 className="text-xl font-bold">KaChuFul</h1>
        <div className="flex items-center gap-3">
          {roomCode && (
            <div className="flex items-center gap-2">
              <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-full font-medium">
                HOST
              </span>
              <span className="text-sm font-mono bg-zinc-100 dark:bg-zinc-800 px-3 py-1 rounded-lg font-bold tracking-widest">
                {roomCode}
              </span>
            </div>
          )}
          {state.phase !== "setup" && (
            <button
              onClick={handleBackToLobby}
              className="text-sm px-3 py-1 rounded-lg bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 transition"
            >
              New Game
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center">
        {state.phase === "setup" && (
          <SetupScreen dispatch={adminDispatch} />
        )}

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
              onClick={handleBackToLobby}
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
