# Upora Hub SSO / OIDC Implementation Guide

## Overview

Each Upora Hub can independently configure its authentication method. By default, hubs use **Upora Auth** (Amazon Cognito). Hubs can opt into **External SSO (OIDC)** so that their users authenticate through a corporate Identity Provider (IdP) such as Okta, Azure AD, Google Workspace, Auth0, etc.

**Key Design Principle**: SSO users are **completely isolated** from Upora Cognito users. There is no email-based merging. If a hub enables external SSO, only users who authenticate through that SSO provider can access the hub. Existing Cognito users cannot join SSO hubs, and SSO users cannot access the main Upora platform.

---

## Architecture

### Data Model

#### `hubs.auth_config` (JSONB column)

Stores the per-hub authentication configuration:

```json
{
  "provider": "upora" | "oidc",
  "oidcIssuerUrl": "https://your-company.okta.com",
  "oidcClientId": "abc123",
  "oidcClientSecret": "secret-here",
  "emailClaim": "email",       // default: "email"
  "nameClaim": "name",         // default: "name"
  "scopes": "openid email profile"  // default
}
```

- `provider: "upora"` — Default. Uses Upora's Cognito authentication.
- `provider: "oidc"` — Uses an external OIDC-compatible Identity Provider.

#### `users.auth_provider` (VARCHAR column)

Tracks which authentication system created a user:

- `"cognito"` — Default for all Upora users (created via Cognito sign-up).
- `"oidc:<hub_id>"` — Created via SSO login for a specific hub. The hub ID is embedded so we know exactly which hub's SSO created this user.

#### `users.auth_provider_sub` (VARCHAR column)

Stores the external subject identifier (`sub` claim) from the OIDC provider. This is the unique, stable ID that the IdP uses for the user. Combined with `auth_provider`, this uniquely identifies an SSO user.

**Index**: `idx_users_auth_provider_sub ON users(auth_provider, auth_provider_sub) WHERE auth_provider_sub IS NOT NULL`

---

## OIDC Login Flow

### Sequence

```
Browser                     Backend                      IdP (e.g., Okta)
   │                            │                              │
   │  1. Click "Sign in with SSO"                              │
   │ ──────────────────────────►│                              │
   │                            │                              │
   │  2. GET /api/auth/hub/:slug/oidc/login                    │
   │                            │──► OIDC Discovery            │
   │                            │    (.well-known/openid-config)│
   │                            │◄──────────────────────────── │
   │                            │                              │
   │  3. 302 Redirect to IdP   │                              │
   │ ◄─────────────────────────│                              │
   │                            │                              │
   │  4. User authenticates at IdP ──────────────────────────► │
   │ ◄──────────────────────────────────────────────────────── │
   │                            │                              │
   │  5. IdP redirects to callback with auth code              │
   │ ──────────────────────────►│                              │
   │  GET /api/auth/hub/:slug/oidc/callback?code=xxx&state=yyy │
   │                            │                              │
   │                            │  6. Exchange code for tokens │
   │                            │ ────────────────────────────►│
   │                            │ ◄────────────────────────── │
   │                            │                              │
   │                            │  7. Extract user info from   │
   │                            │     ID token claims          │
   │                            │                              │
   │                            │  8. Find or create SSO user  │
   │                            │     + auto-join hub          │
   │                            │                              │
   │  9. 302 Redirect to frontend with token                   │
   │ ◄─────────────────────────│                              │
   │  /hubs/:slug?ssoToken=xxx&ssoUserId=yyy                   │
   │                            │                              │
   │  10. Frontend stores session, loads hub                   │
```

### Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/api/auth/hub/:slug/oidc/login` | GET | Initiates OIDC flow. Discovers issuer, builds auth URL, redirects to IdP. |
| `/api/auth/hub/:slug/oidc/callback` | GET | Handles IdP callback. Exchanges code, creates/finds user, redirects to frontend. |
| `/api/auth/hub/:slug/sso-info` | GET | Returns public SSO status (no secrets). Used by frontend to determine login method. |
| `/api/hubs/:id/auth-config` | GET | Returns auth config for hub admins (client secret masked). |
| `/api/hubs/:id/auth-config` | PATCH | Updates auth config (hub admins only). |

---

## User Isolation Rules

### Core Principle

SSO users and Cognito users are **completely separate identities**. They never merge.

### Rules

1. **SSO hubs block manual invitations.** Members join automatically when they authenticate through the SSO provider. The invite endpoint returns 400 for OIDC hubs.

2. **Email collision handling.** If an SSO user's email matches an existing Cognito user, the SSO user is created with a hub-scoped email (`{sub}@hub-{slug}.sso`) to avoid unique constraint violations. The original email from the IdP is still available in the session data.

3. **Hub access control.** Non-public, non-OIDC hubs require an explicit membership to view. OIDC hubs allow viewing the hub page (to show the SSO login button) but content is only shown to authenticated members.

4. **User scoping.** An SSO user (`auth_provider: "oidc:<hub_id>"`) can only access the hub they authenticated for. They don't have access to the main Upora platform or other hubs.

---

## Configuring SSO for a Hub

### Via the UI

1. Navigate to **Hub Management** → **Settings** tab
2. Scroll to the **Authentication** section
3. Select **External SSO (OIDC)**
4. Fill in:
   - **Issuer URL** (required) — The OIDC discovery URL (e.g., `https://company.okta.com`, `https://accounts.google.com`)
   - **Client ID** (required) — From your IdP's application registration
   - **Client Secret** (optional) — Required for confidential clients; leave blank for public clients using PKCE
