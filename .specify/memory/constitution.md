<!--
Sync Impact Report
==================
Version change: (template) → 1.0.0
Rationale: Initial ratification of the SentryOS Admin Web constitution. All placeholder tokens
replaced with concrete values derived from the user's directive and the two sibling repositories
plus the original monorepo:
  - C:\Repositories\SentryOS-IdP (constitution v5.1.1) — the segregated IdP, deployed locally at
    https://localhost/SentryOS-IdP/. Source of the identity model (global Users / Applications /
    Clients / ApiResources / Scopes; organization-scoped Roles / RoleAssignments), the seeded
    public SPA client `sentry-management-web-app` (redirect http://localhost:5173/callback, CORS
    origin http://localhost:5173), the API resource `api-sentry-management` and its seven
    management scopes, UTC discipline, and the shared response envelope.
  - C:\Repositories\SentryOS-Admin-API (constitution v1.0.1) — the management REST API this web
    app consumes: scope-per-area authorization, standard envelope, pagination, deactivate-over-
    delete, complete entity coverage, role-level delegation.
  - C:\Repositories\portfolio-Sentry.OS (constitution v4.0.0, Principle X; Sentry.OS.Admin.Web) —
    the established frontend parameters carried forward: React + Vite + TypeScript + TailwindCSS
    + shadcn/ui, React Router, TanStack Query, Axios, React Hook Form + Zod, oidc-client-ts,
    i18next single-file-per-language, MSW/Vitest/Playwright, feature-based architecture, and the
    permanent left-drawer shell with Hero Card.
  - User directive (2026-07-12): this repository is the administration website for ALL IdP
    entities, with IdP login and permission-aware UI, professional design, and the Nord color
    palette (dark #2E3440 / #3B4252 / #D8DEE9 with #BF616A / #EBCB8B warm and #88C0D0 / #81A1C1
    cool accents) as the mandated theme.

Principles established:
  I.    Single-Purpose Administration Web App & Repository Boundary (NON-NEGOTIABLE)
  II.   IdP-Delegated Authentication — Authorization Code + PKCE (NON-NEGOTIABLE)
  III.  Scope-Based, Permission-Aware UI (NON-NEGOTIABLE)
  IV.   Complete Entity Administration Coverage
  V.    Organization Context & Role-Level Delegation
  VI.   Feature-Based Architecture & Established Web Stack (NON-NEGOTIABLE)
  VII.  Nord Design System & Professional UX (NON-NEGOTIABLE)
  VIII. Localization Conventions
  IX.   Testing & Quality Discipline
  X.    Temporal Data — Presentation-Boundary Localization
  XI.   Simplicity over Enterprise Complexity

Added sections: Technology Stack Constraints (with Project Structure & Configuration),
Development Workflow & Quality Gates, Governance.
Removed sections: none (template placeholders replaced).

Templates requiring updates:
  ✅ .specify/templates/plan-template.md — generic Constitution Check gate; no change needed
  ✅ .specify/templates/spec-template.md — no repo-specific language; no change needed
  ✅ .specify/templates/tasks-template.md — no repo-specific language; no change needed
  ✅ .specify/templates/checklist-template.md — no repo-specific language; no change needed

Follow-up TODOs:
  ⚠ The repository currently contains only README.md — the Vite/React scaffolding described
    under Project Structure does not exist yet; it will be created by the first feature's
    plan/implementation (/speckit-specify → /speckit-plan → /speckit-implement).
  ⚠ The IdP's seeded redirect URI (http://localhost:5173/callback) and CORS origin
    (http://localhost:5173) assume the Vite dev server default port; if the dev origin changes,
    the seed in SentryOS-IdP must change with it (cross-repository dependency).
  ⚠ The Admin API's local base URL is configuration (VITE_ADMIN_API_BASE_URL) and must match
    however the operator hosts C:\Repositories\SentryOS-Admin-API.
-->

# SentryOS Admin Web Constitution

SentryOS Admin Web is the **administration website** for the SentryOS platform: a React
single-page application whose entire job is presenting a professional, permission-aware UI for
managing **all** of the Identity Provider's entities — organizations, users, applications, OAuth
clients, API resources, scopes, roles, role assignments, and the read-only audit trail. It is the
third piece of a deliberately segregated three-repository system:

- **SentryOS IdP** (`C:\Repositories\SentryOS-IdP`, deployed locally at
  `https://localhost/SentryOS-IdP/`) — the sole token authority. Users sign in there; this web
  app never sees a credential.
- **SentryOS Admin API** (`C:\Repositories\SentryOS-Admin-API`) — the management REST API. It is
  the only backend this web app calls for entity data.
- **SentryOS Admin Web** (this repository) — the browser UI. It holds no data, validates no
  credentials, and enforces no security by itself; it presents what the token's scopes allow and
  lets the backends be the authority.

This constitution governs the architecture, boundaries, and non-negotiable engineering rules for
this web repository and supersedes ad-hoc preferences.

## Core Principles

### I. Single-Purpose Administration Web App & Repository Boundary (NON-NEGOTIABLE)

This repository builds and maintains **only the administration web application** — a React SPA.
Hard boundaries:

- **No backend code lives here.** No API endpoints, no server-side rendering host, no BFF
  (backend-for-frontend), no database access, no EF Core, and no references to the .NET solutions
  of the sibling repositories. The build output is static assets served over HTTPS.
- **It MUST NEVER issue, sign, mint, refresh-rotate, or introspect tokens itself.** All identity
  concerns are delegated to the SentryOS IdP via standard OIDC (Principle II). The app holds
  IdP-issued tokens only as an OIDC client.
- **It MUST NEVER call the database or bypass the Admin API.** Every entity read and mutation
  goes through the SentryOS Admin API with a bearer token. The IdP is contacted exclusively on
  its published OAuth/OIDC protocol surface (authorize, token, userinfo, discovery, endsession).
- **This is a public OAuth client.** As a browser SPA it can hold no secret: there MUST be no
  client secret, API key, or any other credential in source control, build output, or
  environment files committed to the repository.

Adding a backend, a second UI product, or direct data access is a constitutional violation and
MUST be recorded in the plan's Complexity Tracking with an approved justification (the expected
resolution being "do it in the appropriate sibling repository instead").

Rationale: The three-way segregation — IdP issues tokens, Admin API manages data, Admin Web
presents UI — keeps the credential-issuing attack surface away from the administration surface
and gives each repository exactly one reason to change.

### II. IdP-Delegated Authentication — Authorization Code + PKCE (NON-NEGOTIABLE)

Sign-in is exclusively **Authorization Code + PKCE against the SentryOS IdP** using
`oidc-client-ts`:

- The app renders no credential form. "Sign in" redirects the browser to the IdP's hosted login
  pages (which own passwords, 2FA, and forced password change); the IdP returns to the app's
  `/callback` route with an authorization code the library exchanges for tokens.
- The OIDC client is the IdP-seeded public SPA client **`sentry-management-web-app`**; the
  requested audience/resource is **`api-sentry-management`**. The app requests only the
  management scopes it needs; the IdP's scope-intersection rule decides what the token carries.
- The IdP authority URL MUST be configuration (`VITE_OIDC_AUTHORITY`, currently
  `https://localhost/SentryOS-IdP/` in local hosting), never hardcoded. Client id, redirect URI,
  and the Admin API base URL are likewise environment configuration.
- Token lifecycle is handled deliberately: expired/expiring access tokens trigger the library's
  renewal flow; a session that can no longer be renewed signs the user out to the login screen
  with a friendly message — never a broken screen or silent infinite spinner. Logout uses the
  IdP's end-session endpoint so the IdP session ends too.
- Tokens MUST NEVER be logged, rendered, or persisted beyond the storage the OIDC library
  manages. No token — access, identity, or refresh — may appear in console output, error
  reports, or analytics.

Rationale: Delegating every credential interaction to the IdP keeps this app out of the
credential-handling business entirely; a public PKCE client with configured endpoints is the
standard, auditable way for an SPA to participate in OAuth 2.0.

### III. Scope-Based, Permission-Aware UI (NON-NEGOTIABLE)

The UI is driven by the scopes present in the validated access token, mirroring the Admin API's
scope-per-area authorization:

| Management area                            | Required scope         |
|--------------------------------------------|------------------------|
| Organizations                              | `organizations.manage` |
| Applications (and availability links)      | `applications.manage`  |
| API Resources and Scopes                   | `resources.manage`     |
| Clients (URIs, origins, grants, secrets)   | `clients.manage`       |
| Roles and Role↔Scope attachments           | `roles.manage`         |
| Users, claims, and role assignments        | `users.manage`         |
| Audit log (read-only)                      | `audit.read`           |

Enforcement rules:

- **Route guards**: every management route requires an authenticated session; a route whose area
  scope is missing MUST NOT render — the user is shown a friendly "no access" state, never a
  blank page or raw API error.
- **Navigation is permission-aware**: drawer entries for areas the token does not grant are
  hidden (or visibly disabled with an explanatory tooltip — one convention, applied
  consistently); action buttons (create/edit/deactivate/assign) render only when the governing
  scope is present.
- **The UI is UX, not security.** Hiding a button is a courtesy; the Admin API is the enforcement
  point. The app MUST still handle `Unauthorized` and `Forbidden` envelope responses gracefully
  on every call, because the API may reject what the UI predicted it would allow.
- New management areas MUST map to a scope seeded in the IdP and enforced by the Admin API
  before their screens ship here (a cross-repository dependency the plan MUST record).

Rationale: Binding the UI to the same seeded scopes the API enforces makes authority end-to-end
consistent — what the user can see is what their token can do — while never mistaking client-side
hiding for enforcement.

### IV. Complete Entity Administration Coverage

This web app is the only human-facing administration surface for the platform, so it MUST
ultimately provide screens covering **all** IdP entities, honoring the two-tier model
(Principle V) and the Admin API's coverage rules:

- **Full lifecycle screens (list, detail, create, update, deactivate/delete):** `Organization`,
  `User` (including `UserClaim`, `UserProfilePicture`, and the user's role assignments),
  `Application` (including its `ApplicationOrganization` availability links), `Client`
  (including redirect URIs, CORS origins, grant types, allowed scopes, and secret rotation),
  `ApiResource`, `Scope`, `Role` (including `RoleScope` attachments and the administrative
  `Level`), and `RoleAssignment`.
- **Read-only:** `AuditLog` — filterable by organization, date range, entity type, and actor;
  the UI MUST NOT offer creation, editing, or deletion of audit records.
- **Runtime token records** (`RefreshToken`, `UserToken`): read/listing and administrative
  revocation only, exactly as the Admin API exposes them.

Coverage rules:

- **Deactivate over delete, reflected honestly.** Where the API deactivates instead of deleting
  (entities with dependents), the UI says "deactivate" and explains consequences in a
  confirmation dialog; destructive irreversible actions are never one accidental click away.
- **Pagination everywhere.** Every collection screen consumes the API's paginated shape (page,
  size, total count) — never fetch-all client-side pagination.
- **Integrity rules surface early.** The UI constrains choices to what the model allows (a
  client's allowed scopes are picked from its own application's scopes; a role's scopes from
  applications available to its organization) and still renders the API's `Conflict`/validation
  envelope errors clearly when a rule is rejected server-side.
- **Secrets display once.** A client secret returned at creation/rotation is shown exactly once
  with an explicit copy affordance and warning, and is never retrievable again in the UI.

Rationale: "Administer ALL the entities" is the product; enumerating the screens and their rules
prevents the portal from silently drifting into partial coverage or teaching users a model that
contradicts the IdP's invariants.

### V. Organization Context & Role-Level Delegation

The platform is organization-based; this UI makes the active organization explicit and honors
the delegation rules the backends enforce:

- The **active organization** is the one carried in the current access token. The drawer's Hero
  Card always displays it, so an administrator never mutates data without seeing which
  organization they are acting in.
- **Organization switching is re-authentication territory**: switching triggers a new token
  acquisition from the IdP for the selected organization. The app MUST NOT implement switching
  as a client-side filter or a request parameter it invents — the token is the truth.
- A non-global administrator sees only what their organization can see (applications available
  to it, users who are members of it) — the API already filters this; the UI simply must not
  cache or leak data across an organization switch (server-state caches are cleared or keyed by
  organization on switch).
- **Role-level delegation is respected in the UI**: role management screens disable
  assign/modify/remove affordances for roles at or above the current user's highest level in the
  active organization, and render the API's `Forbidden` response with a friendly explanation
  when the server rejects an elevation attempt anyway.

Rationale: Cross-organization confusion in an admin portal is how grants leak in practice — an
operator acting in the wrong organization. Making the active organization always visible, and
its switch a token-level event, keeps the UI aligned with the structural isolation the backends
enforce.

### VI. Feature-Based Architecture & Established Web Stack (NON-NEGOTIABLE)

The app MUST use the established stack: **React + Vite + TypeScript + TailwindCSS + shadcn/ui,
React Router, TanStack Query, Axios, React Hook Form + Zod, `oidc-client-ts`, i18next**,
organized in a **feature-based architecture**:

- `src/features/{area}/` holds each management area's pages, dialogs, and its own Axios service
  file (`api.ts`) — each Admin API area has its own service module; components MUST NOT call
  Axios directly.
- **Server state lives in TanStack Query** — queries and mutations with cache invalidation on
  mutation success; no hand-rolled fetch state, no duplicating server data into local state.
- **Forms use React Hook Form + Zod** — every create/edit form validates with a Zod schema
  before submission and maps API field-level validation errors back onto the form.
- **The envelope is handled deterministically.** Every response is the shared envelope
  `{ responseCode, responseMessage, data }`. A single shared HTTP layer interprets
  `Success`, `ValidationError`, `Unauthorized`, `Forbidden`, `NotFound`, `Conflict`, and
  `InternalServerError` consistently: validation errors reach forms, `Unauthorized` triggers the
  session-expiry flow (Principle II), `Forbidden` renders the no-access state, and unexpected
  errors show a friendly localized message — never a raw payload, stack trace, or blank screen.
- Shared, reusable primitives (buttons, dialogs, tables, form fields) live in
  `src/components/ui/`; app-level composition (routing, providers, i18n, theme) lives in
  `src/app/`; cross-cutting helpers in `src/lib/`.

Rationale: These are the conventions already proven in the original monorepo's portal; keeping
them makes the segregated repositories read as one system and makes every new entity screen a
repeatable pattern instead of a design decision.

### VII. Nord Design System & Professional UX (NON-NEGOTIABLE)

The portal's visual identity is the **Nord palette** applied as a design system, not per-screen
decoration:

- **Dark theme (default)** uses the mandated values: primary background `#2E3440` (dark
  blue-gray), secondary background / surfaces `#3B4252` (slate blue), primary text `#D8DEE9`
  (frosted white), warm accents `#BF616A` (aurora red) and `#EBCB8B` (yellow), cool accents
  `#88C0D0` (bright mint) and `#81A1C1` (ice blue).
- **Semantic mapping is fixed** so color always means the same thing: `#88C0D0` is the primary
  interactive/brand color; `#81A1C1` is secondary/informational (links, focus, info states);
  `#BF616A` is destructive/error; `#EBCB8B` is warning/attention. Success states use Nord's
  aurora green (`#A3BE8C`), completing the palette family.
- **A light theme MUST exist** alongside dark, built from the same Nord family (Snow Storm
  backgrounds `#ECEFF4`/`#E5E9F0` with Polar Night text `#2E3440`) so the established Light/Dark
  selector keeps working; dark is the default.
- **Tokens, not hex literals.** All colors are defined once as CSS custom properties mapped into
  the Tailwind theme; components consume semantic tokens (e.g. `background`, `surface`,
  `primary`, `destructive`) and MUST NOT hardcode hex values.
- **Professional shell layout**: a **permanent left drawer** — no top navigation bar, ribbon, or
  dashboard header. The drawer contains a **Hero Card** (profile picture, user name, email,
  active organization), the navigation for the management areas (permission-aware, Principle
  III), a Light/Dark theme selector, a language selector, and a logout button.
- **Accessibility is part of professional.** Text/background combinations MUST meet WCAG AA
  contrast, interactive elements have visible focus states, and destructive actions are
  confirmed before execution.

Rationale: A fixed, token-based palette with fixed semantics is what makes a UI read as
professionally designed — consistent, calm, and predictable — and lets the theme evolve (or a
theme be added) by editing tokens, never by hunting hex codes through components.

### VIII. Localization Conventions

Localization uses **i18next with exactly one JSON file per language** under `src/locales/`
(e.g. `en-US.json`), never split by feature:

- Keys are organized hierarchically as `Feature → Screen → Section → Phrase`
  (e.g. `authentication.login.signInButton`), with strongly typed keys preferred over raw
  strings.
- **No hardcoded user-facing strings** in components — every label, message, error, and
  confirmation goes through i18next.
- Only `en-US.json` ships initially; adding a language MUST require only a new same-structured
  file, selectable from the drawer's language selector.
- Product names (SentryOS, SentryOS IdP, SentryOS Admin) remain exactly as specified and are not
  translated.

Rationale: One file per language with a fixed hierarchy makes translation a data task, not a
code change, and keeps every screen localizable from day one.

### IX. Testing & Quality Discipline

- **Unit/component tests** run on Vitest + Testing Library (jsdom) covering rendering, form
  validation, envelope error handling, and permission-aware visibility logic.
- **End-to-end tests** run on Playwright against a **mocked OIDC authority and Admin API via
  MSW** — the mock authority is off by default in `npm run dev` and enabled only via explicit
  configuration (e.g. `VITE_ENABLE_MSW=true`), so normal development runs against the real IdP.
- **Quality gates**: TypeScript MUST compile with no errors (`tsc -b`), lint MUST pass, and the
  test suites MUST pass before merge. UI states for loading, empty, error, and no-access are
  part of a screen's definition of done — not follow-up work.
- Test fixtures MUST NOT contain real personal data or real credentials; seed-style placeholder
  identities only.

Rationale: An admin portal's failure modes are mostly state-handling bugs (expired session, 403,
validation, empty page); testing those paths against mocks keeps the suite deterministic while
the real IdP integration stays the development default.

