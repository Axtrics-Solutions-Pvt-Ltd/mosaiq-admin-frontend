import { test as base } from "@playwright/test";

export const test = base.extend({});
export { expect } from "@playwright/test";

export async function signIn(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("Work email").fill("admin@example.test");
  await page.locator("#login-password").fill("browser input");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("**/dashboard");
}
