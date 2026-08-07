# Implementation Plan: SentryOS Administration Web Portal

**Branch**: `001-admin-web-portal` | **Date**: 2026-07-12 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/001-admin-web-portal/spec.md`

## Summary

Build the SentryOS administration portal as a React SPA: sign-in fully delegated to the SentryOS
IdP (`https://localhost/SentryOS-IdP/`, Authorization Code + PKCE via the seeded public client
`sentry-management-web-app`), with the resulting bearer token used for every call to the already
implemented Admin API (`https://localhost/SentryOS-API`). The portal renders a permanent
left-drawer shell with a Hero Card (profile picture/initials, name, email, active organization),
permission-aware navigation driven by `GET /api/me`, full management screens for every exposed
entity (organizations, users + claims + pictures + role assignments, applications + availability,
API resources, scopes, clients + secret rotation, roles + scope attachments, read-only audit),
Nord-token theming (dark default + light), and en-US/es-MX localization. Technical approach per
research: one envelope-interpreting Axios layer, TanStack Query for all server state, RHF + Zod
forms, shadcn/ui components themed through CSS custom properties.

## Technical Context

**Language/Version**: TypeScript ~6.0, React 19, Node.js 22+ toolchain

**Primary Dependencies**: Vite 8, Tailwind CSS 4 (`@tailwindcss/vite`), shadcn/ui (+ lucide-react,
Geist font), react-router-dom 7, TanStack Query 5, Axios, React Hook Form 7 + Zod 4,
`oidc-client-ts` 3.x, i18next 26 + react-i18next 17

**Storage**: none owned — all entity data via the Admin API; client-only persistence limited to
`localStorage` (theme, language) and the OIDC library's session storage

**Testing**: Vitest 4 + Testing Library (jsdom), Playwright e2e, MSW 2 (mock Admin API + mock OIDC
authority, opt-in via `VITE_ENABLE_MSW=true`), oxlint

