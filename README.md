# ARRANTZA — Prototype 1

A mobile-first, portrait fishing game. The complete Lake / European Perch loop is playable: cast, watch for a bite, press and hold Hook to Reel, release to ease Tension, land the Creature, reveal it, and discover it in the persistent Book. Holding too long snaps the line. Further casts repeat the Perch.

The canonical design is [`docs/Arrantza20Design202026-09-242019-25.md`](docs/Arrantza20Design202026-09-242019-25.md) (the supplied filename is encoded). Visual authority is defined in [`docs/references/REFERENCE_MANIFEST.md`](docs/references/REFERENCE_MANIFEST.md). These source documents and references are unchanged.

## Run locally

Use Node.js 22.12+ and npm.

```sh
npm ci
npm run dev
```

Open the printed local URL. For a phone on the same network, use the printed network URL. Sound starts after the first interaction. Haptics and fullscreen depend on browser support.

Touch: tap Cast, then make a fresh press when Hook appears. Keep that finger down to Reel; lift anywhere to Give Line. A second finger cannot take over the Reel. Mouse uses the same press/hold/release interaction. A focused action button also accepts held Space or Enter.

Desktop uses a centered 9:16 frame. Touch devices in landscape show Rotate Device and pause. Settings, lost focus, and backgrounding freeze the encounter; resume deliberately. Resume always starts with Reel released. Book access is available when Ready.

## Production and GitHub Pages

```sh
npm run build
npm run preview
```

The static output is `dist/`. There is no backend, account, runtime CDN, or remote asset dependency. Vite uses `base: './'`; bundles and images resolve under both a domain root and a repository path such as `/arrantza/`.

The included `.github/workflows/pages.yml` builds/tests on pushes to `main` and deploys `dist`. In the repository’s **Settings → Pages**, choose **GitHub Actions** as the source, then push or run the workflow manually. No deployment has been performed by this implementation task. The workflow follows [GitHub’s custom Pages workflow documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

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
| `src/feedback.ts`                         | Semantic-event SFX/haptics, synthesized music, reel and dynamic strain layers             |
| `src/main.ts`, `src/style.css`, `src/ui/` | Menus, Book, HUD, pause/orientation/fullscreen, responsive layout                         |
| `public/assets/`                          | Replaceable environment, character, Creature and logo layers                              |
| `docs/ASSETS.md`                          | Asset provenance and generation prompts                                                   |

The Perch uses exactly +13/s Catch Progress, −3/s on release, +16/s Tension, −50/s on release, critical at 90, maximum 100, and a 0.8-second grace at maximum. Waiting is randomized 2–5 seconds; Hook lasts 0.9 seconds. No fake nibbles or directional events occur for the Perch.

Later Creature entries carry the documented base rates but remain unplayable. The behaviour schema and tested scheduler support Runs, Surges, Directional Surges, fake-out telegraphs, recovery, and persistent phase milestones. Future Stage rosters can be added without a global unlock ladder.

Save key: `arrantza.save.v1`. Discoveries, first-clear index, settings, and last Book section persist locally. Repeat Perch catches leave Lake at 1/7 and do not mark it cleared. Active encounters are not saved. Blocked storage falls back to memory and displays a notice; clearing site data removes the save.

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

## Prototype limitations

- Lake and European Perch are the only playable content. The Lake Book has seven slots; Swamp and Frozen Waters are browsable empty sections for future collections, not locked Stages.
- Player animation uses an isolated seated illustration with procedural posture/reel/rod motion. Synthesized music and sound effects are replaceable prototype audio.
- No size/weight records, extra gear, shop, inventory, free roaming, or cloud save.
- Browser-emulated mobile tests cannot validate physical vibration feel, phone speaker balance, or iOS fullscreen restrictions. Those require a real-device pass.
