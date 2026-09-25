# ARRANTZA — Prototype 1

A mobile-first, portrait fishing game. Six Lake Creatures are playable in first-clear order: European Perch, Rainbow Trout, Common Carp, Northern Pike, Largemouth Bass, and European Eel. Cast, Hook, hold Reel, release to ease Tension, and follow directional runs. Each catch has its own illustration, reveal, and persistent Book entry. After Eel, further casts repeat Eel until the Wels Catfish boss is implemented.

The canonical design is [`docs/Arrantza20Design202026-09-242019-25.md`](docs/Arrantza20Design202026-09-242019-25.md) (the supplied filename is encoded). Visual authority is defined in [`docs/references/REFERENCE_MANIFEST.md`](docs/references/REFERENCE_MANIFEST.md). The Master Design and original references are unchanged. Later approved playtest changes are recorded in [September feedback](docs/FEEDBACK_2026-09-25.md).

## Run locally

Use Node.js 22.12+ and npm.

```sh
npm ci
npm run dev
```

Open the printed local URL. For a phone on the same network, use the printed network URL. Sound starts after the first interaction. Haptics and fullscreen depend on browser support.

Touch: tap Cast, then make a fresh press when Hook appears. Keep that finger down to Reel; lift anywhere to Give Line. A second finger cannot take over the Reel. Mouse uses the same press/hold/release interaction. A focused action button also accepts held Space or Enter.

For Carp onward, keep Reel held and slide slightly in the arrow's direction. Keep that direction until the Run ends, and follow reversals without lifting. A Surge warns of stronger resistance; release if necessary, then reel during calmer recovery windows. Eel can appear to tire before a renewed pull.

Desktop uses a centered 9:16 frame. Touch devices in landscape show Rotate Device and pause. Settings, lost focus, and backgrounding freeze the encounter; resume deliberately. Resume always starts with Reel released. Book access is available when Ready.

## Production and GitHub Pages

```sh
npm run build
npm run preview
```

The static output is `dist/`. There is no backend, account, runtime CDN, or remote asset dependency. Vite uses `base: './'`; bundles and images resolve under both a domain root and a repository path such as `/arrantza/`.

The included `.github/workflows/pages.yml` builds/tests on pushes to `main` and deploys `dist`. In the repository’s **Settings → Pages**, choose **GitHub Actions** as the source, then push or run the workflow manually. The workflow follows [GitHub’s custom Pages workflow documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

To validate an actual repository subpath with strict missing-file responses:

```sh
npm run build
node scripts/serve-pages.mjs
```

Open `http://127.0.0.1:4174/arrantza/`.

## Structure and tuning

| Location                                  | Responsibility                                                                            |
| ----------------------------------------- | ----------------------------------------------------------------------------------------- |
| `src/data.ts`                             | Stage roster, Creature definitions, asset manifest, all core timing/rate tuning           |
| `src/game/engine.ts`                      | Explicit fishing state machine, pointer ownership, immediate meter response, pause        |
| `src/game/behaviour.ts`                   | Eligible behaviour pool, cooldowns, telegraphs, recovery, reversals, sticky boss phases   |
| `src/game/save.ts`                        | Versioned local save validation, discoveries, independent Stage progression, preferences  |
| `src/render/LakeScene.ts`                 | Phaser scenic layer, seated angler, bendable rod, line, bobber, water and ambient effects |
| `src/feedback.ts`                         | Semantic-event SFX/haptics, synthesized music, steady reel audio and discrete warning cues             |
| `src/main.ts`, `src/style.css`, `src/ui/` | Menus, Book, HUD, pause/orientation/fullscreen, responsive layout                         |
| `public/assets/`                          | Replaceable environment, character, Creature and logo layers                              |
| `docs/ASSETS.md`                          | Asset provenance and generation prompts                                                   |

The Perch uses exactly +13/s Catch Progress, −3/s on release, +16/s Tension, and −50/s on release. The Trout is a stronger Calm fight: +12/s Catch Progress, −5/s on release, +20/s Tension, and −46/s on release. Both use critical Tension at 90, maximum 100, and immediate line snap at maximum. Leaving Reel released at zero Catch Progress for two seconds lets the fish escape; the final second show a warning. Pausing freezes this timer. Waiting is randomized 2–5 seconds; Hook lasts 0.9 seconds. Neither Creature has directional events or special attacks.

Carp introduces Runs; Pike adds Surges; Bass adds faster Runs and reversals; Eel combines Directional Surges, deceptive lulls, and recovery windows. All combat configuration lives in `src/data.ts`. See [Lake combat tuning](docs/LAKE_COMBAT.md) for the current rates, including approved Carp/Pike easing, and implementation choices within the move-timing ranges. Wels Catfish remains unplayable; the scheduler already supports sticky phase milestones. Future Stage rosters can be added without a global unlock ladder.

Save key: `arrantza.save.v1`. Discoveries, first-clear index, settings, and last Book section persist locally. Existing saves continue at their next required Creature; a 2/7 save offers Carp. Repeat Eel catches leave Lake at 6/7 and do not mark it cleared. Active encounters are not saved. Title Settings → Reset Progress offers one Stage or all Stages with confirmation; audio/haptic preferences stay intact. Blocked storage falls back to memory and displays a notice; clearing site data removes the save.

## Temporary Creature picker

In the Lake, the fish button below Settings opens **Test a Creature** while Ready. All six implemented Creatures show their names/art, including undiscovered entries. Choose and Confirm; subsequent casts keep that choice through failure, catches and Book visits. Cancel keeps the old choice. **Normal progression** restores the next regular encounter. Leaving the Stage or refreshing clears the override.

Test catches show **Test catch** and never add Book entries or advance progression. This is a development-only tool: search `TEMPORARY PLAYTEST TOOL` in `src/main.ts` and `src/style.css` when removing it before release. Selection is deliberately not persisted in the save.

## Checks

```sh
npm run typecheck
npm test
npm run build
```

Browser tests use installed Google Chrome (install it, or change `channel` in `playwright.config.ts`). Start the production preview, then run:

```sh
npm run test:e2e
```

Set `PREVIEW_URL=http://127.0.0.1:4174/arrantza/` to exercise the Pages-style server instead. The suite uses real mouse events and Chrome-emulated touch contacts, advancing browser time without altering the game’s rules. Screenshots and failure traces go to `test-results/`.

Optional browser-engine smoke checks (WebKit touch at iPhone SE size, Firefox mouse):

```sh
npx playwright install webkit firefox
npm run test:compat
```

These use the Pages-style server at port 4174 by default. Set `PREVIEW_URL` to override it. Settings includes **Test vibration**; success means the browser accepted the request, not that a physical motor was verified.

## Prototype limitations

- Lake is the only playable Stage, with six of its seven Creatures playable. Wels Catfish is still unimplemented. Swamp and Frozen Waters are browsable empty sections for future collections, not locked Stages.
- Player animation uses an isolated seated illustration with procedural posture/reel/rod motion. Synthesized music and sound effects are replaceable prototype audio.
- No size/weight records, extra gear, shop, inventory, free roaming, or cloud save.
- Browser-emulated mobile tests cannot validate physical vibration feel, phone speaker balance, or iOS fullscreen restrictions. Those require a real-device pass.
