# Edit past-round results + round sequence + points formula — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix three KaChuFul bugs: the round sequence is one short, the points formula adds a `+1` bonus to every successful bid (should only apply to bids 0 and 1), and there is no UI to edit a round's bid/actual after submission.

**Architecture:** Two pure-logic fixes in `src/lib/game-logic.ts` (points formula, round sequence). One new reducer action `EDIT_ROUND` in `src/hooks/useGameState.ts` that updates a single `RoundRecord` and recomputes `cumulativeScores` from scratch. One new presentational component `RoundEditor` and a "use client" upgrade to `Scoreboard` that adds an inline expand-on-header editor (admin only — controlled by the presence of a `dispatch` prop). Existing `localStorage`/SSE sync handles persistence and viewer fan-out automatically.

**Tech Stack:** Next.js 16, React 19, TypeScript, Vitest. Note: `AGENTS.md` warns this is a non-standard Next.js — consult `node_modules/next/dist/docs/` if any Next-specific behavior surprises you. The changes in this plan are React/TypeScript only and do not touch Next-specific APIs.

---

## File Structure

**Files to create:**
- `src/components/RoundEditor.tsx` — pure form, owns draft `bids`/`actuals`, validates and emits via `onSave`. ~120 lines.
- `src/__tests__/edit-round.test.ts` — unit tests for `EDIT_ROUND` reducer behavior. ~150 lines.

**Files to modify:**
- `src/lib/game-logic.ts` — `calculatePoints` (Task 1), `generateRoundSequence` (Task 2).
- `src/__tests__/game-logic.test.ts` — update assertions for both fixes.
- `src/lib/types.ts` — add `EDIT_ROUND` to the `GameAction` union.
- `src/hooks/useGameState.ts` — export `gameReducer`, add `EDIT_ROUND` reducer case.
- `src/components/Scoreboard.tsx` — add `"use client"`, accept optional `dispatch`, manage expanded-round state, render `RoundEditor` below the table.
- `src/components/GameBoard.tsx` — forward `dispatch` to `Scoreboard`.
- `src/components/GameShell.tsx` — forward `dispatch` to the game-over `<Scoreboard>` so admin can still edit after the game ends.

`ViewerBoard.tsx` is intentionally not modified — it omits `dispatch` for both its in-game and game-over `<Scoreboard>` invocations, so the viewer stays read-only.

---

## Task 1: Fix points formula

**Files:**
- Modify: `src/__tests__/game-logic.test.ts:93-129`
- Modify: `src/lib/game-logic.ts:24-29`
- Test: `src/__tests__/game-logic.test.ts`

- [ ] **Step 1: Update existing `calculatePoints` tests to expect new values**

In `src/__tests__/game-logic.test.ts`, replace the entire `describe("calculatePoints", ...)` block (lines 93–129) with:

```ts
describe("calculatePoints", () => {
  it("gives 10 points for bidding 0 and making 0", () => {
    expect(calculatePoints(0, 0)).toBe(10);
  });

  it("gives 11 points for bidding 1 and making 1", () => {
    expect(calculatePoints(1, 1)).toBe(11);
  });

  it("gives 20 points for bidding 2 and making 2", () => {
    expect(calculatePoints(2, 2)).toBe(20);
  });

  it("gives 30 points for bidding 3 and making 3", () => {
    expect(calculatePoints(3, 3)).toBe(30);
  });

  it("gives 100 points for bidding 10 and making 10", () => {
    expect(calculatePoints(10, 10)).toBe(100);
  });

  it("gives 0 points when actual is more than bid", () => {
    expect(calculatePoints(2, 3)).toBe(0);
    expect(calculatePoints(0, 1)).toBe(0);
  });

  it("gives 0 points when actual is less than bid", () => {
    expect(calculatePoints(3, 2)).toBe(0);
    expect(calculatePoints(5, 0)).toBe(0);
  });

  it("formula is N*10 for successful N>=2", () => {
    for (let n = 2; n <= 10; n++) {
      expect(calculatePoints(n, n)).toBe(n * 10);
    }
  });

  it("only bid 1 gets the +1 bonus on successful bid", () => {
    expect(calculatePoints(1, 1)).toBe(11);
    expect(calculatePoints(2, 2)).toBe(20);
    expect(calculatePoints(3, 3)).toBe(30);
  });
});
```

- [ ] **Step 2: Run failing tests**

Run: `npx vitest run src/__tests__/game-logic.test.ts -t "calculatePoints"`

