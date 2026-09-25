import { expect, signIn, test } from "./fixtures";

test("a client gets a Meta workspace that connects and fetches sample data", async ({
  page,
}, testInfo) => {
  const clientName = `Acme ${testInfo.project.name}`;
  await signIn(page);
  await page.goto("/clients/new?agency=1");
  await page.getByLabel("Client name").fill(clientName);
  await page.getByRole("button", { name: "Create client" }).click();
  await expect(
    page.getByRole("heading", { name: clientName, level: 1 }),
  ).toBeVisible();

  await page.getByRole("link", { name: "Add channel workspace" }).click();
  await expect(page.getByRole("option", { name: "Meta Ads" })).toBeAttached();
  await page.getByLabel("Channel").selectOption({ label: "Meta Ads" });
  await expect(page.getByLabel("Workspace name")).toHaveValue(
    `${clientName} – Meta Ads`,
  );
  await page.getByRole("button", { name: "Create workspace" }).click();
  await expect(
    page.getByRole("heading", { name: `${clientName} – Meta Ads`, level: 1 }),
  ).toBeVisible();

  await page.getByRole("tab", { name: "Connection" }).click();
  const connection = page.getByRole("tabpanel", { name: "Connection" });
  await expect(
    connection.getByText(/live connection to Meta Ads comes in a later phase/),
  ).toBeVisible();
  await expect(connection.getByText("Not connected")).toBeVisible();
  await expect(
    connection.getByRole("button", { name: "Fetch data" }),
  ).toBeDisabled();
  await connection.getByLabel("Access token").fill("secret-token-9876");
  await connection.getByLabel("Ad account ID").fill("act_1234");
  await connection.getByRole("button", { name: "Save credentials" }).click();
  await expect(
    connection.getByText("Connected", { exact: true }),
  ).toBeVisible();
  await expect(connection.getByText("•••• 9876")).toBeVisible();
  await expect(connection.locator("input[type=password]")).toHaveCount(0);

  await connection.getByRole("button", { name: "Fetch data" }).click();
  await expect(
    connection.getByText(/^400 rows updated for 21 Aug 2025–24 Sept? 2026\.$/),
  ).toBeVisible();
  await expect(connection.getByText("completed")).toBeVisible();

  const hasOverflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth >
      document.documentElement.clientWidth,
  );
  expect(hasOverflow).toBe(false);
});

test("a Manager reaches clients and workspaces but cannot delete one", async ({
  page,
}) => {
  await signIn(page, "manager@example.test");
  await page.goto("/workspaces/10?agency=1&client=20");
  await expect(
    page.getByRole("heading", { name: "Northstar Reporting", level: 1 }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Edit", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Delete workspace" }),
  ).toHaveCount(0);
  await page.goto("/clients/20?agency=1");
  await expect(
    page.getByRole("heading", { name: "Northstar Client", level: 1 }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Edit client" })).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Add channel workspace" }),
  ).toBeVisible();
});

test("a Super Admin reviews the channel catalogue", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "chromium");
  await signIn(page);
  await page
    .getByRole("navigation", { name: "Primary" })
    .getByRole("link", { name: "Channels" })
    .click();
  await expect(page.getByRole("heading", { name: "Channels" })).toBeVisible();
  const catalogue = page.getByRole("table", { name: "Channel catalogue" });
  await expect(catalogue.getByText("meta_ads")).toBeVisible();
  await catalogue.getByRole("button", { name: "Edit Meta Ads" }).click();
  const drawer = page.getByRole("dialog", { name: "Edit Meta Ads" });
  await expect(drawer.getByLabel("Code")).toHaveAttribute("readonly", "");
  await expect(drawer.getByLabel("Key").first()).toHaveValue("access_token");
  await drawer.getByRole("button", { name: "Cancel" }).click();
  await expect(drawer).toBeHidden();
});
