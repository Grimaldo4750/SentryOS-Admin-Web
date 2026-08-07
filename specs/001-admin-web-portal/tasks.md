# Tasks: SentryOS Administration Web Portal

**Input**: Design documents from `/specs/001-admin-web-portal/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/admin-api.md,
contracts/oidc.md, quickstart.md

**Tests**: INCLUDED — the constitution (Principle IX) makes tests part of every screen's
definition of done, and the spec's success criteria require automated verification.

**Organization**: Tasks are grouped by user story (US1–US10 from spec.md) so each story is an
independently testable increment.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: User story label (US1–US10); Setup/Foundational/Polish tasks carry none
- Every task names its exact file path(s)

## Path Conventions

Single frontend project at repository root per plan.md: `src/`, `tests/unit/`, `tests/e2e/`,
`mocks/`, `public/`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Scaffold the Vite SPA, styling tokens, i18n, and test tooling.

- [ ] T001 Scaffold Vite React+TypeScript project at repository root: `package.json` (scripts:
      dev/build/lint/test/test:watch/test:e2e), `tsconfig.json`, `tsconfig.app.json`,
      `tsconfig.node.json`, `vite.config.ts` with `@vitejs/plugin-react`, `@tailwindcss/vite`,
      and `@` path alias to `src/`; create `src/main.tsx` and placeholder `src/app/App.tsx`
- [ ] T002 Install runtime dependencies per research R1: react, react-dom, react-router-dom,
      @tanstack/react-query, axios, react-hook-form, @hookform/resolvers, zod, oidc-client-ts,
      i18next, react-i18next, lucide-react, class-variance-authority, clsx, tailwind-merge,
      tailwindcss, @fontsource-variable/geist (update `package.json`)
- [ ] T003 Install dev dependencies: typescript, vite, vitest, @testing-library/react,
      @testing-library/jest-dom, jsdom, @playwright/test, msw, oxlint, @types/react,
      @types/react-dom, @types/node (update `package.json`)
- [ ] T004 [P] Configure linting: oxlint config + `npm run lint` script wired in `package.json`
- [ ] T005 Create Nord design tokens in `src/index.css`: `.dark` (default) block with `#2E3440`
      background / `#3B4252` card / `#D8DEE9` foreground / `#88C0D0` primary / `#81A1C1` info /
      `#BF616A` destructive / `#EBCB8B` warning / `#A3BE8C` success; `:root` light block from
      Snow Storm (`#ECEFF4`/`#E5E9F0` backgrounds, `#2E3440` text, AA-adjusted accents); map all
      tokens into Tailwind via `@theme inline` using shadcn variable names; load Geist font
- [ ] T006 Create `index.html` with app mount, `<title>`, favicon, and inline pre-paint script
      that reads the persisted theme from localStorage and sets the `dark` class on `<html>`
      before first render (defaults to dark)
- [ ] T007 Initialize shadcn/ui (`components.json`) and generate base primitives into
      `src/components/ui/`: button, input, label, dialog, select, table, card, badge,
      dropdown-menu, separator, tooltip
- [ ] T008 [P] Create `.env.development` (`VITE_OIDC_AUTHORITY=https://localhost/SentryOS-IdP`,
      `VITE_OIDC_CLIENT_ID=sentry-management-web-app`,
      `VITE_ADMIN_API_BASE_URL=https://localhost/SentryOS-API`) and typed accessor
      `src/lib/env.ts` that fails fast on missing values
- [ ] T009 [P] Set up localization skeleton: `src/app/i18n.ts` (i18next init, language from
      localStorage, `en-US` default), `src/locales/en-US.json` and `src/locales/es-MX.json` with
      the top-level key hierarchy (common, authentication, shell, organizations, users,
      applications, resources, clients, roles, audit, errors), and `src/i18next.d.ts` typing keys
      from the en-US resource
- [ ] T010 [P] Configure test tooling: `vitest.config.ts` (jsdom, setup file
      `tests/unit/setup.ts` with jest-dom), `playwright.config.ts` (baseURL
      `http://localhost:5173`, web server command with `VITE_ENABLE_MSW=true`), and MSW worker
      `public/mockServiceWorker.js` (`msw init public/`)

