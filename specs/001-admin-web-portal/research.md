# Research: SentryOS Administration Web Portal

**Feature**: `001-admin-web-portal` | **Date**: 2026-07-12

All Technical Context unknowns are resolved below. Sources: the SentryOS Admin API implementation
(`C:\Repositories\SentryOS-Admin-API`, inspected 2026-07-12), the SentryOS IdP implementation and
seed (`C:\Repositories\SentryOS-IdP`), the proven legacy portal
(`C:\Repositories\portfolio-Sentry.OS\src\Sentry.OS.Admin.Web`), and the project constitution
(v1.0.0).

## R1. Stack versions and baseline dependencies

- **Decision**: React 19 + Vite 8 + TypeScript ~6.0 + Tailwind CSS 4 (`@tailwindcss/vite`) +
  shadcn/ui components (generated into `src/components/ui/`), react-router-dom 7, TanStack Query 5,
  Axios, React Hook Form 7 + Zod 4 (`@hookform/resolvers`), `oidc-client-ts` 3.x, i18next 26 +
  react-i18next 17, lucide-react icons, Geist variable font. Testing: Vitest 4 + Testing Library +
  jsdom, Playwright, MSW 2. Linting: oxlint.
- **Rationale**: This exact family is already proven in the legacy portal
  (`portfolio-Sentry.OS/src/Sentry.OS.Admin.Web/package.json`) against the same backends, and the
  constitution fixes the technology list. Reusing the known-good major versions avoids re-research
  of integration quirks (Tailwind 4 Vite plugin, shadcn on Tailwind 4, MSW worker setup).
- **Alternatives considered**: Next.js (rejected — constitution forbids a backend/SSR host; static
  SPA only); CSS-in-JS theming (rejected — Tailwind + CSS custom properties is the constitutional
  token mechanism); TanStack Router (rejected — react-router-dom is the constitutional choice).

## R2. OIDC integration parameters

- **Decision**: `oidc-client-ts` `UserManager` with:
  - `authority = VITE_OIDC_AUTHORITY` (local: `https://localhost/SentryOS-IdP`)
  - `client_id = sentry-management-web-app` (seeded public PKCE client, no secret)
  - `redirect_uri = <origin>/callback`, `post_logout_redirect_uri = <origin>/`
  - `response_type = code` (Authorization Code + PKCE)
  - `scope = "openid profile email organizations.manage applications.manage resources.manage
    clients.manage roles.manage users.manage audit.read"` — the seeded client is allowed all seven
    management scopes; the IdP intersects them with the signed-in user's role scopes, so a
    lower-privileged administrator simply receives fewer scopes in the token.
  - Silent renewal via refresh tokens: the seeded client issues rotating refresh tokens
    (access token 3600 s, refresh 14 days, rotation enabled), so `automaticSilentRenew` with the
    refresh-token grant works without an iframe.
- **Rationale**: Matches the IdP seed exactly (`IdentitySeed.cs`: `RequirePkce = true`,
  `RequireClientSecret = false`, redirect `http://localhost:5173/callback`, CORS origin
  `http://localhost:5173`, `RefreshTokenRotationEnabled = true`).
