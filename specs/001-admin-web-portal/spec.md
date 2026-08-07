# Feature Specification: SentryOS Administration Web Portal

**Feature Branch**: `001-admin-web-portal`

**Created**: 2026-07-12

**Status**: Draft

**Input**: User description: "desarrolla la web applicacion de administracion usa el admin endpoint en
https://localhost/SentryOS-API y agrega un login el login apunta a https://localhost/SentryOS-IdP y de
ahi el token se usa parara el api, asegurate de manejar todas las entidades usar themming, traducciones
react vite, taiolwind css y shadcnui y que tenga un diseño profesional, el usuario debe aparecer en una
hero card"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Sign in through the identity provider and land in the portal shell (Priority: P1)

An administrator opens the portal and is asked to sign in. Signing in sends them to the SentryOS
identity provider's hosted login page (the portal itself never shows a password form). After
authenticating there, they return to the portal already signed in. They see the portal shell: a
permanent left drawer containing a Hero Card with their profile picture, name, email, and active
organization, the navigation menu, theme and language selectors, and a logout button. Logging out ends
both the portal session and the identity provider session. If their session expires and cannot be
renewed, they are returned to the sign-in screen with a friendly explanation — never a broken screen.

**Why this priority**: Nothing else in the portal is reachable without authentication, and the shell
(drawer + Hero Card) is the frame every other story renders inside. This story alone is a demonstrable,
valuable slice: secure entry into a professional-looking portal.

**Independent Test**: With the identity provider and management API running, a seeded administrator can
sign in, see their own identity and organization in the Hero Card, and log out. No entity screens are
required to verify it.

**Acceptance Scenarios**:

1. **Given** an unauthenticated visitor on any portal URL, **When** they arrive, **Then** they see a
   sign-in screen and no management data, and choosing "Sign in" redirects them to the identity
   provider's login page.
2. **Given** an administrator who completes login at the identity provider, **When** they return to the
   portal, **Then** the portal shell renders with their profile picture (or initials fallback), name,
   email, and active organization in the Hero Card.
3. **Given** a signed-in administrator, **When** they choose "Log out", **Then** the portal session and
   the identity provider session both end and they land on the sign-in screen.
4. **Given** a signed-in administrator whose session expires and cannot be renewed, **When** they
   perform any action, **Then** they are taken to the sign-in screen with a friendly message explaining
   the session ended.
5. **Given** a visitor who cancels or fails login at the identity provider, **When** they are returned
   to the portal, **Then** they see a friendly explanation and can retry — not an error dump.

---

### User Story 2 - Permission-aware navigation (Priority: P1)

A signed-in administrator only sees and reaches the management areas their access rights allow. An
administrator with rights over users and roles — but not clients — sees Users and Roles in the
navigation but not Clients; navigating to a Clients URL directly shows a friendly "no access" state
instead of the screen. Someone with full rights sees everything.

**Why this priority**: The portal is an administration surface over an identity system; showing areas a
person cannot act on (or leaking their existence) undermines trust, and unguarded routes are broken UX
even though the backend still refuses the data.

**Independent Test**: Sign in with tokens carrying different permission sets and verify the navigation
entries and route access match the table of area permissions exactly.

**Acceptance Scenarios**:

1. **Given** an administrator whose access grants only some management areas, **When** the shell
   renders, **Then** only those areas appear as navigation entries.
2. **Given** an administrator lacking access to an area, **When** they open that area's URL directly,
   **Then** a friendly "no access" state renders instead of the screen and no data is requested.
3. **Given** an administrator whose access predicted an action would succeed, **When** the management
   API still refuses it, **Then** the portal shows a friendly "not allowed" message — never a raw
   technical error.

---

### User Story 3 - Manage organizations (Priority: P2)

An administrator opens Organizations and sees a paginated list. They can create a new organization,
edit its details, and deactivate one that is no longer used — with a confirmation dialog that explains
deactivation preserves history. They cannot hard-delete an organization that has roles or members.

**Why this priority**: Organizations are the platform's top-level scoping concept; every role and
assignment hangs off one. It is the first entity a fresh deployment needs after sign-in.

**Independent Test**: Create, edit, and deactivate an organization end-to-end from the UI and verify
the list reflects each change.

**Acceptance Scenarios**:

1. **Given** the Organizations screen, **When** it loads, **Then** organizations render in a paginated
   list showing name, status, and creation date, with a visible total count.
2. **Given** a valid new-organization form, **When** the administrator saves it, **Then** the new
   organization appears in the list and a success confirmation is shown.
