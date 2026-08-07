# Contract: SentryOS IdP (OIDC, consumed)

**Authority**: `VITE_OIDC_AUTHORITY` (local: `https://localhost/SentryOS-IdP`)
**Source of truth**: `C:\Repositories\SentryOS-IdP` (server + seed, verified 2026-07-12)

## Client registration (seeded by the IdP — configuration data, not portal code)

| Setting | Value |
|---|---|
| Client id | `sentry-management-web-app` |
| Type | Public SPA — PKCE required, **no client secret** |
| Grant | Authorization Code + PKCE; rotating refresh tokens |
| Redirect URI | `http://localhost:5173/callback` (dev seed) |
| Post-logout redirect | portal origin |
| CORS origin | `http://localhost:5173` (dev seed) |
| Access token lifetime | 3600 s |
| Identity token lifetime | 300 s |
| Refresh token lifetime | 14 days, rotation enabled |
| Allowed scopes | all seven management scopes (seed) |

## Protocol endpoints used (per IdP discovery document)

| Endpoint | Portal usage |
|---|---|
| `/.well-known/openid-configuration` | discovery (oidc-client-ts bootstrap) |
| `authorize` | sign-in redirect (code + PKCE); hosted login/2FA/password-change pages are the IdP's |
| `token` | code exchange; refresh-token renewal (silent renew) |
| `userinfo` | optional profile enrichment |
| `endsession` | logout — ends the IdP session, returns to portal |
| `jwks` | (used by the Admin API, not the portal) |

## Scopes requested at sign-in

```
openid profile email
organizations.manage applications.manage resources.manage
clients.manage roles.manage users.manage audit.read
```

The IdP issues the **intersection** of the user's role scopes (active organization) and the
client's allowed scopes — a low-privilege administrator simply receives fewer scopes. The portal
never inspects the raw `scope` claim; effective permissions come from `GET /api/me`
([admin-api.md](admin-api.md)).

## Token claims relevant to the platform

| Claim | Meaning |
|---|---|
| `sub` | user id |
| `organization_id` | active organization for this session (drives API-side isolation) |
| `scope` | space-delimited effective scopes (validated by the Admin API) |
| `name`, `email` | identity display (Hero Card falls back to `/api/me`) |

## Session rules the portal implements

- Sign-in is a full-page redirect to `authorize`; the portal renders no credential UI.
- Callback route `/callback` completes the code exchange and restores the pre-login location.
- Silent renewal uses the refresh-token grant (`automaticSilentRenew`); renewal failure ends the
  session and routes to the sign-in screen with a friendly message.
- Logout calls `endsession` so the IdP session terminates too.
- Organization switching = new sign-in round-trip (research R6); selecting a *different*
  organization awaits IdP-side support (cross-repository dependency).
- Tokens never appear in logs, URLs (beyond the OIDC protocol itself), error messages, or state
  the UI renders.
