import { expect, signIn, test } from "./fixtures";

test.beforeEach(async ({ page }) => {
  await signIn(page);
});

test("channel directory opens every detail section without overflow", async ({
  page,
}) => {
  await page.goto("/workspaces?agency=1&client=20");
  await expect(
    page.getByRole("heading", { name: "Client Channels" }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("link", { name: "Northstar Reporting" })
      .filter({ visible: true })
      .first(),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Northstar Reporting" })
    .filter({ visible: true })
    .first()
    .click();
  await expect(page).toHaveURL(/workspaces\/10\?agency=1&client=20/);
  await expect(page.getByRole("tab", { name: "Data" })).toHaveCount(0);
  for (const name of [
    "Overview",
    "Connection",
    "Team and Access",
    "Activity",
  ]) {
    await page.getByRole("tab", { name }).click();
    await expect(page.getByRole("tabpanel", { name })).toBeVisible();
  }
  const hasOverflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth >
      document.documentElement.clientWidth,
  );
  expect(hasOverflow).toBe(false);
});

test("channel create form requires a platform and a name", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "chromium");
  await page.goto("/workspaces/new?agency=1&client=20");
  await expect(
    page.getByRole("heading", { name: "Create channel" }),
  ).toBeVisible();
  await expect(page.getByRole("option", { name: "Meta Ads" })).toBeAttached();
  await page.getByRole("button", { name: "Create channel" }).click();
  await expect(page.getByText("Choose a platform.")).toBeVisible();
  await expect(page.getByText("Enter a channel name.")).toBeVisible();
});

test("create and edit channel persists the API profile", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "chromium");
  await page.goto("/workspaces/new?agency=1&client=20");
  await page
    .getByLabel("Platform")
    .selectOption({ label: "Google Analytics 4" });
  await page.getByLabel("Channel name").fill("New Reporting Space");
  await page.getByRole("button", { name: "Create channel" }).click();
  await expect(page).toHaveURL(/workspaces\/\d+\?agency=1&client=20/);
  await expect(
    page.getByRole("heading", { name: "New Reporting Space", level: 1 }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Edit", exact: true }).click();
  await expect(
    page.getByText("A channel's platform can't be changed."),
  ).toBeVisible();
  await page.getByLabel("Channel name").fill("Updated Reporting Space");
  await page.getByRole("button", { name: "Save channel" }).click();
  await expect(
    page.getByRole("heading", { name: "Updated Reporting Space", level: 1 }),
  ).toBeVisible();
});
