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
    // The label, not the tab's drag handle or Move menu.
    .getByRole("button", { name: /^Channels/ })
    .click();
  const pacing = page.getByRole("region", {
    name: "Budget Utilization",
    exact: true,
  });
  await expect(pacing.getByText("No data for this period.")).toBeVisible();
  // Budgets are edited beside the widget, in the inspector.
  await pacing.getByRole("button", { name: "Add budgets" }).click();
  const budgets = page.getByRole("region", { name: "Monthly budgets" });
  await expect(budgets).toBeVisible();
  const month = budgets.locator("[aria-live=polite]");
  const target = new Date(2026, 8, 1);
  for (let step = 0; step < 36; step += 1) {
    const shown = new Date(`1 ${await month.textContent()}`);
    if (shown.getTime() === target.getTime()) break;
    await budgets
      .getByRole("button", {
        name: shown > target ? "Previous month" : "Next month",
      })
      .click();
  }
  await expect(month).toHaveText("September 2026");
  await budgets
    .getByRole("textbox", {
      name: `${workspaceName} budget for September 2026`,
    })
    .fill("3000");
  await expect(budgets.getByText("1 unsaved budget")).toBeVisible();
  await budgets.getByRole("button", { name: "Save budgets" }).click();
  await expect(budgets.getByText("No unsaved budgets")).toBeVisible();
  if (isMobile)
    await page.getByRole("button", { name: "Close drawer" }).click();

  // Pacing now has budgets to work against.
  await expect(pacing.getByText("Pacing")).toBeVisible();
  await expect(pacing.getByText("Spent")).toBeVisible();
  await expect(pacing.getByRole("button", { name: "Add budgets" })).toHaveCount(
    0,
  );

  // Enter Marketing Intelligence content with the generic list editor.
  await page
    .getByRole("navigation", { name: "Report sections" })
    .getByRole("button", { name: "Marketing Intelligence", exact: true })
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

  // Leaving the tab closes the open widget, so unsaved edits are asked about
  // first. The phone drawer covers the tabs, so this is checked on desktop.
  if (!isMobile) {
    const reportingDashboard = page
      .getByRole("navigation", { name: "Report sections" })
      .getByRole("button", { name: "Reporting Dashboard", exact: true });
    // The canvas previews the edit before it is saved.
    await inspector.getByLabel("Subtitle").fill("Draft subtitle");
    await expect(overview.getByText("Draft subtitle")).toBeVisible();
    await expect(overview.getByText("Editing · unsaved preview")).toBeVisible();
    await reportingDashboard.click();
    const unsaved = page.getByRole("dialog", { name: "Save your changes?" });
    await unsaved.getByRole("button", { name: "Keep editing" }).click();
    await expect(inspector.getByLabel("Subtitle")).toHaveValue(
      "Draft subtitle",
    );
    await inspector.getByRole("button", { name: "Discard" }).click();
    await expect(inspector.getByLabel("Subtitle")).toHaveValue("");
    await expect(inspector.getByText("No unsaved changes")).toBeVisible();
    await expect(overview.getByText("Draft subtitle")).toHaveCount(0);

    // Saving from the dialog keeps the edit and moves on.
    await inspector.getByLabel("Subtitle").fill("Saved subtitle");
    await reportingDashboard.click();
    await unsaved.getByRole("button", { name: "Save and continue" }).click();
    await expect(unsaved).toBeHidden();
    await expect(inspector).toBeHidden();
    await page
      .getByRole("navigation", { name: "Report sections" })
      .getByRole("button", { name: "Marketing Intelligence", exact: true })
      .click();
    await expect(overview.getByText("Saved subtitle")).toBeVisible();

    // A click on the card itself opens it too, at the field for the part
    // clicked.
    await overview.getByText("Saved subtitle").click();
    await expect(inspector.getByLabel("Subtitle")).toHaveValue(
      "Saved subtitle",
    );
    await expect(inspector.getByLabel("Subtitle")).toBeFocused();
    await expect(overview.getByText("Editing", { exact: true })).toBeVisible();
  }

  const hasOverflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth >
      document.documentElement.clientWidth,
  );
  expect(hasOverflow).toBe(false);
});
