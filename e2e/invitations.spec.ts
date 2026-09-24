import { expect, test } from "./fixtures";

const invitationToken = "e".repeat(64);

test("an existing account signs in from the invitation link and accepts it", async ({
  page,
}) => {
  await page.goto(`/accept-invitation?token=${invitationToken}`);
  await page.getByRole("link", { name: "Sign in to accept" }).click();
  await expect(page).toHaveURL(/\/login\?next=/);
  await page.getByLabel("Work email").fill("agency@example.test");
  await page.locator("#login-password").fill("browser input");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(`**/accept-invitation?token=${invitationToken}`);
  await page.getByRole("button", { name: "Accept invitation" }).click();
  await expect(
    page.getByText("You now have access to Retail at Northstar Digital."),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Go to dashboard" })).toBeVisible();
});

test("a signed-in user without a membership accepts a pending invitation", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByLabel("Work email").fill("returning@example.test");
  await page.locator("#login-password").fill("browser input");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("**/invitations/pending");
  await expect(
    page.getByRole("heading", { name: "Your invitations" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Accept invitation to Growth" })
    .click();
  await page.waitForURL("**/dashboard");
});