**Checkpoint**: `npm run dev` serves a blank themed shell; `npm run lint`, `npm run build`,
`npm run test` all run clean.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Auth, HTTP/envelope layer, shared primitives, and routing every story depends on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T011 Define envelope and error types in `src/lib/apiError.ts`: `ApiResponse<T>`,
      `ResponseCode` union, `PagedResult<T>`, `PagingParams`, and typed `ApiError` classes per
      data-model.md shared shapes
- [ ] T012 Implement the single HTTP layer in `src/lib/http.ts`: Axios instance on
      `VITE_ADMIN_API_BASE_URL`; request interceptor attaching the current access token;
      response interceptor unwrapping the envelope (Success → `data`), normalizing
      ValidationError/Forbidden/NotFound/Conflict/InternalServerError to typed `ApiError`s, and
      on Unauthorized attempting one silent renew then raising the session-expired signal
      (research R9)
- [ ] T013 [P] Implement `src/lib/datetime.ts`: `formatDateTime`/`formatDate` converting ISO UTC
      strings to the active locale's local time via `Intl.DateTimeFormat`, plus `toUtcIso` for
      outbound values (Principle X)
- [ ] T014 [P] Implement `src/lib/permissions.ts`: the constitutional area→scope table,
      `hasPermission(ctx, scope)`, and `highestRoleLevel(ctx)` helpers
- [ ] T015 Implement OIDC session management in `src/features/auth/oidcConfig.ts` (UserManager
      config per contracts/oidc.md: authority/client/scopes/redirects, automaticSilentRenew) and
      `src/features/auth/AuthProvider.tsx` (sign-in redirect, callback completion, sign-out via
      endsession, renewal-failure → session-expired state, token accessor consumed by http.ts)
- [ ] T016 Implement auth screens in `src/features/auth/`: `LoginPage.tsx` (sign-in action,
      friendly IdP-unreachable and login-cancelled states), `CallbackPage.tsx` (code exchange,
      restore pre-login location), `ProtectedRoute.tsx` (redirect unauthenticated users to login)
- [ ] T017 Implement caller context in `src/features/auth/api.ts` (`GET /api/me` per
      contracts/admin-api.md) and `src/features/auth/useCallerContext.ts` (TanStack Query
      `['me']`, exposes CallerContext + hasPermission/highestRoleLevel; invalidated on sign-in
      and renewal)
- [ ] T018 Implement `src/app/UiPreferencesProvider.tsx`: theme (`dark`|`light`, default dark)
      and language (`en-US`|`es-MX`) state, localStorage persistence, `dark` class toggling, and
      i18next language sync
- [ ] T019 Compose the app in `src/app/App.tsx` (QueryClientProvider, UiPreferencesProvider,
      AuthProvider, RouterProvider) and define the route table in `src/app/routes.tsx`: public
      `/login` and `/callback`, protected layout route wrapping all management areas, per-area
      scope guard placeholder, catch-all NotFound
- [ ] T020 Build shared screen primitives in `src/components/ui/`: `PagedTable.tsx` (columns,
      server pagination with total count, loading/empty/error slots), `FormDialog.tsx`
      (RHF + Zod + submit error banner), `Field.tsx`, `ConfirmDeactivateDialog.tsx`
      (consequence text + confirm), `FriendlyError.tsx`, `EmptyState.tsx`, `NoAccessState.tsx`,
      `NotFoundState.tsx` — all localized and token-styled
- [ ] T021 Create MSW mock infrastructure: `mocks/oidcHandlers.ts` (discovery, authorize
      redirect, token, endsession per legacy pattern), `mocks/adminApiHandlers.ts`
      (envelope-shaped handlers + `/api/me` fixtures with configurable permission sets),
      `mocks/browser.ts`, and conditional startup in `src/main.tsx` gated by
      `VITE_ENABLE_MSW=true`

**Checkpoint**: Foundation ready — sign-in round-trip works against the real IdP; user story
implementation can begin.

---

## Phase 3: User Story 1 — Sign in and land in the portal shell (Priority: P1) 🎯 MVP

**Goal**: IdP-delegated sign-in into a professional Nord shell: permanent left drawer with Hero
Card (picture/initials, name, email, active organization) and logout; graceful session expiry.

**Independent Test**: Quickstart V1 — sign in as the seeded admin, see identity in the Hero
Card, log out; session-expiry drill shows the friendly message.

### Implementation for User Story 1

