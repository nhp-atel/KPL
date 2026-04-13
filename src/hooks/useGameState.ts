"use client";

import { useReducer, useEffect, useCallback } from "react";
import { GameState, GameAction, Phase, RoundRecord } from "@/lib/types";
import { getMaxCardsPerPlayer } from "@/lib/deck";
import {
  generateRoundSequence,
  generateSuitSequence,
  calculatePoints,
} from "@/lib/game-logic";

const STORAGE_KEY = "kachuful-game-state";

function createInitialState(): GameState {
  return {
    phase: "setup" as Phase,
    subPhase: "bidding",
    players: [],
    numPlayers: 0,
    maxCardsPerPlayer: 0,
    roundSequence: [],
    suitSequence: [],
    currentRoundIndex: 0,
    playerOrder: [],
    bids: [],
    roundHistory: [],
    cumulativeScores: {},
  };
}

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "SET_PLAYERS": {
      const numPlayers = action.players.length;
      const max = getMaxCardsPerPlayer(numPlayers);
      const roundSeq = generateRoundSequence(max);
      const suitSeq = generateSuitSequence(roundSeq.length);
      const scores: Record<number, number> = {};
      action.players.forEach((p) => (scores[p.id] = 0));

      return {
        ...state,
        phase: "draw",
        players: action.players,
        numPlayers,
        maxCardsPerPlayer: max,
        roundSequence: roundSeq,
        suitSequence: suitSeq,
        cumulativeScores: scores,
      };
    }

    case "COMPLETE_DRAW": {
      return {
        ...state,
        phase: "playing",
        subPhase: "bidding",
        playerOrder: action.playerOrder,
        players: action.players,
        currentRoundIndex: 0,
        bids: [],
      };
    }

    case "SUBMIT_BIDS": {
      return {
        ...state,
        subPhase: "scoring",
        bids: action.bids,
      };
    }

    case "SUBMIT_RESULTS": {
      const roundRecord: RoundRecord = {
        roundIndex: state.currentRoundIndex,
        cardsPerPlayer: state.roundSequence[state.currentRoundIndex],
        trumpSuit: state.suitSequence[state.currentRoundIndex],
        results: action.results.map((r) => {
          const bid = state.bids.find((b) => b.playerId === r.playerId)!;
          const points = calculatePoints(bid.bid, r.actual);
          return {
            playerId: r.playerId,
            bid: bid.bid,
            actual: r.actual,
            points,
          };
        }),
      };

      const newScores = { ...state.cumulativeScores };
      roundRecord.results.forEach((r) => {
        newScores[r.playerId] = (newScores[r.playerId] || 0) + r.points;
      });

      const isLastRound =
        state.currentRoundIndex >= state.roundSequence.length - 1;

      return {
        ...state,
        phase: isLastRound ? "gameOver" : "playing",
        subPhase: "bidding",
        roundHistory: [...state.roundHistory, roundRecord],
        cumulativeScores: newScores,
        currentRoundIndex: isLastRound
          ? state.currentRoundIndex
          : state.currentRoundIndex + 1,
        bids: [],
      };
    }

    case "NEXT_ROUND": {
      return {
        ...state,
        subPhase: "bidding",
        bids: [],
      };
    }

    case "RESET_GAME": {
      if (typeof window !== "undefined") {
        localStorage.removeItem(STORAGE_KEY);
      }
      return createInitialState();
    }

    case "HYDRATE": {
      return action.state;
    }

    default:
      return state;
  }
}

function loadSavedState(): GameState | null {
  if (typeof window === "undefined") return null;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.phase) return parsed as GameState;
    }
  } catch {
    // ignore
  }
  return null;
}

export function useGameState(roomCode?: string | null, isViewer?: boolean) {
  const [state, dispatch] = useReducer(
    gameReducer,
    null,
    () => loadSavedState() || createInitialState()
  );

  // Save to localStorage (admin only, non-viewer)
  useEffect(() => {
    if (!isViewer && state.phase !== "setup") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  }, [state, isViewer]);

  // Sync state to room (admin only)
  useEffect(() => {
    if (!roomCode || isViewer) return;
    if (state.phase === "setup") return;

    fetch(`/api/rooms/${roomCode}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(state),
    }).catch(() => {
      // silent fail for sync
    });
  }, [state, roomCode, isViewer]);

  // SSE listener (viewer only)
  useEffect(() => {
    if (!roomCode || !isViewer) return;

    const eventSource = new EventSource(`/api/rooms/${roomCode}/stream`);

    eventSource.onmessage = (event) => {
      try {
        const newState = JSON.parse(event.data) as GameState;
        dispatch({ type: "HYDRATE", state: newState });
      } catch {
        // ignore parse errors
      }
    };

    eventSource.onerror = () => {
      // Will auto-reconnect
    };

    return () => {
      eventSource.close();
    };
  }, [roomCode, isViewer]);

  const resetGame = useCallback(() => dispatch({ type: "RESET_GAME" }), []);

  return { state, dispatch, resetGame };
}
