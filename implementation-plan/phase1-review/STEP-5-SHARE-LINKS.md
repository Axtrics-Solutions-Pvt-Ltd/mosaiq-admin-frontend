# Step 5 — Share links

API dependency: API Step 5 (`reports/{r}/links` endpoints, `PORTAL_PUBLIC_URL` configured).

## 5.1 Links tab (`/reports/[reportId]/links`)

- **Table columns:** label, URL (monospace, with a copy button), password (Yes/No), expires, status badge (Active / Expired / Revoked), views, last viewed, created by.
- **"+ Create link"** opens a drawer:
  - label (optional)
  - readable slug part (optional, lowercase/hyphen check matching the API)
  - password with a show/hide toggle (optional)
  - expiry date (optional, must be in the future)

  After creating, show the full URL with a **Copy** button and the note "The password is not shown again."
- **Row actions:**
  - Edit (label, expiry, set or replace the password, remove the password)
  - **Revoke** (`ConfirmationDialog`: "Anyone with this link loses access immediately.")
  - **Regenerate** (confirmation: "The old URL stops working and a new URL is created with the same settings.")
  - Open in portal (new tab)
- Revoked links stay listed, with actions disabled.

## 5.2 Elsewhere

- The builder header shows a "Share" button that opens the Links tab and shows the active link count.
- The reports list shows an active-links count column.
- The dashboard adds cards for reports and active links, using the API Step 4 dashboard fields.

## 5.3 Tests

- Slug validation.
- The copy button uses the clipboard API with a fallback.
- Revoke and regenerate refresh the list.
- e2e: create a password-protected link, then revoke it.
