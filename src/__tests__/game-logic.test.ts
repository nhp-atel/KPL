import { describe, it, expect } from "vitest";
import {
  getSuitForRound,
  generateRoundSequence,
  generateSuitSequence,
  calculatePoints,
  isValidBid,
  getForbiddenBid,
  getRotatedPlayerOrder,
} from "@/lib/game-logic";

describe("getSuitForRound", () => {
  it("follows S,D,C,H for rounds 0-3", () => {
    expect(getSuitForRound(0)).toBe("spades");
    expect(getSuitForRound(1)).toBe("diamonds");
    expect(getSuitForRound(2)).toBe("clubs");
    expect(getSuitForRound(3)).toBe("hearts");
  });

  it("reverses to H,C,D,S for rounds 4-7", () => {
    expect(getSuitForRound(4)).toBe("hearts");
    expect(getSuitForRound(5)).toBe("clubs");
    expect(getSuitForRound(6)).toBe("diamonds");
    expect(getSuitForRound(7)).toBe("spades");
  });

  it("repeats the 8-round cycle", () => {
    expect(getSuitForRound(8)).toBe("spades");
    expect(getSuitForRound(9)).toBe("diamonds");
    expect(getSuitForRound(10)).toBe("clubs");
    expect(getSuitForRound(11)).toBe("hearts");
    expect(getSuitForRound(12)).toBe("hearts");
    expect(getSuitForRound(13)).toBe("clubs");
    expect(getSuitForRound(14)).toBe("diamonds");
    expect(getSuitForRound(15)).toBe("spades");
  });

  it("produces correct suit for 5 players (19 rounds)", () => {
    const expected = [
      "spades", "diamonds", "clubs", "hearts",   // 1-4 cards
      "hearts", "clubs", "diamonds", "spades",    // 5-8 cards
      "spades", "diamonds",                        // 9-10 cards
      "clubs", "hearts",                           // 9-8 cards (descending)
      "hearts", "clubs", "diamonds", "spades",    // 7-4 cards
      "spades", "diamonds", "clubs",              // 3-1 cards
    ];
    for (let i = 0; i < 19; i++) {
      expect(getSuitForRound(i)).toBe(expected[i]);
    }
  });
});

describe("generateRoundSequence", () => {
  it("generates 1 to max to 1 for max=10", () => {
    const seq = generateRoundSequence(10);
    expect(seq).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1]);
    expect(seq.length).toBe(19);
  });

  it("generates correct sequence for max=8", () => {
    const seq = generateRoundSequence(8);
    expect(seq).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 7, 6, 5, 4, 3, 2, 1]);
    expect(seq.length).toBe(15);
  });

  it("generates correct sequence for max=1", () => {
    const seq = generateRoundSequence(1);
    expect(seq).toEqual([1]);
    expect(seq.length).toBe(1);
  });

  it("total rounds = 2*max - 1", () => {
    for (let max = 1; max <= 13; max++) {
      expect(generateRoundSequence(max).length).toBe(2 * max - 1);
    }
  });
});

describe("generateSuitSequence", () => {
  it("returns correct number of suits", () => {
    const seq = generateSuitSequence(19);
    expect(seq.length).toBe(19);
  });

  it("matches getSuitForRound for each index", () => {
    const seq = generateSuitSequence(19);
    for (let i = 0; i < 19; i++) {
      expect(seq[i]).toBe(getSuitForRound(i));
    }
  });
});

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

