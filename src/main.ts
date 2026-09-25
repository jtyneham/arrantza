import Phaser from "phaser";
import "./style.css";
import { assets, asset, creatures, stages, tuning, encounterFor, type Creature } from "./data";
import { FishingGame } from "./game/engine";
import { SaveStore } from "./game/save";
import { Feedback } from "./feedback";
import { LakeScene } from "./render/LakeScene";
import { icon, silhouette } from "./ui/icons";

type Screen = "title" | "select" | "lake" | "book";
type Overlay = "settings" | "resume" | null;
const el = <T extends HTMLElement = HTMLElement>(selector: string) =>
  document.querySelector<T>(selector)!;
function textIfChanged(selector: string, value: string) {
  const node = el(selector);
  if (node.textContent !== value) node.textContent = value;
}
const root = el("#game"),
  ui = el("#ui"),
  overlayRoot = el("#overlay"),
  rotate = el("#rotate");
// Resolve against the page, not the emitted CSS directory (also works under /repo/ on Pages).
root.style.setProperty(
  "--lake-art",
  `url('${new URL(assets.lake, document.baseURI).href}')`,
);
root.style.setProperty(
  "--harbor-art",
  `url('${new URL(assets.harbor, document.baseURI).href}')`,
);
const model = new FishingGame();
let storage: Storage | null = null;
try {
  storage = localStorage;
} catch {
  /* Private storage can be unavailable. */
}
const save = new SaveStore(storage);
const feedback = new Feedback(() => save.data.preferences);
let screen: Screen = "title",
  overlay: Overlay = null,
  bookOrigin: Screen = "select";
let landscape = false,
  sceneReady = false,
  firstCatch = false,
  lastState = "",
  toastTimer = 0;
let previousFocus: HTMLElement | null = null;
const logo = () =>
  `<img class="logo" src="${asset("ui/logo.png")}" alt="ARRANTZA" draggable="false">`;
const button = (
  action: string,
  label: string,
  symbol?: string,
  primary = false,
) =>
  `<button class="menu-button${primary ? " primary" : ""}" data-action="${action}">${symbol ? icon(symbol) : ""}<span>${label}</span></button>`;