3. **Given** an organization with dependents, **When** the administrator chooses to remove it, **Then**
   the portal offers deactivation (not deletion), asks for confirmation explaining the consequence, and
   the organization shows as inactive afterwards.
4. **Given** a form submitted with invalid values, **When** the API rejects it, **Then** each rejected
   field shows its specific message inline and the form keeps the entered values.

---

### User Story 4 - Manage users, their claims, and their role assignments (Priority: P2)

An administrator opens Users and sees a paginated, searchable list of user identities. They can create
a user, edit profile details, manage the user's additional claims, deactivate a user, and — most
importantly — assign and remove organization-scoped roles, making the user a member of organizations
through those assignments. They cannot grant a role at or above their own rank in that organization.

**Why this priority**: User and access management is the single most frequent administrative task the
portal exists for.

**Independent Test**: Create a user, assign them a role in an organization, verify the assignment
lists, remove it, and deactivate the user — all from the UI.

**Acceptance Scenarios**:

1. **Given** the Users screen, **When** it loads, **Then** users render paginated with name, email, and
   status, and can be filtered by search text.
2. **Given** a user's detail view, **When** the administrator assigns a role from an organization,
   **Then** the assignment appears in the user's assignments list with the organization and role named.
3. **Given** an administrator whose highest rank in an organization is X, **When** they attempt to
   assign a role ranked at or above X in that organization, **Then** the action is unavailable or
   refused with a friendly explanation of the ranking rule.
4. **Given** a user with history, **When** the administrator removes them, **Then** the portal offers
   deactivation preserving history, not hard deletion.
5. **Given** a user's claims view, **When** the administrator adds or removes a claim, **Then** the
   change is confirmed and reflected immediately in the list.

---

### User Story 5 - Manage the application catalog: applications, API resources, scopes (Priority: P3)

An administrator opens Applications and sees the shared product catalog. They can register an
application, define its API resources, define the scopes under each resource, and control which
organizations each application is available to.

**Why this priority**: The catalog defines what can be granted; it changes less often than users and
roles but everything downstream (clients, roles) picks from it.

**Independent Test**: Register an application with one resource and two scopes, attach it to an
organization, and verify each level lists correctly.

**Acceptance Scenarios**:

1. **Given** the Applications screen, **When** it loads, **Then** applications render paginated with
   name and status.
2. **Given** an application's detail, **When** the administrator adds an API resource and scopes under
   it, **Then** the hierarchy (application → resource → scopes) is visible and navigable.
3. **Given** an application's organization availability view, **When** the administrator attaches or
   detaches an organization, **Then** the availability list updates and detaching warns about roles
   that reference the application's scopes.
4. **Given** a scope in use by roles or clients, **When** the administrator tries to delete it, **Then**
   the portal surfaces the conflict clearly instead of silently failing.

---

### User Story 6 - Manage OAuth clients (Priority: P3)