- [ ] T022 [US1] Build `src/features/shell/AppShell.tsx`: permanent left drawer layout (no top
      bar), main content outlet, responsive ≥1024px behavior, drawer sections for hero/nav/
      preferences/logout
- [ ] T023 [P] [US1] Build `src/features/shell/HeroCard.tsx`: profile picture from
      `GET /api/users/{id}/profile-picture` with initials fallback, name, email, active
      organization from useCallerContext, loading skeleton
- [ ] T024 [US1] Wire logout and session lifecycle into the shell: logout button →
      AuthProvider.signOut (endsession); session-expired signal → redirect to `/login` with
      localized "session ended" message; renewal happens transparently while active
- [ ] T025 [US1] Finalize auth routing in `src/app/routes.tsx`: authenticated users land in the
      shell at `/`, unauthenticated at `/login`; `/callback` restores the pre-login location;
      add `authentication.*` and `shell.*` strings to `src/locales/en-US.json` and
      `src/locales/es-MX.json`
- [ ] T026 [P] [US1] Unit tests in `tests/unit/auth-shell.test.tsx`: HeroCard renders identity +
      initials fallback; LoginPage failure states; ProtectedRoute redirects; session-expired
      message renders
- [ ] T027 [P] [US1] Playwright e2e in `tests/e2e/signin.spec.ts` (mock authority): sign-in
      redirect → callback → shell with Hero Card → logout → back at login
- [ ] T028 [US1] Failure drills polish: IdP unreachable at login and API unreachable after login
      render FriendlyError states with retry (quickstart V9 items 1–3)

**Checkpoint**: US1 fully functional — deployable MVP.

---

## Phase 4: User Story 2 — Permission-aware navigation (Priority: P1)

**Goal**: Navigation and routes gated by the caller's effective permissions from `/api/me`.

**Independent Test**: Quickstart V2 — sign in with different permission sets (MSW fixtures) and
verify nav entries and direct-URL access match the area→scope table.

### Implementation for User Story 2

- [ ] T029 [US2] Build `src/features/shell/NavSection.tsx`: the seven area entries (icons +
      localized labels) rendered only when `hasPermission` grants the area's scope; active-route
      highlight
- [ ] T030 [US2] Implement `RequireScope` route guard in `src/features/auth/ProtectedRoute.tsx`
      (or `src/app/routes.tsx`): missing scope renders `NoAccessState` and mounts no
      data-fetching component
- [ ] T031 [US2] Wire global Forbidden handling: `ApiError(Forbidden)` from any query/mutation
      renders the localized "not allowed" state/toast instead of raw errors (extend
      `src/lib/http.ts` + `FriendlyError.tsx` usage)
- [ ] T032 [P] [US2] Tests: unit `tests/unit/permissions.test.tsx` (nav gating per permission
      fixture, RequireScope renders NoAccessState, no fetch fired) and e2e
      `tests/e2e/permissions.spec.ts` (restricted user sees only Users+Audit, direct URL to
      `/organizations` shows no-access)

**Checkpoint**: Both P1 stories done — portal entry + authority model demonstrable.

---

## Phase 5: User Story 3 — Manage organizations (Priority: P2)

**Goal**: Full organization lifecycle: paginated list, create, edit, deactivate.

**Independent Test**: Quickstart V3 — create/edit/deactivate an organization from the UI.

### Implementation for User Story 3

- [ ] T033 [US3] Create `src/features/organizations/api.ts`: list (paged), get, create, update,
      deactivate per contracts/admin-api.md, with TanStack Query hooks and cache invalidation
- [ ] T034 [US3] Build `src/features/organizations/OrganizationsPage.tsx`: PagedTable (name,
      status, created date via formatDateTime), create/edit FormDialog (Zod: name required),
      ConfirmDeactivateDialog, success toasts
- [ ] T035 [US3] Register the route + nav entry for `/organizations` in `src/app/routes.tsx` and
      `NavSection.tsx`; add `organizations.*` strings to both locale files; wire
      loading/empty/error/no-access states
- [ ] T036 [P] [US3] Tests: unit `tests/unit/organizations.test.tsx` (list render, create
      validation, deactivate confirm, ValidationError banner) and e2e
      `tests/e2e/organizations.spec.ts` (full lifecycle, quickstart V3)

**Checkpoint**: First entity area complete — the pattern (api.ts + PagedTable + dialogs + i18n +
tests) is now the template for US4–US8.

