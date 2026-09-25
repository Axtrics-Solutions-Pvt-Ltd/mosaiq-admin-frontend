import { expect, signIn, test } from "./fixtures";

// Data corrections change every report of a client, so each project works on
// its own seeded client (see e2e/mock-auth-api.mjs).
const clientByProject: Record<string, number> = {
  chromium: 901,
  "mobile-390-chromium": 902,
  "mobile-320-chromium": 903,
};

test("a report is created, shaped, written and corrected in the builder", async ({
  page,
}, testInfo) => {
  const clientId = clientByProject[testInfo.project.name] ?? 901;
  const clientNumber = clientId - 900;
  const reportName = `Q3 performance ${testInfo.project.name}`;
  const isMobile = testInfo.project.name.startsWith("mobile");
  await signIn(page);

  await page.goto(`/reports/new?agency=1&client=${clientId}`);
  await page.getByLabel("Report name").fill(reportName);
  // The seeded workspace reports in GBP; the agency default is USD.
  await page.getByLabel("Currency").selectOption("GBP");
  await page
    .getByRole("checkbox", { name: `Report Client ${clientNumber} – Meta Ads` })
    .check();
  await page.getByRole("button", { name: "Create report" }).click();
  await expect(
    page.getByRole("heading", { name: reportName, level: 1 }),
  ).toBeVisible();

  // Hide the Detailed Metrics tab from the portal.
  if (isMobile) await page.getByRole("button", { name: "Structure" }).click();
  const detailed = page
    .getByRole("navigation", { name: "Report structure" })
    .getByRole("checkbox", { name: "Show Detailed Metrics in the portal" });
  // The optimistic update lands once any layout refetch is cancelled, so
  // wait for the state instead of expecting it right after the click.
  await detailed.click();
  await expect(detailed).not.toBeChecked();
  if (isMobile)
    await page.getByRole("button", { name: "Close drawer" }).click();

  // Write the AI summary.
  await page.getByRole("button", { name: "Edit AI Summary" }).click();
  const inspector = page.getByRole("region", { name: "Inspector: AI Summary" });
  await inspector.getByLabel("Headline").fill("Meta is leading on efficiency");
  await inspector
    .getByLabel("Text", { exact: true })
    .fill("Blended ROAS held above target.");
  await inspector.getByRole("button", { name: "Save" }).click();
  await expect(inspector.getByText("No unsaved changes")).toBeVisible();
  if (isMobile)
    await page.getByRole("button", { name: "Close drawer" }).click();
  const summary = page.getByRole("region", { name: "AI Summary", exact: true });
  await expect(
    summary.getByText("Meta is leading on efficiency"),
  ).toBeVisible();

  // Correct Meta spend and see Blended ROAS recalculate.
  const blendedRoas = page.getByRole("region", {
    name: "Blended ROAS",
    exact: true,
  });
  await expect(blendedRoas.getByText("3.2x", { exact: true })).toBeVisible();
  await page
    .getByRole("region", { name: "ROAS by Channel", exact: true })
    .getByRole("button", { name: "Correct Spend" })
    .click();
  const dialog = page.getByRole("dialog", {
    name: `Correct Spend — Meta Ads (Report Client ${clientNumber} – Meta Ads)`,
  });
  await dialog.getByLabel("New total").fill("1600");
  await dialog.getByRole("button", { name: "Save correction" }).click();
  // The dialog closes once the previews have refetched the corrected data.
  await expect(dialog).toBeHidden({ timeout: 15_000 });
  await expect(blendedRoas.getByText("2x", { exact: true })).toBeVisible();
  await blendedRoas
    .getByRole("button", { name: /ROAS was edited by 1 data correction/ })
    .click();
  const applied = page.getByRole("dialog", { name: "ROAS corrections" });
  await expect(applied.getByText("£1,600.00")).toBeVisible();
  await applied.getByRole("button", { name: "Close", exact: true }).click();
  await expect(applied).toBeHidden();

  // The portal preview leaves the hidden tab out.
  await page.getByRole("button", { name: "Preview as portal" }).click();
  const tabs = page.getByRole("navigation", {
    name: "Reporting Dashboard tabs",
  });
  await expect(
    tabs.getByRole("button", { name: "Executive Summary" }),
  ).toBeVisible();
  await expect(
    tabs.getByRole("button", { name: "Detailed Metrics" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Edit AI Summary" }),
  ).toHaveCount(0);

  const hasOverflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth >
      document.documentElement.clientWidth,
  );
  expect(hasOverflow).toBe(false);
});

test("the reports list shows a client's reports with their channels", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "chromium");
  await signIn(page);
  await page.goto("/reports/new?agency=1&client=901");
  await page.getByLabel("Report name").fill("Listed report");
  await page.getByLabel("Currency").selectOption("GBP");
  await page
    .getByRole("checkbox", { name: "Report Client 1 – Meta Ads" })
    .check();
  await page.getByRole("button", { name: "Create report" }).click();
  await expect(
    page.getByRole("heading", { name: "Listed report", level: 1 }),
  ).toBeVisible();

  await page
    .getByRole("navigation", { name: "Primary" })
    .getByRole("link", { name: "Reports" })
    .click();
  await page
    .getByLabel("Client", { exact: true })
    .selectOption({ label: "Report Client 1" });
  const table = page.getByRole("table", { name: "Reports" });
  const row = table.getByRole("row").filter({ hasText: "Listed report" });
  await expect(row.getByText("Meta Ads")).toBeVisible();
  await expect(row.getByText("Active")).toBeVisible();
});

test("a source in another currency is rejected inline", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "chromium");
  await signIn(page);
  await page.goto("/reports/new?agency=1&client=901");
  await page.getByLabel("Report name").fill("Wrong currency");
  await page
    .getByRole("checkbox", { name: "Report Client 1 – Meta Ads" })
    .check();
  await expect(
    page.getByText("GBP — differs from the report currency"),
  ).toBeVisible();
  await page.getByRole("button", { name: "Create report" }).click();
  await expect(
    page.getByText(
      /Every source workspace must use the report currency \(USD\)/,
    ),
  ).toBeVisible();
  await expect(page.getByLabel("Report name")).toHaveValue("Wrong currency");
});