5. Optionally expand **Advanced claim mapping** to customize:
   - Email claim (default: `email`)
   - Name claim (default: `name`)
   - Scopes (default: `openid email profile`)
6. Click **Save Authentication Settings**

### IdP Configuration (Customer Side)

The customer must register a new OIDC application in their IdP with these settings:

| Setting | Value |
|---|---|
| **Redirect URI** | `https://<backend-domain>/api/auth/hub/<hub-slug>/oidc/callback` |
| **Grant Type** | Authorization Code |
| **Scopes** | `openid email profile` |
| **Response Type** | `code` |

For local development, the redirect URI is:
```
http://localhost:3000/api/auth/hub/<hub-slug>/oidc/callback
```

---

## Technology

- **Library**: `openid-client` v5 (Node.js) — handles OIDC discovery, authorization URL construction, token exchange, and claims validation.
- **State management**: In-memory state store for CSRF protection (prototype). Production should use Redis.
- **Token format**: Base64url-encoded JSON payload (prototype). Production should use proper JWT with RS256 signing.

---

## Future Work

### High Priority

1. **JWT Token Signing** — Replace the prototype base64url token with properly signed JWTs (RS256). This involves:
   - Generating an RSA key pair for the Upora backend
   - Signing tokens with the private key
   - Validating tokens on subsequent requests using the public key
   - Setting appropriate expiry times and refresh token flow

2. **Redis State Store** — Move the OIDC state (CSRF) storage from in-memory `Map` to Redis for multi-instance deployments.

3. **Session Management for SSO Users** — Currently SSO tokens are stored in `sessionStorage`. Implement proper session handling:
   - Token refresh flow
   - Session expiry
   - Logout endpoint that also logs out from the IdP (front-channel/back-channel logout)

4. **SSO User API Authentication** — Currently the backend uses `x-user-id` headers (from Cognito middleware). SSO users need their own authentication middleware that validates the SSO token and sets the request context.

### Medium Priority

5. **SAML Support** — Some enterprise customers use SAML instead of OIDC. Would require:
   - Adding `saml` as a third `provider` option
   - Using a SAML library (e.g., `samlify` or `passport-saml`)
   - SP metadata generation endpoint
   - ACS (Assertion Consumer Service) endpoint

6. **Client Secret Encryption** — Currently stored as plaintext in the `auth_config` JSONB. Should be encrypted at rest using AWS KMS or a local encryption key.

7. **OIDC Configuration Validation** — Add a "Test Connection" button that:
   - Attempts OIDC discovery on the provided issuer URL
   - Validates that the client ID is recognized
   - Reports any configuration errors

8. **Admin Dashboard for SSO Users** — Provide hub admins with visibility into SSO users:
   - List of users who have logged in via SSO
   - Last login timestamps
   - Ability to revoke access (remove from hub_members)

### Low Priority

9. **PKCE Support** — For public clients (no client secret), implement PKCE (Proof Key for Code Exchange) flow. The `openid-client` library supports this natively.

10. **Group/Role Mapping** — Map IdP groups/roles to Upora roles:
    - e.g., IdP group "Managers" → Upora role "admin"
    - e.g., IdP group "Staff" → Upora role "member"
    - Configure mapping in `auth_config`

11. **Multi-IdP Support** — Allow a single hub to accept authentication from multiple OIDC providers (e.g., Google + Okta).

12. **SCIM Provisioning** — Support SCIM (System for Cross-domain Identity Management) for automated user provisioning/deprovisioning from the IdP.

---

## Files Reference

### Backend

| File | Purpose |
|---|---|
| `backend/src/entities/hub.entity.ts` | Hub entity with `authConfig` JSONB column |
| `backend/src/entities/user.entity.ts` | User entity with `authProvider` and `authProviderSub` columns |
| `backend/src/modules/hubs/hubs-auth.controller.ts` | OIDC login/callback HTTP endpoints |
| `backend/src/modules/hubs/hubs-auth.service.ts` | OIDC flow logic, user creation, token issuance |
| `backend/src/modules/hubs/hubs.service.ts` | Auth config CRUD, invitation blocking for SSO hubs |
| `backend/src/modules/hubs/hubs.controller.ts` | Auth config GET/PATCH endpoints |
| `backend/src/modules/hubs/hubs.module.ts` | Module registration for auth controller/service |
| `backend/src/migrations/1736800000000-AddHubAuthConfig.ts` | Database migration |

### Frontend

| File | Purpose |
|---|---|
| `frontend/src/app/features/hub-manage/hub-manage.component.ts` | SSO configuration form in Settings tab |
| `frontend/src/app/features/hub-home/hub-home.component.ts` | SSO login detection, SSO callback handling |
| `frontend/src/app/core/services/hubs.service.ts` | `getSsoInfo()` API method |

---

## Testing Checklist

- [ ] Create hub with default (Upora) auth → verify normal access
- [ ] Switch hub to OIDC → verify Upora users see "SSO Required" page
- [ ] Configure valid OIDC provider → verify login redirects to IdP
- [ ] Complete OIDC login → verify new user created with `auth_provider: "oidc:<hub_id>"`
- [ ] Verify SSO user is auto-joined to hub
- [ ] Verify manual invite is blocked for SSO hubs (400 error)
- [ ] Verify SSO user email collision creates hub-scoped email
- [ ] Switch hub back to Upora auth → verify normal access resumes
- [ ] Verify client secret is masked in GET auth-config response
- [ ] Verify non-admin users cannot read/update auth-config
