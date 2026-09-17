# API boundary

Authentication uses a Laravel Sanctum browser session. Browser code calls the same-origin paths in `paths.ts` through `client.ts`. The allowlisted route handlers call `server.ts`, which reads the validated server-only origins, forwards cookies and the decoded CSRF token, sets the Admin `Origin`, and returns rewritten first-party cookies. Server application layout calls the same transport for `/me` before rendering.

`errors.ts` normalizes status, `error_code`, field errors, and request IDs without showing raw upstream bodies. The auth feature owns DTO validation, normalization, and TanStack Query keys. No credentials or current-user data are persisted in browser storage.

Runtime setup requires `VITE_API_BASE_URL`, `NEXT_ADMIN_ORIGIN`, and the matching Laravel `SANCTUM_STATEFUL_DOMAINS` entry. Check the actual session cookie name and attributes in a real browser. The repository's Playwright suite uses a local mock API; it does not prove the deployed Laravel cookie configuration.