### X. Temporal Data — Presentation-Boundary Localization

The backends operate exclusively in UTC and serialize ISO 8601 with the `Z` designator; **this
app is the presentation boundary**:

- Every timestamp received is treated as UTC and converted to the user's local time zone for
  display, consistently formatted through a shared date utility (and localized through i18next
  where formats differ per language).
- Every point-in-time value sent to the API is converted back to UTC ISO 8601 `Z`; the app MUST
  NOT send local-time strings or invent offsets.
- Audit and security timestamps MAY additionally show the UTC value where precision matters
  (e.g. audit log detail), but display defaults to local time.

Rationale: UTC-only backends with edge-only localization is the platform's contract; this app is
the edge, so getting conversion right here eliminates the entire class of DST/offset bugs.

### XI. Simplicity over Enterprise Complexity

The portal favors simplicity over speculative infrastructure. Until a real business requirement
exists it intentionally **omits**: global client-state managers (Redux/Zustand/MobX — TanStack
Query plus React context/hooks suffice), micro-frontend architectures, a BFF layer, custom
design-system packages beyond the token-based Nord theme, offline/PWA support, and client-side
permission engines beyond the scope checks of Principle III. Introducing any of these MUST be
justified by a concrete requirement in the triggering plan's Complexity Tracking and, where it
changes a principle, treated as a constitutional amendment.

