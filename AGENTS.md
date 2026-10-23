<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture
- Game logic lives in `src/game/` (rules.ts pure, levels.ts data, storage.ts persistence, useGame.ts state); UI in `src/components/game/`. Keeps rules testable without React.
- Only ship puzzles verified unique by `levels.test.ts`; never generate boards at runtime.
- Generate expansion candidates offline with connected regions and deduction/search metrics; preserve the original puzzle fixture and reject symmetry-equivalent duplicates to protect content progression.
- Normalize completed former-final-level saves on load, and centralize win updates in `recordWin`; this extends progression without resetting IDs, unlocks, or best stars.
- Completion checks both general rules and the stored answer; solver tests compare its exact solution to level data to prevent answer drift.
- Gameplay history uses atomic board/counter snapshots, and tap timers are keyed per cell with cancellation on interruption to prevent stale or duplicate actions.
- Board rows and columns use explicit equal tracks; all cell visuals are absolute layers within square cells so animations cannot affect sizing.
- Offline uses vite-plugin-pwa generateSW registered only from src/lib/pwa.ts (refused in dev/preview/iframes); new versions wait for a player Refresh so HTML and bundles never mix versions. Offline navigations fall back to the precached, build-versioned SPA shell (/_shell) so the client router resolves any route; no per-URL HTML is cached. Fonts are bundled locally; no essential remote assets.
- Unfinished main-level boards persist in their own key, apart from stars/unlocks; unreadable saves are backed up, never overwritten, and storage failures raise a notice instead of throwing.
- First-play onboarding is device-local and separate from game progress; its modal traps focus and cancels pending board taps so tutorials cannot change puzzles.
- Character reactions use pre-cropped matching bitmap poses with fixed geometry; reduced motion removes animation delays as well as duration to keep rewards visible.
- Daily dates use device-local components with UTC calendar arithmetic and a permanent catalog order/epoch; this keeps schedules and streaks stable across timezones and DST.
- Shared Game renders both modes, but daily callbacks persist full atomic snapshots and completion in a separate device-local key; main rewards are never written by daily play.
