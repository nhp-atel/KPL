import { Card, Suit } from "./types";

const SUITS: Suit[] = ["clubs", "hearts", "diamonds", "spades"];
const RANK_LABELS: Record<number, string> = {
  2: "2", 3: "3", 4: "4", 5: "5", 6: "6", 7: "7", 8: "8",
  9: "9", 10: "10", 11: "J", 12: "Q", 13: "K", 14: "A",
};
const SUIT_SYMBOLS: Record<Suit, string> = {
  spades: "\u2660", diamonds: "\u2666", clubs: "\u2663", hearts: "\u2665",
};

export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (let rank = 2; rank <= 14; rank++) {
    for (const suit of SUITS) {
      deck.push({
        rank,
        suit,
        label: `${RANK_LABELS[rank]}${SUIT_SYMBOLS[suit]}`,
      });
    }
  }
  return deck;
}

// Remove lowest-rank cards to make deck evenly divisible by numPlayers.
// Removal order within same rank: clubs, hearts, diamonds, spades.
export function removeSurplusCards(numPlayers: number): { deck: Card[]; removed: Card[] } {
  const deck = createDeck();
  const remainder = 52 % numPlayers;
  // Cards are already sorted by rank ASC, suit order: clubs, hearts, diamonds, spades
  const removed = deck.splice(0, remainder);
  return { deck, removed };
}

export function getMaxCardsPerPlayer(numPlayers: number): number {
  const remainder = 52 % numPlayers;
  return (52 - remainder) / numPlayers;
}
