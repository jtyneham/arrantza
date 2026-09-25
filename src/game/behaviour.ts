import type { Creature, Direction, Move } from "../data";

/** Eligible move pool with per-move clocks and sticky progress phases. No global choreography. */
export class Behaviour {
  phase = 0;
  active: Move | null = null;
  direction: Direction = 0;
  elapsed = 0;
  recovery = 0;
  age = 0;
  previous = "";
  private available = new Map<string, number>();
  private seen = new Set<string>();
  private nextMoveAt = 0;
  private demandingEvents = 0;
  constructor(
    private creature: Creature,
    private random: () => number,
  ) {
    for (const move of creature.moves)
      this.available.set(move.id, this.range(move.eligibleAfter));
  }
  private range([a, b]: [number, number]) {
    return a + this.random() * (b - a);
  }
  get resisting() {
    if (!this.active || this.elapsed < (this.active.lull ?? 0) + this.active.telegraph)
      return false;
    const reverse = this.active.reverseAt;
    return reverse === undefined || this.elapsed < reverse ||
      this.elapsed >= reverse + (this.active.reverseReaction ?? 0);
  }
  get lulling() {
    return !!this.active && this.elapsed < (this.active.lull ?? 0);
  }
  get telegraphing() {
    return !!this.active && !this.lulling && !this.resisting;
  }
  get recovering() {
    return !this.active && (this.recovery > 0 || this.age < this.nextMoveAt);
  }
  update(dt: number, progress: number) {
    this.age += dt;
    this.phase = Math.max(
      this.phase,
      this.creature.phases?.filter((p) => progress >= p).length ?? 0,
    );
    if (this.active) {
      const before = this.elapsed;
      this.elapsed += dt;
      if (
        this.active.reverseAt !== undefined &&
        before < this.active.reverseAt &&
        this.elapsed >= this.active.reverseAt
      )
        this.direction = this.direction === 1 ? -1 : 1;
      if (this.elapsed >= (this.active.lull ?? 0) + this.active.telegraph + this.active.duration) {
        this.previous = this.active.id;
        this.recovery = this.active.recovery;
        this.demandingEvents++;
        const recovery = this.creature.recoveryEvery;
        if (recovery && this.demandingEvents >= recovery.events) {
          this.recovery = Math.max(this.recovery, this.range(recovery.duration));
          this.demandingEvents = 0;
        }
        this.nextMoveAt = this.age +
          (this.creature.moveCooldown ? this.range(this.creature.moveCooldown) : 0);
        this.available.set(
          this.active.id,
          this.age + this.range(this.active.cooldown),
        );
        this.active = null;
        this.direction = 0;
      }
      return null;
    }
    this.recovery = Math.max(0, this.recovery - dt);
    if (this.recovery > 0 || this.age < this.nextMoveAt) return null;
    const pool = this.creature.moves.filter(
      (m) =>
        this.age >= (this.available.get(m.id) ?? 0) &&
        progress >= (m.minProgress ?? 0) &&
        this.phase >= (m.minPhase ?? 0),
    );
    const guarantee = pool.find(
      (m) =>
        !this.seen.has(m.id) &&
        m.guaranteeBefore !== undefined &&
        progress >= m.guaranteeBefore,
    );
    const alternatives = pool.filter((m) => m.id !== this.previous);
    const candidates = alternatives.length ? alternatives : pool;
    const next =
      guarantee ?? candidates[Math.floor(this.random() * candidates.length)];
    if (!next) return null;
    this.active = next;
    this.elapsed = 0;
    this.seen.add(next.id);
    this.direction =
      next.direction === "random"
        ? this.random() < 0.5
          ? -1
          : 1
        : (next.direction ?? 0);
    return next;
  }
}
