import { describe, expect, it } from "vitest";
import { FishingGame, type GameEvent } from "../src/game/engine";
import { Behaviour } from "../src/game/behaviour";
import {
  creatures,
  stages,
  encounterFor,
  type Creature,
  type Move,
} from "../src/data";
import { SAVE_KEY, SaveStore } from "../src/game/save";

function advance(game: FishingGame, seconds: number) {
  for (let t = 0; t < seconds - 0.00001; t += 0.01)
    game.update(Math.min(0.01, seconds - t));
}
function bite(game: FishingGame) {
  game.press(1, 100);
  game.release(1);
  advance(game, 2.93);
  expect(game.state).toBe("BITE");
}
function hook(game: FishingGame) {
  bite(game);
  game.press(2, 100);
  expect(game.state).toBe("FIGHT");
}

describe("documented Perch loop", () => {
  it("casts, waits two to five seconds and requires a fresh press", () => {
    const game = new FishingGame(() => 0);
    game.press(1, 100);
    advance(game, 0.8);
    expect(game.state).toBe("CASTING");
    advance(game, 2.13);
    expect(game.state).toBe("BITE");
    expect(game.press(1, 100)).toBe(false);
    expect(game.held).toBe(false);
    advance(game, 0.91);
    expect(game.state).toBe("FAILURE");
    advance(game, 1.21);
    expect(game.state).toBe("READY");
    expect(game.progress).toBe(0);
  });
  it("uses the upper end of the random waiting range", () => {
    const game = new FishingGame(() => 0.9999);
    game.press(1, 0);
    game.release(1);
    advance(game, 5.8);
    expect(game.state).toBe("WAITING");
    advance(game, 0.13);
    expect(game.state).toBe("BITE");
  });
  it("transitions Hook to held Reel without another press", () => {
    const game = new FishingGame(() => 0);
    hook(game);
    advance(game, 1);
    expect(game.held).toBe(true);
    expect(game.progress).toBeCloseTo(13, 5);
    expect(game.tension).toBeCloseTo(16, 5);
    expect(game.behaviour.active).toBeNull();
    expect(game.behaviour.direction).toBe(0);
  });
  it("releases immediately, including outside the button; a second pointer cannot interfere", () => {
    const game = new FishingGame(() => 0);
    hook(game);
    advance(game, 2);
    expect(game.press(3, 200)).toBe(false);
    game.release(3);
    expect(game.held).toBe(true);
    game.move(2, -200);
    expect(game.direction).toBe(-1);
    game.release(2);
    advance(game, 0.1);
    expect(game.progress).toBeCloseTo(25.7);
    expect(game.tension).toBeCloseTo(27);
    expect(game.held).toBe(false);
  });
  it("snaps after 0.8 seconds at maximum and quickly permits replay", () => {
    const game = new FishingGame(() => 0);
    const events: GameEvent[] = [];
    game.onEvent((e) => events.push(e));
    hook(game);
    advance(game, 6.9);
    expect(game.state).toBe("FIGHT");
    expect(game.tension).toBe(100);
    advance(game, 0.17);
    expect(game.state).toBe("LINE_SNAP");
    expect(events).toContain("SNAP_IMMINENT");
    expect(events.filter((e) => e === "LINE_SNAP")).toHaveLength(1);
    advance(game, 1.9);
    expect(game.state).toBe("READY");
  });
  it("resets snap grace as soon as release takes tension below maximum", () => {
    const game = new FishingGame(() => 0);
    hook(game);
    advance(game, 6.7);
    expect(game.snapTime).toBeGreaterThan(0.4);
    game.release(2);
    advance(game, 0.01);
    expect(game.snapTime).toBe(0);
    expect(game.tension).toBeLessThan(100);
  });
  it("lands automatically, keeps reveal open, and repeats Perch", () => {
    const game = new FishingGame(() => 0);
    hook(game);
    advance(game, 5);
    game.release(2);
    advance(game, 1.5);
    game.press(3, 100);
    advance(game, 3.1);
    expect(game.state).toBe("LANDING");
    expect(game.held).toBe(false);
    advance(game, 1.8);
    expect(game.state).toBe("REVEAL");
    advance(game, 20);
    expect(game.state).toBe("REVEAL");
    game.continue();
    expect(game.state).toBe("READY");
    expect(game.creature.id).toBe("european-perch");
  });
  it.each([
    "CASTING",
    "WAITING",
    "BITE",
    "FIGHT",
    "LANDING",
    "LINE_SNAP",
    "REVEAL",
  ] as const)("freezes %s timers and returns with no held input", (state) => {
    const game = new FishingGame(() => 0);
    game.state = state;
    game.elapsed = 0.2;
    game.progress = 30;
    game.tension = 70;
    game.pause();
    advance(game, 30);
    expect(game.state).toBe(state);
    expect(game.elapsed).toBe(0.2);
    expect(game.tension).toBe(70);
    expect(game.progress).toBe(30);
    game.resume();
    expect(game.held).toBe(false);
  });
  it("rate-limits continuous critical haptics and emits threshold events once", () => {
    const game = new FishingGame(() => 0),
      events: GameEvent[] = [];
    game.onEvent((e) => events.push(e));
    hook(game);
    advance(game, 7.1);
    expect(events.filter((e) => e === "TENSION_WARNING")).toHaveLength(1);
    expect(events.filter((e) => e === "CRITICAL_TENSION")).toHaveLength(1);
    expect(
      events.filter((e) => e === "CRITICAL_PULSE").length,
    ).toBeLessThanOrEqual(3);
  });
});

