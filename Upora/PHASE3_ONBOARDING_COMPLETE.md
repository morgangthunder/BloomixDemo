# Phase 3: Onboarding Flow – Complete

**Versions:** Frontend 0.3.3 | Backend 0.3.3

---

## What Was Implemented

### 1. Onboarding Route: `/onboarding`

Flow: **Welcome** → **Profile** (name, age, gender) → **Interests** (TV/movies, hobbies) → **Learning** (learning areas) → **Done**

- **Welcome:** Sign in / Create account links; "Browse without signing in" → Home
- **Profile:** Full name, age range, gender (all optional, Skip available)
- **Interests:** Multi-select TV/movies and hobbies from curated lists (Skip available)
- **Learning:** Multi-select learning areas (Skip available)
- **Done:** "You're all set!" with Continue button

### 2. Auth Guard

When authentication is required and the user is not authenticated, the guard redirects to `/onboarding?returnUrl=...` instead of `/login`.

### 3. Return URL Handling

- Original `returnUrl` is stored when redirecting to onboarding
- After Sign in / Create account, the user is sent back to `/onboarding` to finish personalisation
- After onboarding, the user is redirected to the original URL

### 4. Profile Link

Profile page includes a "Personalisation preferences" link to `/onboarding`.

---

## Testing (Mock Mode)

1. Open http://127.0.0.1:8100
2. Go to **Profile** (while logged in)
3. Click **"Personalisation preferences"**
4. You should see the onboarding flow (Profile step first, since you’re authenticated)
5. Use Next / Skip to move through steps
6. On the last step, click **Continue** to complete

### Testing With Cognito Enabled

When `auth.enabled` is true and the user is not authenticated:

1. Go to a protected route (e.g. Lesson Builder)
2. You should be redirected to `/onboarding?returnUrl=/lesson-builder`
3. Welcome step: click **Sign in** or **Create account**
4. After login, you return to onboarding and continue
5. After completion, you’re redirected to `/lesson-builder`

---

## Files Added/Modified

- `frontend/src/app/core/config/onboarding.config.ts`
- `frontend/src/app/core/services/onboarding.service.ts`
- `frontend/src/app/features/onboarding/onboarding-container.component.ts`
- `frontend/src/app/features/onboarding/onboarding-welcome-step.component.ts`
- `frontend/src/app/features/onboarding/onboarding-profile-step.component.ts`
- `frontend/src/app/features/onboarding/onboarding-interests-step.component.ts`
- `frontend/src/app/features/onboarding/onboarding-learning-step.component.ts`
- `frontend/src/app/features/onboarding/onboarding-done-step.component.ts`
- `frontend/src/app/core/guards/auth.guard.ts` (redirect to onboarding)
- `frontend/src/app/app.routes.ts` (onboarding route)
- `frontend/src/app/features/profile/profile.component.ts` (link to onboarding)
