import { expect, signIn, test } from "./fixtures";

test.beforeEach(async ({ page }) => {
  await signIn(page);
});

test("dashboard filters sample content and exposes review states", async ({
  page,
}) => {
  await page.goto("/dashboard");

  await expect(
    page.getByText("Completed imports").locator("..").getByText("142"),
  ).toBeVisible();

  await page.getByLabel("Date range").selectOption("90");
  await page.getByLabel("Data source", { exact: true }).selectOption("csv");
  await expect(
    page.getByText("Completed imports").locator("..").getByText("243"),
  ).toBeVisible();
  await expect(page.getByText("Workspace starter dataset")).toBeHidden();

  await page.locator("#dashboard-scope").selectOption("newbridge");
  await expect(
    page.getByRole("heading", {
      name: "Set up the first workspace for Newbridge Media",
    }),
  ).toBeVisible();

  await page.getByLabel("Preview state").selectOption("permission");
  await expect(
    page.getByRole("heading", { name: "Limited dashboard access" }),
  ).toBeVisible();
});

test("dashboard remains readable at narrow mobile width", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-320-chromium");
  await page.goto("/dashboard");
  await expect(page.getByText("Agency usage overview")).toBeVisible();

  const hasOverflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth >
      document.documentElement.clientWidth,
  );
  expect(hasOverflow).toBe(false);
});
