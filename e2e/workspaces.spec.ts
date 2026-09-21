import { expect, signIn, test } from "./fixtures";

test.beforeEach(async ({ page }) => {
  await signIn(page);
});

test("workspace directory opens all six detail sections without overflow", async ({
  page,
}) => {
  await page.goto("/workspaces?agency=1&client=20");
  await expect(
    page.getByRole("heading", { name: "Client Workspaces" }),
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
  for (const name of [
    "Overview",
    "Market Profile",
    "Modules",
    "Team and Access",
    "Data",
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

test("workspace create form validates required name", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "chromium");
  await page.goto("/workspaces/new?agency=1&client=20");
  await expect(
    page.getByRole("heading", { name: "Create workspace" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Create workspace" }).click();
  await expect(page.getByText("Enter a workspace name.")).toBeVisible();
});

test("create and edit workspace persists the API profile", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "chromium");
  await page.goto("/workspaces/new?agency=1&client=20");
  await page.getByLabel("Workspace name").fill("New Reporting Space");
  await page.getByRole("button", { name: "Create workspace" }).click();
  await expect(page).toHaveURL(/workspaces\/11\?agency=1&client=20/);
  await expect(
    page.getByRole("heading", { name: "New Reporting Space", level: 1 }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Edit" }).click();
  await page.getByLabel("Workspace name").fill("Updated Reporting Space");
  await page.getByRole("button", { name: "Save workspace" }).click();
  await expect(
    page.getByRole("heading", { name: "Updated Reporting Space", level: 1 }),
  ).toBeVisible();
});
