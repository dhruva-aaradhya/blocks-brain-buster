# Blocks Brain Buster

A daily block-placement puzzle game. Place three pieces on an 8x8 grid, clear lines, and solve the puzzle in six attempts or fewer. A new puzzle is generated every day from a shared seed so all players get the same challenge.

## Tech Stack

- **Framework:** Next.js 16 (App Router, static export)
- **UI:** React 19, Tailwind CSS 4, Framer Motion, shadcn/ui
- **Mobile:** Capacitor 8 (Android; iOS structure exists in shared-plugins)
- **Analytics / Remote Config:** Firebase via `@capacitor-firebase/*` (native only)
- **Monetization:** AppLovin MAX ads + Adjust attribution (native only)

## Prerequisites

- **Node.js** 20 or later
- **npm** (ships with Node)
- For mobile builds: **Android Studio** with an Android SDK

## Getting Started

```bash
# Install dependencies
npm install

# Start the dev server (http://localhost:3000)
npm run dev

# Production build (outputs to .next/)
npm run build

# Serve the production build locally
npm run start
```

## Mobile Build (Android)

The project uses Capacitor to wrap the static export as a native Android app.

```bash
# Build the Next.js static export, then sync with Capacitor
npm run build:mobile

# Open the Android project in Android Studio
npm run open:android
```

`capacitor.config.ts` sets `webDir: 'out'` to match the Next.js static export output directory.

### Firebase setup for native

The `@capacitor-firebase/*` packages (analytics, remote config, performance) require platform-specific config files that are **not committed to git**:

| Platform | File                    | Location                                |
|----------|-------------------------|-----------------------------------------|
| Android  | `google-services.json`  | `android/app/google-services.json`      |
| iOS      | `GoogleService-Info.plist` | Add to the Xcode project root        |

Download these from the [Firebase Console](https://console.firebase.google.com/) for your project.

## Project Structure

```
src/
├── app/                   # Next.js App Router pages
│   ├── globals.css
│   ├── layout.tsx         # Root layout, providers, fonts
│   └── page.tsx           # Main state machine: loading → lobby → game
├── components/
│   ├── Game.tsx           # Core gameplay: grid, drag-drop, line clears
│   ├── Lobby.tsx          # Pre-game hub: stats, countdown, practice mode
│   ├── EndCard.tsx        # Win/loss screen with share text
│   ├── Board.tsx          # 8x8 grid renderer
│   ├── PieceTray.tsx      # Draggable piece selection
│   ├── DragPiece.tsx      # Drag overlay for a piece
│   ├── AttemptDots.tsx    # Attempt progress indicator (6 dots)
│   ├── HintPanel.tsx      # Post-attempt feedback with placement hints
│   ├── HowToPlay.tsx      # Rules dialog
│   ├── ShareCard.tsx      # Shareable result image/text
│   ├── DebugPanel.tsx     # Dev-only debug controls
│   └── ui/                # shadcn primitives (button, card, dialog)
├── contexts/
│   ├── Providers.tsx      # AdjustProvider → AdProvider nesting
│   ├── AdjustContext.tsx   # Adjust attribution context
│   └── AdContext.tsx       # MAX ads context with impression tracking
├── hooks/
│   ├── useAdjust.ts       # Adjust SDK hook
│   └── useMaxAds.ts       # MAX ads hook
├── lib/
│   ├── adjust/
│   │   └── adjustConfig.ts   # Adjust tokens and environment config
│   ├── ads/
│   │   ├── adConfig.ts        # MAX ad unit IDs (test + production)
│   │   └── maxAdsPlugin.ts    # Capacitor plugin bridge for MAX
│   └── utils.ts               # Tailwind merge helper
├── types/
│   └── game.ts            # TypeScript types for pieces, board, state
└── utils/
    ├── analytics.ts       # Firebase Analytics wrapper (native only)
    ├── dailySeed.ts       # Deterministic daily seed generation
    ├── gameLogic.ts       # Placement validation, line clearing, win check
    ├── puzzleGenerator.ts # Puzzle generation from seed
    ├── remoteConfig.ts    # Firebase Remote Config wrapper (native only)
    ├── shapes.ts          # Piece shape definitions
    ├── solver.ts          # Puzzle solver / validator
    ├── storage.ts         # LocalStorage persistence for stats and state
    └── tileRenderer.ts    # Canvas tile rendering utilities
```

## Architecture

The app is a single-page state machine driven by `src/app/page.tsx`:

```
Loading → Lobby → Game ←→ HintPanel
                    ↓
                 EndCard → Lobby
```

1. **Loading** -- fetch remote config (native only), load saved state and stats from localStorage.
2. **Lobby** -- show streak, win rate, attempt distribution, daily countdown (if already completed), and an optional practice mode.
3. **Game** -- generate (or restore) the daily puzzle from a deterministic seed. The player has 6 attempts to place 3 pieces and clear all target lines. Failed attempts show the `HintPanel` with placement feedback.
4. **EndCard** -- win/loss result with shareable text.

Daily puzzles use `utils/dailySeed.ts` to produce a seed from the current date, and `utils/puzzleGenerator.ts` + `utils/solver.ts` to build a solvable puzzle. Player progress and statistics persist in localStorage via `utils/storage.ts`.

## Configuration Placeholders

Tokens and ad unit IDs are stored as **hardcoded placeholder strings** in source (not environment variables). Search for `YOUR_` to find every value that needs replacing before a production build.

### `src/lib/adjust/adjustConfig.ts`

- `ADJUST_APP_TOKEN_ANDROID` / `ADJUST_APP_TOKEN_IOS` -- your Adjust app tokens
- `ADJUST_EVENT_TOKENS` -- per-event tokens for `sessionStart`, `gameStart`, `gameWon`, `gameLost`, ad impressions, and IAP, each with `android` and `ios` values
- Environment (`sandbox` vs `production`) is derived automatically from `NODE_ENV`

### `src/lib/ads/adConfig.ts`

- `TEST_AD_UNITS` / `PRODUCTION_AD_UNITS` -- AppLovin MAX ad unit IDs for `banner`, `interstitial`, and `rewarded` on each platform
- `USE_TEST_ADS` boolean toggles which set is active

### `capacitor.config.ts`

- `appId` is set to `com.tripledot.blockbrainbuster` -- change this if you need a different bundle identifier

## Shared Plugins

The `shared-plugins/` directory is a **reference kit** for integrating AppLovin MAX and Adjust as Capacitor native plugins. It contains:

- Native plugin implementations (Swift/ObjC for iOS, Java for Android)
- TypeScript plugin bridges and hooks
- Example React context/provider files
- A detailed `README.md` with setup instructions, Podfile/Gradle dependencies, and ProGuard rules

These are meant to be copied into new projects that need the same ad + attribution stack. The `src/` directory already has its own copies wired into the app.

## Scripts

| Script             | Command                | Description                                |
|--------------------|------------------------|--------------------------------------------|
| `dev`              | `npm run dev`          | Start Next.js dev server                   |
| `build`            | `npm run build`        | Production build (static export to `out/`) |
| `start`            | `npm run start`        | Serve production build locally             |
| `lint`             | `npm run lint`         | Run ESLint                                 |
| `build:mobile`     | `npm run build:mobile` | Build + Capacitor sync for Android         |
| `open:android`     | `npm run open:android` | Open Android project in Android Studio     |

## License

This project is released under the [MIT License](LICENSE).
