import { expect, signIn, test } from "./fixtures";

test.beforeEach(async ({ page }) => {
  await signIn(page);
});

test("agency directory filters records and opens agency details", async ({
  page,
}) => {
  await page.goto("/agencies");

  await expect(page.getByRole("heading", { name: "Agencies" })).toBeVisible();
  await expect(
    page
      .getByRole("link", { name: /Northstar Digital/ })
      .filter({ visible: true })
      .first(),
  ).toBeVisible();

  await page.getByLabel("Search agencies").fill("Northstar");
  await expect(page.getByText("Showing 1 of 12 sample agencies")).toBeVisible();

  await page.locator('a[href="/agencies/agency_northstar"]:visible').click();
  await expect(page).toHaveURL("/agencies/agency_northstar");
  await expect(
    page.getByRole("heading", { name: "Northstar Digital", level: 1 }),
  ).toBeVisible();
  await page.getByRole("tab", { name: "Defaults" }).click();
  await expect(page.getByText("Europe/London (UTC+00:00)")).toBeVisible();
});

test("create agency preview validates required fields without claiming persistence", async ({
  page,
}) => {
  await page.goto("/agencies/new");

  await page.getByRole("button", { name: "Preview create" }).click();
  await expect(page.getByText("Review the highlighted fields")).toBeVisible();

  await page.getByLabel("Display name").fill("Sample Agency");
  await page.getByLabel("Legal name").fill("Sample Agency Ltd");
  await page.getByRole("tab", { name: "Primary contact" }).click();
  await page.getByLabel("Full name").fill("Jamie Rivera");
  await page.getByLabel("Email").fill("jamie@example.test");
  await page.getByRole("button", { name: "Preview create" }).click();

  await expect(page.getByText("Save state preview")).toBeVisible();
  await expect(
    page.getByText(/No agency was created or updated/),
  ).toBeVisible();
});

test("agency directory uses record cards without page overflow on mobile", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-320-chromium");
  await page.goto("/agencies");

  await expect(page.getByLabel("Agency directory")).toBeVisible();
  const hasOverflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth >
      document.documentElement.clientWidth,
  );
  expect(hasOverflow).toBe(false);
});