Rationale: A small, conventional SPA is easier to secure, review, and extend than a speculative
platform; every omitted layer is one less place for an admin portal to leak authority.

## Technology Stack Constraints

Frontend: React, Vite, TypeScript, TailwindCSS, shadcn/ui, React Router, TanStack Query, Axios,
React Hook Form, Zod, `oidc-client-ts`, i18next; testing via Vitest, Testing Library,
Playwright, and MSW. Substituting a core technology in this list is a constitutional change
requiring a version bump and recorded justification. Additive libraries that do not displace a
listed technology and do not violate a principle MAY be introduced through normal review. No
backend technology is part of this repository (Principle I).

### Project Structure & Configuration

Representative layout (names MAY be adjusted in a plan provided the roles and boundaries hold):

```
src/
  app/            (App shell composition: routing, providers, i18n setup, theme tokens)
  components/ui/  (shared primitives: button, dialog, table, form field, paged table)
  features/
    auth/         (AuthProvider, callback page, protected route, OIDC config, session)
    shell/        (left drawer, Hero Card, active-organization provider)
    organizations/ users/ applications/ clients/ resources/ roles/ audit/
                  (one folder per management area: pages, dialogs, api.ts service)
  lib/            (HTTP layer with envelope handling, date/UTC utilities, helpers)
  locales/        (en-US.json — one file per language)
```

