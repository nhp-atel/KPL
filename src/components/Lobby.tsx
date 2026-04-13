"use client";

import { useState } from "react";

interface LobbyProps {
  onCreateRoom: () => void;
  onJoinRoom: (code: string) => void;
}

export default function Lobby({ onCreateRoom, onJoinRoom }: LobbyProps) {
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState("");
  const [joining, setJoining] = useState(false);

  const handleJoin = async () => {
    const code = joinCode.trim().toUpperCase();
    if (code.length !== 4) {
      setError("Room code must be 4 characters");
      return;
    }
    setJoining(true);
    setError("");
    try {
      const res = await fetch(`/api/rooms/${code}`);
      if (!res.ok) {
        setError("Room not found. Check the code and try again.");
        setJoining(false);
        return;
      }
      onJoinRoom(code);
    } catch {
      setError("Could not connect. Make sure you're on the same network.");
      setJoining(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-8 w-full max-w-md mx-auto">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-2">KaChuFul</h1>
        <p className="text-zinc-500">Card Game Score Tracker</p>
      </div>

      {/* Admin: Create Room */}
      <div className="w-full space-y-3">
        <button
          onClick={onCreateRoom}
          className="w-full py-4 bg-blue-600 text-white rounded-xl font-semibold text-lg hover:bg-blue-700 transition"
        >
          Host a Game
        </button>
        <p className="text-sm text-zinc-500 text-center">
          Create a room and share the code with players
        </p>
      </div>

      <div className="flex items-center gap-4 w-full">
        <div className="flex-1 h-px bg-zinc-300 dark:bg-zinc-700" />
        <span className="text-sm text-zinc-400">or</span>
        <div className="flex-1 h-px bg-zinc-300 dark:bg-zinc-700" />
      </div>

      {/* Viewer: Join Room */}
      <div className="w-full space-y-3">
        <label className="block text-sm font-medium">Join a Room</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={joinCode}
            onChange={(e) => {
              setJoinCode(e.target.value.toUpperCase().slice(0, 4));
              setError("");
            }}
            placeholder="Enter room code"
            maxLength={4}
            className="flex-1 px-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-center text-2xl font-mono tracking-widest uppercase focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <button
            onClick={handleJoin}
            disabled={joinCode.length !== 4 || joining}
            className="px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {joining ? "..." : "Join"}
          </button>
        </div>
        {error && <p className="text-sm text-red-500 text-center">{error}</p>}
        <p className="text-sm text-zinc-500 text-center">
          View the live scoreboard on your device
        </p>
      </div>
    </div>
  );
}