An administrator manages the clients of an application: creating a client, editing its redirect URIs,
allowed origins, grant types, and allowed scopes (drawn only from that application's scopes), and
rotating its secret. A newly issued secret is displayed exactly once with a copy control and a warning
that it cannot be retrieved again.

**Why this priority**: Clients are how real software connects to the platform; secret rotation and
scope allow-lists are routine security operations.

**Independent Test**: Create a client under an application, restrict its allowed scopes, rotate its
secret, and verify the one-time display behavior.

**Acceptance Scenarios**:

1. **Given** an application's clients view, **When** the administrator creates a client, **Then** it
   appears listing its grant type and allowed scopes.
2. **Given** the allowed-scopes editor, **When** the administrator picks scopes, **Then** only scopes
   belonging to that client's application are offered.
3. **Given** a secret rotation, **When** the new secret is issued, **Then** it is shown exactly once
   with a copy control and warning, and is never displayable again in the portal.
4. **Given** a client's redirect URIs and origins editor, **When** entries are added or removed,
   **Then** the changes persist and invalid URL formats are rejected inline.

---

### User Story 7 - Manage roles and their permissions (Priority: P3)

An administrator manages the roles of an organization: creating a role with an administrative rank,
attaching permissions (scopes) drawn only from applications available to that organization, and
removing roles. They never see or edit another organization's roles unless they are a global
administrator.

**Why this priority**: Roles turn the catalog into usable authority; they complete the
grant-management loop started in Users.

**Independent Test**: Create a role, attach scopes, assign it to a user (story 4), then remove the
attachment and the role.

**Acceptance Scenarios**:

1. **Given** the Roles screen, **When** it loads, **Then** only the active organization's roles render,
   paginated.
2. **Given** the role's permission editor, **When** the administrator attaches scopes, **Then** only
   scopes from applications available to the active organization are offered.
3. **Given** a role ranked at or above the administrator's own highest rank, **When** they attempt to
   edit or delete it, **Then** the action is unavailable or refused with a friendly explanation.
4. **Given** a role with active assignments, **When** the administrator tries to remove it, **Then**
   the portal explains the dependency instead of silently deleting.

---

### User Story 8 - Review the audit trail and active sessions (Priority: P4)

An administrator opens the Audit area to answer "who changed what, when": a read-only, filterable
record of administrative activity (by organization, date range, entity type, and actor). They can also
list issued token records and revoke a suspicious session, but never create or edit these records.

**Why this priority**: Auditability is what makes an identity administration tool trustworthy, but it
depends on all mutation stories existing first.

**Independent Test**: Perform a mutation (e.g., create an organization), then find it in the audit list
and filter down to it; list token records and revoke one.

**Acceptance Scenarios**:

1. **Given** the Audit screen, **When** it loads, **Then** audit entries render paginated, newest
   first, each showing actor, action, target, organization, and timestamp.
2. **Given** the filters, **When** the administrator applies organization, date range, entity type, or
   actor, **Then** the list narrows accordingly and filters are combinable.
3. **Given** any audit entry, **When** the administrator inspects it, **Then** no edit or delete action
   exists anywhere in the area.
4. **Given** the token records view, **When** the administrator revokes a token, **Then** the record
   shows as revoked after confirmation, and creating or editing token records is impossible.

---

### User Story 9 - Switch theme and language (Priority: P4)

From the drawer, the administrator switches between the dark theme (default) and a light theme, and
switches the portal language. Both choices apply immediately across every screen and persist across
sessions on that browser. All text — labels, messages, errors, confirmations — follows the selected
language.

**Why this priority**: Theming and localization are explicit product requirements and part of the
professional feel, but they refine an experience the earlier stories must first create.

**Independent Test**: Toggle theme and language from the drawer and verify every visited screen
reflects both choices, including after reloading the browser.

**Acceptance Scenarios**:

1. **Given** the portal in its default dark theme, **When** the administrator selects light, **Then**
   every screen renders in the light theme immediately and the choice survives a reload.
2. **Given** the language selector, **When** the administrator picks another available language,
   **Then** all interface text switches immediately, including validation and error messages.
3. **Given** any theme/language combination, **When** any screen renders, **Then** text remains
   readable with adequate contrast and no layout breakage.

---

### User Story 10 - Switch the active organization (Priority: P4)

An administrator who belongs to several organizations switches the active organization from the
drawer. The switch re-establishes their session for the selected organization; afterwards, the Hero
Card shows the new organization and every organization-scoped screen (roles, assignments, audit)
reflects only that organization's data.

**Why this priority**: Multi-organization administrators are a core platform concept, but the portal is
fully usable for single-organization administrators without it.

**Independent Test**: With a user holding roles in two organizations, switch between them and verify
the Hero Card and the Roles screen contents change accordingly, with no data from the previous
organization lingering.

**Acceptance Scenarios**:

1. **Given** an administrator with roles in more than one organization, **When** they open the
   organization switcher, **Then** only their organizations are offered.
2. **Given** an organization switch, **When** it completes, **Then** the Hero Card shows the new active
   organization and previously loaded organization-scoped data is not shown stale.
3. **Given** an administrator in exactly one organization, **When** they view the switcher, **Then**
   their single organization is shown without a misleading choice.

### Edge Cases

- Identity provider unreachable at sign-in: the portal shows a friendly "service unavailable, retry"
  state, not a hang or crash.
- Management API unreachable or erroring after sign-in: screens show a friendly error state with a
  retry affordance; navigation remains usable.
- Access rights change while signed in (e.g., a permission removed): the next refused API call is
  handled gracefully and the navigation reflects the new rights after session renewal.
- Deactivated administrator attempts to sign in: the identity provider refuses; the portal relays the
  friendly failure state.
- A list page beyond the last page (e.g., after deletions): the list falls back to a valid page rather
  than rendering empty forever.
- Very long names, emails, or scope lists: layouts truncate gracefully with full values available on
  hover/detail, in both themes and all languages.
- User with no profile picture: the Hero Card and user lists show an initials avatar fallback.
- Two administrators editing the same record: the later save surfaces the conflict message from the
  API clearly and preserves the editor's input.
- Direct URL access to a detail view of an entity that no longer exists: a friendly "not found" state
  renders with a way back to the list.
- Browser reload on any screen: the session is restored (or re-established silently) without losing
  the current location, theme, or language.

## Requirements *(mandatory)*

### Functional Requirements

**Authentication & session**

- **FR-001**: The portal MUST require sign-in before any management screen or data is reachable; the
  only public surfaces are the sign-in screen and the post-login return route.
- **FR-002**: Sign-in MUST be delegated entirely to the SentryOS identity provider (deployed at
  `https://localhost/SentryOS-IdP/` in local development): the portal never renders its own credential
  form and never sees a password.
- **FR-003**: The credentials issued at sign-in MUST be used for every management API call (API
  deployed at `https://localhost/SentryOS-API` in local development); the portal obtains all entity
  data exclusively from that API.
- **FR-004**: The portal MUST renew the session transparently while the user is active, and when
  renewal is impossible it MUST end the session and return the user to sign-in with a friendly
  explanation.
- **FR-005**: Logout MUST end both the portal session and the identity provider session.
- **FR-006**: Session credentials MUST never be exposed in page content, links, logs, or error
  messages.

**Shell, Hero Card & professional design**

- **FR-007**: All authenticated screens MUST render inside a shell with a permanent left drawer; there
  MUST be no top navigation bar, ribbon, or dashboard header.
- **FR-008**: The drawer MUST contain a Hero Card showing the signed-in user's profile picture (with
  initials fallback), display name, email, and active organization.