Expected: failures on the bid≥2 cases — current implementation returns `bid * 10 + 1`, so `calculatePoints(2, 2)` returns 21 not 20, etc.

- [ ] **Step 3: Update `calculatePoints` implementation**

In `src/lib/game-logic.ts`, replace lines 24–29:

```ts
export function calculatePoints(bid: number, actual: number): number {
  if (bid !== actual) return 0;
  if (bid === 0) return 10;
  if (bid === 1) return 11;
  return bid * 10;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/__tests__/game-logic.test.ts -t "calculatePoints"`

Expected: PASS for all `calculatePoints` tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/game-logic.ts src/__tests__/game-logic.test.ts
git commit -m "Fix points formula: bid*10 for successful bids >= 2

Successful bid 0 keeps 10 pts and successful bid 1 keeps 11 pts.
Successful bids of 2+ now award bid*10 instead of bid*10 + 1."
```

---

## Task 2: Fix round sequence (peak played twice)

**Files:**
- Modify: `src/__tests__/game-logic.test.ts:38-77`
- Modify: `src/lib/game-logic.ts:14-18`
- Test: `src/__tests__/game-logic.test.ts`

- [ ] **Step 1: Update `generateRoundSequence` tests for new length**

In `src/__tests__/game-logic.test.ts`, replace the entire `describe("generateRoundSequence", ...)` block (lines 53–77) with:

```ts
describe("generateRoundSequence", () => {
  it("generates 1 to max to 1 with peak played twice for max=10", () => {
    const seq = generateRoundSequence(10);
    expect(seq).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
      10, 9, 8, 7, 6, 5, 4, 3, 2, 1,
    ]);
    expect(seq.length).toBe(20);
  });

  it("generates correct sequence for max=8", () => {
    const seq = generateRoundSequence(8);
    expect(seq).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 8, 7, 6, 5, 4, 3, 2, 1]);
    expect(seq.length).toBe(16);
  });

  it("generates correct sequence for max=5", () => {
    const seq = generateRoundSequence(5);
    expect(seq).toEqual([1, 2, 3, 4, 5, 5, 4, 3, 2, 1]);
    expect(seq.length).toBe(10);
  });

  it("generates correct sequence for max=1 (peak played twice)", () => {
    const seq = generateRoundSequence(1);
    expect(seq).toEqual([1, 1]);
    expect(seq.length).toBe(2);
  });

  it("total rounds = 2*max", () => {
    for (let max = 1; max <= 13; max++) {
      expect(generateRoundSequence(max).length).toBe(2 * max);
    }
  });

  it("middle elements are both equal to max (peak doubled)", () => {
    const seq = generateRoundSequence(10);
    expect(seq[9]).toBe(10);
    expect(seq[10]).toBe(10);
  });
});
```

- [ ] **Step 2: Update suit-sequence tests for new length**

In `src/__tests__/game-logic.test.ts`, replace the existing test `"produces correct suit for 5 players (19 rounds)"` (lines 38–50) with:

```ts
  it("produces correct suit for 5 players (20 rounds)", () => {
    // 8-cycle: spades, diamonds, clubs, hearts, hearts, clubs, diamonds, spades
    // Rounds 0-7: full first cycle
    // Rounds 8-15: full second cycle
    // Rounds 16-19: spades, diamonds, clubs, hearts
    const expected = [
      "spades", "diamonds", "clubs", "hearts",
      "hearts", "clubs", "diamonds", "spades",
      "spades", "diamonds", "clubs", "hearts",
      "hearts", "clubs", "diamonds", "spades",
      "spades", "diamonds", "clubs", "hearts",
    ];
    for (let i = 0; i < 20; i++) {
      expect(getSuitForRound(i)).toBe(expected[i]);
    }
  });
```

In the same file, replace the `describe("generateSuitSequence", ...)` block (lines 79–91):

```ts
describe("generateSuitSequence", () => {
  it("returns correct number of suits", () => {
    const seq = generateSuitSequence(20);
    expect(seq.length).toBe(20);
  });

  it("matches getSuitForRound for each index", () => {
    const seq = generateSuitSequence(20);
    for (let i = 0; i < 20; i++) {
      expect(seq[i]).toBe(getSuitForRound(i));
    }
  });
});
```

- [ ] **Step 3: Run failing tests**

Run: `npx vitest run src/__tests__/game-logic.test.ts -t "generateRoundSequence"`

Expected: failures on length and array contents.

- [ ] **Step 4: Update `generateRoundSequence` implementation**

In `src/lib/game-logic.ts`, replace lines 14–18:

```ts
// Generate [1, 2, ..., max, max, max-1, ..., 1] — peak played twice
export function generateRoundSequence(max: number): number[] {
  const ascending = Array.from({ length: max }, (_, i) => i + 1);
  const descending = Array.from({ length: max }, (_, i) => max - i);
  return [...ascending, ...descending];
}
```

- [ ] **Step 5: Run all tests in the file**

Run: `npx vitest run src/__tests__/game-logic.test.ts`

Expected: PASS for every test in the file (including the points-formula tests from Task 1).

- [ ] **Step 6: Commit**

```bash
git add src/lib/game-logic.ts src/__tests__/game-logic.test.ts
git commit -m "Fix round sequence: peak card count played twice

