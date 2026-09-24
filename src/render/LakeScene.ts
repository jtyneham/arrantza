import Phaser from "phaser";
import { assets, stages, tuning } from "../data";
import type { FishingGame, GameEvent } from "../game/engine";

export class LakeScene extends Phaser.Scene {
  private angler!: Phaser.GameObjects.Image;
  private ink!: Phaser.GameObjects.Graphics;
  private ambient!: Phaser.GameObjects.Graphics;
  private clock = 0;
  private burst = 0;
  private reducedMotion = matchMedia("(prefers-reduced-motion: reduce)")
    .matches;
  private unsubscribe?: () => void;
  constructor(
    private model: FishingGame,
    private shown: () => boolean,
    private loaded: () => void,
  ) {
    super("lake");
  }
  preload() {
    this.load.image("lake", assets.lake);
    this.load.image("angler", assets.angler);
    this.load.on("loaderror", () => {
      document.getElementById("toast")!.textContent =
        "An illustration could not load. Please refresh.";
      document.getElementById("toast")!.hidden = false;
    });
  }
  create() {
    this.add.image(270, 480, "lake").setDisplaySize(540, 960);
    this.ambient = this.add.graphics();
    // Full-body isolated figure; the chair stays planted as shoulders breathe and pull.
    this.angler = this.add
      .image(106, 794, "angler")
      .setOrigin(0.5, 1)
      .setDisplaySize(235, 283);
    this.ink = this.add.graphics();
    this.unsubscribe = this.model.onEvent((event: GameEvent) => {
      if (
        [
          "BOBBER_LAND",
          "BITE",
          "HOOK_SUCCESS",
          "LINE_SNAP",
          "LANDING",
        ].includes(event)
      )
        this.burst = 1;
    });
    this.events.once("shutdown", () => this.unsubscribe?.());
    this.loaded();
  }
  update(_time: number, delta: number) {
    if (!this.shown() || this.model.paused) return;
    const dt = Math.min(delta / 1000, 0.05);
    this.clock += dt;
    this.burst = Math.max(0, this.burst - dt * 1.7);
    const m = this.model,
      t = this.clock,
      fight = m.state === "FIGHT";
    const tension = fight && m.held ? m.tension / 100 : 0;
    const landing = m.state === "LANDING",
      snap = m.state === "LINE_SNAP";
    const cast =
      m.state === "CASTING" ? Math.min(1, m.elapsed / tuning.castDuration) : 1;
    const breathe = this.reducedMotion ? 0 : Math.sin(t * 1.4) * 0.5;
    const pull = landing
      ? Math.sin(m.elapsed * 4) * 2.5 - 2
      : fight && m.held
        ? Math.sin(t * 9) * 0.65 - tension * 1.4
        : snap
          ? Math.sin(m.elapsed * 15) * 4
          : 0;
    this.angler.setAngle(pull).setDisplaySize(235, 283 + breathe);
    this.drawAmbient(t);
    const g = this.ink;
    g.clear();
    const base = { x: 173, y: 650 + breathe };
    const direction = m.behaviour.direction;
    let tipX = 252 + tension * 31 + direction * 23;
    let tipY = 448 - tension * 80;
    if (m.state === "CASTING") {
      tipX = 143 + Math.sin((cast * Math.PI) / 2) * 110;
      tipY = 345 + cast * 103;
    }
    if (landing) {
      tipX = 220;
      tipY = 345 + Math.sin(m.elapsed * 6) * 8;
    }
    if (snap) {
      tipX = 220 - Math.sin(m.elapsed * 14) * 18;
      tipY = 345;
    }
    const rod = new Phaser.Curves.QuadraticBezier(
      new Phaser.Math.Vector2(base.x, base.y),
      new Phaser.Math.Vector2(213 - tension * 16, 426 - tension * 90),
      new Phaser.Math.Vector2(tipX, tipY),
    );
    const points = rod.getPoints(32);
    g.lineStyle(4, 0x182326);
    g.strokePoints(points);
    g.lineStyle(1.2, 0xbfa77a);
    g.strokePoints(points);
    for (let i = 4; i < 31; i += 5) {
      g.lineStyle(1, 0x182326);
      g.strokeCircle(points[i].x, points[i].y, 2);
    }
    g.lineStyle(6, 0x624d32);
    g.lineBetween(base.x - 5, base.y + 11, base.x + 3, base.y - 8);
    g.fillStyle(0x172e31);
    g.fillCircle(base.x - 5, base.y - 4, 8);
    g.lineStyle(1.5, 0xd9c99d);
    g.strokeCircle(base.x - 5, base.y - 4, 5);
    const reelAngle = fight && m.held ? t * 16 : 0.5;
    g.lineStyle(2, 0xcac4a6);
    g.lineBetween(
      base.x - 5,
      base.y - 4,
      base.x - 5 + Math.cos(reelAngle) * 10,
      base.y - 4 + Math.sin(reelAngle) * 10,
    );
    const visible = [
      "CASTING",
      "WAITING",
      "BITE",
      "FIGHT",
      "LANDING",
      "LINE_SNAP",
    ].includes(m.state);
    if (!visible) return;
    let bx = stages[0].castPoint.x,
      by = stages[0].castPoint.y;
    if (m.state === "CASTING") {
      bx = base.x + (bx - base.x) * cast;
      by = base.y + (by - base.y) * cast - Math.sin(cast * Math.PI) * 210;
    }
    if (fight) {
      bx += Math.sin(t * 5) * (3 + tension * 8) + direction * 42;
      by += Math.cos(t * 6) * 3 + m.progress * 0.17;
    }
    if (m.state === "BITE") by += 7 + Math.sin(t * 22) * 4;
    if (landing) {
      const p = Math.min(1, m.elapsed / tuning.landingDuration);
      bx += (base.x - bx) * p;
      by += (base.y - by) * p - Math.sin(p * Math.PI) * 60;
    }
    by += Math.sin(t * 2.4) * 1.5;
    g.lineStyle(1.4, 0xfff5d8, 0.95);
    if (snap) {
      g.lineBetween(tipX, tipY, tipX + 20, tipY + 35);
      g.lineBetween(bx - 24, by - 20, bx, by);
    } else {
      const slack = (fight && m.held) || landing ? 0 : 23;
      const line = new Phaser.Curves.QuadraticBezier(
        new Phaser.Math.Vector2(tipX, tipY),
        new Phaser.Math.Vector2((tipX + bx) / 2, (tipY + by) / 2 + slack),
        new Phaser.Math.Vector2(bx, by),
      );
      g.strokePoints(line.getPoints(20));
    }
    if (m.state !== "CASTING" && !landing) {
      for (let i = 0; i < 4; i++) {
        const cycle = (t * (fight ? 0.8 : 0.28) + i / 4) % 1;
        g.lineStyle(
          fight ? 1.5 : 1,
          0xe1f4ec,
          (1 - cycle) * (fight ? 0.8 : 0.46),
        );
        g.strokeEllipse(
          bx,
          by + 5,
          24 + cycle * (fight ? 140 : 95),
          5 + cycle * (fight ? 27 : 16),
        );
      }
    }
    if (this.burst > 0 || (fight && m.held)) {
      for (let i = 0; i < 13; i++) {
        const phase = (t * 1.8 + i * 0.173) % 1;
        const strength = Math.max(
          this.burst,
          tension * 0.65 + (fight ? 0.13 : 0),
        );
        const x = bx + Math.sin(i * 13.2) * phase * 65 * strength;
        const y =
          by - Math.sin(phase * Math.PI) * (20 + (i % 4) * 13) * strength;
        g.fillStyle(0xfff9e9, (1 - phase) * 0.9);
        g.fillEllipse(x, y, 2.5, 4.5);
      }
    }
    if (snap || (landing && m.elapsed > 1.2)) return;
    // One consistent red/cream bobber, built independently of the scenic plate.
    g.lineStyle(1.5, 0x203437);
    g.lineBetween(bx - 1, by - 18, bx, by + 4);
    g.fillStyle(0xd45632);
    g.fillTriangle(bx, by - 12, bx - 4, by - 1, bx + 5, by - 1);
    g.fillStyle(0xfff3d6);
    g.fillTriangle(bx - 4, by - 1, bx + 5, by - 1, bx + 1, by + 8);
    g.lineStyle(1, 0x233d42);
    g.strokeTriangle(bx, by - 12, bx - 4, by - 1, bx + 1, by + 8);
    if (m.state === "BITE") {
      g.lineStyle(3, 0xfff0ba);
      for (let i = 0; i < 3; i++)
        g.lineBetween(bx - 17 + i * 17, by - 25, bx - 22 + i * 22, by - 39);
    }
  }
  private drawAmbient(t: number) {
    const g = this.ambient;
    g.clear();
    if (this.reducedMotion) return;
    for (let i = 0; i < 42; i++) {
      const x = (i * 137.31 + Math.sin(t * 0.18 + i) * 11) % 530;
      const y = 352 + ((i * 47.8) % 415);
      g.lineStyle(
        1,
        i % 3 ? 0xe8f2d9 : 0x88d2df,
        0.06 + (Math.sin(t * 0.8 + i) + 1) * 0.08,
      );
      g.lineBetween(x, y, x + 8 + (i % 5) * 6, y);
    }
    // A few drifting pollen motes near the bank.
    for (let i = 0; i < 7; i++) {
      g.fillStyle(0xffe5a3, (Math.sin(t + i * 3) + 1) * 0.17);
      g.fillCircle(
        30 + i * 68 + Math.sin(t * 0.4 + i) * 18,
        650 + Math.sin(t * 0.25 + i * 2) * 90,
        1.2,
      );
    }
  }
}
