import { NextRequest } from "next/server";
import { getRoom, addListener } from "@/lib/room-store";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const room = getRoom(code);
  if (!room) {
    return new Response("Room not found", { status: 404 });
  }

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      // Send current state immediately
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(room.state)}\n\n`));

      // Listen for updates
      const removeListener = addListener(code, (data: string) => {
        try {
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        } catch {
          removeListener();
        }
      });

      // Clean up when client disconnects
      _req.signal.addEventListener("abort", () => {
        removeListener();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
