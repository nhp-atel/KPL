# Edit past-round results + fix round sequence + fix points formula

## Background

Three bugs in the KaChuFul game:

1. **Round sequence is one short.** `generateRoundSequence(max)` produces `[1..max, max-1..1]` (length `2*max - 1`). The peak card count should be played twice — `[1..max, max..1]` (length `2*max`). For 5 players this means 20 rounds (currently 19).
2. **No way to correct a scoring mistake.** Once a round's bid + actual is submitted, there is no UI to edit it. Mistakes (wrong bid recorded, wrong tricks-won) become permanent.
3. **Points formula adds the `+1` bonus to every successful bid.** It should only apply to bid=0 (10 pts) and bid=1 (11 pts). Successful bids of 2+ should award a flat `bid * 10`.

All three are independent and shipped together for convenience.

## Goals

- Round sequence has the peak played twice for **all** player counts.
- Admin can retroactively edit any past round's bid and actual per player. Cumulative scores recompute automatically. Viewers see the updated scores via the existing SSE sync.
- Points formula awards `10` for a successful bid of 0, `11` for a successful bid of 1, and `bid * 10` for any successful bid ≥ 2. Failed bids award 0. (Old behavior: `bid * 10 + 1` for any successful bid ≥ 1.)

## Non-goals

- Migrating in-flight games (started before the fix) to the new sequence length. They keep their saved sequence; new games and post-reset games get the fix.
- Manual point overrides that bypass `calculatePoints(bid, actual)`. All edits go through bid + actual.
- Undo / history of edits. An edit overwrites prior values.
- A confirmation prompt when discarding an unsaved draft.

---

## Design

### 0. Points formula

In `src/lib/game-logic.ts`, replace `calculatePoints`:

```ts
export function calculatePoints(bid: number, actual: number): number {
  if (bid !== actual) return 0;
  if (bid === 0) return 10;
  if (bid === 1) return 11;
  return bid * 10;
}
```

Effect on successful bids:

| Bid | Old points | New points |
|-----|------------|------------|
| 0   | 10         | 10         |
| 1   | 11         | 11         |
| 2   | 21         | 20         |
| 3   | 31         | 30         |
| n≥2 | n*10 + 1   | n*10       |

Failed bids stay at 0.

**Retroactive impact on past rounds:** `RoundRecord.results[].points` is stored per round in `roundHistory`. Existing in-flight games carry old point values. The `EDIT_ROUND` reducer recomputes points via the new `calculatePoints`, but only for the round being edited — it does not silently rewrite untouched rounds. To recalc the entire history under the new formula, the admin can edit each round (a no-op edit triggers recompute), or reset and start a new game. This is intentional: silent retro-rewrites of cumulative scores would surprise players mid-game.

### 1. Round sequence

In `src/lib/game-logic.ts`:

```ts
export function generateRoundSequence(max: number): number[] {
  const ascending = Array.from({ length: max }, (_, i) => i + 1);
  const descending = Array.from({ length: max }, (_, i) => max - i);
  return [...ascending, ...descending];
}
```

Length goes from `2*max - 1` to `2*max`. `generateSuitSequence(totalRounds)` is length-driven and continues the existing 8-cycle naturally.

Player-count effects:

| Players | Max cards | Old rounds | New rounds |
|---------|-----------|------------|------------|
| 4       | 13        | 25         | 26         |
| 5       | 10        | 19         | 20         |
| 6       | 8         | 15         | 16         |
| 7       | 7         | 13         | 14         |

### 2. Edit past-round results

#### UI

`src/components/Scoreboard.tsx` becomes a client component and accepts an optional `dispatch` prop. When present (admin), each round-column header in the round-history table becomes a tap target. Tapping a header opens an inline editor **below the table**:

- One row per player with `[- N +]` controls for both bid and actual.
- Live `points` preview per row using `calculatePoints(bid, actual)`.
- Footer shows `Total bids: B / cards` and `Total tricks: A / cards`.
- Save button disabled until both validations pass.
- Tapping the same header (or another header) closes / switches the panel and discards any unsaved draft.

When `dispatch` is absent (viewer), headers stay non-interactive — viewers see read-only.

#### Validation on save

Mirrors live-play rules:

- Each `actual ∈ [0, cardsPerPlayer]`; `sum(actuals) === cardsPerPlayer`.
- Each `bid ∈ [0, cardsPerPlayer]`; `sum(bids) !== cardsPerPlayer`.

The "last bidder forbidden" rule has no notion of order at edit time, so it is applied as a sum constraint across all bids. This is the same underlying invariant.

#### Reducer action

In `src/lib/types.ts`, extend `GameAction`:

```ts
| {
    type: "EDIT_ROUND";
    roundIndex: number;
    bids: { playerId: number; bid: number }[];
    actuals: { playerId: number; actual: number }[];
  }
```

In `src/hooks/useGameState.ts` `gameReducer`, the `EDIT_ROUND` case:

1. Locate the `RoundRecord` in `state.roundHistory` whose `roundIndex` matches.
2. Build a replacement record: same `roundIndex`, `cardsPerPlayer`, `trumpSuit`; new `results` computed from the supplied `bids` + `actuals` via `calculatePoints`.
3. Splice it into `roundHistory` in place.
4. Recompute `cumulativeScores` from scratch by summing `points` across the new `roundHistory` (per player). Recompute-from-scratch avoids drift versus delta-based update.
5. Leave `phase`, `subPhase`, `currentRoundIndex`, and the live in-progress `bids` array untouched.

