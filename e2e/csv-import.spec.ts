import { expect, signIn, test } from "./fixtures";

const clientByProject: Record<string, number> = {
  chromium: 901,
  "mobile-390-chromium": 902,
  "mobile-320-chromium": 903,
};

test("Marketing Intelligence cards are filled from one combined CSV", async ({
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

  // The template is one CSV or a zip of card CSVs, blank unless the example
  // rows are asked for.
  const template = dialog.getByRole("link", { name: "Download as one file" });
  const zipTemplate = dialog.getByRole("link", { name: "Download as zip" });
  await expect(template).not.toHaveAttribute("href", /sample=1/);
  await expect(zipTemplate).toHaveAttribute("href", /\?format=zip$/);
  await dialog.getByRole("checkbox", { name: "Include example rows" }).check();
  await expect(template).toHaveAttribute("href", /\?sample=1$/);
  await expect(zipTemplate).toHaveAttribute("href", /\?sample=1&format=zip$/);
  const zipDownload = await page.request.get(
    (await zipTemplate.getAttribute("href"))!,
  );
  expect(zipDownload.headers()["content-type"]).toBe("application/zip");
  expect(zipDownload.headers()["content-disposition"]).toContain(
    "MOSAIQ-Marketing-Intelligence-Templates.zip",
  );
  const download = await page.request.get(
    (await template.getAttribute("href"))!,
  );
  expect(download.headers()["content-type"]).toContain("text/csv");
  expect(download.headers()["content-disposition"]).toContain(
    "MOSAIQ-Marketing-Intelligence.csv",
  );
  expect(await download.text()).toContain(
    "#card,audience_overview,Audience Overview",
  );

  // One file: a ready card and a card the report doesn't have.
  await dialog.getByLabel("Choose CSV or zip files").setInputFiles({
    name: "MOSAIQ-Marketing-Intelligence.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(
      [
        "# MOSAIQ Marketing Intelligence template.",
        "#tab,audience_profile,Audience Profile",
        "#card,audience_overview,Audience Overview",
        "label,value",
        "Population,2100000",
        "",
        "#card,family_values,Family Values",
        "label,value",
        "Close-knit,30%",
        "",
      ].join("\r\n"),
    ),
  });
  await dialog.getByRole("button", { name: "Check files" }).click();
  await expect(
    dialog.getByText("1 ready · 0 with errors · 0 skipped · 1 not used"),
  ).toBeVisible();
  // The table from md up, cards below it.
  await expect(
    dialog.getByText("Not recognised").filter({ visible: true }),
  ).toBeVisible();

  await dialog.getByRole("button", { name: "Apply 1 card" }).click();
  await expect(page.getByText("1 card updated")).toBeVisible();
  await expect(dialog).toBeHidden();
  await expect(
    page
      .getByRole("region", { name: "Audience Overview", exact: true })
      .getByText("2.1M"),
  ).toBeVisible();
});
