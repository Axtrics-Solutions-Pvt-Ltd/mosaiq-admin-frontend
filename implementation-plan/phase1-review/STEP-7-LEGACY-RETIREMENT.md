# Step 7 — Legacy retirement

API dependency: API Step 7 (curation and analytics endpoints removed).

**Delete:**
- `src/app/(application)/curation/`
- `src/features/curation/`
- the proxy route `src/app/api/v1/admin/workspaces/[workspace]/curation/`
- `routes.curation` and the `curation.manage` capability
- the related MSW handlers and tests

**Search for leftovers:** `grep -rn "curation\|csv\|import-history\|connectors" src e2e`. Remove dead code, labels and fixtures that mention them.

The older plan files stay untouched, per the decision.