Environment configuration (never hardcoded, no secrets — this is a public client):

- `VITE_OIDC_AUTHORITY` — IdP base URL (currently `https://localhost/SentryOS-IdP/`).
- `VITE_OIDC_CLIENT_ID` — `sentry-management-web-app` (IdP-seeded public SPA client).
- `VITE_ADMIN_API_BASE_URL` — the SentryOS Admin API base URL.
- The IdP seed registers redirect URI `http://localhost:5173/callback` and CORS origin
  `http://localhost:5173` for local development; changing the dev origin is a cross-repository
  dependency on the IdP's seed.

## Development Workflow & Quality Gates

- Every feature plan MUST include a Constitution Check that explicitly evaluates Principles
  I–XI; violations MUST be justified in Complexity Tracking or the design MUST change.
- Any proposal to add a backend, direct database access, token issuance, or a second UI product
  to this repository MUST be rejected and redirected to the appropriate sibling repository
  (Principle I).
- Schema, seed, or scope changes needed by a screen belong to the IdP repository; new endpoints
  belong to the Admin API repository. Plans MUST record these cross-repository dependencies and
  stop at stating them — never work around them client-side.
- Every new management screen MUST ship with: route guard + scope gating (Principle III),
  pagination (Principle IV), envelope error handling incl. loading/empty/error/no-access states
  (Principle VI), Nord-token styling with both themes (Principle VII), localized strings
  (Principle VIII), and tests (Principle IX).
- Security-affecting changes (OIDC configuration, token handling, storage, logout, CORS-facing
  origins) MUST be called out in review and MUST NOT weaken an existing control without explicit
  sign-off. Tokens never appear in logs, errors, or test snapshots.
- Code review MUST verify feature-based structure, TanStack Query usage for server state, the
  single envelope-handling HTTP layer, and absence of hardcoded colors, strings, and URLs.

## Governance

This constitution supersedes other practices and preferences within the SentryOS Admin Web
repository. Amendments MUST be proposed as a documented change describing the motivation, the
affected principles or sections, and any migration impact, and MUST be approved before merge.

Versioning follows semantic versioning of the constitution itself:

- **MAJOR** — backward-incompatible governance changes: removing or redefining a principle, or
  relaxing a NON-NEGOTIABLE.
- **MINOR** — adding a principle/section or materially expanding guidance.
- **PATCH** — clarifications, wording, and non-semantic refinements.

All plans, specs, task lists, and pull requests MUST verify compliance with these principles;
unjustified complexity or boundary violations MUST be rejected. Where runtime or agent guidance
conflicts with this document, this constitution prevails.

**Version**: 1.0.0 | **Ratified**: 2026-07-12 | **Last Amended**: 2026-07-12
