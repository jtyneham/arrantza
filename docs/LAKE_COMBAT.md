# Lake combat implementation

The Master Design remains authoritative except for the explicitly approved playtest changes in [September feedback](FEEDBACK_2026-09-25.md). Six Creatures are playable in its first-clear order: European Perch, Rainbow Trout, Common Carp, Northern Pike, Largemouth Bass, European Eel. The unimplemented Wels Catfish remains an undiscovered seventh slot. After Eel, casts repeat Eel; the Lake remains at 6/7 and is not marked cleared. Existing local saves continue at their next required Creature.

## Current rates

All values are meter points per second. Wrong/neutral directional input stops progress gain without adding a separate loss penalty. Correct input earns 70% of ordinary gain. Release always uses the Creature's normal decay and recovery, regardless of the active move.

| Creature | Gain | Release decay | Normal Tension | Release recovery | Correct / wrong run Tension |
| --- | ---: | ---: | ---: | ---: | ---: |
| Perch | 13 | 3 | 16 | 50 | — |
| Trout | 12 | 5 | 20 | 46 | — |
| Carp | 11 | 7 | 21 | 43 | 23 / 32 |
| Pike | 10 | 9 | 18 | 40 | 22 / 30 |
| Bass | 10 | 11 | 19 | 39 | 24 / 36 |
| Eel | 9 | 14 | 21 | 37 | 28 / 40 |

## Move tuning selected within the design's ranges

Eligibility and cooldown ranges are randomized. Once a move begins, its cue, active segments and recovery remain consistent. A shared event cooldown prevents alternate Bass moves from bypassing its documented pacing. Only one move can be active; cooldowns and recovery pause with gameplay.

- **Carp:** first Run eligible after 2–3 seconds; 0.9-second cue, 1.75-second Run, 2.5–4-second cooldown. Random left/right.
- **Pike:** Surge eligible after 2–3.5 seconds; 0.45-second tell, 0.8-second resistance, 2.5–4-second cooldown. Occasional Runs have a 0.85-second cue, 1.7-second duration, and 6–9-second cooldown.
- **Bass:** 0.65-second directional cues; 1.1-second active Run segments. Reversal moves switch direction after the first segment, give another 0.65-second reaction window, then run for a second 1.1-second segment. Shared event cooldown 1.8–3 seconds; reversal cooldown 5–7 seconds.
- **Eel:** directional bursts have a 0.6-second cue and 0.9-second resistance. Ordinary surges use a 0.4-second tell and 0.9-second resistance. Fake-outs become eligible at 25% Catch Progress: an apparent 1.4-second lull, then a 0.4-second warning tell and 0.9-second surge. Recovery lasts 1.5 seconds, extending to a randomized 1.5–2 seconds after two demanding events.

The design specifies pressure identity but not exact raw Surge rates or calm-window resistance. Current tuning is Pike Surge 28/s, Eel Surge 42/s, and Eel fake-out Surge 46/s. Eel's apparent lull uses one quarter of its normal Tension rate, and its recovery windows use 4/s while reeling. These windows are important with the documented 14/s release decay: skilled play gives line during resistance and gains ground during recovery. These selected values are explicit in `src/data.ts` and can be adjusted after phone playtesting with approved playtest adjustments recorded separately.

Teaching guarantees prioritize an unseen eligible move before a fight can nearly finish: Carp Run, Pike Surge, Bass reversal, and Eel fake-out. Eel's fake-out cannot start before meaningful progress. Guarantees select from the eligible pool; they do not interrupt another move or ignore recovery.

## Input and feedback

Keep the same Reel press held and slide about 32 CSS pixels left/right (15-pixel neutral dead zone). Input remains captured outside the button. The large mirrored vector arrow moves back and forth horizontally without a surrounding box throughout the Run and changes color when acquired. Reel follows the horizontal pointer displacement, clamped to 16% of the game frame width on either side; the original press remains the drag origin. Release returns it to center. Bass reversals change that arrow under the same held pointer. Release overrides direction immediately. Re-engaging starts a new drag origin.

Directional wakes mirror left/right. Non-directional Surges use radial splashes and a strong-pull warning without an arrow; directional Surges combine the wake and stronger disturbance. Eel lulls visibly settle before the short tell. Audio distinguishes cue, directional response and active Surge, with sparse haptics. The temporary Ready-only Creature picker bypasses encounter order for testing without writing catch progress to the save.

## Verification

`tests/combat.test.ts` verifies exact rates, continuous corrections, first-run timing, reversal reaction windows, pause during a tell, fake-out phases, Eel recovery, save progression and successful encounters across 25 seeds per new Creature. Browser tests use actual mouse events and Chrome touch contacts, read the displayed cues/meters, release during surges and reel through recovery. No simulation state is modified by the browser combat driver.

## Failure rules after feedback

At 100 Tension the line snaps immediately, with a near-snap cue at 96; there is no full-bar grace period. Unheld Reel at zero Catch Progress accumulates a two-second escape timer, with a visible warning after one second. Resuming Reel cancels this timer, and pause freezes it. Giving line while progress remains above zero still uses ordinary progress decay. Escape returns to Ready with the same encounter, without changing the Book.
