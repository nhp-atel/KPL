import { NextRequest, NextResponse } from "next/server";
import { createRoom } from "@/lib/room-store";
import { GameState } from "@/lib/types";

export async function POST(req: NextRequest) {
  const state: GameState = await req.json();
  const code = createRoom(state);
  return NextResponse.json({ code });
}
