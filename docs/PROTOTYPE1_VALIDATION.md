# Prototype 1 verification

Verified on 25 September 2026 using Node 24.20, Phaser 3.90, Vite 7.3.6, and Playwright 1.63 with installed Google Chrome. This covers the six playable Lake Creatures through European Eel.

- `npm run typecheck`: passed.
- `npm test`: 41 tests passed, including combat simulations across 25 seeds for each new Creature.
- `npm run build`: passed. The only build advisory is Phaser's vendor chunk size (332 kB gzip).
- `npm run test:e2e`: 18 tests passed against the production output served at `http://127.0.0.1:4174/arrantza/`, with strict 404 responses and no SPA fallback.
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
| Perch landing → Reveal → Continue → Trout encounter | Passed |
| Stronger Trout fight → Reveal → Continue | Passed |
| Carp Runs, Pike Surges, Bass reversals, Eel bursts and fake-outs | Passed |
| Each new Creature → landing → species-specific Reveal → Book → reload | Passed |
| Repeated Eel catch omits New Book Entry and preserves 6/7 | Passed |
| Captured mouse/touch slides follow left/right cues and reversals | Passed |
| Interruption during a directional cue freezes it and releases Reel | Passed |
| First catch of each unlocks its own entry; repeat omits New Book Entry | Passed |
| Seven Lake Book slots, global tabs, Lake-specific entry route | Passed |
| All six discoveries, settings, and progression survive reload | Passed |
| Settings freezes Waiting; interruption freezes Fight | Passed |
| Explicit Resume returns with Reel released | Passed |
| Landscape touch device pauses; portrait requires Resume | Passed |
| User-triggered fullscreen or readable fallback | Passed |
| 320×568 controls, Book, Settings, and Stage Select | Passed |
| Repository-relative scripts, styles and image assets | Passed |

Screenshots of Title, directional and Surge cues, Eel's apparent lull, all new Catch Reveals, the six-entry Book and small-screen menus were inspected. The original Master Design and approved references were not edited.

Simulation tests additionally cover the documented rates for all six Creatures, continuous wrong-to-correct directional response, reaction time after reversal, shared Bass cooldown, Eel recovery after two events, readable fake-out phases, each new Creature's snap/retry path, teaching guarantees, snap-grace recovery, every timed state's pause behavior, sparse critical events, sticky boss phases, independent Stage save state, and corrupt/blocked browser storage. The automated combat player reacts to cues, releases during strong Surges, and reels during recovery; it does not bypass the normal rules.

## Limits of this verification

This is browser-emulated mobile coverage, not a physical-phone test. Physical haptic strength/rhythm, phone speaker balance, iOS-specific fullscreen behavior, and Safari rendering have not been verified. Prototype audio is synthesized and the seated character uses procedural illustration motion; both are modular replacement points. The Lake has six playable Creatures; the Wels Catfish boss and other Stages still await implementation.

The Pages workflow runs unit tests and the production build before deploying pushes to `main`.
