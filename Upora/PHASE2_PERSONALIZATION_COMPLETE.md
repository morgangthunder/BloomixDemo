# Phase 2: Personalisation – Complete

**Versions:** Frontend 0.3.2 | Backend 0.3.2

---

## What Was Implemented

### 1. Database (PostgreSQL)

- **user_personalization** – Per-user preferences (full_name, age_range, gender, favourite_tv_movies, hobbies_interests, learning_areas, onboarding_completed_at, skipped_onboarding)
- **personalization_options** – Curated lists (tv_movies, hobbies, learning_areas) with ~55 TV/movie options, ~48 hobbies, ~20 learning areas

### 2. Backend API

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/user-personalization/me` | Yes | Get current user's personalization |
| PATCH | `/api/user-personalization/me` | Yes | Update current user's personalization |
| PATCH | `/api/user-personalization/me/complete-onboarding` | Yes | Mark onboarding completed |
| PATCH | `/api/user-personalization/me/skip-onboarding` | Yes | Mark onboarding skipped |
| GET | `/api/user-personalization/options` | No | Get all curated options |
| GET | `/api/user-personalization/options/:category` | No | Get options for category (tv_movies \| hobbies \| learning_areas) |

---

## Applying the Migration (Existing Database)

Postgres init scripts run only when the database is first created. For an **existing** database, run the migration manually:

```powershell
cd C:\Morgan\Coding\Bloomix\BloomixDemo
docker exec -i upora-postgres psql -U upora_user -d upora_dev < docker/postgres/init/05-personalization.sql
```

Or via Docker Compose:

```powershell
Get-Content docker/postgres/init/05-personalization.sql | docker exec -i upora-postgres psql -U upora_user -d upora_dev
```

For a **new** database (e.g. after `docker compose down -v`), the script runs automatically on first startup.

---

## Testing

1. Restart backend: `docker compose restart backend`
2. **Get all options** (no auth):
   ```
   GET http://127.0.0.1:3000/api/user-personalization/options
   ```
3. **Get options for a category**:
   ```
   GET http://127.0.0.1:3000/api/user-personalization/options/tv_movies
   GET http://127.0.0.1:3000/api/user-personalization/options/hobbies
   GET http://127.0.0.1:3000/api/user-personalization/options/learning_areas
   ```
4. **Get/update my personalization** (requires x-user-id header – ensure you're logged in via frontend):
   ```
   GET http://127.0.0.1:3000/api/user-personalization/me
   PATCH http://127.0.0.1:3000/api/user-personalization/me
   Body: {"fullName": "Test User", "favouriteTvMovies": ["lotr", "marvel"]}
   ```

---

## Next: Phase 3 – Onboarding Flow

Phase 3 will add the onboarding UI (modals/steps) that use this API to collect personalisation data when users first sign up or visit protected routes.
