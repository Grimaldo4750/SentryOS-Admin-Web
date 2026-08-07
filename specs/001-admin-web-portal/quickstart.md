# Quickstart: SentryOS Administration Web Portal

**Feature**: `001-admin-web-portal` — validation guide proving the portal works end-to-end.

## Prerequisites

1. **SQL Server** on `localhost` with the `SentryOS` database provisioned and seeded (see the IdP
   repo's README — migrations are operator-run there, never from this repo).
2. **SentryOS IdP** running at `https://localhost/SentryOS-IdP/`
   (from `C:\Repositories\SentryOS-IdP`).
3. **SentryOS Admin API** running at `https://localhost/SentryOS-API`
   (from `C:\Repositories\SentryOS-Admin-API`); its dev CORS must allow `http://localhost:5173`.
4. **Node.js 22+** and npm.
5. Seeded bootstrap credential (development only): `admin@sentryos.local` / `ChangeMe123!` —
   forced password change on first sign-in.

> The IdP seed registers redirect URI `http://localhost:5173/callback` and CORS origin
> `http://localhost:5173`; keep the Vite dev server on port 5173.

## Setup & run

```bash
npm install
npm run dev        # http://localhost:5173 — talks to the REAL IdP and Admin API
```

`.env.development` (committed, no secrets):

```
VITE_OIDC_AUTHORITY=https://localhost/SentryOS-IdP
VITE_OIDC_CLIENT_ID=sentry-management-web-app
VITE_ADMIN_API_BASE_URL=https://localhost/SentryOS-API
```

## Validation scenarios

### V1 — Sign-in, Hero Card, logout (US1, P1)

1. Open `http://localhost:5173` → sign-in screen, no management data.
2. Click **Sign in** → redirected to the IdP's hosted login. Authenticate (first time: complete
   the forced password change on the IdP's pages).
3. Returned to the portal: left drawer renders with the Hero Card showing name, email, initials
   avatar (bootstrap admin has no picture), and active organization; navigation shows all seven
   areas (bootstrap admin holds every management scope).
4. **Log out** → back to sign-in; visiting the IdP directly shows its session is gone too.

### V2 — Permission-aware navigation (US2, P1)

1. In the portal, create a role holding only `users.manage` + `audit.read`, assign it to a new
   test user (scenario V4 covers the mechanics).
2. Sign out; sign in as that user (complete first-login password change).
3. Drawer shows only Users and Audit. Navigating to `/organizations` by URL renders the friendly
   "no access" state and issues no data request (verify in devtools network tab).

### V3 — Organization lifecycle (US3)

1. As the bootstrap admin, open **Organizations** → paginated list with total count.
2. Create `Org Chihuahua` → appears with success toast. Edit its description → persists.
3. Deactivate it → confirmation dialog explains history is preserved; row shows inactive.
4. Audit check: **Audit** area lists the create/update/deactivate actions with you as actor.

### V4 — Users, claims, role assignment with rank rule (US4)

1. **Users** → create `test.admin@sentryos.local` → appears in the paginated, searchable list.
2. Open the user → assign a role of the active organization → assignment lists organization +
   role. Add a claim (`department=QA`) → appears immediately; remove it → gone.
3. Rank rule: as a non-global admin whose highest level is N, verify roles at level ≥ N are not
   offered for assignment, and a forced attempt (replay via devtools) renders the friendly
   "not allowed" message from the API's `Forbidden` envelope.
4. Deactivate the user → labeled deactivation with confirmation, not deletion.

### V5 — Catalog: application → resource → scopes → client (US5, US6)

1. **Applications** → create `Solder Paste MS` with a slug → detail shows empty resources.
2. Add API resource `api-solder-paste`; under it add scopes `paste.read`, `paste.manage` →
   hierarchy navigable application → resource → scopes.
3. Availability: attach the application to `Org Chihuahua`; detaching warns about dependents.
4. **Clients**: create a client under the application; edit allowed scopes → only `paste.*`
   scopes are offered (never another application's). Set a redirect URI with an invalid URL →
   inline rejection; a valid one persists.
5. Rotate the client secret → plaintext shown **exactly once** with copy control + warning;
   reopening the client offers no way to view it again.
6. Try deleting scope `paste.read` while the client allows it → friendly `Conflict` explanation.

### V6 — Roles & permissions (US7)

1. **Roles** → list shows only the active organization's roles.
2. Create role `QA Auditor` (level below yours) → attach `paste.read` → offered scopes come only
   from applications available to the active organization.
3. Attempt to edit a role at/above your level → affordance disabled with explanatory tooltip.
4. Delete an assigned role → friendly `Conflict` explanation; unassign first → delete succeeds.

### V7 — Audit trail (US8)

1. **Audit** → newest-first paginated entries: actor, action, target, organization, timestamp
   (local time; UTC visible in the detail view).
2. Combine filters (date range + entity type + actor) → list narrows correctly.
3. Confirm no edit/delete affordance exists anywhere in the area.
4. Token records: section intentionally absent (Admin API dependency — research R5).

### V8 — Theming & language (US9)

1. Drawer theme selector: switch dark (default) → light → every screen re-renders in Nord light
   immediately; reload → choice persists.
2. Language selector: switch `en-US` → `es-MX` → all labels, messages, validation and error text
   switch; reload → persists.
3. Spot-check AA contrast in both themes (automated check runs in the test suite).

### V9 — Failure drills (edge cases; SC-005)

1. Stop the Admin API → screens show friendly error states with retry; navigation still works.
2. Stop the IdP → sign-in shows "service unavailable, retry" state.
3. Let the session expire with renewal blocked (devtools: block the token endpoint) → next
   action routes to sign-in with the friendly session-ended message.
4. Open a detail URL for a deleted record → friendly "not found" with a way back.
5. Verify no raw envelope/stack trace is ever rendered and no token appears in console/network
   logs the UI writes.

## Automated suites

```bash
npm run lint       # oxlint
npm run build      # tsc -b && vite build — must pass clean
npm run test       # Vitest unit/component (MSW-mocked API + OIDC)
npm run test:e2e   # Playwright (VITE_ENABLE_MSW=true — mock authority; real services NOT required)
```

Expected: all green; e2e covers V1/V2 journeys and one full entity lifecycle (V3).
