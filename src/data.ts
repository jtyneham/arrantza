export type Direction = -1 | 0 | 1;
export interface Move {
  id: string;
  kind: "run" | "surge" | "directional-surge" | "fake-out";
  eligibleAfter: [number, number];
  cooldown: [number, number];
  duration: number;
  telegraph: number;
  recovery: number;
  minProgress?: number;
  minPhase?: number;
  direction?: -1 | 1 | "random";
  reverseAt?: number;
  reverseReaction?: number;
  lull?: number;
  lullTensionMultiplier?: number;
  tension: number;
  wrongTension?: number;
  progressMultiplier?: number;
  guaranteeBefore?: number;
}
export interface Creature {
  id: string;
  name: string;
  playable: boolean;
  artwork?: string;
  artworkFit?: "contain" | "cover";
  gain: number;
  decay: number;
  tension: number;
  recovery: number;
  moves: Move[];
  phases?: number[];
  moveCooldown?: [number, number];
  recoveryEvery?: { events: number; duration: [number, number] };
  recoveryTension?: number;
}
export const creatures: Creature[] = [
  {
    id: "european-perch",
    name: "European Perch",
    playable: true,
    artwork: "creatures/european-perch.png",
    gain: 13,
    decay: 3,
    tension: 16,
    recovery: 50,
    moves: [],
  },
  {
    id: "rainbow-trout",
    name: "Rainbow Trout",
    playable: true,
    artwork: "creatures/rainbow-trout.png",
    gain: 12,
    decay: 5,
    tension: 20,
    recovery: 46,
    moves: [],
  },
  {
    id: "common-carp",
    name: "Common Carp",
    playable: true,
    artwork: "creatures/common-carp.png",
    gain: 11,
    decay: 7,
    tension: 21,
    recovery: 43,
    moves: [{
      id: "carp-run", kind: "run", eligibleAfter: [2, 3],
      telegraph: 0.9, duration: 1.75, cooldown: [2.5, 4], recovery: 1,
      direction: "random", tension: 27, wrongTension: 48,
      progressMultiplier: 0.7, guaranteeBefore: 25,
    }],
  },
  {
    id: "northern-pike",
    name: "Northern Pike",
    playable: true,
    artwork: "creatures/northern-pike.png",
    gain: 10,
    decay: 9,
    tension: 25,
    recovery: 40,
    moves: [
      { id: "pike-surge", kind: "surge", eligibleAfter: [2, 3.5],
        telegraph: 0.45, duration: 0.8, cooldown: [2.5, 4], recovery: 1,
        tension: 58, guaranteeBefore: 35 },
      { id: "pike-run", kind: "run", eligibleAfter: [4, 6],
        telegraph: 0.85, duration: 1.7, cooldown: [6, 9], recovery: 1.2,
        direction: "random", tension: 34, wrongTension: 55,
        progressMultiplier: 0.7 },
    ],
  },
  {
    id: "largemouth-bass",
    name: "Largemouth Bass",
    playable: true,
    artwork: "creatures/largemouth-bass.png",
    gain: 10,
    decay: 11,
    tension: 23,
    recovery: 39,
    moveCooldown: [1.8, 3],
    moves: [
      { id: "bass-dart", kind: "run", eligibleAfter: [1.8, 2.8],
        telegraph: 0.65, duration: 1.1, cooldown: [1.8, 3], recovery: 0.8,
        direction: "random", tension: 31, wrongTension: 58, progressMultiplier: 0.7 },
      { id: "bass-reversal", kind: "run", eligibleAfter: [3, 4],
        telegraph: 0.65, duration: 2.85, reverseAt: 1.75, reverseReaction: 0.65,
        cooldown: [5, 7], recovery: 1, direction: "random", tension: 31,
        wrongTension: 58, progressMultiplier: 0.7, guaranteeBefore: 35 },
    ],
  },
  {
    id: "european-eel",
    name: "European Eel",
    playable: true,
    artwork: "creatures/european-eel.png",
    artworkFit: "contain",
    gain: 9,
    decay: 14,
    tension: 27,
    recovery: 37,
    moveCooldown: [0.6, 1.2],
    recoveryEvery: { events: 2, duration: [1.5, 2] },
    recoveryTension: 4,
    moves: [
      { id: "eel-burst", kind: "directional-surge", eligibleAfter: [2, 3.5],
        telegraph: 0.6, duration: 0.9, cooldown: [2.5, 4.5], recovery: 1.5,
        direction: "random", tension: 36, wrongTension: 62, progressMultiplier: 0.7 },
      { id: "eel-surge", kind: "surge", eligibleAfter: [3, 5],
        telegraph: 0.4, duration: 0.9, cooldown: [3, 5], recovery: 1.5,
        tension: 64 },
      { id: "eel-fake-out", kind: "fake-out", eligibleAfter: [3, 5],
        minProgress: 25, guaranteeBefore: 35, lull: 1.4, lullTensionMultiplier: 0.25,
        telegraph: 0.4, duration: 0.9, cooldown: [5, 8], recovery: 1.5,
        tension: 68 },
    ],
  },
  {
    id: "wels-catfish",
    name: "Wels Catfish",
    playable: false,
    gain: 7.8,
    decay: 18,
    tension: 30,
    recovery: 34,
    moves: [],
    phases: [35, 70],
  },
];
export interface Stage {
  id: string;
  name: string;
  playable: boolean;
  roster: string[];
  castPoint: { x: number; y: number };
}
export const stages: Stage[] = [
  {
    id: "lake",
    name: "Lake",
    playable: true,
    roster: creatures.map((c) => c.id),
    castPoint: { x: 372, y: 462 },
  },
  {
    id: "swamp",
    name: "Swamp",
    playable: false,
    roster: [],
    castPoint: { x: 360, y: 460 },
  },
  {
    id: "frozen-waters",
    name: "Frozen Waters",
    playable: false,
    roster: [],
    castPoint: { x: 360, y: 460 },
  },
];
/** Respect independent first-clear order; unfinished prototype content repeats the last playable entry. */
export function encounterFor(
  stage: Stage,
  nextIndex: number,
  cleared: boolean,
  random = Math.random,
): Creature {
  const roster = stage.roster
    .map((id) => creatures.find((c) => c.id === id))
    .filter((c): c is Creature => !!c);
  const playable = roster.filter((c) => c.playable);
  if (!playable.length)
    throw new Error(`Stage ${stage.id} has no playable Creatures`);
  if (cleared) return playable[Math.floor(random() * playable.length)];
  return roster[nextIndex]?.playable
    ? roster[nextIndex]
    : (roster
        .slice(0, nextIndex + 1)
        .filter((c) => c.playable)
        .at(-1) ?? playable[0]);
}
export const tuning = {
  castDuration: 0.9,
  waitMin: 2,
  waitMax: 5,
  hookWindow: 0.9,
  landingDuration: 1.7,
  snapDuration: 0.65,
  failureDuration: 1.2,
  warningTension: 70,
  criticalTension: 90,
  maxTension: 100,
  snapGrace: 0.8,
  snapImminent: 0.55,
  criticalPulseInterval: 0.48,
  directionalDeadZone: 15,
  directionHapticCooldown: 0.45,
};
export const asset = (path: string) =>
  `${import.meta.env.BASE_URL}assets/${path}`;
export const assets = {
  lake: asset("environment/lake.png"),
  harbor: asset("environment/harbor.png"),
  angler: asset("characters/angler.png"),
};
