import { expect, test, type Page } from "@playwright/test";

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

test("Perch then Trout, persistent Book, repeat catch and navigation", async ({
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
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await catchTrout(page, isMobile);
  await expect(
    page.getByRole("heading", { name: "New Book Entry" }),
  ).toHaveCount(0);
  await page.reload();
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect(page.locator(".completion")).toContainText("2 / 7");
  await page.getByRole("button", { name: "Book", exact: true }).click();
  await expect(page.locator(".creature-card.discovered")).toHaveCount(2);
  await expect(page.locator(".creature-card.discovered img")).toHaveCount(2);
  expect(errors).toEqual([]);
});

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
