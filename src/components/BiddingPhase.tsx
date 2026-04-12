"use client";

import { useState } from "react";
import { Player, GameAction, RoundBid } from "@/lib/types";
import { getForbiddenBid } from "@/lib/game-logic";

interface BiddingPhaseProps {
  players: Player[]; // in current round's bidding order
  cardsPerPlayer: number;
  totalPlayers: number;
  dispatch: React.Dispatch<GameAction>;
}

export default function BiddingPhase({
  players,
  cardsPerPlayer,
  totalPlayers,
  dispatch,
}: BiddingPhaseProps) {
  const [bids, setBids] = useState<RoundBid[]>([]);
  const [currentBid, setCurrentBid] = useState<number>(0);

  const currentBidderIndex = bids.length;
  const allBidsPlaced = bids.length === players.length;
  const currentPlayer = !allBidsPlaced ? players[currentBidderIndex] : null;

  const forbidden = getForbiddenBid(cardsPerPlayer, bids, totalPlayers);
  const bidSum = bids.reduce((a, b) => a + b.bid, 0);

  const handlePlaceBid = () => {
    if (!currentPlayer) return;
    const newBids = [...bids, { playerId: currentPlayer.id, bid: currentBid }];
    setBids(newBids);
    setCurrentBid(0);
  };

  const handleConfirm = () => {
    dispatch({ type: "SUBMIT_BIDS", bids });
  };

  const handleUndo = () => {
    if (bids.length === 0) return;
    const newBids = bids.slice(0, -1);
    setBids(newBids);
    setCurrentBid(0);
  };

  return (
    <div className="w-full space-y-4">
      <h3 className="text-lg font-bold">Bidding Phase</h3>

      {/* Placed bids */}
      <div className="space-y-2">
        {bids.map((b, i) => {
          const player = players[i];
          return (
            <div
              key={player.id}
              className="flex items-center justify-between p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700"
            >
              <span className="font-medium">{player.name}</span>
              <span className="font-bold text-lg">{b.bid}</span>
            </div>
          );
        })}
      </div>

      {/* Current bidder input */}
      {currentPlayer && (
        <div className="p-4 rounded-xl border-2 border-blue-500 bg-blue-50 dark:bg-blue-900/20 space-y-3">
          <div className="font-medium text-blue-700 dark:text-blue-300">
            {currentPlayer.name}&apos;s bid
            {forbidden !== null && (
              <span className="text-sm ml-2 text-red-500">
                (cannot bid {forbidden})
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCurrentBid(Math.max(0, currentBid - 1))}
              className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-700 text-xl font-bold hover:bg-zinc-300 dark:hover:bg-zinc-600 transition"
            >
              -
            </button>
            <span className="text-3xl font-bold w-12 text-center">
              {currentBid}
            </span>
            <button
              onClick={() =>
                setCurrentBid(Math.min(cardsPerPlayer, currentBid + 1))
              }
              className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-700 text-xl font-bold hover:bg-zinc-300 dark:hover:bg-zinc-600 transition"
            >
              +
            </button>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handlePlaceBid}
              disabled={currentBid === forbidden}
              className="flex-1 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Place Bid
            </button>
            {bids.length > 0 && (
              <button
                onClick={handleUndo}
                className="px-4 py-2 bg-zinc-200 dark:bg-zinc-700 rounded-lg font-medium hover:bg-zinc-300 dark:hover:bg-zinc-600 transition"
              >
                Undo
              </button>
            )}
          </div>
        </div>
      )}

      {/* Bid summary */}
      <div className="text-sm text-zinc-500 text-center">
        Total bids so far: <span className="font-bold text-foreground">{bidSum}</span> / {cardsPerPlayer} cards
      </div>

      {/* Confirm all bids */}
      {allBidsPlaced && (
        <div className="space-y-3">
          <div className="text-center text-sm text-zinc-500">
            All bids placed! Total: <span className="font-bold text-foreground">{bidSum}</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleConfirm}
              className="flex-1 py-3 bg-green-600 text-white rounded-lg font-semibold text-lg hover:bg-green-700 transition"
            >
              Confirm Bids
            </button>
            <button
              onClick={handleUndo}
              className="px-4 py-3 bg-zinc-200 dark:bg-zinc-700 rounded-lg font-medium hover:bg-zinc-300 dark:hover:bg-zinc-600 transition"
            >
              Undo Last
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
