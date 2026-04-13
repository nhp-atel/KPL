export type Suit = "spades" | "diamonds" | "clubs" | "hearts";

export type Phase = "setup" | "draw" | "playing" | "gameOver";
export type SubPhase = "bidding" | "scoring";

export interface Card {
  rank: number; // 2-14 (J=11, Q=12, K=13, A=14)
  suit: Suit;
  label: string; // "A♠", "10♦", etc.
}

export interface Player {
  id: number;
  name: string;
  drawnCard?: Card;
}

export interface RoundBid {
  playerId: number;
  bid: number;
}

export interface RoundResult {
  playerId: number;
  bid: number;
  actual: number;
  points: number;
}

export interface RoundRecord {
  roundIndex: number;
  cardsPerPlayer: number;
  trumpSuit: Suit;
  results: RoundResult[];
}

export interface GameState {
  phase: Phase;
  subPhase: SubPhase;
  players: Player[];
  numPlayers: number;
  maxCardsPerPlayer: number;
  roundSequence: number[];
  suitSequence: Suit[];
  currentRoundIndex: number;
  playerOrder: number[]; // player IDs in play order (from initial draw)
  bids: RoundBid[];
  roundHistory: RoundRecord[];
  cumulativeScores: Record<number, number>;
}

export type GameAction =
  | { type: "SET_PLAYERS"; players: Player[] }
  | { type: "COMPLETE_DRAW"; playerOrder: number[]; players: Player[] }
  | { type: "PLACE_BID"; playerId: number; bid: number }
  | { type: "UNDO_BID" }
  | { type: "CONFIRM_BIDS" }
  | { type: "SUBMIT_RESULTS"; results: { playerId: number; actual: number }[] }
  | { type: "NEXT_ROUND" }
  | { type: "RESET_GAME" }
  | { type: "HYDRATE"; state: GameState };
