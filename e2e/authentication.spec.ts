import { expect, signIn, test } from "./fixtures";

const authRoutes = [
  ["/login", "Welcome back"],
  ["/forgot-password", "Reset your password"],
  ["/reset-password", "Set a new password"],
  ["/forbidden", "You cannot access this page"],
] as const;

for (const [route, heading] of authRoutes) {
  test(route + " renders without page overflow", async ({ page }) => {
    await page.goto(route);
    await expect(page.getByRole("heading", { name: heading })).toBeVisible();
    const hasOverflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth,
    );
    expect(hasOverflow).toBe(false);
  });
}

test("login validates input and can show the password", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(
    page.getByText("Enter a valid work email address."),
  ).toBeVisible();
  await page.getByLabel("Show password").click();
  await expect(page.getByRole("textbox", { name: "Password" })).toHaveAttribute(
    "type",
    "text",
  );
});

test("protected route redirects without a session", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login$/);
});

test("sign in survives reload and sign out ends the session", async ({
  page,
}) => {
  await signIn(page);
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await page.getByLabel("Open profile menu").click();
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/reason=signed-out/);
  await expect(page.getByText("You have signed out.")).toBeVisible();
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login$/);
});

test("authenticated non-Admin accounts reach the forbidden page", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByLabel("Work email").fill("viewer@example.test");
  await page.locator("#login-password").fill("browser input");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/forbidden$/);
});

test("expired session during sign out shows the session message", async ({
  page,
}) => {
  await signIn(page);
  await page.context().addCookies([
    {
      name: "mosaiq-session",
      value: "expired",
      url: "http://localhost:3100",
      httpOnly: true,
    },
  ]);
  await page.getByLabel("Open profile menu").click();
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/reason=session-expired/);
});
