import { Suit, RoundBid } from "./types";

const SUITS: Suit[] = ["spades", "diamonds", "clubs", "hearts"];

// Triangle wave: 0,1,2,3,2,1,0,1,2,3,2,1,...
export function getSuitForRound(roundIndex: number): Suit {
  const pos = roundIndex % 6;
  const index = pos <= 3 ? pos : 6 - pos;
  return SUITS[index];
}

// Generate [1, 2, ..., max, max-1, ..., 1]
export function generateRoundSequence(max: number): number[] {
  const ascending = Array.from({ length: max }, (_, i) => i + 1);
  const descending = Array.from({ length: max - 1 }, (_, i) => max - 1 - i);
  return [...ascending, ...descending];
}

export function generateSuitSequence(totalRounds: number): Suit[] {
  return Array.from({ length: totalRounds }, (_, i) => getSuitForRound(i));
}

export function calculatePoints(bid: number, actual: number): number {
  if (bid === actual) {
    return bid === 0 ? 10 : bid * 10 + 1;
  }
  return 0;
}

export function isValidBid(
  bid: number,
  cardsInRound: number,
  existingBids: RoundBid[],
  totalPlayers: number
): { valid: boolean; reason?: string; forbiddenValue?: number } {
  if (bid < 0 || bid > cardsInRound) {
    return { valid: false, reason: `Bid must be between 0 and ${cardsInRound}` };
  }
  if (!Number.isInteger(bid)) {
    return { valid: false, reason: "Bid must be a whole number" };
  }

  const isLastBidder = existingBids.length === totalPlayers - 1;
  if (isLastBidder) {
    const sumSoFar = existingBids.reduce((a, b) => a + b.bid, 0);
    const forbidden = cardsInRound - sumSoFar;
    if (bid === forbidden && forbidden >= 0 && forbidden <= cardsInRound) {
      return {
        valid: false,
        reason: `Cannot bid ${bid} — total bids cannot equal ${cardsInRound}`,
        forbiddenValue: forbidden,
      };
    }
  }

  return { valid: true };
}

export function getForbiddenBid(
  cardsInRound: number,
  existingBids: RoundBid[],
  totalPlayers: number
): number | null {
  const isLastBidder = existingBids.length === totalPlayers - 1;
  if (!isLastBidder) return null;
  const sumSoFar = existingBids.reduce((a, b) => a + b.bid, 0);
  const forbidden = cardsInRound - sumSoFar;
  if (forbidden >= 0 && forbidden <= cardsInRound) return forbidden;
  return null;
}

// Rotate player order for a given round
export function getRotatedPlayerOrder(baseOrder: number[], roundIndex: number): number[] {
  const len = baseOrder.length;
  const offset = roundIndex % len;
  return [...baseOrder.slice(offset), ...baseOrder.slice(0, offset)];
}
