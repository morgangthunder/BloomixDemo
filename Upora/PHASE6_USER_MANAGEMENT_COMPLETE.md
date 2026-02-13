# Phase 6: Shared User Management (Core) – Complete

**Versions:** Frontend 0.3.91 | Backend 0.3.61

---

## What Was Implemented

### 1. Backend

- **ViewerContext / ViewerRole**  
  - `ViewerRole`: `'super-admin' | 'hub-admin' | 'lesson-creator' | 'course-creator' | 'self'`  
  - `ViewerContext`: `{ role, hubId?, lessonId?, courseId? }`  
  - `GetUserDashboardOptions`: extended with `lessonId?`, `courseId?` for future Phase 6.5.

- **Lesson engagement transcript capture + MinIO/S3 storage**  
  - `SuperAdminUsersService.saveEngagementTranscript(sessionId, userId, lessonId, tenantId, transcript)`  
  - Full transcript JSON is stored in **MinIO (or S3)** at key `transcripts/{tenantId}/{userId}/{sessionId}.json` via `FileStorageService.saveTranscript()`.  
  - DB row in `lesson_engagement_transcriptions` stores `storage_key`, `entry_count`; `transcript` column is empty when storage is used (fallback: if MinIO fails, transcript is stored in DB).  
  - **POST** `/api/interaction-data/session/:sessionId/transcript`  
    - Body: `{ lessonId: string, transcript: Array<{ timestamp, speaker, type, content, metadata? }> }`  
    - Resolves `userId` and `tenantId` from `x-user-id` / `x-tenant-id` or JWT.  
  - **Storage layer**: `IStorageAdapter.saveBuffer(key, buffer, contentType)`, `getByKey(key)`; `FileStorageService.saveTranscript(key, data)`, `getTranscriptContent(key)`.  
  - **Migration**: `storage_key`, `entry_count` added to `lesson_engagement_transcriptions`.  
  - **GET transcriptions**: When `storage_key` is set, content is loaded from MinIO and returned as `transcript`.

- **Existing Phase 6 APIs (unchanged)**  
  - **GET** `/api/super-admin/users/search?q=&by=email|id|name`  
  - **GET** `/api/super-admin/users/:id/dashboard` (transcriptions only when `viewerRole === 'super-admin'`)  
  - **GET** `/api/super-admin/users/:id/transcriptions`  
  - **POST** `/api/super-admin/users/:id/send-password-reset` (stub; Cognito integration TODO)

- **InteractionDataModule**  
  - Imports `SuperAdminModule` so the interaction-data controller can use `SuperAdminUsersService` for the transcript endpoint.

### 2. Frontend

- **Lesson-view transcript capture**  
  - On lesson load: generate `engagementSessionId` (UUID), start 60s interval to flush transcript.  
  - **Captured**: chat messages (user + assistant from WebSocket, and from widget `postToChat`), teacher script blocks when played, widget-added messages.  
  - Each entry: `{ timestamp, speaker: 'user'|'assistant'|'system', type: 'chat'|'script', content }`.  
  - **Flush**: every 60s and on `ngOnDestroy` (leave lesson), POST to `/api/interaction-data/session/:sessionId/transcript` with `{ lessonId, transcript }` (ApiService sends `x-user-id`, `x-tenant-id`).  
  - Backend stores full payload in MinIO and upserts DB row with `storage_key` and `entry_count`.

- **User dashboard (Super Admin)**  
  - **Account**: “Send password reset email” button; calls `UserManagementService.sendPasswordReset(userId)` and shows success/error message.  
  - **Lesson Engagement Transcriptions**:  
    - Shown whenever the dashboard payload includes `lessonEngagementTranscriptions` (backend only includes for super-admin).  
    - Uses `entry_count` for list length when content is in MinIO.  
    - “View all transcriptions” loads full list via `getTranscriptions(userId)` (backend reads from MinIO when `storage_key` set) and shows preview.

- **User Management**  
  - No change; list and navigation to user dashboard already in place.

- **Super Admin dashboard**  
  - “User Management” tile already links to `/super-admin/user-management`.

### 3. Version and console

- Backend: `package.json` 0.3.60; `main.ts` logs Phase 6 transcript + ViewerContext.  
- Frontend: `package.json` 0.3.90; `main.ts` version constant and log line updated for Phase 6.

---

## Still To Do (Phase 6.5+)

- **Phase 6.5**: Creator engagement view – `GET /lessons/:id/engagers`, `GET /courses/:id/engagers`; reuse `UserManagementComponent` with `viewerContext.role = 'lesson-creator' | 'course-creator'`.  
- **Phase 6.6**: Assignments & deadlines (tables, APIs, UI).  
- **Phase 6.7**: Course creation UI.  
- **Phase 6.8**: Groups (lesson/course groups, invites, notices).  
- **Cognito**: Wire “Send password reset” to Cognito ForgotPassword / AdminInitiateAuth in `SuperAdminUsersService.sendPasswordReset`.

---

## How to Test

1. **Backend**  
   - Set `STORAGE_TYPE=s3` and MinIO env vars (`S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`) to use MinIO; otherwise transcripts fall back to DB.  
   - Run migration for `storage_key` and `entry_count` on `lesson_engagement_transcriptions`.  
   - Start backend; console should show `BACKEND VERSION 0.3.61` and Phase 6 line.  
   - `POST /api/interaction-data/session/<uuid>/transcript` with body `{ "lessonId": "<lesson-uuid>", "transcript": [{ "timestamp": "...", "speaker": "user", "type": "chat", "content": "Hello" }] }` and `x-user-id` / `x-tenant-id`. Expect `{ saved: true, id: "<uuid>" }`. Check MinIO bucket for `transcripts/<tenant>/<user>/<session>.json`.

2. **Frontend**  
   - Open app; console should show `FRONTEND VERSION 0.3.91` and Phase 6 line.  
   - Open a lesson (lesson-view); use chat, trigger a script; leave or wait 60s. Console should log “Transcript flushed to MinIO: ok”.  
   - As super-admin: Super Admin → User Management → search → open a user.  
   - In Account section: click “Send password reset email” (stub message shown).  
   - If that user has transcript rows (from lesson-view or API), “Lesson Engagement Transcriptions” appears; “View all transcriptions” loads content (from MinIO when `storage_key` set).

---

**Last updated:** February 2025
