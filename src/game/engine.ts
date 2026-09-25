import { creatures, tuning, type Creature, type Direction } from "../data";
import { Behaviour } from "./behaviour";

export type State =
  | "READY"
  | "CASTING"
  | "WAITING"
  | "BITE"
  | "FIGHT"
  | "LANDING"
  | "LINE_SNAP"
  | "REVEAL"
  | "FAILURE";
export type GameEvent =
  | "CAST"
  | "BOBBER_LAND"
  | "BITE"
  | "HOOK_SUCCESS"
  | "REEL_START"
  | "REEL_RELEASE"
  | "MISSED_HOOK"
  | "FISH_ESCAPED"
  | "DIRECTIONAL_RUN_START"
  | "DIRECTION_ACQUIRED"
  | "DIRECTION_REVERSED"
  | "SURGE_TELEGRAPH"
  | "FAKE_OUT_START"
  | "SURGE_START"
  | "DIRECTIONAL_SURGE_START"
  | "TENSION_WARNING"
  | "CRITICAL_TENSION"
  | "CRITICAL_PULSE"
  | "SNAP_IMMINENT"
  | "LINE_SNAP"
  | "LANDING"
  | "CATCH_REVEAL";
const clamp = (n: number) => Math.max(0, Math.min(100, n));

/** Pure simulation. Time advances only through update; menus never own encounter timers. */
export class FishingGame {
  state: State = "READY";
  paused = false;
  elapsed = 0;
  progress = 0;
  tension = 0;
  slackTime = 0;
  dragX = 0;
  held = false;
  pointer: number | null = null;
  direction: Direction = 0;
  failure: "miss" | "snap" | "escape" = "miss";
  creature: Creature;
  behaviour: Behaviour;
  private startX = 0;
  private waitDuration = 2;
  private warning = false;
  private critical = false;
  private imminent = false;
  private pulse = 0;
  private acquired = false;
  private acquireCooldown = 0;
  private listeners = new Set<(event: GameEvent) => void>();
  constructor(
    private random = Math.random,
    creature = creatures[0],
  ) {
    this.creature = creature;
    this.behaviour = new Behaviour(creature, random);
  }
  onEvent(fn: (event: GameEvent) => void) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
  private emit(event: GameEvent) {
    this.listeners.forEach((fn) => fn(event));
  }
  private enter(state: State) {
    this.state = state;
    this.elapsed = 0;
  }
  reset(creature = this.creature) {
    this.cancelInput();
    this.creature = creature;
    this.behaviour = new Behaviour(creature, this.random);
    this.progress = this.tension = this.slackTime = 0;
    this.warning = this.critical = this.imminent = this.acquired = false;
    this.pulse = this.acquireCooldown = 0;
    this.enter("READY");
  }
  press(id: number, x: number) {
    if (this.paused || this.pointer !== null) return false;
    // Track inactive presses too: a finger already down when a bite begins cannot Hook.
    this.pointer = id;
    this.startX = x;
    this.direction = 0;
    if (this.state === "READY") {
      this.enter("CASTING");
      this.emit("CAST");
    } else if (this.state === "BITE") {
      this.enter("FIGHT");
      this.held = true;
      this.emit("HOOK_SUCCESS");
      this.emit("REEL_START");
    } else if (this.state === "FIGHT") {
      this.slackTime = 0;
      this.held = true;
      this.emit("REEL_START");
    }
    return true;
  }
  move(id: number, x: number) {
    if (this.pointer !== id || !this.held) return;
    const dx = x - this.startX;
    this.dragX = dx;
    this.direction =
      Math.abs(dx) < tuning.directionalDeadZone ? 0 : dx < 0 ? -1 : 1;
  }
  release(id: number) {
    if (this.pointer !== id) return;
    if (this.held) this.emit("REEL_RELEASE");
    this.held = false;
    this.pointer = null;
    this.direction = 0;
    this.dragX = 0;
  }
  cancelInput() {
    if (this.pointer !== null) this.release(this.pointer);
  }
  pause() {
    this.cancelInput();
    this.paused = true;
  }
  resume() {
    this.cancelInput();
    this.paused = false;
  }
  continue() {
    if (this.state === "REVEAL") this.reset();
  }
  update(dt: number) {
    if (this.paused || !Number.isFinite(dt) || dt <= 0) return;
    // Fixed substeps also make numerical integration stable in tests and on slower phones.
    let remaining = Math.min(dt, 0.25);
    while (remaining > 0.000001) {
      const step = Math.min(remaining, 1 / 120);
      this.tick(step);
      remaining -= step;
    }
  }
  private tick(dt: number) {
    this.elapsed += dt;
    switch (this.state) {
      case "CASTING":
        if (this.elapsed >= tuning.castDuration) {
          this.waitDuration =
            tuning.waitMin + this.random() * (tuning.waitMax - tuning.waitMin);
          this.enter("WAITING");
          this.emit("BOBBER_LAND");
        }
        break;
      case "WAITING":
        if (this.elapsed >= this.waitDuration) {
          this.enter("BITE");
          this.emit("BITE");
        }
        break;
      case "BITE":
        if (this.elapsed >= tuning.hookWindow) {
          this.cancelInput();
          this.failure = "miss";
          this.enter("FAILURE");
          this.emit("MISSED_HOOK");
        }
        break;
      case "FIGHT":
        this.fight(dt);
        break;
      case "LANDING":
        if (this.elapsed >= tuning.landingDuration) {
          this.enter("REVEAL");
          this.emit("CATCH_REVEAL");
        }
        break;
      case "LINE_SNAP":
        if (this.elapsed >= tuning.snapDuration) this.enter("FAILURE");
        break;
      case "FAILURE":
        if (this.elapsed >= tuning.failureDuration) this.reset();
        break;
    }
  }
  private fight(dt: number) {
    const wasResisting = this.behaviour.resisting;
    const wasLulling = this.behaviour.lulling;
    const previousDirection = this.behaviour.direction;
    const move = this.behaviour.update(dt, this.progress);
    if (move) {
      if (move.kind === "fake-out") this.emit("FAKE_OUT_START");
      else if (move.direction) this.emit("DIRECTIONAL_RUN_START");
      else this.emit("SURGE_TELEGRAPH");
      this.acquired = false;
    }
    const active = this.behaviour.active;
    if (active && wasLulling && !this.behaviour.lulling)
      this.emit("SURGE_TELEGRAPH");
    if (active && previousDirection && this.behaviour.direction !== previousDirection) {
      this.acquired = false;
      this.emit("DIRECTION_REVERSED");
    }
    if (active && !wasResisting && this.behaviour.resisting && active.kind !== "run")
      this.emit(active.kind === "directional-surge" ? "DIRECTIONAL_SURGE_START" : "SURGE_START");
    const directional = this.behaviour.direction !== 0;
    const correct = directional && this.direction === this.behaviour.direction;
    this.acquireCooldown = Math.max(0, this.acquireCooldown - dt);
    if (correct && this.held && !this.acquired && this.acquireCooldown === 0) {
      this.emit("DIRECTION_ACQUIRED");
      this.acquireCooldown = tuning.directionHapticCooldown;
    }
    this.acquired = correct && this.held;
    if (this.held) {
      let rate = this.creature.tension,
        gain = this.creature.gain;
      if (this.behaviour.recovering) rate = this.creature.recoveryTension ?? rate;
      // The Eel appears to tire before its tell and renewed resistance.
      if (this.behaviour.lulling) rate *= active?.lullTensionMultiplier ?? 1;
      if (active && this.behaviour.resisting) {
        rate =
          directional && !correct
            ? (active.wrongTension ?? active.tension)
            : active.tension;
        gain *=
          directional && !correct
            ? 0
            : (active.progressMultiplier ?? (directional ? 0.7 : 1));
      }
      this.progress = clamp(this.progress + gain * dt);
      this.tension = clamp(this.tension + rate * dt);
    } else {
      this.progress = clamp(this.progress - this.creature.decay * dt);
      this.tension = clamp(this.tension - this.creature.recovery * dt);
    }
    if (this.tension >= tuning.warningTension && !this.warning)
      this.emit("TENSION_WARNING");
    if (this.tension >= tuning.criticalTension && !this.critical) {
      this.emit("CRITICAL_TENSION");
      this.pulse = 0;
    }
    // Hysteresis avoids warning spam when hovering around a threshold.
    this.warning =
      this.tension >=
      (this.warning ? tuning.warningTension - 8 : tuning.warningTension);
    this.critical =
      this.tension >=
      (this.critical ? tuning.criticalTension - 5 : tuning.criticalTension);
    if (this.critical) {
      this.pulse += dt;
      if (this.pulse >= tuning.criticalPulseInterval) {
        this.emit("CRITICAL_PULSE");
        this.pulse = 0;
      }
    }
    if (this.tension >= tuning.snapImminent && !this.imminent)
      this.emit("SNAP_IMMINENT");
    this.imminent = this.tension >= tuning.snapImminent;
    this.slackTime = !this.held && this.progress <= 0 ? this.slackTime + dt : 0;
    if (this.tension >= tuning.maxTension) {
      this.cancelInput();
      this.failure = "snap";
      this.enter("LINE_SNAP");
      this.emit("LINE_SNAP");
    } else if (this.slackTime >= tuning.slackEscape) {
      this.cancelInput();
      this.failure = "escape";
      this.enter("FAILURE");
      this.emit("FISH_ESCAPED");
    } else if (this.progress >= 100) {
      this.cancelInput();
      this.enter("LANDING");
      this.emit("LANDING");
    }
  }
}