**Target Platform**: evergreen desktop browsers; static SPA build (Vite) served over HTTPS;
dev server fixed at `http://localhost:5173` (IdP seed's redirect/CORS registration)

**Project Type**: single-page web application (frontend only — backends live in sibling repos)

**Performance Goals**: sign-in round-trip to rendered Hero Card < 1 min (SC-001); theme/language
switch applied portal-wide < 1 s (SC-006); list screens stay responsive against 1,000+-record
datasets via server-side pagination (SC-007)

**Constraints**: public OAuth client — zero secrets anywhere; WCAG AA contrast in both themes;
no raw technical errors user-visible; tokens never logged/rendered; UTC-in/local-out timestamps;
desktop-first (usable ≥ 1024 px)

**Scale/Scope**: 7 permission-gated management areas, ~15 screens + dialogs, 2 languages, 2 themes,
~30 functional requirements, 10 user stories

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Principle | Status | Evidence |
|---|---|---|---|
| I | Single-purpose web app & repo boundary | ✅ PASS | SPA only; no backend/BFF/SSR; data exclusively via Admin API; IdP contacted only on protocol endpoints; public client with no secrets (plan adds none) |
| II | IdP-delegated auth (Code + PKCE) | ✅ PASS | `oidc-client-ts` against seeded `sentry-management-web-app`; no credential UI; authority/client/API URLs are `VITE_*` config; silent renew + endsession logout; tokens never logged (contracts/oidc.md) |
| III | Scope-based, permission-aware UI | ✅ PASS | Gating driven by `/api/me` `permissions` using the constitutional area→scope table; routes render no-access states; API refusals still handled (research R3) |
| IV | Complete entity administration coverage | ✅ PASS with recorded dependency | All implemented Admin API areas covered incl. secret display-once, pagination, deactivate-over-delete. Token records: API exposes no endpoints — recorded as cross-repo dependency, UI slot reserved (research R5); not worked around client-side |
| V | Organization context & role-level delegation | ✅ PASS with recorded dependency | Active org always in Hero Card; switch = re-auth round-trip, never a client filter; caches cleared on switch; rank gating via `/api/me` roleLevels. Selecting a *different* org needs IdP support — recorded (research R6) |
| VI | Feature-based architecture & established stack | ✅ PASS | Exact constitutional stack (research R1); `src/features/{area}` with per-area `api.ts`; single envelope HTTP layer (research R9); TanStack Query for all server state; RHF + Zod forms |
| VII | Nord design system & professional UX | ✅ PASS | CSS custom properties → Tailwind tokens, shadcn token names; mandated dark palette + Snow Storm light; fixed semantic mapping; permanent left drawer + Hero Card, no top nav; AA contrast validated (research R7) |
| VIII | Localization conventions | ✅ PASS | i18next, one file per language (`en-US.json` default, `es-MX.json`), hierarchical typed keys, no hardcoded strings (research R8) |
| IX | Testing & quality discipline | ✅ PASS | Vitest + Testing Library, Playwright, MSW opt-in mock authority; loading/empty/error/no-access states in each screen's definition of done (research R10) |
| X | Temporal data — presentation boundary | ✅ PASS | Shared `formatDateTime` (UTC → local), UTC ISO `Z` on the wire; audit detail may show UTC (research R8) |
| XI | Simplicity | ✅ PASS | No Redux/Zustand, no micro-frontends, no BFF, no PWA; context + TanStack Query only |

**Post-design re-check (after Phase 1)**: all gates still pass. The two recorded items are
cross-repository dependencies (constitutionally required to be stated and stopped at), not
violations — Complexity Tracking stays empty.

## Project Structure

### Documentation (this feature)

```text
specs/001-admin-web-portal/
├── plan.md              # This file
├── research.md          # Phase 0 — decisions R1–R11
├── data-model.md        # Phase 1 — client-side types & validation
├── quickstart.md        # Phase 1 — validation guide V1–V9
├── contracts/
│   ├── admin-api.md     # consumed REST surface (verified against implementation)
│   └── oidc.md          # consumed OIDC surface & seeded client registration
├── checklists/
│   └── requirements.md  # spec quality checklist (passing)
└── tasks.md             # Phase 2 — /speckit-tasks output (NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
.env.development           # VITE_OIDC_AUTHORITY / VITE_OIDC_CLIENT_ID / VITE_ADMIN_API_BASE_URL
index.html                 # pre-paint theme script (no flash), font loading
vite.config.ts / tsconfig* / playwright.config.ts / vitest.config.ts
public/                    # static assets (favicon, mockServiceWorker.js)
mocks/                     # MSW handlers: adminApiHandlers.ts, oidcHandlers.ts
src/
├── main.tsx               # bootstrap (+ conditional MSW start)
├── index.css              # Nord tokens (:root light, .dark dark) + Tailwind theme mapping
├── app/
│   ├── App.tsx             # provider composition (Query, Auth, UiPreferences, Router)
│   ├── routes.tsx          # route table incl. guards
│   ├── i18n.ts             # i18next init + typed resources
│   └── UiPreferencesProvider.tsx  # theme + language persistence
├── components/ui/          # shadcn primitives + shared: PagedTable, FormDialog, Field,
│                           #   ConfirmDeactivateDialog, FriendlyError, EmptyState, NoAccessState
├── features/
│   ├── auth/               # AuthProvider, oidcConfig, LoginPage, CallbackPage,
│   │                       #   ProtectedRoute, useCallerContext (GET /api/me)
│   ├── shell/              # AppShell (left drawer), HeroCard, NavSection,
│   │                       #   ThemeSelector, LanguageSelector, OrganizationSwitcher
│   ├── organizations/      # OrganizationsPage + dialogs + api.ts
│   ├── users/              # UsersPage, UserDetailPage (claims, picture, assignments) + api.ts
│   ├── applications/       # ApplicationsPage, ApplicationDetail (resources, availability) + api.ts
│   ├── resources/          # ApiResource + Scope screens + api.ts
│   ├── clients/            # ClientsPage, ClientDetail (sets editors, secret rotation) + api.ts
│   ├── roles/              # RolesPage, RoleScopesDialog + api.ts
│   └── audit/              # AuditLogPage (filters) + api.ts   [token records slot reserved]
├── lib/
│   ├── http.ts             # single Axios instance: token attach + envelope interpretation
│   ├── apiError.ts         # typed envelope errors
│   ├── datetime.ts         # UTC → local formatting (locale-aware)
│   └── permissions.ts      # area→scope table, hasPermission, highestRoleLevel
└── locales/
    ├── en-US.json
    └── es-MX.json
tests/
├── unit/                   # Vitest component/unit specs (per feature)
└── e2e/                    # Playwright specs (sign-in shell, permissions, org lifecycle)
```

**Structure Decision**: Single frontend project at the repository root (constitutional layout,
Principle VI / Project Structure & Configuration). Feature-based `src/features/{area}` with one
`api.ts` per management area; the only cross-cutting layers are `app/` (composition), `lib/`
(HTTP/permissions/datetime), and `components/ui/` (shared primitives).

## Complexity Tracking

No constitutional violations — table intentionally empty. The two cross-repository dependencies
(Admin API token-record endpoints, research R5; IdP organization-selection support, research R6)
are recorded per the constitution and deferred, not worked around.