---

## Phase 6: User Story 4 — Manage users, claims, and role assignments (Priority: P2)

**Goal**: User lifecycle plus claims editor, profile picture, and rank-gated role assignments.

**Independent Test**: Quickstart V4 — create user, assign/remove a role, edit claims,
deactivate; rank rule blocks assigning at/above own level.

### Implementation for User Story 4

- [ ] T037 [US4] Create `src/features/users/api.ts`: list (paged + search), get, create, update,
      deactivate, roles (list/assign/remove), claims (list/replace/delete), profile picture
      (get/put/delete) per contracts/admin-api.md, with Query hooks + invalidation
- [ ] T038 [US4] Build `src/features/users/UsersPage.tsx`: searchable PagedTable (name, email,
      status), create/edit FormDialog (Zod: email format, name required), deactivate flow
- [ ] T039 [US4] Build `src/features/users/UserDetailPage.tsx`: profile section with picture
      upload/remove + initials fallback, claims editor (add/remove type-value pairs), localized
      tabs/sections
- [ ] T040 [US4] Build the role-assignment panel in `src/features/users/UserRolesPanel.tsx`:
      list assignments (role, organization, level, assigned date); assign dialog with role
      picker (minimal `listRoles` in `src/features/roles/api.ts` if US7 not yet built, offered
      only when the caller holds `roles.manage`); remove with confirmation; disable options at/
      above `highestRoleLevel` with explanatory tooltip; render API Forbidden refusals friendly
- [ ] T041 [P] [US4] Tests in `tests/unit/users.test.tsx`: lifecycle forms, claims editing,
      initials fallback, rank-gated assignment options, Forbidden rendering; register routes/nav
      and `users.*` strings in both locales as part of page tasks above

**Checkpoint**: Access management loop (user → role assignment) usable end-to-end.

---

## Phase 7: User Story 5 — Application catalog: applications, resources, scopes (Priority: P3)

**Goal**: Catalog management with the application → resource → scope hierarchy and
per-organization availability.

**Independent Test**: Quickstart V5 steps 1–3 — create application, resource, scopes; attach to
an organization; conflict on deleting a referenced scope.

### Implementation for User Story 5

- [ ] T042 [US5] Create `src/features/applications/api.ts` (list/get/create/update/deactivate +
      availability get/put) and `src/features/resources/api.ts` (api-resources CRUD + scopes
      CRUD) per contracts/admin-api.md, with Query hooks + invalidation
- [ ] T043 [US5] Build `src/features/applications/ApplicationsPage.tsx`: PagedTable, create/edit
      FormDialog (name + slug), deactivate flow
- [ ] T044 [US5] Build `src/features/applications/ApplicationDetailPage.tsx`: resources list with
      add/edit/delete, nested scopes per resource with add/edit/delete (Conflict rendered on
      referenced deletions), and availability editor (organization multi-select via
      `PUT /organizations` with detach warning)
- [ ] T045 [US5] Register `/applications` routes + nav; add `applications.*` and `resources.*`
      strings to both locales; wire all screen states
- [ ] T046 [P] [US5] Tests in `tests/unit/applications.test.tsx`: hierarchy rendering,
      availability replacement, Conflict explanation on scope delete

**Checkpoint**: Catalog manageable; clients and roles now have real data to pick from.

---

## Phase 8: User Story 6 — Manage OAuth clients (Priority: P3)

**Goal**: Client lifecycle with set editors and display-once secret rotation.

**Independent Test**: Quickstart V5 steps 4–6 — create client, constrain allowed scopes to its
application, rotate secret shown exactly once.

### Implementation for User Story 6

- [ ] T047 [US6] Create `src/features/clients/api.ts`: list/get/create/update/deactivate + set
      replacements (scopes, redirect-uris, cors-origins, grant-types) + `rotateSecret` per
      contracts/admin-api.md, with Query hooks + invalidation
- [ ] T048 [US6] Build `src/features/clients/ClientsPage.tsx`: PagedTable (clientId, display
      name, application, status), create FormDialog (application picker, Zod on clientId/name)
- [ ] T049 [US6] Build `src/features/clients/ClientDetailPage.tsx`: core settings form (PKCE,
      lifetimes, rotation flag); set editors — allowed scopes (pick-list restricted to the
      parent application's scopes), redirect URIs (absolute-URL Zod), CORS origins (origin
      format), grant types; `SecretRotationDialog.tsx` showing the plaintext exactly once with
      copy control + warning, never cached; deactivate flow
