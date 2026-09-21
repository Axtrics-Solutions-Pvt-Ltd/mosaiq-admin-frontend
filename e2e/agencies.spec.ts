import { expect, signIn, test } from "./fixtures";

test.beforeEach(async ({ page }) => {
  await signIn(page);
});

test("agency directory filters live records and opens agency details", async ({
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
  await expect(page).toHaveURL(/search=Northstar/);
  await expect(page.getByText("Showing 1 of 1 agencies")).toBeVisible();
  await page.locator('a[href="/agencies/1"]:visible').first().click();
  await expect(page).toHaveURL("/agencies/1");
  await expect(
    page.getByRole("heading", { name: "Northstar Digital", level: 1 }),
  ).toBeVisible();
  await page.getByRole("tab", { name: "Defaults" }).click();
  await expect(
    page.getByRole("tabpanel", { name: "Defaults" }).getByText("Europe/London"),
  ).toBeVisible();
});

test("create agency validates and saves through the API", async ({ page }) => {
  await page.goto("/agencies/new");
  await page.getByRole("button", { name: "Create agency" }).click();
  await expect(page.getByText("Enter an agency display name.")).toBeVisible();
  await page.getByLabel("Display name").fill("Sample Agency");
  await page.getByRole("button", { name: "Create agency" }).click();
  await expect(page).toHaveURL("/agencies/3");
  await expect(
    page.getByRole("heading", { name: "Sample Agency", level: 1 }),
  ).toBeVisible();
});

test("edit agency persists the profile through PUT", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "chromium");
  await page.goto("/agencies/2/edit");
  await expect(
    page.getByRole("heading", { name: "Edit Kinetic Growth" }),
  ).toBeVisible();
  await page.getByLabel("Display name").fill("Kinetic Updated");
  await page.getByRole("button", { name: "Save agency" }).click();
  await expect(page).toHaveURL("/agencies/2");
  await expect(
    page.getByRole("heading", { name: "Kinetic Updated", level: 1 }),
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
