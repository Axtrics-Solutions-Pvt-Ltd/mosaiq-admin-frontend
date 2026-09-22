import { expect, test } from "./fixtures";

test("agency user edits their own name and changes password", async ({
  page,
}, testInfo) => {
  await page.goto("/login");
  await page.getByLabel("Work email").fill("agency@example.test");
  await page.locator("#login-password").fill("browser input");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("**/dashboard");
  await page.getByLabel("Open profile menu").click();
  await page.getByRole("link", { name: "Edit profile" }).click();
  await expect(
    page.getByRole("heading", { name: "Your profile" }),
  ).toBeVisible();
  await page
    .getByRole("textbox", { name: /Name/ })
    .fill(`Alex Rivera ${testInfo.project.name}`);
  await page.getByRole("button", { name: "Save name" }).click();
  await expect(page.getByText("Your name has been updated.")).toBeVisible();
  await expect(page.getByLabel("Open profile menu")).toHaveText("AR");

  await page.getByLabel("Current password").fill("wrong-current");
  await page
    .getByLabel("New password *", { exact: true })
    .fill("new-password-123");
  await page.getByLabel("Confirm new password").fill("new-password-123");
  await page.getByRole("button", { name: "Change password" }).click();
  await expect(
    page.getByText("The current password is incorrect."),
  ).toBeVisible();
  await expect(page.getByLabel("Current password")).toHaveValue(
    "wrong-current",
  );
  await page.getByLabel("Current password").fill("correct-current");
  await page.getByRole("button", { name: "Change password" }).click();
  await expect(
    page.getByText(/signed out of your other sessions and devices/),
  ).toBeVisible();
  await expect(page.getByLabel("Current password")).toHaveValue("");
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth,
    ),
  ).toBe(false);
});

test("Super Admin sees read-only profile and password form", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByLabel("Work email").fill("admin@example.test");
  await page.locator("#login-password").fill("browser input");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("**/dashboard");
  await page.getByLabel("Open profile menu").focus();
  await page.keyboard.press("Enter");
  await page.getByRole("link", { name: "Change password" }).click();
  await expect(page).toHaveURL(/\/profile#change-password/);
  await expect(
    page.getByText(/no agency-independent self-edit endpoint/),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Change password" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth,
    ),
  ).toBe(false);
});
