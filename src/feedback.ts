import type { FishingGame, GameEvent } from "./game/engine";
import type { Preferences } from "./game/save";

const patterns: Partial<Record<GameEvent, number | number[]>> = {
  CAST: 10,
  BOBBER_LAND: 15,
  BITE: 30,
  HOOK_SUCCESS: [18, 25, 28],
  DIRECTIONAL_RUN_START: 20,
  DIRECTION_ACQUIRED: 9,
  SURGE_START: 35,
  DIRECTIONAL_SURGE_START: 40,
  TENSION_WARNING: 18,
  CRITICAL_TENSION: [22, 45, 22],
  CRITICAL_PULSE: 15,
  SNAP_IMMINENT: [30, 30, 45],
  LINE_SNAP: 75,
  LANDING: [18, 30, 30],
  CATCH_REVEAL: 20,
};

/** Replaceable synthesized prototype sound palette; semantic events are its only input. */
export class Feedback {
  private ctx?: AudioContext;
  private music?: GainNode;
  private sfx?: GainNode;
  private reel?: GainNode;
  private strain?: GainNode;
  private strainOsc?: OscillatorNode;
  private ambience?: GainNode;
  private nextNote = 0;
  private note = 0;
  private mode = "title";
  private paused = false;
  private duckUntil = 0;
  constructor(private settings: () => Preferences) {}
  unlock() {
    try {
      if (!this.ctx) this.create();
      if (!this.paused) void this.ctx?.resume().catch(() => {});
    } catch {
      /* Visual cues carry all essential information if Web Audio is unavailable. */
    }
  }
  private create() {
    const ctx = (this.ctx = new AudioContext());
    this.music = ctx.createGain();
    this.music.connect(ctx.destination);
    this.sfx = ctx.createGain();
    this.sfx.connect(ctx.destination);
    const noise = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate);
    const data = noise.getChannelData(0);
    let previous = 0;
    for (let i = 0; i < data.length; i++) {
      previous = (previous + (Math.random() * 2 - 1) * 0.08) / 1.02;
      data[i] = previous;
    }
    const source = ctx.createBufferSource();
    source.buffer = noise;
    source.loop = true;
    const water = ctx.createBiquadFilter();
    water.type = "lowpass";
    water.frequency.value = 750;
    this.ambience = ctx.createGain();
    source.connect(water).connect(this.ambience).connect(this.sfx);
    source.start();
    const gear = ctx.createOscillator();
    gear.type = "triangle";
    gear.frequency.value = 76;
    this.reel = ctx.createGain();
    this.reel.gain.value = 0;
    gear.connect(this.reel).connect(this.sfx);
    gear.start();
    this.strainOsc = ctx.createOscillator();
    this.strainOsc.type = "sine";
    this.strain = ctx.createGain();
    this.strain.gain.value = 0;
    this.strainOsc.connect(this.strain).connect(this.sfx);
    this.strainOsc.start();
  }
  setMode(mode: "title" | "lake") {
    if (this.mode !== mode) {
      this.mode = mode;
      this.note = 0;
      this.nextNote = 0;
    }
  }
  setPaused(paused: boolean) {
    this.paused = paused;
    if (paused) {
      this.silenceReel();
      navigator.vibrate?.(0);
      void this.ctx?.suspend().catch(() => {});
    } else void this.ctx?.resume().catch(() => {});
  }
  private silenceReel() {
    if (!this.ctx) return;
    this.reel?.gain.cancelScheduledValues(this.ctx.currentTime);
    this.reel?.gain.setValueAtTime(0, this.ctx.currentTime);
    this.strain?.gain.cancelScheduledValues(this.ctx.currentTime);
    this.strain?.gain.setValueAtTime(0, this.ctx.currentTime);
  }
  private tone(
    freq: number,
    duration: number,
    gain: number,
    type: OscillatorType = "sine",
    music = false,
    delay = 0,
    endFreq?: number,
  ) {
    const ctx = this.ctx,
      output = music ? this.music : this.sfx;
    if (!ctx || !output) return;
    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator(),
      env = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (endFreq)
      osc.frequency.exponentialRampToValueAtTime(endFreq, now + duration);
    env.gain.setValueAtTime(0, now);
    env.gain.linearRampToValueAtTime(gain, now + 0.015);
    env.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(env).connect(output);
    osc.start(now);
    osc.stop(now + duration + 0.02);
    osc.onended = () => {
      osc.disconnect();
      env.disconnect();
    };
  }
  private splash(duration: number, gain: number, frequency = 1100) {
    const ctx = this.ctx;
    if (!ctx || !this.sfx) return;
    const buffer = ctx.createBuffer(
      1,
      Math.ceil(ctx.sampleRate * duration),
      ctx.sampleRate,
    );
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++)
      data[i] = (Math.random() * 2 - 1) * (1 - i / data.length) ** 2;
    const source = ctx.createBufferSource(),
      filter = ctx.createBiquadFilter(),
      volume = ctx.createGain();
    source.buffer = buffer;
    filter.type = "lowpass";
    filter.frequency.value = frequency;
    volume.gain.value = gain;
    source.connect(filter).connect(volume).connect(this.sfx);
    source.start();
    source.onended = () => {
      source.disconnect();
      filter.disconnect();
      volume.disconnect();
    };
  }
  event(event: GameEvent) {
    if (this.paused) return;
    const pattern = patterns[event];
    if (pattern && this.settings().haptics) navigator.vibrate?.(pattern);
    if (
      ["BITE", "CRITICAL_TENSION", "LINE_SNAP", "CATCH_REVEAL"].includes(event)
    )
      this.duckUntil = (this.ctx?.currentTime ?? 0) + 0.6;
    const variation = 0.94 + Math.random() * 0.12;
    switch (event) {
      case "CAST":
        this.splash(0.22, 0.17, 2500);
        break;
      case "BOBBER_LAND":
        this.tone(420 * variation, 0.18, 0.18, "sine", false, 0, 120);
        this.splash(0.23, 0.15);
        break;
      case "BITE":
        this.splash(0.3, 0.33);
        this.tone(880, 0.14, 0.2);
        this.tone(1174, 0.2, 0.16, "sine", false, 0.1);
        break;
      case "HOOK_SUCCESS":
        this.tone(140, 0.2, 0.15, "triangle", false, 0, 320);
        this.splash(0.15, 0.14);
        break;
      case "REEL_RELEASE":
        this.silenceReel();
        this.splash(0.11, 0.055, 3300);
        break;
      case "TENSION_WARNING":
        this.tone(190, 0.2, 0.05, "triangle");
        break;
      case "CRITICAL_TENSION":
        this.tone(650, 0.32, 0.075, "triangle", false, 0, 930);
        break;
      case "SNAP_IMMINENT":
        this.tone(1250, 0.16, 0.09, "triangle");
        break;
      case "LINE_SNAP":
        this.silenceReel();
        this.splash(0.13, 0.3, 5500);
        this.tone(610, 0.3, 0.22, "triangle", false, 0, 80);
        break;
      case "MISSED_HOOK":
        this.splash(0.2, 0.13);
        this.tone(240, 0.3, 0.09, "sine", false, 0, 160);
        break;
      case "LANDING":
        this.silenceReel();
        this.splash(0.4, 0.2);
        break;
      case "CATCH_REVEAL":
        [392, 494, 587, 784].forEach((f, i) =>
          this.tone(f, 0.9, 0.09, "sine", false, i * 0.1),
        );
        break;
      case "SURGE_START":
      case "DIRECTIONAL_SURGE_START":
      case "DIRECTIONAL_RUN_START":
        this.splash(0.35, 0.2);
        break;
    }
  }
  update(game: FishingGame, inLake: boolean) {
    const ctx = this.ctx;
    if (!ctx || this.paused) return;
    const now = ctx.currentTime,
      prefs = this.settings();
    this.music!.gain.setTargetAtTime(
      prefs.music * (now < this.duckUntil ? 0.25 : 1),
      now,
      0.08,
    );
    this.sfx!.gain.setTargetAtTime(prefs.sfx, now, 0.02);
    this.ambience!.gain.setTargetAtTime(inLake ? 0.12 : 0.06, now, 0.2);
    const reeling =
      inLake && game.state === "FIGHT" && game.held && !game.paused;
    this.reel!.gain.setValueAtTime(
      reeling ? 0.018 + game.tension * 0.00025 : 0,
      now,
    );
    this.strain!.gain.setValueAtTime(
      reeling ? Math.max(0, game.tension - 35) * 0.0007 : 0,
      now,
    );
    this.strainOsc!.frequency.setTargetAtTime(
      110 + game.tension * 7,
      now,
      0.05,
    );
    if (now >= this.nextNote) {
      const melody =
        this.mode === "lake"
          ? [293.66, 440, 369.99, 329.63, 246.94, 369.99, 440, 329.63]
          : [392, 493.88, 587.33, 493.88, 440, 369.99, 329.63, 293.66];
      this.tone(melody[this.note % melody.length], 2.5, 0.045, "sine", true);
      if (this.note % 4 === 0)
        this.tone(
          melody[this.note % melody.length] / 2,
          3.8,
          0.04,
          "sine",
          true,
        );
      this.note++;
      this.nextNote = now + (this.mode === "lake" ? 1.65 : 1.15);
    }
  }
}
