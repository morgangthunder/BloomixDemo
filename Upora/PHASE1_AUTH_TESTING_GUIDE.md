# Phase 1 Auth – Testing Guide

**Versions:** Frontend 0.3.1 | Backend 0.3.1

---

## 1. Start the app

### Option A: Docker (recommended)
```bash
cd C:\Morgan\Coding\Bloomix\BloomixDemo
docker compose up -d
```
- Frontend: http://127.0.0.1:8100
- Backend: http://127.0.0.1:3000

### Option B: Local dev servers
```bash
# Terminal 1 - Backend
cd C:\Morgan\Coding\Bloomix\BloomixDemo\Upora\backend
npm run start:dev

# Terminal 2 - Frontend
cd C:\Morgan\Coding\Bloomix\BloomixDemo\Upora\frontend
npm start
```
- Frontend: http://localhost:4200 or http://127.0.0.1:4200
- Backend: http://127.0.0.1:3000

### Verify versions
1. Open DevTools (F12) → Console.
2. You should see:
   - `FRONTEND VERSION 0.3.1 LOADED`
   - `BACKEND VERSION 0.3.1` (after the API call)

---

## 2. Mock mode (current config)

`environment.auth.enabled = false` → mock mode, no real Cognito.

### What to test

| Test | Steps | Expected |
|------|-------|----------|
| **Default user** | Open app → check header and protected routes | You see **Sign out** (not Sign in). You can access Super Admin, Lesson Builder, etc. |
| **Sign out** | Click **Sign out** in header | Redirects to home. Header shows **Sign in**. |
| **Sign in** | Click **Sign in** → enter any email/password → Sign in | Logs in as mock user, redirects to home. Header shows **Sign out**. |
| **Protected routes after sign out** | Sign out → navigate to `/lesson-builder` (or Super Admin, Profile, etc.) | In mock mode, auth guard is bypassed; you can still access them. |
| **Login returnUrl** | Go to `/profile` → Sign out → Sign in with any credentials | After login, redirects back to `/profile`. |
| **API headers** | Sign in → open DevTools → Network → trigger an API call (e.g. load lessons) | Request headers include `x-user-id`, `x-tenant-id`, `x-user-role`. |

### Quick smoke test
1. Home → Super Admin → LLM Usage.
2. Lesson Builder, Content Library, Profile all load.
3. Sign out → Sign in with `test@test.com` / `password123` → redirected and logged in.

---

## 3. Auth verify route (mock mode)

- **URL:** `/auth/verify`  
- **Mock mode:** Redirects straight to `/home` (no Cognito).  
- **Cognito mode:** Used for email verification links with `?code=...&username=...&returnUrl=...`.

---

## 4. When enabling Cognito

Set in `Upora/frontend/src/environments/environment.ts`:
```ts
auth: {
  enabled: true,
  userPoolId: 'your-pool-id',
  userPoolClientId: 'your-client-id',
  region: 'us-east-1',
  identityPoolId: 'optional-identity-pool-id',
}
```

Then:

| Test | Expected |
|------|----------|
| Unauthenticated → protected route | Redirect to `/login?returnUrl=/protected-path` |
| Login with real Cognito credentials | Redirect to `returnUrl` after successful login |
| Sign up → verification email | Click link (if it points to `/auth/verify`) → confirms and redirects |
| Sign out | Clears session and Cognito sign-out |

---

## 5. Files changed (reference)

- **Guard:** `frontend/src/app/core/guards/auth.guard.ts`
- **Auth service:** `frontend/src/app/core/services/auth.service.ts`
- **Auth interceptor:** `frontend/src/app/core/interceptors/auth-headers.interceptor.ts`
- **Verify component:** `frontend/src/app/features/auth/auth-verify.component.ts`
- **Login/Signup:** `frontend/src/app/features/auth/login.component.ts`, `signup.component.ts`
- **Routes:** `frontend/src/app/app.routes.ts` (auth guard on protected routes)
- **Header:** `frontend/src/app/shared/components/header/header.component.ts` (Sign in / Sign out)
- **Build fix:** `frontend/angular.json` (budgets relaxed)

---

## 6. Troubleshooting

| Issue | Check |
|-------|-------|
| Build fails | Run `npm run build` in `Upora/frontend`. If it still fails, share the error output. |
| Backend unreachable | Confirm backend is running on port 3000. Check Docker or `npm run start:dev`. |
| 401 on API calls | Ensure auth interceptor runs. In mock mode, backend uses `x-user-id` headers when `AUTH_PROVIDER=none`. |
| Sign in has no effect | Confirm `AuthService` is used. Check Network tab for `x-user-id` header after login. |
