# Data Model: SentryOS Administration Web Portal

**Feature**: `001-admin-web-portal` | **Date**: 2026-07-12

The portal owns **no persistent data**. Every entity below is a client-side TypeScript view of a
DTO served by the Admin API (see [contracts/admin-api.md](contracts/admin-api.md)); the schema of
record lives in the IdP repository. This file defines the client-side types, their relationships,
the validation the portal enforces before submission, and the client-only state the portal keeps.

## Shared shapes

```ts
// Every Admin API response
interface ApiResponse<T> {
  responseCode: 'Success' | 'ValidationError' | 'Unauthorized' | 'Forbidden'
              | 'NotFound' | 'Conflict' | 'InternalServerError';
  responseMessage: string;
  data: T | null;
}

// Every list endpoint's data payload
interface PagedResult<T> {
  items: T[];
  totalCount: number;
  page: number;      // 1-based
  pageSize: number;  // default 20, max 100
}

interface PagingParams { page?: number; pageSize?: number; }
```

All timestamps arrive as ISO 8601 UTC strings (`...AtUtc` properties, `Z` designator) and are
converted to local time at render only.

## Caller context (Hero Card & permissions — `GET /api/me`)

```ts
interface CallerContext {
  userId: string | null;
  name: string | null;
  email: string | null;
  activeOrganization: { id: string; name: string | null } | null;
  isGlobalAdministrator: boolean;
  roles: string[];
  roleLevels: number[];          // caller's role levels in the active organization
  permissions: string[];         // effective management scopes — drives all area gating
}
```

Derived client-side helpers: `hasPermission(scope)`, `highestRoleLevel = max(roleLevels)` (used
for role-rank gating, FR-027).

## Entities (API-served)

### Organization

| Field | Type | Notes |
|---|---|---|
| id | Guid | |
| name | string | required, unique (server-enforced) |
| description | string \| null | |
| isActive | boolean | deactivate-over-delete |
| createdAtUtc | ISO UTC | display-only |

Form validation (Zod): `name` non-empty ≤ server max; `description` optional.
Lifecycle: create → update → deactivate (confirmation dialog; no hard delete).

### User (global identity)

| Field | Type | Notes |
|---|---|---|
| id | Guid | |
| email | string | required, valid email, unique |
| name | string | required |
| isActive / isLockedOut | boolean | deactivate preserves history |
| twoFactorEnabled | boolean | display |
| createdAtUtc | ISO UTC | |

Subresources:
- **UserClaim**: `{ id, type, value }` — list/replace-set/delete from user detail.
- **UserProfilePicture**: bytes via `GET/PUT/DELETE /api/users/{id}/profile-picture`; UI shows
  initials fallback when absent (also used in Hero Card for the signed-in user).
- **RoleAssignment (user view)**: `{ roleId, roleName, organizationId, organizationName, level,
  assignedAtUtc }` — assign (`POST /roles`), remove (`DELETE /roles/{roleId}`). Assignment implies
  organization membership (derived, no membership entity).

Form validation: email format, name non-empty; role assignment constrained to roles of the active
organization ranked **below** the caller's highest level (UI disables; server re-enforces).

### Application (shared catalog)

| Field | Type | Notes |
|---|---|---|
| id | Guid | |
| name, slug | string | required |
| description | string \| null | |
| isActive | boolean | deactivate-over-delete |

Subresource: **organization availability** — `GET/PUT /api/applications/{id}/organizations`
replaces the set of attached organization ids; detaching warns about dependent roles/scopes.

### ApiResource

| Field | Type | Notes |
|---|---|---|
| id | Guid | |
| applicationId | Guid | parent — immutable after create |
| name | string | required (resource identifier, e.g. `api-sentry-management`) |
| displayName / description | string \| null | |

Hard-deletable when scope-free (server decides; UI surfaces `Conflict`).

### Scope

| Field | Type | Notes |
|---|---|---|
| id | Guid | |
| apiResourceId | Guid | parent — immutable after create |
| name | string | required (e.g. `users.manage`) |
| displayName / description | string \| null | |

Hard-deletable when unused; `Conflict` rendered when roles/clients reference it.

### Client (OAuth)

| Field | Type | Notes |
|---|---|---|
| id | Guid | record id |
| applicationId | Guid | exactly one application — immutable |
| clientId | string | protocol identifier, required, unique |
| displayName | string | required |
| requirePkce / requireClientSecret | boolean | |
| accessTokenLifetimeSeconds, identityTokenLifetimeSeconds, refreshTokenLifetimeSeconds | number | positive ints |
| refreshTokenRotationEnabled | boolean | |
| isActive | boolean | deactivate-over-delete |

Subresource set-replacement editors (each a `PUT` of the full set):
- **allowed scopes** — pick-list constrained to the parent application's scopes only;
- **redirect URIs** — absolute URL validation client-side;
- **CORS origins** — origin format validation;
- **grant types** — allowed values from the API contract.

**Secret rotation** (`POST /secret/rotate`): response carries the plaintext secret **once**;
client-side state holds it only in the confirmation dialog and never caches/queries it again.

### Role (organization-scoped)

| Field | Type | Notes |
|---|---|---|
| id | Guid | |
| organizationId | Guid | always the active organization |
| name | string | required, unique per organization |
| description | string \| null | |
| level | number | administrative rank; editable only below caller's highest level |

Subresource: **role scopes** — attach (`POST /scopes`), detach (`DELETE /scopes/{scopeId}`);
pick-list constrained to scopes of applications available to the active organization.
Delete refused (`Conflict`) while assignments exist; UI explains.

### AuditLogEntry (read-only)

| Field | Type | Notes |
|---|---|---|
| id | Guid | |
| organizationId | Guid | |
| actorUserId / actorDisplay | Guid \| string | |
| action | string | e.g. `Auth.SignIn`, `Organizations.Create` |
| targetType / targetId | string / Guid | |
| occurredAtUtc | ISO UTC | list ordered newest-first |

Filters (combinable): `organizationId` (global admins only), `fromUtc`, `toUtc`, `targetType`,
`actorUserId`, `action`. No mutation surface exists.

### TokenRecord — deferred

Not exposed by the Admin API today (see research R5). Reserved navigation slot under Audit;
no client type shipped in this feature.

## Client-only state (no server persistence)

| State | Where | Notes |
|---|---|---|
| OIDC session (tokens, expiry) | `oidc-client-ts` UserManager storage | never rendered or logged |
| Caller context | TanStack Query cache (`['me']`) | invalidated on sign-in/renewal/switch |
| Theme (`dark` \| `light`) | `localStorage` | default `dark`; applied pre-paint |
| Language (`en-US` \| `es-MX`) | `localStorage` | default `en-US` |
| Server entity caches | TanStack Query, keys `[entity, filters, page]` | invalidated on mutation success; fully cleared on logout and organization switch |

## Relationship map (client perspective)

```
CallerContext.permissions ──gates──▶ navigation areas & action affordances
Application ──▶ ApiResource ──▶ Scope
Application ──▶ Client ──allowed scopes ⊆ own Application's scopes
Application ◀──availability──▶ Organization
Organization ──▶ Role ──attached scopes ⊆ scopes of Applications available to that Organization
User ──RoleAssignment──▶ Role (implies membership of Role.organizationId)
AuditLogEntry — read-only trace of all of the above
```
