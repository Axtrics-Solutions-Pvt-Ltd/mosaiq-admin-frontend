import { expect, signIn, test } from "./fixtures";

test.beforeEach(async ({ page }) => {
  await signIn(page);
});

test("root redirects to public login", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
  await expect(
    page.getByRole("heading", { name: "Welcome back" }),
  ).toBeVisible();
});

test("authenticated shell and destination routes render", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await expect(page.getByText("Super Admin", { exact: true })).toBeVisible();
  await page.goto("/agencies");
  await expect(page).toHaveURL(/\/agencies$/);
  await expect(page.getByRole("heading", { name: "Agencies" })).toBeVisible();
});

test("component dialog supports keyboard dismissal", async ({ page }) => {
  await page.goto("/design-system");
  await page.getByRole("button", { name: "Open dialog" }).click();
  await expect(
    page.getByRole("dialog", { name: "Create agency preview" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("dialog", { name: "Create agency preview" }),
  ).not.toBeVisible();
});

test("mobile navigation opens and closes after navigation", async ({
  page,
}, testInfo) => {
  test.skip(!testInfo.project.name.startsWith("mobile"));
  await page.goto("/dashboard");
  await page.getByRole("button", { name: "Open navigation" }).click();
  const drawer = page.getByRole("dialog", { name: "MOSAIQ Admin" });
  await expect(drawer).toBeVisible();
  await drawer.getByRole("link", { name: "Users" }).click();
  await expect(page).toHaveURL(/\/users$/);
  await expect(drawer).not.toBeVisible();
});

test("dashboard has no horizontal page overflow", async ({ page }) => {
  await page.goto("/dashboard");
  const hasOverflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth >
      document.documentElement.clientWidth,
  );
  expect(hasOverflow).toBe(false);
});

test("shell adapts at required tablet and desktop widths", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "chromium");
  for (const width of [1440, 1024, 768]) {
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/dashboard");
    await expect(
      page.getByRole("heading", { name: "Dashboard" }),
    ).toBeVisible();
    const hasOverflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth,
    );
    expect(hasOverflow).toBe(false);
    const menuButton = page.getByRole("button", { name: "Open navigation" });
    if (width < 1024) {
      await expect(menuButton).toBeVisible();
    } else {
      await expect(menuButton).toBeHidden();
    }
  }
});