- **Alternatives considered**: requesting only `openid profile email` and re-requesting management
  scopes per area (rejected — the IdP's intersection rule already narrows the grant; one request is
  simpler and matches the Admin API's expectation of a space-delimited `scope` claim).

## R3. Permission model for the UI

- **Decision**: After sign-in, call `GET /api/me` (any authenticated caller; no specific scope) and
  drive the entire permission-aware UI from its response: `permissions` (effective management
  scopes), `isGlobalAdministrator`, `roles`, `roleLevels`, `activeOrganization`, plus `name`,
  `email`, `userId` for the Hero Card. Area gating table (constitution Principle III):
  organizations → `organizations.manage`, applications → `applications.manage`, resources/scopes →
  `resources.manage`, clients → `clients.manage`, roles → `roles.manage`, users → `users.manage`,
  audit → `audit.read`. The token's raw `scope` claim is not parsed client-side; `/api/me` is the
  single source of truth.
- **Rationale**: `MeController` exists precisely for this ("so the web app can decide which
  administration areas to render") and returns the caller's highest role levels needed for the
  role-rank UX (FR-027).
- **Alternatives considered**: decoding the access token client-side (rejected — duplicates server
  logic, breaks if claim format changes; the API already exposes the computed view).

## R4. Admin API surface (confirmed implemented)

- **Decision**: Build against the implemented controllers (see `contracts/admin-api.md` for the
  full route/scope table): `api/organizations`, `api/users` (+ roles, claims, profile-picture
  subresources), `api/applications` (+ organizations availability), `api/api-resources`,
  `api/scopes`, `api/clients` (+ scopes, redirect-uris, cors-origins, grant-types, secret/rotate,
  deactivate), `api/roles` (+ scopes attach/detach), `api/audit-logs` (read-only, filterable),
  `api/me`. All responses use the shared envelope `{ responseCode, responseMessage, data }` with
  `responseCode` serialized as a **string** (`JsonStringEnumConverter`), camelCase JSON. List
  endpoints take `page`/`pageSize` (default 20, max 100) and return
  `data: { items, totalCount, page, pageSize }`.
- **Rationale**: Inspected directly from `SentryOS.Admin.Api/Controllers/*` and
  `SentryOS.Admin.Application/Common/PagedResult.cs` — this is the real contract, not an
  assumption.
- **Alternatives considered**: none — the API is the fixed counterpart.

## R5. Token records (FR-018) — cross-repository dependency

- **Decision**: The Admin API currently exposes **no** `RefreshToken`/`UserToken` endpoints.
  Defer the "token records list + revoke" screens: record the dependency (new read/revoke
  endpoints in `SentryOS-Admin-API`), exclude those screens from this feature's build scope, and
  design the Audit area's navigation so a "Sessions/Tokens" tab can slot in later without
  restructuring.
- **Rationale**: Constitution (Development Workflow): new endpoints belong to the Admin API
  repository; plans record the dependency and stop — never work around it client-side.
- **Alternatives considered**: calling IdP internals or the database (constitutional violations).

## R6. Organization switching (US10) — partial cross-repository dependency

- **Decision**: The IdP today always resolves the active organization with a `null` requested
  organization (`SignInHandler` → `FindActiveOrganizationAsync(user.Id, null, …)`) — there is no
  authorize-flow parameter to pick one, and `/api/me` returns only the active organization, not
  the user's full membership list. Implement US10 as: Hero Card always shows the active
  organization (from `/api/me`); the switcher control renders only the active organization and a
  "switch" action that performs a fresh IdP sign-in round-trip (`prompt`-style re-auth). True
  selection of a *different* organization requires IdP support (an organization-selection step or
  authorize parameter) — recorded as a cross-repository dependency; the repository interface
  already accepts a `Guid? organizationId`, so the IdP-side change is anticipated.
- **Rationale**: Constitution Principle V — switching is re-authentication territory and MUST NOT
  be a client-side filter; the portal must not invent an organization parameter the IdP ignores.
- **Alternatives considered**: client-side org filter over API data (constitutional violation);
  blocking the whole feature on the IdP change (rejected — single-org administrators, including
  the seeded bootstrap admin, are fully served without it; spec US10 scenario 3 covers the
  single-organization display).

## R7. Theming — Nord tokens with light/dark

- **Decision**: Define all colors as CSS custom properties on `:root` (light) and `.dark` (dark,
  default) in `src/index.css`, mapped into Tailwind 4 via `@theme inline`, following the shadcn/ui
  token names (`--background`, `--card`, `--primary`, `--destructive`, …) so generated components
  theme automatically. Dark (default): background `#2E3440`, surface/card `#3B4252`, text
  `#D8DEE9`, primary `#88C0D0`, info/links/focus `#81A1C1`, destructive `#BF616A`, warning
  `#EBCB8B`, success `#A3BE8C`. Light: backgrounds `#ECEFF4`/`#E5E9F0`, surfaces `#D8DEE9`
  borders, text `#2E3440`, same accent hues (darkened variants where AA contrast requires, e.g.
  accents used as text on light backgrounds). Theme choice persisted in `localStorage` and applied
  by toggling the `dark` class on `<html>` before first paint (inline script) to avoid flash.
- **Rationale**: Constitution Principle VII mandates tokens-not-hex-literals and fixed semantics;
  routing Nord through shadcn's token names means zero per-component styling work. WCAG AA note:
  Nord accents on `#2E3440` pass AA for large text/UI components; body text stays `#D8DEE9`
  (≈10.9:1). On light backgrounds the accents are used at Nord's darker "frost" values or with
  dark foregrounds — validated during implementation with a contrast checker.
- **Alternatives considered**: `prefers-color-scheme` only (rejected — explicit selector required);
  separate Tailwind config themes (rejected — CSS variables are the Tailwind 4 idiom).

## R8. Localization — two languages, one file each

- **Decision**: i18next + react-i18next with exactly `src/locales/en-US.json` (default) and
  `src/locales/es-MX.json`, keys `feature.screen.section.phrase`, TypeScript resource typing via
  `i18next.d.ts` (`resources` typed from the en-US file) so keys are compile-checked. Language
  persisted in `localStorage`; selector in the drawer. Timestamps formatted with `Intl.DateTimeFormat`
  through one shared `formatDateTime` utility (UTC → local, per Principle X), locale-aware.
- **Rationale**: Constitution Principle VIII (one file per language, hierarchy, typed keys); the
  spec ships English + Spanish; `es-MX` matches the operator's locale.
- **Alternatives considered**: per-feature JSON namespaces (constitutional violation);
  date-fns/luxon (rejected — `Intl` covers display-only needs without a dependency).

## R9. HTTP layer and envelope handling

- **Decision**: One Axios instance in `src/lib/http.ts`: request interceptor attaches the current
  access token; response interceptor unwraps the envelope and normalizes every outcome to a typed
  result — `Success` resolves with `data`; `ValidationError` throws a typed `ApiError` carrying
  the message for field mapping; `Unauthorized` triggers one silent-renew attempt then the
  session-expired flow; `Forbidden`, `NotFound`, `Conflict`, `InternalServerError` throw typed
  errors rendered by shared UI states. Note: the API's validation failures arrive as a single
  joined message string (`ExceptionHandlingMiddleware` joins FluentValidation errors), so forms
  show a form-level error banner plus client-side Zod per-field validation (which mirrors the
  API's syntax rules and catches almost everything before submission).
- **Rationale**: Constitution Principle VI requires a single envelope-interpreting HTTP layer;
  the observed middleware shape (message string, no field dictionary) dictates the field-mapping
  strategy honestly instead of pretending per-field server errors exist.
- **Alternatives considered**: fetch + custom wrapper (rejected — Axios is constitutional);
  per-feature interceptors (rejected — duplicates session/error policy).

## R10. Testing strategy

- **Decision**: Vitest + Testing Library for components (permission-gated rendering, forms,
  envelope error states, Hero Card, theme/language switching); MSW 2 mocking both the Admin API
  (envelope-shaped handlers) and the OIDC authority (discovery/token/userinfo), enabled only when
  `VITE_ENABLE_MSW=true`; Playwright e2e for the P1 journeys (sign-in redirect → callback → shell,
  permission-aware nav, logout, session expiry) and one full entity lifecycle (organizations)
  against the mock authority. `npm run dev` talks to the real IdP + API by default.
- **Rationale**: Constitution Principle IX prescribes exactly this split; the legacy portal's
  `mocks/oidcHandlers.ts` pattern is a proven template.
- **Alternatives considered**: e2e against the real IdP (rejected for CI determinism; the real
  integration is exercised in `npm run dev` and quickstart validation).

## R11. Environment configuration

- **Decision**: `.env.development` committed with local defaults —
  `VITE_OIDC_AUTHORITY=https://localhost/SentryOS-IdP`,
  `VITE_OIDC_CLIENT_ID=sentry-management-web-app`,
  `VITE_ADMIN_API_BASE_URL=https://localhost/SentryOS-API`; production values injected at deploy.
  No secrets exist (public client). Dev server stays on `http://localhost:5173` because the IdP
  seed registers that exact redirect URI and CORS origin, and the Admin API's dev CORS allows it.
- **Rationale**: User-specified endpoints; seed alignment verified in both sibling repos.
- **Alternatives considered**: none material.
