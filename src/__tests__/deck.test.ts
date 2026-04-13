import { describe, it, expect } from "vitest";
import { createDeck, removeSurplusCards, getMaxCardsPerPlayer } from "@/lib/deck";

describe("createDeck", () => {
  it("creates a 52-card deck", () => {
    const deck = createDeck();
    expect(deck.length).toBe(52);
  });

  it("has 4 suits with 13 cards each", () => {
    const deck = createDeck();
    const suits = new Map<string, number>();
    deck.forEach((c) => suits.set(c.suit, (suits.get(c.suit) || 0) + 1));
    expect(suits.get("spades")).toBe(13);
    expect(suits.get("diamonds")).toBe(13);
    expect(suits.get("clubs")).toBe(13);
    expect(suits.get("hearts")).toBe(13);
  });

  it("has ranks from 2 to 14", () => {
    const deck = createDeck();
    const ranks = new Set(deck.map((c) => c.rank));
    expect(ranks.size).toBe(13);
    expect(Math.min(...ranks)).toBe(2);
    expect(Math.max(...ranks)).toBe(14);
  });

  it("has unique cards", () => {
    const deck = createDeck();
    const labels = deck.map((c) => `${c.rank}-${c.suit}`);
    expect(new Set(labels).size).toBe(52);
  });

  it("has correct labels for face cards", () => {
    const deck = createDeck();
    const aceSpades = deck.find((c) => c.rank === 14 && c.suit === "spades");
    expect(aceSpades?.label).toBe("A\u2660");
    const kingHearts = deck.find((c) => c.rank === 13 && c.suit === "hearts");
    expect(kingHearts?.label).toBe("K\u2665");
  });
});

describe("removeSurplusCards", () => {
  it("removes 2 cards for 5 players", () => {
    const { deck, removed } = removeSurplusCards(5);
    expect(removed.length).toBe(2);
    expect(deck.length).toBe(50);
    expect(deck.length % 5).toBe(0);
  });

  it("removes 4 cards for 6 players", () => {
    const { deck, removed } = removeSurplusCards(6);
    expect(removed.length).toBe(4);
    expect(deck.length).toBe(48);
    expect(deck.length % 6).toBe(0);
  });

  it("removes 0 cards for 4 players", () => {
    const { deck, removed } = removeSurplusCards(4);
    expect(removed.length).toBe(0);
    expect(deck.length).toBe(52);
  });

  it("removes 1 card for 3 players", () => {
    const { deck, removed } = removeSurplusCards(3);
    expect(removed.length).toBe(1);
    expect(deck.length).toBe(51);
    expect(deck.length % 3).toBe(0);
  });

  it("removes 3 cards for 7 players", () => {
    const { deck, removed } = removeSurplusCards(7);
    expect(removed.length).toBe(3);
    expect(deck.length).toBe(49);
    expect(deck.length % 7).toBe(0);
  });

  it("removes lowest rank cards first", () => {
    const { removed } = removeSurplusCards(5);
    // Should remove 2s (lowest rank = 2)
    expect(removed.every((c) => c.rank === 2)).toBe(true);
  });

  it("resulting deck is evenly divisible for all player counts 3-8", () => {
    for (let n = 3; n <= 8; n++) {
      const { deck } = removeSurplusCards(n);
      expect(deck.length % n).toBe(0);
    }
  });
});

describe("getMaxCardsPerPlayer", () => {
  it("returns 10 for 5 players", () => {
    expect(getMaxCardsPerPlayer(5)).toBe(10);
  });

  it("returns 8 for 6 players", () => {
    expect(getMaxCardsPerPlayer(6)).toBe(8);
  });

  it("returns 13 for 4 players", () => {
    expect(getMaxCardsPerPlayer(4)).toBe(13);
  });

  it("returns 17 for 3 players", () => {
    expect(getMaxCardsPerPlayer(3)).toBe(17);
  });

  it("returns 7 for 7 players", () => {
    expect(getMaxCardsPerPlayer(7)).toBe(7);
  });

  it("returns 6 for 8 players", () => {
    expect(getMaxCardsPerPlayer(8)).toBe(6);
  });
});
