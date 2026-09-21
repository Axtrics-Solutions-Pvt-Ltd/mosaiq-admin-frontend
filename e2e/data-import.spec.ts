import { expect, signIn, test } from "./fixtures";

test.beforeEach(async ({ page }) => {
  await signIn(page);
  await page.goto("/data-import");
});

test("guided examples stay local and show the MMM readiness and completion designs", async ({
  page,
}) => {
  const importRequests: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("csv-imports"))
      importRequests.push(request.url());
  });

  await expect(
    page.getByRole("heading", { name: "Data import" }),
  ).toBeVisible();
  await page.getByLabel("Dataset type").selectOption("mmm");
  await page.getByRole("button", { name: "Show sample validation" }).click();
  await expect(
    page.getByRole("heading", { name: "MMM readiness example" }),
  ).toBeVisible();

  await page.getByLabel("Validation example").selectOption("invalid");
  await expect(page.getByText("Import blocked")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Review confirmation" }),
  ).toBeDisabled();

  await page.getByLabel("Validation example").selectOption("valid");
  await page.getByRole("radio", { name: /Replace dataset/ }).check();
  await page.getByRole("button", { name: "Review confirmation" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Show sample completion" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Completion preview" }),
  ).toBeVisible();
  expect(importRequests).toEqual([]);
});

test("data import has no page overflow at review widths", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "chromium");
  await page.getByRole("button", { name: "Show sample validation" }).click();
  await page.getByLabel("Dataset type").selectOption("mmm");
  await page.getByRole("button", { name: "Show sample validation" }).click();
  for (const width of [1440, 1280, 1024, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    const hasOverflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth,
    );
    expect(hasOverflow, `unexpected page overflow at ${width}px`).toBe(false);
  }
});
