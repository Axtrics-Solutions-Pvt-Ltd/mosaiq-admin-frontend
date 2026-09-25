import { expect, signIn, test } from "./fixtures";

// Budgets and corrections belong to a client, so each project works on its
// own seeded client (see e2e/mock-auth-api.mjs).
const clientByProject: Record<string, number> = {
  chromium: 901,
  "mobile-390-chromium": 902,
  "mobile-320-chromium": 903,
};

test("budget pacing asks for budgets, and manual content is entered in the builder", async ({
  page,
}, testInfo) => {
  const clientId = clientByProject[testInfo.project.name] ?? 901;
  const clientNumber = clientId - 900;
  const workspaceName = `Report Client ${clientNumber} – Meta Ads`;
  const isMobile = testInfo.project.name.startsWith("mobile");
  await signIn(page);

  await page.goto(`/reports/new?agency=1&client=${clientId}`);
  await page.getByLabel("Report name").fill(`Pacing ${testInfo.project.name}`);
  await page.getByLabel("Currency").selectOption("GBP");
  await page.getByRole("checkbox", { name: workspaceName }).check();
  await page.getByRole("button", { name: "Create report" }).click();
  await expect(
    page.getByRole("heading", {
      name: `Pacing ${testInfo.project.name}`,
      level: 1,
    }),
  ).toBeVisible();

  // Without budgets, pacing is empty and offers a way to add them.
  await page
    .getByRole("navigation", { name: "Reporting Dashboard tabs" })
    .getByRole("button", { name: "Channels" })
    .click();
  const pacing = page.getByRole("region", {
    name: "Budget Utilization",
    exact: true,
  });
  await expect(pacing.getByText("No data for this period.")).toBeVisible();
  await pacing.getByRole("link", { name: "Add budgets" }).click();

  const budgets = page.getByRole("heading", { name: "Budgets" });
  await expect(budgets).toBeVisible();
  const year = page
    .locator("[aria-live=polite]")
    .filter({ hasText: /^\d{4}$/ });
  const shownYear = Number(await year.textContent());
  for (let step = shownYear; step > 2026; step -= 1)
    await page.getByRole("button", { name: "Previous year" }).click();
  for (let step = shownYear; step < 2026; step += 1)
    await page.getByRole("button", { name: "Next year" }).click();
  await expect(year).toHaveText("2026");
  await page
    .getByRole("textbox", { name: `${workspaceName} budget for August 2026` })
    .fill("3,100");
  await page
    .getByRole("textbox", {
      name: `${workspaceName} budget for September 2026`,
    })
    .fill("3000");
  await expect(page.getByText("2 unsaved changes")).toBeVisible();
  await page.getByRole("button", { name: "Save budgets" }).click();
  await expect(page.getByText("No unsaved changes")).toBeVisible();

  // Back in the builder, pacing now has budgets to work against.
  await page.goBack();
  await expect(pacing.getByText("Pacing")).toBeVisible();
  await expect(pacing.getByText("Spent")).toBeVisible();
  await expect(pacing.getByRole("link", { name: "Add budgets" })).toHaveCount(
    0,
  );

  // Enter Marketing Intelligence content with the generic list editor.
  await page
    .getByRole("navigation", { name: "Report sections" })
    .getByRole("button", { name: "Marketing Intelligence" })
    .click();
  await page.getByRole("button", { name: "Edit Audience Overview" }).click();
  const inspector = page.getByRole("region", {
    name: "Inspector: Audience Overview",
  });
  await inspector.getByLabel("Label").fill("Population");
  await inspector.getByLabel("Value").fill("1.8M");
  await inspector.getByRole("button", { name: "Add row" }).click();
  await inspector.getByLabel("Label").nth(1).fill("Median age");
  await inspector.getByLabel("Value").nth(1).fill("34");
  await inspector.getByRole("button", { name: "Move row 2 up" }).click();
  await inspector.getByRole("button", { name: "Save" }).click();
  await expect(inspector.getByText("No unsaved changes")).toBeVisible();
  if (isMobile)
    await page.getByRole("button", { name: "Close drawer" }).click();
  const overview = page.getByRole("region", {
    name: "Audience Overview",
    exact: true,
  });
  await expect(overview.getByText("1.8M")).toBeVisible();
  await expect(overview.getByRole("term").first()).toHaveText("Median age");

  const hasOverflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth >
      document.documentElement.clientWidth,
  );
  expect(hasOverflow).toBe(false);
});