describe("Rainbow Trout encounter", () => {
  it("uses the documented stronger Calm rates without directional moves", () => {
    const game = new FishingGame(() => 0, creatures[1]);
    hook(game);
    advance(game, 1);
    expect(game.progress).toBeCloseTo(12, 5);
    expect(game.tension).toBeCloseTo(20, 5);
    expect(game.behaviour.active).toBeNull();
    expect(game.behaviour.direction).toBe(0);
    game.release(2);
    advance(game, 0.1);
    expect(game.progress).toBeCloseTo(11.5, 5);
    expect(game.tension).toBeCloseTo(15.4, 5);
  });
  it("lands with repeated hold and release before the line snaps", () => {
    const game = new FishingGame(() => 0, creatures[1]);
    hook(game);
    advance(game, 4);
    game.release(2);
    advance(game, 1);
    game.press(3, 100);
    advance(game, 3);
    game.release(3);
    advance(game, 1.2);
    game.press(4, 100);
    advance(game, 2.3);
    expect(game.state).toBe("LANDING");
    expect(game.tension).toBeLessThan(100);
    advance(game, 1.8);
    expect(game.state).toBe("REVEAL");
    expect(game.creature.id).toBe("rainbow-trout");
  });
  it("snaps sooner than Perch if Reel stays held", () => {
    const game = new FishingGame(() => 0, creatures[1]);
    hook(game);
    advance(game, 5.7);
    expect(game.state).toBe("FIGHT");
    expect(game.tension).toBe(100);
    advance(game, 0.12);
    expect(game.state).toBe("LINE_SNAP");
  });
});

describe("future encounter extension seam", () => {
  const move: Move = {
    id: "run",
    kind: "directional-surge",
    eligibleAfter: [0, 0],
    cooldown: [1, 1],
    duration: 2,
    telegraph: 0.1,
    recovery: 1,
    direction: 1,
    reverseAt: 1,
    tension: 27,
    wrongTension: 48,
    progressMultiplier: 0.7,
  };
  const creature: Creature = {
    ...creatures[0],
    moves: [move],
    phases: [35, 70],
  };
  it("supports held directional reactions, reversals, release and recovery", () => {
    const game = new FishingGame(() => 0, creature);
    hook(game);
    advance(game, 0.2);
    const initial = game.progress;
    advance(game, 0.2);
    expect(game.progress).toBe(initial);
    game.move(2, 130);
    advance(game, 0.2);
    expect(game.progress).toBeGreaterThan(initial);
    advance(game, 0.5);
    expect(game.behaviour.direction).toBe(-1);
    game.release(2);
    const tension = game.tension;
    advance(game, 0.2);
    expect(game.tension).toBeLessThan(tension);
    advance(game, 0.9);
    expect(game.behaviour.active).toBeNull();
    expect(game.behaviour.recovery).toBeGreaterThan(0);
  });
  it("keeps boss phases sticky after progress falls", () => {
    const behaviour = new Behaviour(creature, () => 0);
    behaviour.update(0.1, 72);
    expect(behaviour.phase).toBe(2);
    behaviour.update(0.1, 20);
    expect(behaviour.phase).toBe(2);
  });
});

describe("local Book and independent Stage progression", () => {
  const memory = () => {
    const data = new Map<string, string>();
    return {
      getItem: (k: string) => data.get(k) ?? null,
      setItem: (k: string, v: string) => {
        data.set(k, v);
      },
    };
  };
  it("advances from Perch to Trout, persists both, and does not duplicate repeats", () => {
    const storage = memory(),
      store = new SaveStore(storage);
    expect(store.catch("lake", "european-perch")).toBe(true);
    expect(store.catch("lake", "european-perch")).toBe(false);
    const reloaded = new SaveStore(storage);
    expect(reloaded.data.stages.lake).toEqual({
      discovered: ["european-perch"],
      nextIndex: 1,
      cleared: false,
    });
    expect(reloaded.data.stages.swamp.nextIndex).toBe(0);
    expect(
      encounterFor(stages[0], reloaded.data.stages.lake.nextIndex, false).id,
    ).toBe("rainbow-trout");
    expect(reloaded.catch("lake", "rainbow-trout")).toBe(true);
    expect(reloaded.catch("lake", "rainbow-trout")).toBe(false);
    const afterTrout = new SaveStore(storage);
    expect(afterTrout.data.stages.lake).toEqual({
      discovered: ["european-perch", "rainbow-trout"],
      nextIndex: 2,
      cleared: false,
    });
    expect(encounterFor(stages[0], 2, false).id).toBe("common-carp");
    expect(afterTrout.data.stages.swamp.nextIndex).toBe(0);
  });
  it("persists settings and last Book section", () => {
    const storage = memory(),
      store = new SaveStore(storage);
    store.data.preferences = { music: 0, sfx: 0.4, haptics: false };
    store.data.lastBookStage = "swamp";
    store.write();
    const loaded = new SaveStore(storage);
    expect(loaded.data.preferences).toEqual(store.data.preferences);
    expect(loaded.data.lastBookStage).toBe("swamp");
  });
  it("survives corrupt and blocked storage without breaking a catch", () => {
    const storage = memory();
    storage.setItem(SAVE_KEY, "{no");
    const store = new SaveStore(storage);
    expect(store.data.stages.lake.discovered).toEqual([]);
    const blocked = new SaveStore({
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    });
    expect(blocked.catch("lake", "european-perch")).toBe(true);
    expect(blocked.available).toBe(false);
    expect(blocked.data.stages.lake.discovered).toHaveLength(1);
  });
});
