import { Card, Player } from "./types";
import { createDeck } from "./deck";

// Fisher-Yates shuffle
function shuffleDeck(deck: Card[]): Card[] {
  const arr = [...deck];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

const SUIT_RANK: Record<string, number> = {
  clubs: 0,
  diamonds: 1,
  hearts: 2,
  spades: 3,
};

// Deal one card to each player, return players with cards and sorted order (highest first)
export function dealInitialCards(players: Player[]): {
  playersWithCards: Player[];
  playerOrder: number[];
} {
  const deck = shuffleDeck(createDeck());
  const playersWithCards = players.map((p, i) => ({
    ...p,
    drawnCard: deck[i],
  }));

  // Sort by card rank descending, then suit rank descending for ties
  const sorted = [...playersWithCards].sort((a, b) => {
    const rankDiff = b.drawnCard!.rank - a.drawnCard!.rank;
    if (rankDiff !== 0) return rankDiff;
    return SUIT_RANK[b.drawnCard!.suit] - SUIT_RANK[a.drawnCard!.suit];
  });

  return {
    playersWithCards,
    playerOrder: sorted.map((p) => p.id),
  };
}