describe("isValidBid", () => {
  it("allows bids between 0 and cardsInRound", () => {
    expect(isValidBid(0, 5, [], 5).valid).toBe(true);
    expect(isValidBid(3, 5, [], 5).valid).toBe(true);
    expect(isValidBid(5, 5, [], 5).valid).toBe(true);
  });

  it("rejects negative bids", () => {
    expect(isValidBid(-1, 5, [], 5).valid).toBe(false);
  });

  it("rejects bids greater than cardsInRound", () => {
    expect(isValidBid(6, 5, [], 5).valid).toBe(false);
  });

  it("rejects non-integer bids", () => {
    expect(isValidBid(1.5, 5, [], 5).valid).toBe(false);
  });

  it("allows any bid for non-last bidder", () => {
    const bids = [{ playerId: 0, bid: 3 }];
    // 2nd of 5 bidders - not last
    expect(isValidBid(2, 5, bids, 5).valid).toBe(true);
  });

  it("forbids last bidder from making total equal cards", () => {
    // 5 cards, bids so far: 3+0+2+0=5, last player cannot bid 0 (5+0=5)
    const bids = [
      { playerId: 0, bid: 3 },
      { playerId: 1, bid: 0 },
      { playerId: 2, bid: 2 },
      { playerId: 3, bid: 0 },
    ];
    expect(isValidBid(0, 5, bids, 5).valid).toBe(false);
    expect(isValidBid(0, 5, bids, 5).reason).toContain("Cannot bid 0");
  });

  it("allows last bidder other values", () => {
    const bids = [
      { playerId: 0, bid: 3 },
      { playerId: 1, bid: 0 },
      { playerId: 2, bid: 2 },
      { playerId: 3, bid: 0 },
    ];
    // Total so far: 5, cards: 5, forbidden: 0
    expect(isValidBid(1, 5, bids, 5).valid).toBe(true);
    expect(isValidBid(2, 5, bids, 5).valid).toBe(true);
  });

  it("handles case where forbidden bid is out of range", () => {
    // If sum > cards, forbidden would be negative - should be no restriction
    const bids = [
      { playerId: 0, bid: 3 },
      { playerId: 1, bid: 3 },
      { playerId: 2, bid: 3 },
      { playerId: 3, bid: 3 },
    ];
    // Total: 12, cards: 5, forbidden would be -7 (out of range)
    expect(isValidBid(0, 5, bids, 5).valid).toBe(true);
    expect(isValidBid(5, 5, bids, 5).valid).toBe(true);
  });
});

describe("getForbiddenBid", () => {
  it("returns null for non-last bidder", () => {
    expect(getForbiddenBid(5, [], 5)).toBeNull();
    expect(getForbiddenBid(5, [{ playerId: 0, bid: 2 }], 5)).toBeNull();
  });

  it("returns the forbidden value for last bidder", () => {
    const bids = [
      { playerId: 0, bid: 3 },
      { playerId: 1, bid: 0 },
      { playerId: 2, bid: 2 },
      { playerId: 3, bid: 0 },
    ];
    // Total: 5, cards: 5, forbidden: 0
    expect(getForbiddenBid(5, bids, 5)).toBe(0);
  });

  it("returns correct forbidden for different scenario", () => {
    const bids = [
      { playerId: 0, bid: 1 },
      { playerId: 1, bid: 1 },
      { playerId: 2, bid: 1 },
      { playerId: 3, bid: 1 },
    ];
    // Total: 4, cards: 5, forbidden: 1
    expect(getForbiddenBid(5, bids, 5)).toBe(1);
  });

  it("returns null when forbidden is out of range", () => {
    const bids = [
      { playerId: 0, bid: 5 },
      { playerId: 1, bid: 5 },
      { playerId: 2, bid: 5 },
      { playerId: 3, bid: 5 },
    ];
    // Total: 20, cards: 5, forbidden: -15 (out of range)
    expect(getForbiddenBid(5, bids, 5)).toBeNull();
  });
});

describe("getRotatedPlayerOrder", () => {
  it("returns same order for round 0", () => {
    expect(getRotatedPlayerOrder([0, 1, 2, 3, 4], 0)).toEqual([0, 1, 2, 3, 4]);
  });

  it("rotates by 1 for round 1", () => {
    expect(getRotatedPlayerOrder([0, 1, 2, 3, 4], 1)).toEqual([1, 2, 3, 4, 0]);
  });

  it("rotates by 2 for round 2", () => {
    expect(getRotatedPlayerOrder([0, 1, 2, 3, 4], 2)).toEqual([2, 3, 4, 0, 1]);
  });

  it("wraps around after full cycle", () => {
    expect(getRotatedPlayerOrder([0, 1, 2, 3, 4], 5)).toEqual([0, 1, 2, 3, 4]);
  });

  it("works with non-sequential IDs", () => {
    expect(getRotatedPlayerOrder([3, 1, 4, 0, 2], 1)).toEqual([1, 4, 0, 2, 3]);
  });
});