- **FR-009**: The drawer MUST also contain the permission-aware navigation, a theme selector, a
  language selector, the organization switcher, and a logout control.
- **FR-010**: The portal MUST apply the Nord visual identity as defined in the project constitution:
  dark theme by default (background `#2E3440`, surfaces `#3B4252`, text `#D8DEE9`, accents `#BF616A`,
  `#EBCB8B`, `#88C0D0`, `#81A1C1`) with fixed semantic meaning per color, plus a light counterpart
  from the same palette family.
- **FR-011**: Every screen MUST provide deliberate loading, empty, error, and no-access states; raw
  technical errors MUST never be shown to the user.
- **FR-012**: Text/background combinations MUST meet WCAG AA contrast in both themes, interactive
  elements MUST have visible focus states, and destructive actions MUST require confirmation.

**Permissions**

- **FR-013**: The portal MUST derive the user's allowed management areas from the access rights carried
  in their session, per the constitution's area-to-permission table (organizations, applications,
  resources/scopes, clients, roles, users, audit).
- **FR-014**: Navigation entries for areas the user cannot access MUST NOT be shown, and their routes
  MUST render a friendly "no access" state without requesting data.
- **FR-015**: Action affordances (create, edit, deactivate, assign, rotate, revoke) MUST only render
  when the governing permission is present, and the portal MUST still handle API refusals gracefully
  when they occur anyway.

**Entity management coverage**

- **FR-016**: The portal MUST provide full lifecycle management screens (paginated list, detail,
  create, update, deactivate/delete) for: organizations, users (including their claims, profile
  picture, and role assignments), applications (including per-organization availability), OAuth
  clients (including redirect URIs, allowed origins, grant types, allowed scopes, and secret
  rotation), API resources, scopes, and roles (including their permission attachments and
  administrative rank).
- **FR-017**: The audit trail MUST be exposed read-only with combinable filters (organization, date
  range, entity type, actor); no create, edit, or delete affordance may exist for audit records.
- **FR-018**: Issued token records MUST be listable and administratively revocable, and MUST never be
  creatable or editable from the portal.
- **FR-019**: Every collection screen MUST be paginated with a visible total count; the portal MUST
  never fetch unbounded result sets.
- **FR-020**: Where an entity has dependents, the portal MUST offer deactivation (clearly labeled, with
  a consequence-explaining confirmation) instead of hard deletion; hard deletion is offered only for
  dependent-free records the API permits deleting.
- **FR-021**: Choice inputs MUST be constrained to the platform's integrity rules: a client's allowed
  scopes come only from its application's scopes; a role's permissions come only from applications
  available to its organization; role assignments pair a user with a role of the assigner's active
  organization.
- **FR-022**: A newly created or rotated client secret MUST be displayed exactly once with a copy
  control and an explicit warning, and MUST be irretrievable through the portal afterwards.
- **FR-023**: Validation failures returned by the API MUST map to the specific offending form fields
  inline, preserving the user's input.

**Organization context**

- **FR-024**: The active organization MUST always be visible in the Hero Card while signed in.
- **FR-025**: Switching organization MUST re-establish the session for the selected organization; the
  portal MUST NOT implement switching as a local filter, and MUST NOT show stale data from the
  previous organization after a switch.
- **FR-026**: Organization-scoped screens (roles, role assignments, audit) MUST reflect only the active
  organization unless the user is a global administrator.
