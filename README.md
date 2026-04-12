# KaChuFul - Score Tracker

A web-based score tracking app for the card game KaChuFul (Kutchfoil). Built with Next.js, React, and TypeScript.

## Quick Start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint |

## Tech Stack

- **Next.js 16** with App Router
- **React 19** with `useReducer` for state management
- **TypeScript** (strict mode)
- **Tailwind CSS 4** for styling
- **localStorage** for game persistence

## Architecture

```
src/
├── app/
│   ├── layout.tsx            Root layout (Geist fonts, metadata)
│   ├── page.tsx              Home page — renders GameShell
│   └── globals.css           Tailwind config, light/dark mode vars
├── components/
│   ├── GameShell.tsx         Main container, routes phases
│   ├── SetupScreen.tsx       Player count & name entry
│   ├── InitialDraw.tsx       Card draw for play order
│   ├── GameBoard.tsx         Gameplay wrapper (bidding + scoring)
│   ├── RoundHeader.tsx       Round number, trump suit, first bidder
│   ├── BiddingPhase.tsx      Bid input with forbidden-bid rule
│   ├── ScoringPhase.tsx      Actual tricks entry + point calc
│   ├── Scoreboard.tsx        Standings table + round history
│   └── SuitIcon.tsx          Suit symbol renderer (♠ ♣ ♦ ♥)
├── hooks/
│   └── useGameState.ts       useReducer + localStorage persistence
└── lib/
    ├── types.ts              All TypeScript types (Card, Player, GameState, etc.)
    ├── deck.ts               Deck creation, card removal for player count
    ├── game-logic.ts         Scoring rules, bid validation, round sequences
    └── initial-draw.ts       Fisher-Yates shuffle, deal & sort for play order
```

## Game Flow

```
Setup → Draw → [Bidding → Scoring] × N rounds → Game Over
```

1. **Setup** — Choose 3-8 players and enter names. The app calculates how many cards to remove so the deck divides evenly.
2. **Draw** — Each player draws one card. Highest card determines first player.
3. **Playing** — Repeats for each round (cards per player go 1, 2, ..., max, ..., 2, 1):
   - **Bidding** — Players bid how many tricks they expect to win. The last bidder has a forbidden bid (total bids cannot equal cards in the round).
   - **Scoring** — Enter actual tricks won. Points: correct bid = bid × 10 + 1 (bidding 0 correctly = 10 points); wrong = 0.
4. **Game Over** — Final standings displayed.

## Key Game Logic

- **Trump suits** cycle in a triangle wave: ♠ ♦ ♣ ♥ ♣ ♦ ♠ ♦ ...
- **Round sequence** ramps up then back down: 1, 2, ..., max, max-1, ..., 1
- **Player order** rotates each round so a different player bids first
- **Forbidden bid rule** prevents the last bidder from making the total bids equal the number of cards in the round

## State Management

All game state lives in a single `useReducer` hook (`useGameState`). Actions:

| Action | Effect |
|--------|--------|
| `SET_PLAYERS` | Initialize game with player names, generate round/suit sequences |
| `COMPLETE_DRAW` | Set player order from draw results, move to playing phase |
| `SUBMIT_BIDS` | Lock in bids, transition to scoring sub-phase |
| `SUBMIT_RESULTS` | Calculate points, record round, advance or end game |
| `NEXT_ROUND` | Reset for next round |
| `RESET_GAME` | Clear all state |

State is auto-saved to `localStorage` (key: `kachuful-game-state`) after every action and restored on page load, so games survive refreshes.