#### Persistence + sync

No new endpoints. The existing effects in `useGameState`:

- `localStorage.setItem(STORAGE_KEY, ...)` on any state change → covers admin persistence.
- `PUT /api/rooms/[code]` on any state change → covers room replication.
- `/api/rooms/[code]/stream` SSE handler pushes the new state to viewers, who `HYDRATE` it.

The `silent fail for sync` `.catch()` on the PUT continues to absorb transient network errors — the next state change retries.

### 3. Components

**New: `src/components/RoundEditor.tsx`**
- Props: `players: Player[]`, `round: RoundRecord`, `onSave(bids, actuals)`, `onCancel()`.
- Owns local `bids` and `actuals` drafts as `Record<playerId, number>` (mirrors `ScoringPhase`).
- Pure form. No reducer, no persistence, no room knowledge.
- Disables Save until both sum-validations pass.

**Changed: `src/components/Scoreboard.tsx`**
- Adds `"use client"`.
- Adds optional `dispatch?: React.Dispatch<GameAction>` prop.
- Owns `expandedRoundIndex: number | null` state.
- When admin (dispatch present), round-column headers are buttons that toggle `expandedRoundIndex`.
- Renders `<RoundEditor>` below the table when expanded; `onSave` dispatches `EDIT_ROUND` and clears the index.

**Changed: `src/components/GameBoard.tsx`**
- Forwards `dispatch` to `Scoreboard`.
- `ViewerBoard.tsx` is unchanged — it omits `dispatch`, so the editor stays disabled there.

**Changed: `src/lib/types.ts`**
- Adds the `EDIT_ROUND` variant to `GameAction`.

**Changed: `src/hooks/useGameState.ts`**
- Adds the `EDIT_ROUND` reducer case.

**Changed: `src/lib/game-logic.ts`**
- Fixes `generateRoundSequence`.

### 4. Edge cases

- **Mid-game edit.** `EDIT_ROUND` does not touch live game-flow fields. Bidding or scoring on round N continues uninterrupted while round M < N is edited.
- **Game-over edit.** Allowed. Reducer does not gate on `phase === "gameOver"`. Leaderboard re-ranks.
- **Current round.** Not yet in `roundHistory` until `SUBMIT_RESULTS`, so it has no column and no edit affordance.
- **Empty scoreboard.** `Scoreboard` already returns `null` when `roundHistory.length === 0`.
- **Invalid edit.** Save is disabled; reducer does not need defensive re-validation (matches `SUBMIT_RESULTS` which also trusts the UI).
- **Viewer race.** Admin saves → state changes → PUT → SSE → viewer `HYDRATE`s the new state. Standard existing path.
- **Migrating in-flight games.** Not done. Saved `roundSequence` and `suitSequence` keep their length. New games and post-reset get `2*max` rounds.

### 5. Testing

**Update `src/__tests__/game-logic.test.ts`:**

Round sequence:
- Update `generateRoundSequence(10)` expected array to `[1..10, 10..1]` and length to 20.
- Update `generateRoundSequence(8)` expected array to `[1..8, 8..1]` and length to 16.
- Replace the loop-based `2*max - 1` assertion with `2*max`.
- Add: `generateRoundSequence(5)` equals `[1,2,3,4,5,5,4,3,2,1]`.
- Add: `generateRoundSequence(10)` middle slice contains `[..., 9, 10, 10, 9, ...]`.

Suit sequence (5-player example): the existing "produces correct suit for 5 players (19 rounds)" test must be updated to 20 rounds, with the inserted second peak at index 10 ('diamonds' under the existing 8-cycle).

Points formula:
- Update "gives 21 points for bidding 2 and making 2" → expect 20.
- Update "gives 31 points for bidding 3 and making 3" → expect 30.
- Update "gives 101 points for bidding 10 and making 10" → expect 100.
- Update "formula is N*10+1 for N>=1" → split into two: bid=1 → 11, bid≥2 → bid*10.
- Keep existing bid=0,actual=0 → 10 and bid=1,actual=1 → 11 tests as-is.

**New `src/__tests__/edit-round.test.ts`:**
- `EDIT_ROUND` replaces only the targeted `roundHistory` entry; other entries are byte-identical.
- `cumulativeScores` after edit equal a fresh sum across the whole new `roundHistory` (verified by computing manually for a small fixture).
- Editing both bid and actual recomputes `points` via the new `calculatePoints` (e.g. bid=2 actual=2 → 20; bid=1 actual=1 → 11; bid=0 actual=0 → 10; bid=3 actual=2 → 0).
- `phase`, `subPhase`, `currentRoundIndex`, live `bids` unchanged after `EDIT_ROUND`.

**Manual UI verification:**
- Open admin in one tab, viewer in another, play a few rounds.
- Tap a round column on admin scoreboard, edit, save → admin scoreboard updates → viewer scoreboard updates within ~1s via SSE.
- Tap same column → editor closes. Tap another column with editor open → editor switches.
- Try invalid edits (bid sum equals cards, actuals don't sum to cards) → Save stays disabled.
- Edit during live bidding of a later round → live bidding state unaffected.
