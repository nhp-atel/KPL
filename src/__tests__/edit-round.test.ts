import { describe, it, expect } from "vitest";
import { gameReducer } from "@/hooks/useGameState";
import { GameState, RoundRecord } from "@/lib/types";

function makeBaseState(): GameState {
  // Two players, two rounds played: round 0 (1 card, spades), round 1 (2 cards, diamonds).
  // Round 0: P1 bid 1 actual 1 → 11, P2 bid 0 actual 0 → 10. Cumulative: P1=11, P2=10.
  // Round 1: P1 bid 1 actual 2 → 0,  P2 bid 1 actual 0 → 0.  Cumulative: P1=11, P2=10.
  const round0: RoundRecord = {
    roundIndex: 0,
    cardsPerPlayer: 1,
    trumpSuit: "spades",
    results: [
      { playerId: 1, bid: 1, actual: 1, points: 11 },
      { playerId: 2, bid: 0, actual: 0, points: 10 },
    ],
  };
  const round1: RoundRecord = {
    roundIndex: 1,
    cardsPerPlayer: 2,
    trumpSuit: "diamonds",
    results: [
      { playerId: 1, bid: 1, actual: 2, points: 0 },
      { playerId: 2, bid: 1, actual: 0, points: 0 },
    ],
  };
  return {
    phase: "playing",
    subPhase: "bidding",
    players: [
      { id: 1, name: "Alice" },
      { id: 2, name: "Bob" },
    ],
    numPlayers: 2,
    maxCardsPerPlayer: 10,
    roundSequence: [1, 2, 3],
    suitSequence: ["spades", "diamonds", "clubs"],
    currentRoundIndex: 2,
    playerOrder: [1, 2],
    bids: [],
    roundHistory: [round0, round1],
    cumulativeScores: { 1: 11, 2: 10 },
  };
}

describe("EDIT_ROUND reducer", () => {
  it("replaces only the targeted RoundRecord; other rounds are byte-identical", () => {
    const state = makeBaseState();
    const before = state.roundHistory[0];

    const next = gameReducer(state, {
      type: "EDIT_ROUND",
      roundIndex: 1,
      bids: [
        { playerId: 1, bid: 2 },
        { playerId: 2, bid: 0 },
      ],
      actuals: [
        { playerId: 1, actual: 2 },
        { playerId: 2, actual: 0 },
      ],
    });

    // Round 0 unchanged
    expect(next.roundHistory[0]).toBe(before);
    // Round 1 updated: P1 bid 2 actual 2 → 20, P2 bid 0 actual 0 → 10
    expect(next.roundHistory[1].results).toEqual([
      { playerId: 1, bid: 2, actual: 2, points: 20 },
      { playerId: 2, bid: 0, actual: 0, points: 10 },
    ]);
    // Round 1 retains its cardsPerPlayer and trumpSuit
    expect(next.roundHistory[1].cardsPerPlayer).toBe(2);
    expect(next.roundHistory[1].trumpSuit).toBe("diamonds");
  });

  it("recomputes cumulativeScores from scratch across roundHistory", () => {
    const state = makeBaseState();

    const next = gameReducer(state, {
      type: "EDIT_ROUND",
      roundIndex: 1,
      bids: [
        { playerId: 1, bid: 2 },
        { playerId: 2, bid: 0 },
      ],
      actuals: [
        { playerId: 1, actual: 2 },
        { playerId: 2, actual: 0 },
      ],
    });

    // Round 0: P1=11, P2=10 (unchanged)
    // Round 1 (edited): P1 bid 2 actual 2 → 20, P2 bid 0 actual 0 → 10
    // Cumulative: P1=31, P2=20
    expect(next.cumulativeScores).toEqual({ 1: 31, 2: 20 });
  });

  it("does not touch phase, subPhase, currentRoundIndex, or live bids", () => {
    const state: GameState = {
      ...makeBaseState(),
      subPhase: "bidding",
      bids: [{ playerId: 1, bid: 2 }],
      currentRoundIndex: 2,
    };

    const next = gameReducer(state, {
      type: "EDIT_ROUND",
      roundIndex: 0,
      bids: [
        { playerId: 1, bid: 0 },
        { playerId: 2, bid: 0 },
      ],
      actuals: [
        { playerId: 1, actual: 1 },
        { playerId: 2, actual: 0 },
      ],
    });

    expect(next.phase).toBe(state.phase);
    expect(next.subPhase).toBe(state.subPhase);
    expect(next.currentRoundIndex).toBe(state.currentRoundIndex);
    expect(next.bids).toEqual(state.bids);
  });

  it("recomputes points via the new calculatePoints (bid 1 actual 1 = 11; bid 0 actual 0 = 10)", () => {
    const state = makeBaseState();
    const next = gameReducer(state, {
      type: "EDIT_ROUND",
      roundIndex: 0,
      bids: [
        { playerId: 1, bid: 0 },
        { playerId: 2, bid: 1 },
      ],
      actuals: [
        { playerId: 1, actual: 0 },
        { playerId: 2, actual: 1 },
      ],
    });

    expect(next.roundHistory[0].results).toEqual([
      { playerId: 1, bid: 0, actual: 0, points: 10 },
      { playerId: 2, bid: 1, actual: 1, points: 11 },
    ]);
  });

  it("returns state unchanged when roundIndex is not in roundHistory", () => {
    const state = makeBaseState();
    const next = gameReducer(state, {
      type: "EDIT_ROUND",
      roundIndex: 99,
      bids: [
        { playerId: 1, bid: 0 },
        { playerId: 2, bid: 0 },
      ],
      actuals: [
        { playerId: 1, actual: 0 },
        { playerId: 2, actual: 0 },
      ],
    });

    expect(next).toBe(state);
  });
});