Sequence now has length 2*max instead of 2*max - 1. For 5 players
this means 20 rounds (was 19). Suit sequence is length-driven and
extends naturally via the existing 8-cycle."
```

---

## Task 3: Add `EDIT_ROUND` action type, export reducer, add reducer case

**Files:**
- Modify: `src/lib/types.ts:52-61`
- Modify: `src/hooks/useGameState.ts:31, 162`
- Create: `src/__tests__/edit-round.test.ts`
- Test: `src/__tests__/edit-round.test.ts`

- [ ] **Step 1: Add `EDIT_ROUND` to the action union**

In `src/lib/types.ts`, replace lines 52–61 (the entire `GameAction` union) with:

```ts
export type GameAction =
  | { type: "SET_PLAYERS"; players: Player[] }
  | { type: "COMPLETE_DRAW"; playerOrder: number[]; players: Player[] }
  | { type: "PLACE_BID"; playerId: number; bid: number }
  | { type: "UNDO_BID" }
  | { type: "CONFIRM_BIDS" }
  | { type: "SUBMIT_RESULTS"; results: { playerId: number; actual: number }[] }
  | { type: "NEXT_ROUND" }
  | { type: "RESET_GAME" }
  | { type: "HYDRATE"; state: GameState }
  | {
      type: "EDIT_ROUND";
      roundIndex: number;
      bids: { playerId: number; bid: number }[];
      actuals: { playerId: number; actual: number }[];
    };
