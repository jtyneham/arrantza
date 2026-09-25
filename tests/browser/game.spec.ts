import { expect, test, type Page } from "@playwright/test";
const creatures = [
  { id: "european-perch", name: "European Perch" },
  { id: "rainbow-trout", name: "Rainbow Trout" },
  { id: "common-carp", name: "Common Carp" },
  { id: "northern-pike", name: "Northern Pike" },
  { id: "largemouth-bass", name: "Largemouth Bass" },
  { id: "european-eel", name: "European Eel" },
];

async function boot(page: Page) {
  await page.goto("./");
  await page.clock.install();
  await expect(
    page.getByRole("button", { name: "Play", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: "Enter Lake" }).click();
  await expect(page.locator("#game")).toHaveAttribute("data-state", "READY");
}
async function advance(page: Page, ms: number) {
  await page.clock.runFor(ms);
}
async function input(page: Page, touch: boolean) {
  const box = (await page.locator("#action").boundingBox())!;
  const x = box.x + box.width / 2,
    y = box.y + box.height / 2;
  const cdp = touch ? await page.context().newCDPSession(page) : null;
  return {
    down: async () => {
      if (cdp)
        await cdp.send("Input.dispatchTouchEvent", {
          type: "touchStart",
          touchPoints: [{ x, y, id: 1 }],
        });
      else {
        await page.mouse.move(x, y);
        await page.mouse.down();
      }
    },
    up: async () => {
      if (cdp)
        await cdp.send("Input.dispatchTouchEvent", {
          type: "touchEnd",
          touchPoints: [],
        });
      else await page.mouse.up();
    },
    outside: async () => {
      if (cdp)
        await cdp.send("Input.dispatchTouchEvent", {
          type: "touchMove",
          touchPoints: [{ x: x + 130, y: y - 120, id: 1 }],
        });
      else await page.mouse.move(x + 130, y - 120);
    },
    slide: async (direction: number) => {
      if (cdp) await cdp.send("Input.dispatchTouchEvent", {
        type: "touchMove", touchPoints: [{ x: x + direction * 32, y, id: 1 }],
      });
      else await page.mouse.move(x + direction * 32, y);
    },
    second: async () => {
      if (cdp) {
        await cdp.send("Input.dispatchTouchEvent", {
          type: "touchStart",
          touchPoints: [
            { x, y, id: 1 },
            { x: x + 20, y, id: 2 },
          ],
        });
        await cdp.send("Input.dispatchTouchEvent", {
          type: "touchEnd",
          touchPoints: [{ x: x + 20, y, id: 2 }],
        });
      }
    },
  };
}
async function waitBite(page: Page) {
  for (let i = 0; i < 62; i++) {
    if ((await page.locator("#game").getAttribute("data-state")) === "BITE")
      return;
    await advance(page, 100);
  }
  throw new Error("No Bite arrived in the documented waiting range");
}
async function catchPerch(page: Page, touch: boolean) {
  const control = await input(page, touch);
  await control.down();
  await control.up();
  await waitBite(page);
  await control.down();
  await expect(page.locator("#game")).toHaveAttribute("data-held", "true");
  await advance(page, 4900);
  await control.up();
  await advance(page, 1400);
  await control.down();
  await advance(page, 3400);
  await control.up();
  await advance(page, 2000);
  await expect(
    page.getByRole("heading", { name: "European Perch", exact: true }),
  ).toBeVisible();
}

async function catchTrout(page: Page, touch: boolean) {
  const control = await input(page, touch);
  await control.down();
  await control.up();
  await waitBite(page);
  await control.down();
  await expect(page.locator("#game")).toHaveAttribute("data-held", "true");
  await advance(page, 4000);
  await expect(page.locator("#direction")).toBeHidden();
  await control.up();
  await advance(page, 1000);
  await control.down();
  await advance(page, 3000);
  await control.up();
  await advance(page, 1200);
  await control.down();
  await advance(page, 2300);
  await control.up();
  await advance(page, 2000);
  await expect(
    page.getByRole("heading", { name: "Rainbow Trout", exact: true }),
  ).toBeVisible();
}

test("Perch then Trout, persistent Book and navigation", async ({
  page,
  isMobile,
}, info) => {
  test.setTimeout(120000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("response", (response) => {
    if (
      response.url().endsWith(".png") &&
      !response.headers()["content-type"]?.startsWith("image/")
    )
      errors.push(`Bad image response: ${response.url()}`);
    if (response.status() >= 400)
      errors.push(`HTTP ${response.status()}: ${response.url()}`);
  });
  await boot(page);
  await catchPerch(page, isMobile);
  await expect(
    page.getByRole("heading", { name: "New Book Entry" }),
  ).toBeVisible();
  await page.screenshot({
    path: `test-results/${info.project.name}-catch.png`,
  });
  await advance(page, 8000);
  await expect(page.getByRole("button", { name: "Continue" })).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Book", exact: true }).click();
  await expect(page.locator(".creature-card")).toHaveCount(7);
  await expect(page.locator(".creature-card.discovered")).toHaveCount(1);
  await page.screenshot({ path: `test-results/${info.project.name}-book.png` });
  await page.getByRole("button", { name: "Swamp", exact: true }).click();
  await expect(page.getByText("Unwritten waters")).toBeVisible();
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await page.getByRole("button", { name: "Book", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Lake", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await catchTrout(page, isMobile);
  await expect(
    page.getByRole("heading", { name: "New Book Entry" }),
  ).toBeVisible();
  await page.screenshot({
    path: `test-results/${info.project.name}-trout-catch.png`,
  });
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Book", exact: true }).click();
  await expect(page.locator(".creature-card.discovered")).toHaveCount(2);
  await expect(page.locator(".creature-card.discovered img")).toHaveCount(2);
  await page.screenshot({
    path: `test-results/${info.project.name}-book-two.png`,
  });
  await page.reload();
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect(page.locator(".completion")).toContainText("2 / 7");
  await page.getByRole("button", { name: "Book", exact: true }).click();
  await expect(page.locator(".creature-card.discovered")).toHaveCount(2);
  await expect(page.locator(".creature-card.discovered img")).toHaveCount(2);
  expect(errors).toEqual([]);
});

async function catchFightingCreature(page: Page, touch: boolean, screenshotPrefix: string, pauseDuringRun = false) {
  const control = await input(page, touch);
  await control.down();
  await control.up();
  await waitBite(page);
  await control.down();
  let held = true;
  let paused = false;
  const seen = new Set<string>();
  const arrows = new Set<string>();
  for (let elapsed = 0; elapsed < 180000; elapsed += 150) {
    const view = await page.evaluate(() => {
      const root = document.querySelector<HTMLElement>("#game")!;
      const cue = document.querySelector<HTMLElement>("#direction")!;
      return { state: root.dataset.state, phase: root.dataset.combat,
        kind: cue.hidden ? "none" : cue.dataset.kind,
        direction: Number(cue.dataset.direction),
        tension: Number(document.querySelector(".tension [role=progressbar]")!.getAttribute("aria-valuenow")) };
    });
    if (view.state !== "FIGHT") {
      expect(view.state).toBe("LANDING");
      break;
    }
    if (view.direction) arrows.add(String(view.direction));
    const key = view.phase === "lull" ? "lull" : `${view.kind}-${view.phase}`;
    if (!seen.has(key) && (view.kind !== "none" || view.phase === "lull")) {
      seen.add(key);
      await page.screenshot({ path: `test-results/${screenshotPrefix}-${key}.png` });
    }
    if (pauseDuringRun && !paused && view.direction) {
      paused = true;
      await page.evaluate(() => window.dispatchEvent(new Event("blur")));
      await control.up();
      held = false;
      await advance(page, 2000);
      await expect(page.locator("#direction")).toHaveAttribute("data-direction", String(view.direction));
      await expect(page.locator("#game")).toHaveAttribute("data-combat", view.phase!);
      await page.getByRole("button", { name: "Resume", exact: true }).click();
      await expect(page.locator("#game")).toHaveAttribute("data-held", "false");
    }
    const surge = view.kind === "surge" && view.phase === "resisting";
    if (held && (view.tension >= 80 || (surge && view.tension >= 35))) {
      await control.up(); held = false;
    } else if (!held && (view.tension <= 5 || (!surge && view.tension <= 60))) {
      await control.down(); held = true;
    }
    if (held) await control.slide(view.direction);
    await advance(page, 150);
  }
  await control.up();
  await advance(page, 2600);
  await expect(page.locator("#game")).toHaveAttribute("data-state", "REVEAL");
  return { seen, arrows };
}

for (const [offset, creature] of creatures.slice(2, 6).entries()) {
  const index = offset + 2;
  test(`${creature.name}: real combat, reveal, save and next encounter`, async ({ page, isMobile }, info) => {
    test.setTimeout(240000);
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("response", response => { if (response.status() >= 400) errors.push(response.url()); });
    await page.addInitScript(ids => {
      if (!localStorage.getItem("arrantza.save.v1"))
        localStorage.setItem("arrantza.save.v1", JSON.stringify({ version: 1,
          stages: { lake: { discovered: ids } }, lastBookStage: "lake" }));
    }, creatures.slice(0, index).map(c => c.id));
    await boot(page);
    const prefix = `${info.project.name}-${creature.id}`;
    const result = await catchFightingCreature(page, isMobile, prefix, index === 2);
    await expect(page.getByRole("heading", { name: creature.name, exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "New Book Entry" })).toBeVisible();
    await expect.poll(() => page.locator(".reveal-paper img").evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
    await page.screenshot({ path: `test-results/${prefix}-reveal.png` });
    if (index === 2) expect(result.seen.has("run-resisting")).toBe(true);
    if (index === 3) expect(result.seen.has("surge-resisting")).toBe(true);
    if (index === 4) expect(result.arrows.size).toBe(2);
    if (index === 5) expect(result.seen.has("lull")).toBe(true);
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    if (index === 5) {
      await catchFightingCreature(page, isMobile, `${prefix}-repeat`);
      await expect(page.getByRole("heading", { name: creature.name, exact: true })).toBeVisible();
      await expect(page.getByRole("heading", { name: "New Book Entry" })).toHaveCount(0);
      await page.getByRole("button", { name: "Continue", exact: true }).click();
    }
    await page.reload();
    await page.getByRole("button", { name: "Play", exact: true }).click();
    await expect(page.locator(".completion")).toContainText(`${index + 1} / 7`);
    await page.getByRole("button", { name: "Book", exact: true }).click();
    await expect(page.locator(".creature-card.discovered")).toHaveCount(index + 1);
    await expect(page.getByRole("heading", { name: creature.name, exact: true })).toBeVisible();
    await page.screenshot({ path: `test-results/${prefix}-book.png` });
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("arrantza.save.v1")!));
    expect(saved.stages.lake.nextIndex).toBe(index + 1);
    expect(saved.stages.lake.cleared).toBe(false);
    expect(errors).toEqual([]);
  });
}

test("pre-hold misses; continuous hold snaps; outside release is immediate", async ({
  page,
  isMobile,
}, info) => {
  await boot(page);
  let control = await input(page, isMobile);
  await control.down();
  await advance(page, 7300);
  await control.up();
  await expect(page.locator("#game")).toHaveAttribute("data-state", "READY");
  await control.down();
  await control.up();
  await waitBite(page);
  await control.down();
  await expect(
    page.getByRole("button", { name: "Book", exact: true }),
  ).toBeDisabled();
  await control.second();
  await expect(page.locator("#game")).toHaveAttribute("data-held", "true");
  await advance(page, 5800);
  await page.screenshot({
    path: `test-results/${info.project.name}-fight.png`,
  });
  await advance(page, 1300);
  await expect(page.locator("#game")).toHaveAttribute(
    "data-state",
    "LINE_SNAP",
  );
  await control.up();
  await advance(page, 2100);
  await expect(page.locator("#game")).toHaveAttribute("data-state", "READY");
  control = await input(page, isMobile);
  await control.down();
  await control.up();
  await waitBite(page);
  await control.down();
  await advance(page, 2000);
  await control.outside();
  await expect(page.locator("#game")).toHaveAttribute("data-held", "true");
  const tension = Number(
    await page
      .getByRole("progressbar", { name: "Tension", exact: true })
      .getAttribute("aria-valuenow"),
  );
  await control.up();
  await advance(page, 20);
  const progress = await page
    .locator("#catch-fill")
    .evaluate((e) => parseFloat((e as HTMLElement).style.width));
  await advance(page, 100);
  expect(
    Number(
      await page
        .getByRole("progressbar", { name: "Tension", exact: true })
        .getAttribute("aria-valuenow"),
    ),
  ).toBeLessThan(tension);
  expect(
    await page
      .locator("#catch-fill")
      .evaluate((e) => parseFloat((e as HTMLElement).style.width)),
  ).toBeLessThan(progress);
});

test("settings pause timers; interruption requires Resume; settings persist", async ({
  page,
  isMobile,
}) => {
  await boot(page);
  const control = await input(page, isMobile);
  await control.down();
  await control.up();
  await advance(page, 1000);
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await advance(page, 12000);
  await expect(page.locator("#game")).toHaveAttribute("data-state", "WAITING");
  await page.getByRole("slider", { name: "Music volume" }).fill("0");
  await page.getByRole("slider", { name: "SFX volume" }).fill("40");
  await page.getByLabel("Haptics", { exact: true }).uncheck();
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await waitBite(page);
  await control.down();
  await advance(page, 1000);
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await control.up();
  const tension = await page
    .getByRole("progressbar", { name: "Tension", exact: true })
    .getAttribute("aria-valuenow");
  await advance(page, 10000);
  await expect(page.getByText("Your fishing is paused.")).toBeVisible();
  await expect(
    page.getByRole("progressbar", { name: "Tension", exact: true }),
  ).toHaveAttribute("aria-valuenow", tension!);
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await advance(page, 100);
  await expect(page.locator("#game")).toHaveAttribute("data-held", "false");
  await page.reload();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(page.getByRole("slider", { name: "Music volume" })).toHaveValue(
    "0",
  );
  await expect(page.getByRole("slider", { name: "SFX volume" })).toHaveValue(
    "40",
  );
  await expect(page.getByLabel("Haptics", { exact: true })).not.toBeChecked();
});

test("portrait frame, orientation pause and fullscreen fallback", async ({
  page,
  isMobile,
}, info) => {
  await page.goto("./");
  await page.screenshot({
    path: `test-results/${info.project.name}-title.png`,
  });
  const frame = (await page.locator("#game").boundingBox())!;
  expect(frame.width / frame.height).toBeCloseTo(9 / 16, 2);
  await page.getByRole("button", { name: "Full Screen", exact: true }).click();
  expect(
    (await page.evaluate(() => !!document.fullscreenElement)) ||
      (await page.locator("#toast").isVisible()),
  ).toBe(true);
  if (await page.evaluate(() => !!document.fullscreenElement))
    await page.evaluate(() => document.exitFullscreen());
  await boot(page);
  if (isMobile) {
    const control = await input(page, true);
    await control.down();
    await control.up();
    await advance(page, 1100);
    await page.setViewportSize({ width: 850, height: 393 });
    await expect(
      page.getByRole("heading", { name: "Rotate Device" }),
    ).toBeVisible();
    await advance(page, 9000);
    await expect(page.locator("#game")).toHaveAttribute(
      "data-state",
      "WAITING",
    );
    await page.setViewportSize({ width: 393, height: 850 });
    await expect(
      page.getByRole("button", { name: "Resume", exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Resume", exact: true }).click();
  }
});

test("small portrait layout keeps controls and Book reachable", async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await boot(page);
  const action = (await page.locator("#action").boundingBox())!;
  expect(action.width).toBeCloseTo(action.height, 1);
  expect(action.y + action.height).toBeLessThan(568 - 16);
  await page.getByRole("button", { name: "Book", exact: true }).click();
  await expect(page.locator(".creature-card")).toHaveCount(7);
  await page.screenshot({
    path: `test-results/${info.project.name}-small-book.png`,
  });
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  const modal = (await page.locator(".modal").boundingBox())!;
  expect(modal.y).toBeGreaterThanOrEqual(0);
  expect(modal.y + modal.height).toBeLessThanOrEqual(568);
  await page.getByRole("button", { name: "Stage Select", exact: true }).click();
  await page.screenshot({
    path: `test-results/${info.project.name}-select.png`,
  });
});
