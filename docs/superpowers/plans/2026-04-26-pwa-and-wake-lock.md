# PWA installability + screen wake lock — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the KaChuFuL app installable as a PWA (manifest + iOS apple-touch-icon, using the existing `public/Logo.png`) and add a screen wake lock that activates while a game is in progress (admin or viewer, phases `draw`/`playing`/`gameOver`).

**Architecture:** Two new files (`src/app/manifest.ts`, `src/hooks/useWakeLock.ts`) plus minor edits to `src/app/layout.tsx` (icons metadata) and `src/components/GameShell.tsx` (one hook call). No service worker, no offline support, no push notifications, no UI changes. Wake lock state is a pure side effect tied to `state.phase`.

**Tech Stack:** Next.js 16 metadata routes (`MetadataRoute.Manifest`), the browser Wake Lock API (`navigator.wakeLock.request("screen")`), React 19 hooks. Note: `AGENTS.md` warns this Next version may have non-standard APIs — the bundled PWA guide at `node_modules/next/dist/docs/01-app/02-guides/progressive-web-apps.md` and the manifest reference at `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/01-metadata/manifest.md` are authoritative for this Next version. The Wake Lock API is a browser standard, not Next-specific. TypeScript types for `WakeLockSentinel` / `navigator.wakeLock` are in `lib.dom.d.ts` (already in this project's `tsconfig.json` `lib`).

---

## File Structure

**Files to create:**
- `src/app/manifest.ts` — Next.js metadata route handler that returns the PWA manifest. ~20 lines.
- `src/hooks/useWakeLock.ts` — pure side-effect hook taking `active: boolean`. ~40 lines.

**Files to modify:**
- `src/app/layout.tsx` — extend the existing `metadata` export with `icons.icon` and `icons.apple` pointing at `/Logo.png`. Trivial.
- `src/components/GameShell.tsx` — import `useWakeLock`, derive a `wakeLockActive` boolean, call the hook before any early return.

**Files NOT touched:**
- No reducer change.
- No new dependency in `package.json` (Wake Lock types come from `lib.dom`).
- No service worker file.
- `ViewerBoard.tsx`, `GameBoard.tsx`, etc. — wake lock is wired at the `GameShell` level, which is the parent of both, so no per-board change is needed.

**Static asset:** `public/Logo.png` is already in place (512×512, RGBA). Filename casing is exact (`Logo.png`) — case-sensitive web servers will not redirect `/logo.png`.

---

## Task 1: Add the PWA manifest

**Files:**
- Create: `src/app/manifest.ts`

- [ ] **Step 1: Create the manifest file**

Create `src/app/manifest.ts` with the exact content:

```ts
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "KaChuFuL Score Tracker",
    short_name: "KaChuFuL",
    description: "Points recording system for the KaChuFuL card game",
    start_url: "/",
    display: "standalone",
    background_color: "#000000",
    theme_color: "#000000",
    icons: [
      { src: "/Logo.png", sizes: "192x192", type: "image/png" },
      { src: "/Logo.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
```

Note: `Logo.png` is referenced for both 192 and 512 size slots. The actual file is 512×512; browsers will downscale for the 192 slot. Do not lowercase the filename — `Logo.png` is the on-disk casing.

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`

Expected: no errors.

- [ ] **Step 3: Verify lint**

Run: `npm run lint`

Expected: no errors.

- [ ] **Step 4: Verify the manifest is served by the dev server**

Start the dev server in the background:

```bash
npm run dev &
```

Wait ~5 seconds for it to come up, then:

```bash
curl -s http://localhost:3000/manifest.webmanifest | head -30
```

Expected: a JSON document with `"name": "KaChuFuL Score Tracker"`, `"short_name": "KaChuFuL"`, `"display": "standalone"`, and the `icons` array referencing `/Logo.png`.

Also verify the icon file is served:

```bash
curl -sI http://localhost:3000/Logo.png | head -5
```

Expected: `HTTP/1.1 200 OK` (or `HTTP/2 200`) with `Content-Type: image/png`.

Stop the dev server (`kill %1` or `pkill -f "next dev"`).

- [ ] **Step 5: Commit**

```bash
git add src/app/manifest.ts
git commit -m "Add PWA manifest

Defines name, short_name, standalone display, black splash colors,
and references /Logo.png for both 192 and 512 icon slots. Next.js
serves this at /manifest.webmanifest and emits the manifest link
tag in the document head automatically."
```

---

## Task 2: Add iOS apple-touch-icon to layout metadata

**Files:**
- Modify: `src/app/layout.tsx:15-18`

- [ ] **Step 1: Extend the `metadata` export**

In `src/app/layout.tsx`, replace lines 15–18 (the existing `metadata` export):

```ts
export const metadata: Metadata = {
  title: "KaChuFuL - Score Tracker",
  description: "Points recording system for the KaChuFuL card game",
};
```

with:

```ts
export const metadata: Metadata = {
  title: "KaChuFuL - Score Tracker",
  description: "Points recording system for the KaChuFuL card game",
  icons: {
    icon: "/Logo.png",
    apple: "/Logo.png",
  },
};
```

Do not modify anything else in this file.

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`

Expected: no errors.

- [ ] **Step 3: Verify the rendered HTML emits the link tags**

Start the dev server in the background:

```bash
npm run dev &
```

Wait ~5 seconds, then:

```bash
curl -s http://localhost:3000/ | grep -E 'rel="(icon|apple-touch-icon)"'
```

Expected output (order/exact attributes may vary): two lines, one containing `rel="icon"` with `href="/Logo.png"`, one containing `rel="apple-touch-icon"` with `href="/Logo.png"`.

Stop the dev server.

- [ ] **Step 4: Commit**

```bash
git add src/app/layout.tsx
git commit -m "Add icon and apple-touch-icon metadata

Emits <link rel='icon'> and <link rel='apple-touch-icon'> pointing
at /Logo.png so iOS Add-to-Home-Screen uses the brand icon."
```

---

## Task 3: Create the `useWakeLock` hook

**Files:**
- Create: `src/hooks/useWakeLock.ts`

- [ ] **Step 1: Create the hook file**

Create `src/hooks/useWakeLock.ts` with the exact content:

```ts
"use client";

import { useEffect } from "react";

export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    if (typeof navigator === "undefined") return;
    if (!("wakeLock" in navigator)) return;

    let lock: WakeLockSentinel | null = null;
    let cancelled = false;

    const acquire = async () => {
      try {
        const next = await navigator.wakeLock.request("screen");
        if (cancelled) {
          await next.release();
          return;
        }
        lock = next;
      } catch {
        // Permission denied or system released. Will retry on next visibility change.
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible" && !lock) acquire();
    };

    acquire();
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibility);
      lock?.release().catch(() => {});
      lock = null;
    };
  }, [active]);
}
```

Behavior reference:
- `active === false` → effect short-circuits; if a previous render had `active === true`, its cleanup already released its lock.
- Unsupported runtime → silent no-op.
- Tab hidden → browser auto-releases; `visibilitychange` listener re-acquires when tab is shown again.
- Component unmount → cleanup releases lock; in-flight request gets short-circuited via `cancelled`.

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`

Expected: no errors. The `WakeLockSentinel` and `navigator.wakeLock` types come from `lib.dom`, which is already in `tsconfig.json`. If TypeScript complains that `wakeLock` is not on `Navigator`, double-check that `tsconfig.json` includes `"dom"` in its `lib` array (it does — line 4) and that `target` / `lib` is at least up to date enough to know about Wake Lock (ES2017 + dom is sufficient).

- [ ] **Step 3: Verify lint**

Run: `npm run lint`

Expected: no errors.

- [ ] **Step 4: Verify the existing test suite still passes**

Run: `npm test`

Expected: 66/66 tests pass. (The hook itself has no automated tests — see spec section 6 — but the suite must not regress.)

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useWakeLock.ts
git commit -m "Add useWakeLock hook

Pure side-effect React hook that acquires a screen wake lock when
active is true, releases on cleanup, and re-acquires after the
browser auto-releases on tab hide. Silent no-op on browsers
without Wake Lock API support."
```

---

## Task 4: Wire `useWakeLock` into `GameShell`

**Files:**
- Modify: `src/components/GameShell.tsx`

- [ ] **Step 1: Import the hook**

In `src/components/GameShell.tsx`, find the existing imports near the top of the file (around line 4):

```ts
import { useGameState } from "@/hooks/useGameState";
```

Add a new import line directly below it:

```ts
import { useWakeLock } from "@/hooks/useWakeLock";
```

- [ ] **Step 2: Add the hook call after `useGameState`**

In `src/components/GameShell.tsx`, find the existing `useGameState` call (around lines 19–22):

```ts
  const { state, dispatch, resetGame } = useGameState(
    role !== "none" ? roomCode : null,
    role === "viewer"
  );
```

Insert the following block immediately after it (before any other code in the component body):

```ts

  const wakeLockActive =
    role !== "none" &&
    (state.phase === "draw" ||
      state.phase === "playing" ||
      state.phase === "gameOver");
  useWakeLock(wakeLockActive);
```

The hook MUST go above any of the `if (role === "none") return …` / `if (role === "viewer" && roomCode) return …` early-return branches, so that React's rules of hooks are satisfied (hooks always run in the same order on every render).

After the edit, the top of the component body should look approximately like:

```ts
export default function GameShell() {
  const [role, setRole] = useState<Role>("none");
  const [roomCode, setRoomCode] = useState<string | null>(null);

  const { state, dispatch, resetGame } = useGameState(
    role !== "none" ? roomCode : null,
    role === "viewer"
  );

  const wakeLockActive =
    role !== "none" &&
    (state.phase === "draw" ||
      state.phase === "playing" ||
      state.phase === "gameOver");
  useWakeLock(wakeLockActive);

  const handleCreateRoom = useCallback(async () => {
    // ... unchanged
```

Do not modify anything else in this file.

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`

Expected: no errors.

- [ ] **Step 4: Verify lint**

Run: `npm run lint`

Expected: no errors.

- [ ] **Step 5: Verify the full test suite passes**

Run: `npm test`

Expected: 66/66 tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/components/GameShell.tsx
git commit -m "Wire useWakeLock into GameShell

Activates the screen wake lock when role is set and phase is
draw, playing, or gameOver. Applies to both admin and viewer
roles since GameShell is their common parent. Hook is called
unconditionally on every render (above early returns) to satisfy
React's rules of hooks."
```

---

## Task 5: End-to-end verification

**Files:** none modified.

- [ ] **Step 1: Run typecheck, lint, and tests one more time**

Run each of the following and confirm they all pass:

```bash
npx tsc --noEmit
npm run lint
npm test
```

Expected: all three exit cleanly. `npm test` reports 66/66 tests pass.

- [ ] **Step 2: Start the dev server**

Run: `npm run dev`

Wait for the URL to print (typically `http://localhost:3000`). Open it in a browser.

- [ ] **Step 3: Manual verification — manifest is served**

In the browser, navigate to `http://localhost:3000/manifest.webmanifest`. Confirm a JSON document is returned with:
- `"name": "KaChuFuL Score Tracker"`
- `"short_name": "KaChuFuL"`
- `"display": "standalone"`
- `"icons"` array with two entries pointing at `/Logo.png` (sizes 192×192 and 512×512)

In the browser DevTools, open Application → Manifest. Confirm Chrome reports no errors and shows the rendered icon.

- [ ] **Step 4: Manual verification — install prompt**

In Chrome desktop or Android Chrome, look in the address bar / browser menu for an "Install KaChuFuL" option. Click it; confirm the install dialog shows the `Logo.png` icon and the `KaChuFuL` short name. Install it; confirm the launched window has no browser chrome (standalone mode) and uses the black splash background.

If you don't see the install option, run Lighthouse → "PWA" audit and confirm installability checks pass. The most common reason for the prompt to be missing is that the page hasn't finished registering the manifest yet — reload once.

- [ ] **Step 5: Manual verification — iOS apple-touch-icon**

On an iOS device (Safari 16+), open the dev server URL (you may need to use your machine's LAN IP and serve over HTTPS — `next dev --experimental-https` if you want install testing, otherwise localhost on a tunneled URL). Tap Share → Add to Home Screen → confirm the icon shown in the prompt is `Logo.png` (not a generic page screenshot).

- [ ] **Step 6: Manual verification — wake lock during gameplay**

In the browser:
1. Click "Create Room" (or whatever the lobby's start path is).
2. Enter player names → click through to start the draw phase.
3. Once `phase === "draw"` (the initial draw screen) or `phase === "playing"` (the bidding/scoring screen) is showing, leave the device idle (or open DevTools → Rendering → "Show wake lock indicator" if available, or check `navigator.wakeLock` state via the console).
4. On a real phone: leave the device idle for longer than the screen-sleep timeout (typically 30 seconds with no input). Confirm the screen does NOT turn off.

- [ ] **Step 7: Manual verification — wake lock releases on phase transitions**

From a running game:
1. Click "New Game" (the back-to-lobby button — `handleBackToLobby` in `GameShell`).
2. The app returns to the lobby (`role === "none"`).
3. Confirm the screen-sleep behavior returns: leave the device idle, confirm the screen turns off after the system timeout.

- [ ] **Step 8: Manual verification — wake lock re-acquires on visibility return**

While in the playing phase:
1. Switch to another browser tab or another app for ~10 seconds.
2. Switch back to the KaChuFuL tab.
3. Confirm the screen-stays-on behavior continues. (The browser auto-released the lock on hide; the visibilitychange listener should have re-acquired it on show.)

To verify in DevTools: in the Console, run `await navigator.wakeLock.request("screen")` (just to check the API is available) — should not throw. If it throws "permission denied" or similar, that's a user-gesture requirement; the hook handles this case silently.

- [ ] **Step 9: Manual verification — viewer also keeps screen on**

1. With the admin game running, open `http://localhost:3000/` in a second browser (or private window).
2. Enter the room code → join as viewer.
3. While the host is in the playing phase, leave the viewer device idle. Confirm the viewer's screen also stays on.
4. Once the host returns to lobby (so the viewer's `state.phase` becomes `setup` again), confirm the viewer's screen-sleep behavior returns. (The viewer follows the host's `state.phase` via SSE.)

- [ ] **Step 10: Manual verification — unsupported-browser fallback (optional)**

If you have access to an older browser without Wake Lock support (e.g., iOS Safari < 16.4), open the app and confirm:
- No console errors related to `navigator.wakeLock`.
- The app behaves normally otherwise (game flow works, manifest is served).
- Screen sleeps after the system timeout (no fallback behavior — silent no-op).

- [ ] **Step 11: Stop the dev server**

`Ctrl+C` in the terminal.

- [ ] **Step 12: No commit needed if verification passes**

If a manual issue surfaces, fix it in a follow-up commit referencing the specific failure case.

---

## Out of scope (intentional)

- No service worker → no offline support.
- No web-push / push notifications → no VAPID keys, no notification UI.
- No custom install prompt button or iOS install instructions UI.
- No 192×192 or maskable icon variant → only `Logo.png` (512×512) is referenced for both size slots.
- No wake-lock user toggle → behavior is fully phase-driven.
- No persistence of wake-lock state in `GameState` → it's a side effect, not a synced field.