function notify(message: string) {
  const toast = el("#toast");
  toast.textContent = message;
  toast.hidden = false;
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => (toast.hidden = true), 4500);
}
function lakeEncounter() {
  const progress = save.data.stages.lake;
  return encounterFor(stages[0], progress.nextIndex, progress.cleared);
}
function pause() {
  model.pause();
  feedback.setPaused(true);
}
function synchronizePause() {
  if (overlay || landscape || document.hidden) pause();
  else {
    if (screen === "lake") model.resume();
    else model.pause();
    feedback.setPaused(false);
  }
}
function setScreen(next: Screen) {
  model.cancelInput();
  screen = next;
  overlay = null;
  root.dataset.screen = screen;
  feedback.setMode(
    screen === "lake" || (screen === "book" && bookOrigin === "lake")
      ? "lake"
      : "title",
  );
  render();
  renderOverlay();
  synchronizePause();
}
function openBook(from: Screen) {
  if (from === "lake" && model.state !== "READY") return;
  bookOrigin = from;
  if (from === "lake") {
    save.data.lastBookStage = "lake";
    save.write();
  }
  setScreen("book");
}
function showOverlay(next: Overlay) {
  if (next) previousFocus = document.activeElement as HTMLElement;
  overlay = next;
  if (next) pause();
  renderOverlay();
  synchronizePause();
  if (!next) {
    previousFocus?.focus({ preventScroll: true });
    previousFocus = null;
  }
}
function render() {
  ui.className = `screen ${screen}`;
  if (screen === "title") {
    ui.innerHTML = `<header class="title-logo">${logo()}</header><nav class="title-menu" aria-label="Main menu">${button("play", "Play", "play", true)}${button("settings", "Settings", "settings")}${button("fullscreen", document.fullscreenElement ? "Exit Full Screen" : "Full Screen", "fullscreen")}</nav>`;
  } else if (screen === "select") {
    ui.innerHTML = `<header class="select-header">${logo()}<h1>Select Stage</h1><span class="ink-rule"></span></header><div class="stage-cards">${stages
      .filter((s) => s.playable)
      .map(
        (s) =>
          `<button class="stage-card" data-action="enter-${s.id}" aria-label="Enter ${s.name}"><img src="${assets.lake}" alt="A sunlit alpine lake beneath pine forests and mountains"><span class="stage-name">${s.name}</span><span class="completion">${icon("fish")} ${save.data.stages[s.id].discovered.length} / ${s.roster.length}</span></button>`,
      )
      .join(
        "",
      )}</div><nav class="bottom-nav" aria-label="Stage navigation">${button("title", "Back", "back")}${button("book", "Book", "book")}</nav>`;
  } else if (screen === "lake") {
    ui.innerHTML = `<nav class="stage-tools"><button class="icon-button" data-action="book" aria-label="Book">${icon("book")}</button><button class="icon-button" data-action="settings" aria-label="Settings">${icon("settings")}</button></nav><div class="lake-intro" aria-hidden="true">Lake<span>A moment by the water</span></div><section class="fight-cluster" aria-label="Fishing controls"><div id="direction" class="direction" hidden></div><div id="meters" hidden><div class="meter-block tension"><div class="meter-label"><span>TENSION</span><span id="tension-number">0%</span></div><div class="meter-track" role="progressbar" aria-label="Tension" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><div id="tension-fill" class="meter-fill"></div></div></div><div class="meter-block catch"><div class="meter-label"><span>CATCH PROGRESS</span><span id="catch-number">0%</span></div><div class="meter-track" role="progressbar" aria-label="Catch Progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><div id="catch-fill" class="meter-fill"></div></div></div></div><p id="fishing-hint" class="fishing-hint" role="status"></p><button id="action" class="action-button" aria-label="Cast"><span class="action-icon">${icon("cast")}</span><span class="action-label">CAST</span></button><span id="hold-hint" class="hold-hint">Tap to cast</span></section><div id="reveal"></div>`;
    const action = el<HTMLButtonElement>("#action");
    action.addEventListener("pointerdown", (e) => {
      if (e.button !== 0 || !e.isPrimary) return;
      e.preventDefault();
      feedback.unlock();
      if (model.press(e.pointerId, e.clientX))
        action.setPointerCapture(e.pointerId);
      updateHUD();
    });
    action.addEventListener("pointermove", (e) =>
      model.move(e.pointerId, e.clientX),
    );
    const release = (e: PointerEvent) => {
      model.release(e.pointerId);
      updateHUD();
    };
    action.addEventListener("pointerup", release);
    action.addEventListener("pointercancel", release);
    action.addEventListener("lostpointercapture", release);
    action.addEventListener("contextmenu", (e) => e.preventDefault());
    action.addEventListener("keydown", (e) => {
      if ((e.code === "Space" || e.code === "Enter") && !e.repeat) {
        e.preventDefault();
        feedback.unlock();
        model.press(-1, 0);
        updateHUD();
      }
    });
    action.addEventListener("keyup", (e) => {
      if (e.code === "Space" || e.code === "Enter") {
        e.preventDefault();
        model.release(-1);
        updateHUD();
      }
    });
    lastState = "";
    updateHUD();
  } else renderBook();
}
function renderBook() {
  const selected =
    stages.find((s) => s.id === save.data.lastBookStage) ?? stages[0];
  const discovered = save.data.stages[selected.id].discovered;
  const cards = selected.roster.map((id, i) => {
    const creature = creatures.find((c) => c.id === id)!;
    const known = discovered.includes(id);
    const image = known && creature.artwork
      ? `<img src="${asset(creature.artwork)}" alt="${creature.name} illustration">`
      : silhouette(i);
    return `<article class="creature-card ${known ? "discovered" : ""}">${image}<h2>${known ? creature.name : "???"}</h2></article>`;
  }).join("");
  ui.innerHTML = `<header class="book-header"><div class="book-mark">${icon("fish")}</div><h1 class="brush-title">Book</h1></header><nav class="book-tabs" aria-label="Book Stage sections">${stages.map((s) => `<button data-action="tab-${s.id}" aria-pressed="${selected.id === s.id}" class="book-tab ${s.id === selected.id ? "selected" : ""}">${s.name}</button>`).join("")}</nav><div class="book-count">${selected.name}<span>${icon("fish")} ${discovered.length} / ${selected.roster.length || "—"}</span></div><div class="book-grid">${selected.roster.length ? cards : `<div class="book-empty">${icon("book")}<h2>Unwritten waters</h2><p>This Stage’s Creature collection will arrive in a later prototype.</p></div>`}</div><nav class="bottom-nav">${button("book-back", "Back", "back")}</nav>`;
}
function updateHUD() {
  if (screen !== "lake") return;
  const state = model.state,
    fight = state === "FIGHT";
  root.dataset.state = state;
  root.dataset.held = String(model.held);
  root.dataset.danger =
    model.tension >= tuning.criticalTension
      ? "critical"
      : model.tension >= tuning.warningTension
        ? "warning"
        : "normal";
  const book = el<HTMLButtonElement>('[data-action="book"]');
  book.disabled = state !== "READY";
  const action = el<HTMLButtonElement>("#action");
  const active =
    sceneReady && ["READY", "BITE", "FIGHT"].includes(state) && !model.paused;
  action.setAttribute("aria-disabled", String(!active));
  el("#meters").hidden = !fight;
  if (fight) {
    for (const [name, value] of [
      ["tension", model.tension],
      ["catch", model.progress],
    ] as const) {
      el(`#${name}-fill`).style.width = `${value}%`;
      textIfChanged(`#${name}-number`, `${Math.floor(value)}%`);
      el(`#${name}-fill`).parentElement!.setAttribute(
        "aria-valuenow",
        String(Math.floor(value)),
      );
    }
  }
  const direction = el("#direction");
  direction.hidden = !fight || model.behaviour.direction === 0;
  textIfChanged(
    "#direction",
    model.behaviour.direction === -1 ? "← HOLD LEFT" : "HOLD RIGHT →",
  );
  direction.classList.toggle(
    "acquired",
    model.direction === model.behaviour.direction,
  );
  const label = {
    READY: "CAST",
    CASTING: "CASTING",
    WAITING: "WAIT",
    BITE: "HOOK",
    FIGHT: "REEL",
    LANDING: "LANDING",
    LINE_SNAP: "SNAP",
    REVEAL: "CAUGHT",
    FAILURE: "CAST",
  }[state];
  textIfChanged(".action-label", label);
  action.setAttribute("aria-label", label);
  const hint = !sceneReady
    ? "Arriving at the lake…"
    : {
        READY: "",
        CASTING: "",
        WAITING: "Watch the bobber…",
        BITE: "Bite! Press and hold",
        FIGHT:
          model.tension >= 90
            ? "⚠ Line at risk — release!"
            : model.tension >= 70 && model.held
              ? "Tension rising — release to ease"
              : model.held
                ? "Reeling in"
                : "Giving line",
        LANDING: "Bringing it ashore…",
        LINE_SNAP: "Line snapped!",
        REVEAL: "",
        FAILURE:
          model.failure === "miss"
            ? "It got away. Cast again."
            : "The Creature got away.",
      }[state];
  // Live status text changes only on meaningful events, never once per render frame.
  textIfChanged("#fishing-hint", hint);
  textIfChanged(
    "#hold-hint",
    state === "READY"
      ? "Tap to cast"
      : state === "BITE"
        ? "Press and keep holding"
        : fight
          ? model.held
            ? "Release to give line"
            : "Hold to reel"
          : "",
  );
  if (lastState !== state) {
    el(".action-icon").innerHTML = icon(
      state === "BITE" ? "hook" : fight ? "reel" : "cast",
    );
    if (state === "REVEAL") renderReveal();
    else el("#reveal").innerHTML = "";
    lastState = state;
  }
}
function renderReveal() {
  const creature: Creature = model.creature;
  const image = creature.artwork
    ? `<img src="${asset(creature.artwork)}" alt="${creature.name} illustration">`
    : silhouette(0);
  el("#reveal").innerHTML =
    `<section class="reveal-panel" role="dialog" aria-modal="true" aria-labelledby="catch-name"><div class="reveal-heading"><div class="book-mark">${icon("fish")}</div><h2 class="brush-title">${firstCatch ? "New Book Entry" : "A fine catch"}</h2></div><div class="reveal-paper">${image}<h1 id="catch-name" class="brush-title">${creature.name}</h1><div class="reveal-ornament">— ${icon("fish")} —</div></div>${button("continue", "Continue", "play", true)}</section>`;
  el<HTMLButtonElement>('[data-action="continue"]').focus({
    preventScroll: true,
  });
}
function renderOverlay() {
  overlayRoot.hidden = overlay === null;
  if (!overlay) {
    overlayRoot.innerHTML = "";
    ui.inert = landscape;
    return;
  }
  ui.inert = true;
  if (overlay === "settings") {
    const prefs = save.data.preferences;
    overlayRoot.innerHTML = `<section class="modal" role="dialog" aria-modal="true" aria-labelledby="settings-title"><h1 id="settings-title">Settings</h1><span class="ink-rule"></span><label class="setting">Music <output id="music-value">${Math.round(prefs.music * 100)}%</output><input aria-label="Music volume" type="range" id="music" min="0" max="100" value="${prefs.music * 100}"></label><label class="setting">SFX <output id="sfx-value">${Math.round(prefs.sfx * 100)}%</output><input aria-label="SFX volume" type="range" id="sfx" min="0" max="100" value="${prefs.sfx * 100}"></label><label class="haptics-setting">Haptics<input type="checkbox" id="haptics" ${prefs.haptics ? "checked" : ""}><span class="toggle" aria-hidden="true"></span></label>${button("fullscreen", document.fullscreenElement ? "Exit Full Screen" : "Full Screen", "fullscreen")}${button("close-settings", screen === "lake" ? "Resume" : "Back", screen === "lake" ? "play" : "back", true)}${screen === "lake" ? button("leave-lake", "Stage Select") : ""}</section>`;
    for (const key of ["music", "sfx"] as const)
      el<HTMLInputElement>(`#${key}`).addEventListener("input", (e) => {
        save.data.preferences[key] =
          Number((e.target as HTMLInputElement).value) / 100;
        el(`#${key}-value`).textContent =
          `${Math.round(save.data.preferences[key] * 100)}%`;
        save.write();
      });
    el<HTMLInputElement>("#haptics").addEventListener("change", (e) => {
      save.data.preferences.haptics = (e.target as HTMLInputElement).checked;
      save.write();
    });
  } else
    overlayRoot.innerHTML = `<section class="modal resume-modal" role="dialog" aria-modal="true" aria-labelledby="pause-title">${icon("reel")}<h1 id="pause-title">A moment of calm</h1><p>Your fishing is paused.</p>${button("resume", "Resume", "play", true)}</section>`;
  overlayRoot
    .querySelector<HTMLButtonElement>("button")
    ?.focus({ preventScroll: true });
}
async function fullscreen() {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else if (document.documentElement.requestFullscreen)
      await document.documentElement.requestFullscreen();
    else
      notify(
        "Full screen is unavailable in this browser. You can still play here.",
      );
  } catch {
    notify("Full screen is unavailable right now. You can still play here.");
  }
}
document.addEventListener("fullscreenchange", () => {
  document
    .querySelectorAll<HTMLElement>('[data-action="fullscreen"] span')
    .forEach(
      (span) =>
        (span.textContent = document.fullscreenElement
          ? "Exit Full Screen"
          : "Full Screen"),
    );
});
document.addEventListener(
  "pointerdown",
  (e) => {
    if (e.pointerType === "touch" && !e.isPrimary) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    if (e.isPrimary) feedback.unlock();
  },
  { capture: true },
);
document.addEventListener("click", (e) => {
  if (e instanceof PointerEvent && e.pointerType === "touch" && !e.isPrimary)
    return;
  const target = (e.target as HTMLElement).closest<HTMLButtonElement>(
    "[data-action]",
  );
  if (!target || target.disabled || landscape) return;
  feedback.unlock();
  const action = target.dataset.action!;
  if (action === "play") setScreen("select");
  else if (action === "title") setScreen("title");
  else if (action === "enter-lake" && sceneReady) {
    model.reset(lakeEncounter());
    setScreen("lake");
  } else if (action === "enter-lake") notify("The Lake is still loading…");
  else if (action === "book") openBook(screen);
  else if (action === "book-back") setScreen(bookOrigin);
  else if (action.startsWith("tab-")) {
    save.data.lastBookStage = action.slice(4);
    save.write();
    renderBook();
  } else if (action === "settings") showOverlay("settings");
  else if (action === "resume" || action === "close-settings")
    showOverlay(null);
  else if (action === "leave-lake") {
    model.reset();
    setScreen("select");
  } else if (action === "fullscreen") void fullscreen();
  else if (action === "continue" && model.state === "REVEAL") {
    model.reset(lakeEncounter());
    updateHUD();
    el("#action").focus({ preventScroll: true });
  }
});
window.addEventListener("pointerup", (e) => model.release(e.pointerId));
window.addEventListener("pointercancel", (e) => model.release(e.pointerId));
function interruption() {
  model.cancelInput();
  feedback.setPaused(true);
  if (screen === "lake") {
    if (!overlay) overlay = "resume";
    pause();
    renderOverlay();
  }
}
window.addEventListener("blur", interruption);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) interruption();
  else synchronizePause();
});
window.addEventListener("focus", () => {
  if (screen !== "lake") synchronizePause();
});
function orientation() {
  const mobile =
    matchMedia("(pointer: coarse)").matches || navigator.maxTouchPoints > 0;
  const rotated = mobile && innerWidth > innerHeight;
  if (rotated && !landscape) {
    landscape = true;
    pause();
    if (screen === "lake" && !overlay) overlay = "resume";
  } else if (!rotated && landscape) {
    landscape = false;
    if (!overlay) overlay = "resume";
  }
  rotate.hidden = !landscape;
  rotate.innerHTML = `<div class="rotate-card"><span class="phone-outline">↻</span><h1>Rotate Device</h1><p>The water is best seen in portrait.</p><p>Your game is paused.</p></div>`;
  renderOverlay();
  overlayRoot.inert = landscape;
  ui.inert = landscape || !!overlay;
  synchronizePause();
}
window.addEventListener("resize", orientation);
document.addEventListener("keydown", (e) => {
  if (e.code === "Escape") {
    if (overlay) showOverlay(null);
    else if (screen === "lake") showOverlay("settings");
  }
  // Keep focus inside a modal; its controls remain keyboard-accessible.
  const dialog =
    overlayRoot.querySelector<HTMLElement>('[role="dialog"]') ??
    el("#reveal")?.querySelector<HTMLElement>('[role="dialog"]');
  if (e.code === "Tab" && dialog) {
    const controls = [...dialog.querySelectorAll<HTMLElement>("button,input")];
    const first = controls[0],
      last = controls.at(-1);
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last?.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first?.focus();
    }
  }
});
model.onEvent((event) => {
  feedback.event(event);
  if (event === "CATCH_REVEAL") {
    firstCatch = save.catch("lake", model.creature.id);
    if (!save.available)
      notify(
        "Caught! Browser storage is unavailable; your Book lasts for this visit.",
      );
  }
});
new Phaser.Game({
  type: Phaser.AUTO,
  parent: "world",
  width: 540,
  height: 960,
  transparent: true,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  render: { antialias: true, pixelArt: false },
  audio: { noAudio: true },
  scene: new LakeScene(
    model,
    () => screen === "lake",
    () => {
      sceneReady = true;
    },
  ),
});
let previousTime = performance.now();
function frame(now: number) {
  const dt = Math.min((now - previousTime) / 1000, 0.05);
  previousTime = now;
  if (screen === "lake" && sceneReady) {
    model.update(dt);
    updateHUD();
  }
  feedback.update(model, screen === "lake");
  requestAnimationFrame(frame);
}
setScreen("title");
orientation();
requestAnimationFrame(frame);
if (!save.available)
  notify("Browser storage is unavailable. Progress will last for this visit.");
