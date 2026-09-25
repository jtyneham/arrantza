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
  gain: number;
  decay: number;
  tension: number;
  recovery: number;
  moves: Move[];
  phases?: number[];
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
    playable: false,
    gain: 11,
    decay: 7,
    tension: 21,
    recovery: 43,
    moves: [],
  },
  {
    id: "northern-pike",
    name: "Northern Pike",
    playable: false,
    gain: 10,
    decay: 9,
    tension: 25,
    recovery: 40,
    moves: [],
  },
  {
    id: "largemouth-bass",
    name: "Largemouth Bass",
    playable: false,
    gain: 10,
    decay: 11,
    tension: 23,
    recovery: 39,
    moves: [],
  },
  {
    id: "european-eel",
    name: "European Eel",
    playable: false,
    gain: 9,
    decay: 14,
    tension: 27,
    recovery: 37,
    moves: [],
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
