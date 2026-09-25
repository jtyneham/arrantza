import { describe, expect, it } from "vitest";
import { creatures, encounterFor, stages } from "../src/data";
import { FishingGame, type GameEvent } from "../src/game/engine";
import { Behaviour } from "../src/game/behaviour";
import { SaveStore } from "../src/game/save";

function seeded(seed: number) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}
function step(game: FishingGame, seconds: number) {
  for (let t = 0; t < seconds - 1e-6; t += 0.01) game.update(Math.min(0.01, seconds - t));
}

describe("Lake Creatures 3–6", () => {
  it.each([
    [2, 11, 7, 21, 43, 27, 48],
    [3, 10, 9, 25, 40, 34, 55],
    [4, 10, 11, 23, 39, 31, 58],
    [5, 9, 14, 27, 37, 36, 62],
  ])("Creature %i uses documented base and continuous directional rates", (index, gain, decay, tension, recovery, correctRate, wrongRate) => {
    const creature = creatures[index];
    const game = new FishingGame(() => 0, creature);
    game.state = "FIGHT";
    game.press(1, 100);
    step(game, 1);
    expect(game.progress).toBeCloseTo(gain);
    expect(game.tension).toBeCloseTo(tension);
    game.release(1);
    step(game, 0.1);
    expect(game.progress).toBeCloseTo(gain - decay * 0.1);
    expect(game.tension).toBeCloseTo(tension - recovery * 0.1);
    game.behaviour.active = creature.moves.find(m => m.direction)!;
    game.behaviour.elapsed = game.behaviour.active.telegraph + 0.1;
    game.behaviour.direction = 1;
    game.press(2, 100);
    const before = { progress: game.progress, tension: game.tension };
    step(game, 0.1);
    expect(game.progress).toBeCloseTo(before.progress);
    expect(game.tension).toBeCloseTo(before.tension + wrongRate * 0.1);
    game.move(2, 130);
    const corrected = game.tension;
    step(game, 0.1);
    expect(game.progress).toBeCloseTo(before.progress + gain * 0.7 * 0.1);
    expect(game.tension).toBeCloseTo(corrected + correctRate * 0.1);
    game.release(2);
    const released = game.tension;
    step(game, 0.1);
    expect(game.tension).toBeCloseTo(released - recovery * 0.1);
  });

  it("Carp's first run starts inside its authored range, with a full reaction window", () => {
    for (const random of [0, 0.5, 0.999]) {
      const b = new Behaviour(creatures[2], () => random);
      while (!b.active) b.update(0.01, 20);
      expect(b.age).toBeGreaterThanOrEqual(2);
      expect(b.age).toBeLessThanOrEqual(3.01);
      expect(b.resisting).toBe(false);
      b.update(0.89, 20);
      expect(b.resisting).toBe(false);
      b.update(0.02, 20);
      expect(b.resisting).toBe(true);
    }
  });

  it("Bass reversal changes the held response and grants its new reaction window", () => {
    const game = new FishingGame(() => 0, creatures[4]);
    const events: GameEvent[] = [];
    game.onEvent(e => events.push(e));
    game.state = "FIGHT";
    game.press(1, 100);
    game.behaviour.active = creatures[4].moves[1];
    game.behaviour.direction = 1;
    game.behaviour.elapsed = 1.7;
    game.move(1, 130);
    step(game, 0.06);
    expect(game.behaviour.direction).toBe(-1);
    expect(game.behaviour.resisting).toBe(false);
    expect(events).toContain("DIRECTION_REVERSED");
    step(game, 0.6);
    expect(game.behaviour.resisting).toBe(false);
    game.move(1, 70);
    step(game, 0.06);
    expect(game.behaviour.resisting).toBe(true);
    expect(game.held).toBe(true);
    expect(events.filter(e => e === "DIRECTION_ACQUIRED")).toHaveLength(2);
  });

  it("Eel fake-out has a low-pressure lull, readable tell, then a real surge", () => {
    const game = new FishingGame(() => 0, creatures[5]);
    const events: GameEvent[] = [];
    game.onEvent(e => events.push(e));
    game.state = "FIGHT";
    game.press(1, 100);
    game.behaviour.active = creatures[5].moves[2];
    step(game, 1);
    expect(game.behaviour.lulling).toBe(true);
    expect(game.tension).toBeCloseTo(6.75);
    step(game, 0.41);
    expect(game.behaviour.telegraphing).toBe(true);
    expect(events).toContain("SURGE_TELEGRAPH");
    game.pause();
    const elapsed = game.behaviour.elapsed;
    step(game, 10);
    expect(game.behaviour.elapsed).toBe(elapsed);
    game.resume();
    expect(game.held).toBe(false);
    game.press(2, 100);
    step(game, 0.41);
    expect(game.behaviour.resisting).toBe(true);
    expect(events.filter(e => e === "SURGE_START")).toHaveLength(1);
    const tension = game.tension;
    step(game, 0.1);
    expect(game.tension).toBeCloseTo(tension + 6.8);
  });

  it("Eel gives a real recovery opportunity after two demanding events", () => {
    const b = new Behaviour(creatures[5], () => 0);
    let completed = 0;
    for (let i = 0; i < 3000 && completed < 2; i++) {
      const previous = b.active;
      b.update(0.01, 0);
      if (previous && !b.active) completed++;
    }
    expect(completed).toBe(2);
    expect(b.recovery).toBeGreaterThanOrEqual(1);
    b.update(0.5, 0);
    expect(b.active).toBeNull();
    expect(b.recovering).toBe(true);
  });

  it("Bass shares a cooldown across its different Run moves", () => {
    const b = new Behaviour(creatures[4], () => 0);
    let endedAt = -Infinity;
    let starts = 0;
    for (let t = 0; t < 30; t += 0.01) {
      const previous = b.active;
      const move = b.update(0.01, 50);
      if (previous && !b.active) endedAt = b.age;
      if (move) {
        expect(b.age - endedAt).toBeGreaterThanOrEqual(1.8 - 1e-6);
        starts++;
      }
    }
    expect(starts).toBeGreaterThan(3);
  });

  it.each(creatures.slice(2, 6))("$name punishes unattended Reel and preserves the encounter for retry", creature => {
    const game = new FishingGame(() => 0, creature);
    game.state = "FIGHT";
    game.press(1, 100);
    for (let t = 0; t < 20 && game.state === "FIGHT"; t += 0.05) game.update(0.05);
    expect(game.state).toBe("LINE_SNAP");
    expect(game.held).toBe(false);
    step(game, 2);
    expect(game.state).toBe("READY");
    expect(game.creature.id).toBe(creature.id);
    expect(game.progress).toBe(0);
    expect(game.behaviour.active).toBeNull();
  });

  it.each(creatures.slice(2, 6))("$name can be landed across 25 seeds and exposes its teaching move", creature => {
    for (let seed = 1; seed <= 25; seed++) {
      const game = new FishingGame(seeded(seed), creature);
      const events: GameEvent[] = [];
      game.onEvent(e => events.push(e));
      game.press(1, 100);
      game.release(1);
      while (game.state !== "BITE") game.update(0.05);
      game.press(2, 100);
      let fakeOutProgress = -1;
      for (let t = 0; t < 180 && String(game.state) === "FIGHT"; t += 0.1) {
        const surge = game.behaviour.resisting && game.behaviour.active?.kind !== "run";
        if (game.held && (game.tension >= 80 || (surge && game.tension >= 35))) game.release(2);
        else if (!game.held && (game.tension <= 5 || (!surge && game.tension <= 60))) game.press(2, 100);
        if (game.held) game.move(2, 100 + game.behaviour.direction * 30);
        game.update(0.1);
        if (game.behaviour.active?.kind === "fake-out" && fakeOutProgress < 0)
          fakeOutProgress = game.progress;
      }
      expect(game.state, `${creature.id}, seed ${seed}, progress ${game.progress}`).toBe("LANDING");
      if (creature.id === "common-carp") expect(events).toContain("DIRECTIONAL_RUN_START");
      if (creature.id === "northern-pike") expect(events).toContain("SURGE_START");
      if (creature.id === "largemouth-bass") expect(events).toContain("DIRECTION_REVERSED");
      if (creature.id === "european-eel") {
        expect(events).toContain("FAKE_OUT_START");
        expect(fakeOutProgress).toBeGreaterThanOrEqual(25);
        expect(events).toContain("DIRECTIONAL_SURGE_START");
      }
    }
  });

  it("keeps the six-entry Lake incomplete and repeats Eel until the boss exists", () => {
    const values = new Map<string, string>();
    const storage = { getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => { values.set(key, value); } };
    let save = new SaveStore(storage);
    for (const creature of creatures.slice(0, 6)) {
      expect(encounterFor(stages[0], save.data.stages.lake.nextIndex, false).id).toBe(creature.id);
      expect(save.catch("lake", creature.id)).toBe(true);
      save = new SaveStore(storage);
    }
    expect(save.data.stages.lake.nextIndex).toBe(6);
    expect(save.data.stages.lake.cleared).toBe(false);
    expect(encounterFor(stages[0], 6, false).id).toBe("european-eel");
    expect(save.catch("lake", "european-eel")).toBe(false);
    expect(save.data.stages.lake.discovered).toHaveLength(6);
  });
});