- [ ] T050 [P] [US6] Tests in `tests/unit/clients.test.tsx`: scope pick-list constraint, URI
      validation, display-once secret behavior (reopening offers no way to view); register
      routes/nav and `clients.*` strings in both locales within the page tasks

**Checkpoint**: Full OAuth client administration incl. secret hygiene.

---

## Phase 9: User Story 7 — Manage roles and their permissions (Priority: P3)

**Goal**: Organization-scoped roles with scope attachments and rank-gated administration.

**Independent Test**: Quickstart V6 — create role below own level, attach org-available scopes,
rank-gated edit refusal, Conflict on deleting an assigned role.

### Implementation for User Story 7

- [ ] T051 [US7] Complete `src/features/roles/api.ts`: list/get/create/update/delete + scope
      attach/detach per contracts/admin-api.md, with Query hooks + invalidation (extends the
      minimal list from T040 if present)
- [ ] T052 [US7] Build `src/features/roles/RolesPage.tsx`: PagedTable of the active
      organization's roles (name, level, scope count), create/edit FormDialog (Zod: name, level
      integer), delete with Conflict explanation while assigned; affordances disabled with
      tooltip for roles at/above the caller's highest level
- [ ] T053 [US7] Build `src/features/roles/RoleScopesDialog.tsx`: attach/detach scopes with the
      pick-list restricted to scopes of applications available to the active organization;
      register `/roles` route + nav; add `roles.*` strings to both locales
- [ ] T054 [P] [US7] Tests in `tests/unit/roles.test.tsx`: rank gating, constrained pick-list,
      Conflict on delete, attach/detach flows

**Checkpoint**: Grant-management loop fully closed (catalog → role → assignment).

---

## Phase 10: User Story 8 — Audit trail (Priority: P4)

**Goal**: Read-only, filterable audit log; reserved slot for future token records.

**Independent Test**: Quickstart V7 — mutations appear newest-first; filters combine; no
mutation affordance exists.

### Implementation for User Story 8

- [ ] T055 [US8] Create `src/features/audit/api.ts`: paged query with filters (`organizationId`
      global-admin-only, `fromUtc`, `toUtc`, `targetType`, `actorUserId`, `action`) per
      contracts/admin-api.md
- [ ] T056 [US8] Build `src/features/audit/AuditLogPage.tsx`: newest-first PagedTable (actor,
      action, target, organization, local timestamp), combinable filter bar (date range pickers
      converting to UTC, entity type, actor, action; organization filter only for global
      admins), detail view showing the UTC value, zero mutation affordances; reserved
      "Sessions/Tokens" tab placeholder commented for the Admin API dependency (research R5);
      register `/audit` route + nav; add `audit.*` strings to both locales
- [ ] T057 [P] [US8] Tests in `tests/unit/audit.test.tsx`: filter combination, newest-first
      order, read-only guarantee (no buttons), UTC/local rendering

**Checkpoint**: Every implemented Admin API area is now covered.

---

## Phase 11: User Story 9 — Theme and language switching (Priority: P4)

**Goal**: Drawer selectors for Nord dark/light and en-US/es-MX, instant + persistent.

**Independent Test**: Quickstart V8 — switch both from the drawer; every screen reflects them;
choices survive reload.

### Implementation for User Story 9

- [ ] T058 [US9] Build `src/features/shell/ThemeSelector.tsx` and
      `src/features/shell/LanguageSelector.tsx` wired to UiPreferencesProvider; place both in
      the drawer's preferences section of `AppShell.tsx`
- [ ] T059 [US9] Complete `src/locales/es-MX.json` to full key parity with `en-US.json` (all
      areas, errors, confirmations); wire `Intl` date formatting to the active language in
      `src/lib/datetime.ts`; add a parity check test in `tests/unit/locales.test.ts` that fails
      on missing keys
- [ ] T060 [P] [US9] Tests in `tests/unit/preferences.test.tsx`: theme class toggling +
      persistence, language switch re-renders labels, defaults (dark, en-US) on first visit

**Checkpoint**: Theming + localization complete portal-wide.

---

## Phase 12: User Story 10 — Switch the active organization (Priority: P4)

