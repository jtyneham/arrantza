# Prototype 1 verification

Verified on 24 September 2026 using Node 24.20, Phaser 3.90, Vite 7.3.6, and Playwright 1.63 with installed Google Chrome.

- `npm run typecheck`: passed.
- `npm test`: 20 tests passed.
- `npm run build`: passed. The only build advisory is Phaser's vendor chunk size (332 kB gzip).
- `npm run test:e2e`: 10 tests passed against the production output served at `http://127.0.0.1:4174/arrantza/`, with strict 404 responses and no SPA fallback.
- Production dependency audit: zero reported vulnerabilities.

## Browser coverage

The same tests ran with desktop mouse input and a Pixel 7 touch-emulation profile. Touch interaction uses Chrome touch contacts rather than substituting mouse clicks for the held fishing control.

| Flow | Result |
| --- | --- |
| Title → Stage Select → Lake | Passed |
| Randomized waiting and fresh Hook → held Reel | Passed |
| Pre-holding through the Bite never hooks | Passed |
| Drag outside the button retains Reel; lift releases | Passed |
| Secondary touch does not replace/release the primary finger | Passed |
| Continuous hold → critical Tension → Line Snap → replay | Passed |
| Release immediately reduces Tension and Catch Progress | Passed |
| Successful landing → manual Catch Reveal → Continue | Passed |
| First catch unlocks one entry; repeat omits New Book Entry | Passed |
| Seven Lake Book slots, global tabs, Lake-specific entry route | Passed |
| Discovery, settings, and progression survive reload | Passed |
| Settings freezes Waiting; interruption freezes Fight | Passed |
| Explicit Resume returns with Reel released | Passed |
| Landscape touch device pauses; portrait requires Resume | Passed |
| User-triggered fullscreen or readable fallback | Passed |
| 320×568 controls, Book, Settings, and Stage Select | Passed |
| Repository-relative scripts, styles and image assets | Passed |

Screenshots of Title, Fight, Catch Reveal, Book and small-screen menus were inspected. The original Master Design and approved references were not edited.

Simulation tests additionally cover the exact Perch rates, snap-grace recovery, every timed state's pause behavior, sparse critical events, directional responses/reversals, behaviour recovery, sticky boss phases, independent Stage save state, and corrupt/blocked browser storage.

## Limits of this verification

This is browser-emulated mobile coverage, not a physical-phone test. Physical haptic strength/rhythm, phone speaker balance, iOS-specific fullscreen behavior, and Safari rendering have not been verified. Prototype audio is synthesized and the seated character uses procedural illustration motion; both are modular replacement points. Only the Lake / European Perch is playable, as scoped.

The Pages workflow is provided but no public deployment was performed.
