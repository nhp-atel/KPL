import { NextRequest, NextResponse } from "next/server";
import { getRoom, updateRoomState } from "@/lib/room-store";
import { GameState } from "@/lib/types";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const room = getRoom(code);
  if (!room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }
  return NextResponse.json(room.state);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const state: GameState = await req.json();
  const updated = updateRoomState(code, state);
  if (!updated) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
