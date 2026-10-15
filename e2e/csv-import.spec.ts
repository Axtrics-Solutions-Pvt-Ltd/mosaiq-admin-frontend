import { expect, signIn, test } from "./fixtures";

const clientByProject: Record<string, number> = {
  chromium: 901,
  "mobile-390-chromium": 902,
  "mobile-320-chromium": 903,
};

test("Marketing Intelligence cards are filled from the template zip", async ({
  page,
}, testInfo) => {
  const clientId = clientByProject[testInfo.project.name] ?? 901;
  const reportName = `CSV import ${testInfo.project.name}`;
  await signIn(page);

  await page.goto(`/reports/new?agency=1&client=${clientId}`);
  await page.getByLabel("Report name").fill(reportName);
  // The seeded channels report in GBP.
  await page.getByLabel("Currency").selectOption("GBP");
  await page
    .getByRole("checkbox", {
      name: `Report Client ${clientId - 900} – Meta Ads`,
    })
    .check();
  await page.getByRole("button", { name: "Create report" }).click();
  await expect(
    page.getByRole("heading", { name: reportName, level: 1 }),
  ).toBeVisible();

  const sections = page.getByRole("navigation", { name: "Report sections" });
  await sections
    .getByRole("button", { name: "Marketing Intelligence", exact: true })
    .click();
  // Reporting's data is live, so it has no import.
  await expect(
    sections.getByRole("button", {
      name: "Import CSV into Reporting Dashboard",
    }),
  ).toHaveCount(0);
  await sections
    .getByRole("button", { name: "Import CSV into Marketing Intelligence" })
    .click();

  const dialog = page.getByRole("dialog", { name: "Import CSV" });
  await expect(dialog.getByText("Marketing Intelligence")).toBeVisible();
  await dialog.getByLabel("Choose CSV or zip files").setInputFiles({
    name: "MOSAIQ-Marketing-Intelligence-Templates.zip",
    mimeType: "application/zip",
    buffer: Buffer.from("PK"),
  });
  await dialog.getByRole("button", { name: "Check files" }).click();
  await expect(
    dialog.getByText("1 ready · 0 with errors · 0 skipped"),
  ).toBeVisible();
  // The README in the zip is not listed.
  await expect(dialog.getByText("README.txt")).toHaveCount(0);

  await dialog.getByRole("button", { name: "Apply 1 card" }).click();
  await expect(page.getByText("1 card updated")).toBeVisible();
  await expect(dialog).toBeHidden();
  await expect(
    page
      .getByRole("region", { name: "Audience Overview", exact: true })
      .getByText("2.1M"),
  ).toBeVisible();
});
