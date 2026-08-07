# Contract: SentryOS Admin API (consumed)

**Base URL**: `VITE_ADMIN_API_BASE_URL` (local: `https://localhost/SentryOS-API`)
**Source of truth**: `C:\Repositories\SentryOS-Admin-API` (implemented controllers, verified 2026-07-12)
**Auth**: `Authorization: Bearer <access token>` on every call. JSON is camelCase; enums serialize
as strings. Every response is the envelope `ApiResponse<T>`; list payloads are `PagedResult<T>`
(`page`, `pageSize` query params; default 20, max 100). See [data-model.md](../data-model.md).

## Error semantics (all endpoints)

| responseCode | HTTP | Portal behavior |
|---|---|---|
| Success | 200 | unwrap `data` |
| ValidationError | 400 | form-level banner (message is a joined string) |
| Unauthorized | 401 | one silent renew attempt → session-expired flow |
| Forbidden | 403 | friendly "not allowed" state |
| NotFound | 404 | friendly "not found" state with way back |
| Conflict | 409 | explain dependency/duplicate in place |
| InternalServerError | 500 | friendly generic error + retry |

## Caller context

| Method & route | Scope | Notes |
|---|---|---|
| GET `/api/me` | any authenticated | `CallerContext`: identity, active organization, `isGlobalAdministrator`, roles, roleLevels, permissions |

## Organizations — scope `organizations.manage`

| Method & route | Purpose |
|---|---|
| POST `/api/organizations` | create |
| GET `/api/organizations` | list (paged) |
| GET `/api/organizations/{id}` | detail |
| PUT `/api/organizations/{id}` | update |
| POST `/api/organizations/{id}/deactivate` | deactivate (no hard delete) |

## Users — scope `users.manage`

| Method & route | Purpose |
|---|---|
| POST `/api/users` | create |
| GET `/api/users` | list (paged, supports search filter) |
| GET `/api/users/{id}` | detail |
| PUT `/api/users/{id}` | update |
| POST `/api/users/{id}/deactivate` | deactivate |
| GET `/api/users/{id}/roles` | list role assignments |
| POST `/api/users/{id}/roles` | assign role (active org; rank-checked) |
| DELETE `/api/users/{id}/roles/{roleId}` | remove assignment |
| GET `/api/users/{id}/claims` | list claims |
| PUT `/api/users/{id}/claims` | replace claim set |
| DELETE `/api/users/{id}/claims/{claimId}` | remove claim |
| GET `/api/users/{id}/profile-picture` | fetch picture (binary/absent) |
| PUT `/api/users/{id}/profile-picture` | upload/replace |
| DELETE `/api/users/{id}/profile-picture` | remove |

## Applications — scope `applications.manage`

| Method & route | Purpose |
|---|---|
| POST `/api/applications` | create |
| GET `/api/applications` | list (paged) |
| GET `/api/applications/{id}` | detail |
| PUT `/api/applications/{id}` | update |
| POST `/api/applications/{id}/deactivate` | deactivate |
| GET `/api/applications/{id}/organizations` | availability links |
| PUT `/api/applications/{id}/organizations` | replace availability set |

## API Resources — scope `resources.manage`

| Method & route | Purpose |
|---|---|
| POST `/api/api-resources` | create (under an application) |
| GET `/api/api-resources` | list (paged; filterable by application) |
| GET `/api/api-resources/{id}` | detail |
| PUT `/api/api-resources/{id}` | update |
| DELETE `/api/api-resources/{id}` | delete (Conflict if scopes exist) |

## Scopes — scope `resources.manage`

| Method & route | Purpose |
|---|---|
| POST `/api/scopes` | create (under an API resource) |
| GET `/api/scopes` | list (paged; filterable by resource/application) |
| GET `/api/scopes/{id}` | detail |
| PUT `/api/scopes/{id}` | update |
| DELETE `/api/scopes/{id}` | delete (Conflict while referenced) |

## Clients — scope `clients.manage`

| Method & route | Purpose |
|---|---|
| POST `/api/clients` | create (under an application) |
| GET `/api/clients` | list (paged; filterable by application) |
| GET `/api/clients/{id}` | detail |
| PUT `/api/clients/{id}` | update core settings |
| POST `/api/clients/{id}/deactivate` | deactivate |
| PUT `/api/clients/{id}/scopes` | replace allowed-scopes set (⊆ own application's scopes) |
| PUT `/api/clients/{id}/redirect-uris` | replace redirect URI set |
| PUT `/api/clients/{id}/cors-origins` | replace origin set |
| PUT `/api/clients/{id}/grant-types` | replace grant-type set |
| POST `/api/clients/{id}/secret/rotate` | rotate; **response carries plaintext secret exactly once** |

## Roles — scope `roles.manage`

| Method & route | Purpose |
|---|---|
| POST `/api/roles` | create (active organization; level rank-checked) |
| GET `/api/roles` | list (paged; active organization only) |
| GET `/api/roles/{id}` | detail |
| PUT `/api/roles/{id}` | update |
| DELETE `/api/roles/{id}` | delete (Conflict while assigned) |
| POST `/api/roles/{id}/scopes` | attach scope (⊆ org-available applications' scopes) |
| DELETE `/api/roles/{id}/scopes/{scopeId}` | detach scope |

## Audit — scope `audit.read`

| Method & route | Purpose |
|---|---|
| GET `/api/audit-logs` | read-only list (paged, newest first). Filters: `organizationId` (global admin only), `fromUtc`, `toUtc`, `targetType`, `actorUserId`, `action` — combinable |

## Not yet exposed (cross-repository dependency — research R5)

Token records (`RefreshToken`/`UserToken` list + revoke): **no endpoints exist**. The portal
reserves the UI slot and ships without it until `SentryOS-Admin-API` adds them.

## Server-side guarantees the portal relies on

- Organization isolation: token's organization claim drives query filters; roles/assignments/audit
  are always scoped to the caller's active organization (global admins may override where noted).
- Role-rank enforcement on role create/update/assign/remove (the UI mirrors it, the API decides).
- Deactivate-over-delete for dependent entities; `Conflict` on integrity violations.
- Every mutation is audited server-side; the portal writes no audit records.
- CORS: dev origin `http://localhost:5173` is allow-listed in the API's dev configuration.
