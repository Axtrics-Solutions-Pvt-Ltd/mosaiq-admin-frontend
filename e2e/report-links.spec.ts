import { expect, signIn, test } from "./fixtures";

test("a password-protected share link is created, copied and revoked", async ({
  page,
}, testInfo) => {
  // Projects run in parallel against one mock API, so each uses its own label.
  const label = `Board ${testInfo.project.name}`;
  await signIn(page);
  await page.goto("/reports/30/links?agency=1&client=20");
  await expect(
    page.getByRole("heading", { name: "Northstar monthly", level: 1 }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Links", exact: true }),
  ).toHaveAttribute("aria-current", "page");

  await page.getByRole("button", { name: "Create link" }).first().click();
  const form = page.getByRole("form", { name: "Create link" });
  await form.getByLabel("Label").fill(label);
  await form.getByLabel("Readable URL part").fill("northstar-board");
  await form.getByLabel("Password", { exact: true }).fill("open-sesame-42");
  await form.getByRole("button", { name: "Show password" }).click();
  await expect(form.getByLabel("Password", { exact: true })).toHaveAttribute(
    "type",
    "text",
  );
  await form.getByRole("button", { name: "Create link" }).click();

  const created = page.getByRole("dialog", { name: "Link created" });
  await expect(created.getByTestId("created-link-url")).toHaveText(
    /^http:\/\/portal\.example\.test\/userPortal\/northstar-board-\d{6}$/,
  );
  await expect(
    created.getByText(/The password is not shown again\./),
  ).toBeVisible();
  await created.getByRole("button", { name: "Copy link URL" }).click();
  await expect(
    created.getByRole("button", { name: "Copy link URL" }),
  ).toHaveText(/Copied/);
  await created.getByRole("button", { name: "Done" }).click();

  await page.getByRole("button", { name: `Revoke ${label}` }).click();
  const confirm = page.getByRole("dialog", { name: "Revoke this link?" });
  await expect(
    confirm.getByText("Anyone with this link loses access immediately."),
  ).toBeVisible();
  await confirm.getByRole("button", { name: "Revoke link" }).click();

  await expect(
    page.getByRole("button", { name: `Revoke ${label}` }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: `Edit ${label}` }),
  ).toBeDisabled();

  const hasOverflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth >
      document.documentElement.clientWidth,
  );
  expect(hasOverflow).toBe(false);
});
