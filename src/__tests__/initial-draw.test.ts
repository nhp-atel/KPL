import { describe, it, expect } from "vitest";
import { dealInitialCards } from "@/lib/initial-draw";
import { Player } from "@/lib/types";

describe("dealInitialCards", () => {
  const players: Player[] = [
    { id: 0, name: "Alice" },
    { id: 1, name: "Bob" },
    { id: 2, name: "Charlie" },
    { id: 3, name: "Dave" },
    { id: 4, name: "Eve" },
  ];

  it("assigns a card to each player", () => {
    const { playersWithCards } = dealInitialCards(players);
    expect(playersWithCards.length).toBe(5);
    playersWithCards.forEach((p) => {
      expect(p.drawnCard).toBeDefined();
      expect(p.drawnCard!.rank).toBeGreaterThanOrEqual(2);
      expect(p.drawnCard!.rank).toBeLessThanOrEqual(14);
    });
  });

  it("assigns unique cards", () => {
    const { playersWithCards } = dealInitialCards(players);
    const labels = playersWithCards.map((p) => p.drawnCard!.label);
    expect(new Set(labels).size).toBe(5);
  });

  it("returns player order sorted by card rank descending", () => {
    const { playersWithCards, playerOrder } = dealInitialCards(players);
    for (let i = 0; i < playerOrder.length - 1; i++) {
      const curr = playersWithCards.find((p) => p.id === playerOrder[i])!;
      const next = playersWithCards.find((p) => p.id === playerOrder[i + 1])!;
      // Current should have rank >= next
      expect(curr.drawnCard!.rank).toBeGreaterThanOrEqual(next.drawnCard!.rank);
    }
  });

  it("returns all player IDs in the order", () => {
    const { playerOrder } = dealInitialCards(players);
    expect(playerOrder.length).toBe(5);
    expect([...playerOrder].sort()).toEqual([0, 1, 2, 3, 4]);
  });

  it("preserves original player IDs", () => {
    const { playersWithCards } = dealInitialCards(players);
    expect(playersWithCards.map((p) => p.id)).toEqual([0, 1, 2, 3, 4]);
  });
});
