# PWA installability + screen wake lock

## Background

Two related additions to the KaChuFuL score-tracker app:

1. **PWA installability.** Today the app is just a website. We want users to be able to install it (Add to Home Screen / Install) so it launches in standalone mode with its own icon and no browser chrome.
2. **Screen wake lock.** Phone screens go to sleep after ~30 seconds of inactivity. While the app is mid-game, players keep glancing at the score without interacting — and the screen sleeps. We want the screen to stay on while a game is in progress.

Both features are independent but ship together because they're scoped to the same "make this feel like an app" goal.

## Goals

- App can be installed from a modern browser (Chrome/Edge/Safari/Firefox) and launches standalone with the existing `Logo.png` as the icon.
- Screen stays on automatically while `state.phase` is in `{draw, playing, gameOver}` — for both admin and viewer roles. Lifts when the phase becomes `setup` or the user is in the lobby.
- Lock survives visibility changes (tab hidden → tab visible re-acquires).
- Unsupported browsers gracefully no-op (no errors, no UI banners).

## Non-goals

- **Offline support.** No service worker. The app requires a network connection.
- **Push notifications.** No web-push, no VAPID keys, no notification UI.
- **Custom install prompt UI.** Browsers handle install prompts on their own; iOS users use the system share sheet. We will not build "Add to Home Screen" instructions or a `beforeinstallprompt` button.
- **Multiple icon variants.** Only the existing `public/Logo.png` (512×512). No maskable variant, no separate 192×192 file. Browsers downscale 512 for the 192 slot — acceptable for v1.
- **Wake-lock user toggle.** No on/off switch in the UI. Behavior is fully phase-driven.
- **Persistence of wake-lock state.** Wake lock is a side effect, not part of `GameState`. Not synced to room, not stored in `localStorage`.

---

## Design

### 1. PWA manifest

Create `src/app/manifest.ts` returning a `MetadataRoute.Manifest` object:

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

This file becomes a Next.js metadata route — Next.js serves it at `/manifest.webmanifest` automatically and adds `<link rel="manifest" href="/manifest.webmanifest">` to the document head.

`Logo.png` is referenced for both 192×192 and 512×512 size slots. The actual file is 512×512; browsers will downscale for the 192 slot. (When a dedicated 192×192 file is added later, update the first `src`.)

`background_color` and `theme_color` are both black (`#000000`) to match the dark-mode body background and the existing `bg-black` class on the layout.

### 2. iOS apple-touch-icon

Modify `src/app/layout.tsx` to add an `icons` field to the existing `metadata` export:

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

This produces:
- `<link rel="icon" href="/Logo.png">` for browser favicons.
- `<link rel="apple-touch-icon" href="/Logo.png">` for iOS "Add to Home Screen".

### 3. Wake lock hook

Create `src/hooks/useWakeLock.ts`:

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

Behavior:

- `active === false` → effect short-circuits, no lock requested. If a previous render had `active === true`, the prior cleanup releases its lock first.
- `active === true` → request a screen wake lock. Listen for `visibilitychange` so we can re-acquire after the browser auto-releases on tab hide.
- Unsupported runtime (no `navigator.wakeLock`) → silent no-op.
- Cleanup releases the held lock and removes the listener. Sets `cancelled` so any in-flight `request()` resolution releases its sentinel rather than leaking.

The hook is pure side-effect: no return value, no state. Caller passes a derived boolean.

### 4. Wiring in `GameShell`

Modify `src/components/GameShell.tsx` to call the hook with a phase-derived boolean. Place it near the top of the component body, alongside the existing hook usage:

```ts
const wakeLockActive =
  state.phase === "draw" ||
  state.phase === "playing" ||
  state.phase === "gameOver";
useWakeLock(wakeLockActive);
```

This applies to both admin and viewer roles because `GameShell` is the common parent that renders both. It does not apply to:
- `role === "none"` (lobby) — `state` exists but the lobby branch returns early before the hook runs. Note: hook order matters — the hook call must run unconditionally on every render, so it goes **above** the lobby early-return. Pass `false` while in the lobby.

To keep the rules-of-hooks invariant straight, the implementation must compute `wakeLockActive` to be `false` while `role === "none"`:

```ts
const wakeLockActive =
  role !== "none" &&
  (state.phase === "draw" ||
   state.phase === "playing" ||
   state.phase === "gameOver");
useWakeLock(wakeLockActive);
```

Then place this call before any of the early returns in `GameShell`.

### 5. Edge cases

- **Older iOS / older Firefox / non-modern browsers.** `wakeLock` not in `navigator` → silent no-op. App continues to work; screen sleeps as before.
- **Permission rejected (rare).** `request("screen")` throws → caught, ignored. Next `visibilitychange` retries.
- **Tab hidden then visible.** Browser auto-releases; visibility listener re-acquires.
- **Phase transition mid-game.** `useEffect` re-runs when `active` changes; old cleanup releases, new acquire fires.
- **Fast unmount race.** `cancelled` flag releases an in-flight sentinel rather than leaking.
- **Multiple tabs/windows.** Each independently holds its own lock.
- **Local dev.** `localhost` is a secure context — both PWA install and Wake Lock API work in `next dev`. Non-localhost HTTP hosts will not — degrade silently.
- **Filename casing.** `public/Logo.png` is case-sensitive on Linux/Vercel deploys. Manifest and metadata reference `/Logo.png` exactly. Do not lowercase.

### 6. Testing

**Automated:** none.

The two units in this feature don't fit the existing repo's automated-test pattern (unit tests for pure logic). `manifest.ts` returns a static JSON-shaped object. `useWakeLock` exercises browser globals not available under vitest's `environment: "node"`; meaningful tests would require mocking `navigator.wakeLock` plus the visibility API — large fixture vs. small unit. Verified manually instead.

**Manual:**

1. `npm run dev` → open `http://localhost:3000/manifest.webmanifest` → confirm JSON contains `name`, `short_name`, `icons`, `display: "standalone"`.
2. Chrome desktop / Android: look for "Install KaChuFuL" in the address bar / menu → install → confirm standalone mode + `Logo.png` icon + black splash.
3. iOS Safari: Share → Add to Home Screen → confirm `Logo.png` is the icon.
4. Start a game, advance past setup into draw → leave device idle past screen-sleep timeout → confirm screen stays on.
5. From a running game, click "New Game" → confirm screen-sleep behavior returns.
6. Mid-game: switch to another tab/app for ~10s, return → confirm screen stays on (lock re-acquired).
7. On a viewer device joined to a running game, confirm screen stays on too.
8. Optional: open in a browser without Wake Lock support → confirm app still works, no errors.

---

## Out of scope (intentional)

- Service worker / offline mode.
- Push notifications / VAPID keys.
- Custom install button / iOS install instructions UI.
- Maskable icon variant / separate 192×192 file.
- Wake-lock user toggle.
- Wake-lock persistence in `GameState`.