- **FR-027**: Role management and assignment affordances MUST respect administrative rank: actions on
  roles at or above the user's own highest rank in the active organization are unavailable, and API
  refusals of such actions are explained in friendly terms.

**Localization & time**

- **FR-028**: Every piece of user-facing text MUST come from the translation system; the portal ships
  with English (default) and Spanish, and adding a language MUST require only one new translation
  file.
- **FR-029**: Theme and language choices MUST apply immediately, portal-wide, and persist across
  sessions on the same browser.
- **FR-030**: All timestamps received from the platform (UTC) MUST display in the user's local time
  zone consistently; audit detail views MAY additionally show the UTC value. All point-in-time values
  sent to the API MUST be expressed in UTC.

### Key Entities

- **Organization**: top-level scoping unit for authority ("plant"); has name, status, creation date;
  owns roles and receives applications via availability links.
- **User**: global identity (name, email, profile picture, status) that may belong to many
  organizations through role assignments; carries additional claims.
- **User Claim**: an extra fact about a user (type/value pair) manageable from the user's detail.
- **Application**: shared catalog product; owns API resources and clients; attached to one or more
  organizations via availability links.
- **API Resource**: an API surface belonging to an application; groups scopes.
- **Scope**: a named permission belonging to an API resource; the unit roles aggregate and clients are
  allowed.
- **Client**: a connecting piece of software belonging to exactly one application; has redirect URIs,
  allowed origins, grant types, an allowed-scopes subset of its application's scopes, and a rotatable
  secret.
- **Role**: organization-scoped named collection of scopes with an administrative rank (level).
- **Role Assignment**: the link granting a user a role (and thereby organization membership).
- **Audit Record**: read-only trace of an administrative action: actor, action, target, organization,
  timestamp.
- **Token Record**: read-only trace of an issued session/token; supports administrative revocation
  only.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A seeded administrator can go from opening the portal to seeing their identity in the
  Hero Card in under 1 minute, including the identity provider round-trip.
- **SC-002**: 100% of the platform's manageable entity types are administrable from the portal
  (create/read/update/deactivate where applicable), verified by walking every entity through its
  lifecycle from the UI alone.
- **SC-003**: An administrator can create an organization, a role with permissions, and assign it to a
  user in under 5 minutes without documentation.
- **SC-004**: 100% of management areas are hidden and their routes refused for users lacking the
  corresponding access right, verified across at least three distinct permission sets.
- **SC-005**: Zero raw technical error payloads are user-visible across a full pass of failure drills
  (API down, session expired, forbidden action, validation failure, missing record).
- **SC-006**: Theme and language switches apply on every screen in under 1 second and survive a browser
  restart, verified across all screens in both themes and both shipped languages.
- **SC-007**: Every collection screen paginates and displays a total count; no screen loads an
  unbounded list, verified against datasets of 1,000+ records per entity.
- **SC-008**: A client secret is observable exactly once after creation/rotation; any later attempt to
  view it finds no affordance to do so.
- **SC-009**: After an organization switch, zero records from the previous organization remain visible
  in organization-scoped screens.
- **SC-010**: All text/background combinations in both themes pass WCAG AA contrast checks.

## Assumptions

- The SentryOS identity provider (local deployment `https://localhost/SentryOS-IdP/`) and the SentryOS
  management API (local deployment `https://localhost/SentryOS-API`) exist, are running, and already
  enforce authentication, permissions, organization isolation, pagination, and auditing server-side;
  the portal is a pure consumer. Both URLs are deployment configuration, not fixed values.
- The identity provider's seed already registers this portal as a sign-in client and provisions a
  bootstrap administrator, which is how the first user enters the portal.
- The portal is the presentation layer only: it stores no entity data of its own and writes no audit
  records (mutations are audited by the management API).
- "Handle all entities" means the entity set exposed by the management API today (organizations,
  users + claims + profile pictures, applications + availability, clients, API resources, scopes,
  roles + permission attachments + rank, role assignments, read-only audit, revocable token records);
  new entity types added to the API later are new features.
- "Translations" ships as English (`en-US`, default) plus Spanish, since the product owner operates in
  Spanish; the translation structure must make further languages a pure content task.
- Theme and language preferences persist per browser (local persistence), not as server-side profile
  settings.
- Desktop-first professional tool: layouts must remain usable at typical laptop widths; dedicated
  mobile layouts are out of scope for this feature.
- The technology stack (React, Vite, TailwindCSS, shadcn/ui, etc.) is fixed by the project
  constitution and is intentionally not restated as requirements here.
- Password management flows (change, reset, 2FA) are owned by the identity provider's hosted pages and
  are out of the portal's scope.