**Goal**: Active organization always visible; switch action re-authenticates; caches cleared.

**Independent Test**: Quickstart V1 Hero Card shows the active org; switch triggers a fresh IdP
round-trip; org-scoped caches cleared (spec US10 scenario 3 covers single-org display).

### Implementation for User Story 10

- [ ] T061 [US10] Build `src/features/shell/OrganizationSwitcher.tsx`: shows the active
      organization (from useCallerContext); single-org users see it without a misleading
      choice; "switch organization" action performs a fresh sign-in round-trip via AuthProvider
      and clears the TanStack Query cache on completion (also clear on logout); document the
      IdP-side dependency for selecting a *different* organization (research R6) in the
      component's doc comment; add `shell.organizationSwitcher.*` strings to both locales
- [ ] T062 [P] [US10] Tests in `tests/unit/orgswitch.test.tsx`: active org display, single-org
      rendering, cache cleared after switch/sign-out (no stale org-scoped data)

**Checkpoint**: All ten user stories implemented.

---

## Phase 13: Polish & Cross-Cutting Concerns

- [ ] T063 [P] Add automated WCAG AA contrast checks for both themes' token pairs in
      `tests/unit/contrast.test.ts` (compute contrast ratios from the values in `src/index.css`)
- [ ] T064 [P] Sweep for constitution violations: no hardcoded user-facing strings outside
      `src/locales/`, no hex colors outside `src/index.css`, no token values logged — fix any
      findings (all `src/` files)
- [ ] T065 [P] Update `README.md`: getting started (env vars, sibling services, seeded
      credential pointer), scripts, testing (MSW opt-in), theming/i18n conventions
- [ ] T066 Execute quickstart.md validation V1–V9 against the real IdP + Admin API and fix any
      gaps found
- [ ] T067 Final quality gates: `npm run lint`, `npm run build` (tsc clean), `npm run test`,
      `npm run test:e2e` all green

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)** → nothing
- **Foundational (Phase 2)** → Setup; BLOCKS all stories
- **US1 (Phase 3)** → Foundational; US2 (Phase 4) → US1 (shell/nav exist)
- **US3–US8 (Phases 5–10)** → Foundational + US1/US2 shell+guards; otherwise mutually
  independent, except: US4's role picker benefits from US7 (mitigated by the minimal roles list
  in T040); US6/US7 pick from data US5 creates at runtime (not a code dependency)
- **US9 (Phase 11)** → Foundational (provider exists; selectors are additive)
- **US10 (Phase 12)** → US1 (Hero Card/drawer)
- **Polish (Phase 13)** → all desired stories

### Story completion order (sequential solo run)

US1 → US2 → US3 → US4 → US5 → US6 → US7 → US8 → US9 → US10 → Polish

### Parallel Opportunities

- Phase 1: T004, T008, T009, T010 in parallel after T003
- Phase 2: T013, T014 parallel to T015–T017; T020 parallel to auth work; T021 parallel to T020
- After US2: entity areas US3, US5, US6*, US7*, US8 can proceed in parallel (different
  `src/features/*` folders); US4 after T040's roles-list decision (*US6/US7 independent at the
  code level)
- All test tasks marked [P] parallel to each other
- Phase 13: T063, T064, T065 in parallel

## Parallel Example: after Foundational + US1/US2

```bash
# Different feature folders, no shared files:
Task: "US3 organizations — src/features/organizations/*"
Task: "US5 applications/resources — src/features/applications/*, src/features/resources/*"
Task: "US8 audit — src/features/audit/*"
```

## Implementation Strategy

**MVP first**: Phases 1–4 (Setup + Foundational + US1 + US2) = secure sign-in into a
permission-aware Nord shell — demonstrable immediately (quickstart V1–V2).

**Incremental delivery**: then one entity area per increment (US3 establishes the reusable
pattern: api.ts → PagedTable page → dialogs → i18n → tests), validating each against its
quickstart scenario before the next. US9/US10 refine the shell last; Polish closes with the
full quickstart pass and quality gates.

## Notes

- Recorded cross-repo dependencies (not tasks here): token-record endpoints (Admin API,
  research R5); organization-selection support at sign-in (IdP, research R6).
- Every entity-area task includes registering its route/nav entry and both locale files —
  missing es-MX keys fail the T059 parity test.
- Commit after each task or logical group; stop at any checkpoint to validate independently.