```

- [ ] **Step 2: Export `gameReducer` from `useGameState.ts`**

In `src/hooks/useGameState.ts` line 31, change:

```ts
function gameReducer(state: GameState, action: GameAction): GameState {
```

to:

```ts
export function gameReducer(state: GameState, action: GameAction): GameState {
```

(Just add `export`. The hook's internal `useReducer(gameReducer, ...)` reference at line 164 keeps working unchanged.)

- [ ] **Step 3: Create the reducer test file**

Create `src/__tests__/edit-round.test.ts`:

```ts
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
```

Note: the `bids` array on `EDIT_ROUND` carries the new bid value per player; the `actuals` array carries the new tricks-won. Both are required because the reducer recomputes `points = calculatePoints(bid, actual)`.

- [ ] **Step 4: Run failing tests**

Run: `npx vitest run src/__tests__/edit-round.test.ts`

Expected: failures — `EDIT_ROUND` is not yet handled, so the default reducer case returns `state` unchanged. Most tests will fail because they expect mutated values.

- [ ] **Step 5: Implement the `EDIT_ROUND` reducer case**

In `src/hooks/useGameState.ts`, find the `case "HYDRATE"` block (around lines 139–141):

```ts
    case "HYDRATE": {
      return action.state;
    }
```

Insert a new case **immediately after** `HYDRATE`'s closing brace and before `default`:

```ts
    case "EDIT_ROUND": {
      const idx = state.roundHistory.findIndex(
        (r) => r.roundIndex === action.roundIndex
      );
      if (idx === -1) return state;

      const existing = state.roundHistory[idx];
      const updatedResults = action.actuals.map((a) => {
        const bid = action.bids.find((b) => b.playerId === a.playerId)!;
        return {
          playerId: a.playerId,
          bid: bid.bid,
          actual: a.actual,
          points: calculatePoints(bid.bid, a.actual),
        };
      });

      const updatedRound: RoundRecord = {
        roundIndex: existing.roundIndex,
        cardsPerPlayer: existing.cardsPerPlayer,
        trumpSuit: existing.trumpSuit,
        results: updatedResults,
      };

      const newHistory = [
        ...state.roundHistory.slice(0, idx),
        updatedRound,
        ...state.roundHistory.slice(idx + 1),
      ];

      const newScores: Record<number, number> = {};
      state.players.forEach((p) => (newScores[p.id] = 0));
      newHistory.forEach((round) => {
        round.results.forEach((r) => {
          newScores[r.playerId] = (newScores[r.playerId] || 0) + r.points;
        });
      });

      return {
        ...state,
        roundHistory: newHistory,
        cumulativeScores: newScores,
      };
    }
```

You will need `RoundRecord` imported. The file already imports from `@/lib/types`; ensure the import line at the top includes `RoundRecord`:

```ts
import { GameState, GameAction, Phase, RoundRecord } from "@/lib/types";
```

(`RoundRecord` is already imported in the existing file — verify by reading line 4. If not, add it.)

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx vitest run src/__tests__/edit-round.test.ts`

Expected: PASS for all 5 tests.

- [ ] **Step 7: Run the full test suite to confirm no regressions**

Run: `npm test`

Expected: PASS for every test in the repo.

- [ ] **Step 8: Commit**

```bash
git add src/lib/types.ts src/hooks/useGameState.ts src/__tests__/edit-round.test.ts
git commit -m "Add EDIT_ROUND reducer action

Updates a single RoundRecord in roundHistory and recomputes
cumulativeScores from scratch across all rounds. Live game-flow
fields (phase, subPhase, currentRoundIndex, in-progress bids)
are untouched. Reducer is now exported for direct unit testing."
```

---

## Task 4: Build `RoundEditor` component

**Files:**
- Create: `src/components/RoundEditor.tsx`

- [ ] **Step 1: Create the RoundEditor component**

Create `src/components/RoundEditor.tsx`:

```tsx
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
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`

Expected: no errors. If there are errors, fix them in the file.

- [ ] **Step 3: Verify lint**

Run: `npm run lint`

Expected: no errors specific to this new file. (Existing lint warnings unrelated to this change can be ignored.)

- [ ] **Step 4: Commit**

```bash
git add src/components/RoundEditor.tsx
git commit -m "Add RoundEditor component

Pure form component that owns draft bid/actual state for a past
round, validates sums (bids != cards, actuals == cards), and
emits the result via onSave. Knows nothing about reducers,
rooms, or persistence."
```

---

## Task 5: Wire Scoreboard for editing

**Files:**
- Modify: `src/components/Scoreboard.tsx`

- [ ] **Step 1: Replace `Scoreboard.tsx` with the editing-aware version**

Replace the entire contents of `src/components/Scoreboard.tsx` with:

```tsx
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
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`

Expected: no errors.

- [ ] **Step 3: Run all tests**

Run: `npm test`

Expected: PASS — no test should reference Scoreboard's internals.

- [ ] **Step 4: Commit**

```bash
git add src/components/Scoreboard.tsx
git commit -m "Wire Scoreboard for editing past rounds

Adds 'use client' directive and an optional dispatch prop. When
dispatch is present (admin), round-column headers become buttons
that toggle an inline RoundEditor below the table. When dispatch
is absent (viewer), headers render as plain content — viewers
remain read-only."
```

---

## Task 6: Forward `dispatch` from admin contexts to `Scoreboard`

**Files:**
- Modify: `src/components/GameBoard.tsx:66-73`
- Modify: `src/components/GameShell.tsx:162-169`

- [ ] **Step 1: Pass `dispatch` to `Scoreboard` in `GameBoard`**

In `src/components/GameBoard.tsx`, replace lines 66–73:

```tsx
      <Scoreboard
        players={players}
        roundHistory={roundHistory}
        cumulativeScores={cumulativeScores}
        currentRoundIndex={currentRoundIndex}
        suitSequence={suitSequence}
        roundSequence={roundSequence}
        dispatch={dispatch}
      />
```

(The only change is the new `dispatch={dispatch}` line.)

- [ ] **Step 2: Pass `dispatch` to the game-over `Scoreboard` in `GameShell`**

In `src/components/GameShell.tsx`, replace lines 162–169 (the `<Scoreboard ... />` block inside the `phase === "gameOver"` admin branch):

```tsx
            <Scoreboard
              players={state.players}
              roundHistory={state.roundHistory}
              cumulativeScores={state.cumulativeScores}
              currentRoundIndex={state.currentRoundIndex}
              suitSequence={state.suitSequence}
              roundSequence={state.roundSequence}
              dispatch={dispatch}
            />
```

(The only change is the new `dispatch={dispatch}` line. This invocation is on the admin branch only — the viewer renders its own `<ViewerBoard>`, which has its own non-dispatch Scoreboards.)

- [ ] **Step 3: Verify ViewerBoard is unchanged**

Read `src/components/ViewerBoard.tsx` lines 63–70 and 153–160. Confirm both `<Scoreboard />` invocations there do NOT pass a `dispatch` prop. If they do, remove it — viewers must stay read-only.

- [ ] **Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit`

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/GameBoard.tsx src/components/GameShell.tsx
git commit -m "Forward dispatch to Scoreboard on admin board and game-over screen

Enables the inline round-edit affordance for both in-game admin
play and the game-over recap. ViewerBoard intentionally does not
pass dispatch, keeping the viewer read-only in both states."
```

---

## Task 7: End-to-end verification

**Files:** none modified.

- [ ] **Step 1: Run the full test suite**

Run: `npm test`

Expected: PASS — every test green.

- [ ] **Step 2: Run typecheck**

Run: `npx tsc --noEmit`

Expected: no errors.

- [ ] **Step 3: Run lint**

Run: `npm run lint`

Expected: no new errors. Pre-existing warnings unrelated to these changes can be ignored.

- [ ] **Step 4: Start the dev server**

Run: `npm run dev`

Open the URL printed in the terminal (typically `http://localhost:3000`).

- [ ] **Step 5: Manual verification — round sequence**

1. Start a new game with 5 players.
2. Confirm the round-counter at the top of the screen reads "Round 1 of 20" (not 19).
3. Play through enough rounds to confirm the card-count progresses 1→10 then 10→1 (peak doubled).

Expected: total rounds = 20; round 10 and round 11 both have 10 cards.

- [ ] **Step 6: Manual verification — points formula**

During play:
- Confirm a successful bid of 0 awards 10 points.
- Confirm a successful bid of 1 awards 11 points.
- Confirm a successful bid of 2 awards 20 points (not 21).
- Confirm a successful bid of 3 awards 30 points (not 31).
- Confirm a failed bid awards 0.

- [ ] **Step 7: Manual verification — edit past round (admin)**

After at least 2 rounds are submitted, on the admin scoreboard:
1. Tap a round-column header (the suit-icon + card-count).
2. Confirm the editor panel appears below the table with that round's bids and actuals pre-filled.
3. Change a bid and an actual; confirm point preview updates live.
4. Verify Save is disabled when total actuals ≠ cards or total bids = cards.
5. Save with valid values; confirm the editor closes, the table updates, and totals re-rank correctly.
6. Tap the same column header again; confirm it does nothing (panel does not reopen). Tap a different header; confirm the editor switches.
7. Tap a header, change values without saving, then tap a different header; confirm the unsaved draft is discarded.

- [ ] **Step 8: Manual verification — viewer is unaffected**

1. While the admin game is running, open `http://localhost:3000` in a second browser (or private window). On the lobby, choose "Join Room" and enter the admin's room code (visible in the admin header). This routes through `GameShell.handleJoinRoom` and renders `<ViewerBoard>`.
2. Confirm round-column headers are NOT clickable on the viewer (they are plain `<div>`s, not buttons, because `ViewerBoard` does not pass `dispatch` to `Scoreboard`).
3. Edit a round on the admin; confirm the viewer's scoreboard updates within ~1 second via the existing SSE stream.

- [ ] **Step 9: Manual verification — edit during live bidding**

1. While round N is in the bidding sub-phase (not yet submitted), open the editor for round N-1 on the admin scoreboard.
2. Confirm placing/undoing bids on the live BiddingPhase still works while the editor is open.
3. Save an edit to round N-1; confirm the live bid state and current round are unaffected.

- [ ] **Step 10: Manual verification — game-over edits**

1. Play through to game-over (admin board).
2. Confirm the scoreboard is still visible (rendered by `GameShell` inside the game-over branch).
3. Tap a round-column header on the game-over scoreboard.
4. Confirm the editor opens, edit a value, save.
5. Confirm cumulative scores update and the leaderboard at the top re-ranks. The displayed winner should also update if the leader changed.

- [ ] **Step 11: Stop the dev server**

`Ctrl+C` in the terminal.

- [ ] **Step 12: No commit needed if verification passes**

If a manual issue surfaces, fix it in a follow-up commit referencing the failure case.

---

## Out of scope (intentional)

- Migrating in-flight games (started before this PR) to the new round count. They keep their saved `roundSequence`. New games and post-reset get the fix.
- Rewriting points on past rounds. Only the round being edited gets new-formula points. Untouched past-round point values are preserved (deliberate: silent retro-rewrites would surprise players mid-game).
- Confirmation prompt when discarding an unsaved edit draft.
- Undo / history of edits.
