import { expect, signIn, test } from "./fixtures";

test("retired data management screens are not found", async ({ page }) => {
  await signIn(page);
  for (const path of ["/data-import", "/import-history", "/connectors"]) {
    await page.goto(path);
    await expect(
      page.getByRole("heading", { name: "Page not found" }),
    ).toBeVisible();
  }
  await page.goto("/dashboard");
  await expect(page.getByRole("link", { name: /Data import/ })).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: /KPI & module curation/ }),
  ).toHaveCount(0);
});

test("an Agency Admin reaches their own agency as My Agency", async ({
  page,
}, testInfo) => {
  await signIn(page, "agency@example.test");
  await page.goto("/agencies");
  await expect(page).toHaveURL(/\/agencies\/1$/);
  await expect(
    page.getByRole("heading", { name: "Northstar Digital", level: 1 }),
  ).toBeVisible();
  await expect(
    page.getByRole("main").getByRole("link", { name: "My Agency" }),
  ).toHaveAttribute("href", "/agencies/1");
  test.skip(testInfo.project.name !== "chromium");
  const primaryNavigation = page.getByRole("navigation", { name: "Primary" });
  await expect(
    primaryNavigation.getByRole("link", { name: "My Agency" }),
  ).toHaveAttribute("aria-current", "page");
  await expect(
    primaryNavigation.getByRole("link", { name: "Agencies" }),
  ).toHaveCount(0);
});
