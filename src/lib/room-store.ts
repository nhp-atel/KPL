import { GameState } from "./types";

interface Room {
  code: string;
  state: GameState;
  listeners: Set<(data: string) => void>;
  createdAt: number;
}

const rooms = new Map<string, Room>();

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous chars
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export function createRoom(initialState: GameState): string {
  let code = generateCode();
  while (rooms.has(code)) {
    code = generateCode();
  }
  rooms.set(code, {
    code,
    state: initialState,
    listeners: new Set(),
    createdAt: Date.now(),
  });
  return code;
}

export function getRoom(code: string): Room | undefined {
  return rooms.get(code.toUpperCase());
}

export function updateRoomState(code: string, state: GameState): boolean {
  const room = rooms.get(code.toUpperCase());
  if (!room) return false;
  room.state = state;
  // Notify all SSE listeners
  const data = JSON.stringify(state);
  for (const listener of room.listeners) {
    listener(data);
  }
  return true;
}

export function addListener(code: string, listener: (data: string) => void): () => void {
  const room = rooms.get(code.toUpperCase());
  if (!room) return () => {};
  room.listeners.add(listener);
  return () => {
    room.listeners.delete(listener);
  };
}

// Clean up rooms older than 12 hours
setInterval(() => {
  const cutoff = Date.now() - 12 * 60 * 60 * 1000;
  for (const [code, room] of rooms) {
    if (room.createdAt < cutoff) {
      rooms.delete(code);
    }
  }
}, 60 * 60 * 1000);
