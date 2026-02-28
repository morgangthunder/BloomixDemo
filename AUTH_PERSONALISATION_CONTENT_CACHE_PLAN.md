# Authentication, Personalisation Onboarding & Content Caching Plan

**Consolidated Plan** – Merged from Cursor plan versions (f953d97d, 55300801, 83b7570b).

**Workspace:** `c:\Morgan\Coding\Bloomix\BloomixDemo`

---

## Implementation Status (Handoff Summary)

### Done

- **Phase 2 (Personalisation)**: `user_personalization` table, `personalization_options`, UserPersonalizationService, UserPersonalizationController, curated lists (TV/movies, hobbies, learning areas). See `Upora/PHASE2_PERSONALIZATION_COMPLETE.md`.
- **Phase 3 (Onboarding)**: Onboarding flow at `/onboarding` (Welcome → Profile → Interests → Learning → Done), AuthGuard redirect, return URL handling, step components. See `Upora/PHASE3_ONBOARDING_COMPLETE.md`.

### Remaining

| Phase | Description |
|-------|-------------|
| 1 | AWS Cognito Authentication – **DONE** (real Cognito login, JWT, role resolution via backend) |
| 4 | Content Caching – **DONE** (param_hash, processed_content_cache, image dictionary, component map) |
| 5 | Route Protection & UX – **DONE** (roleGuard, unauthorized page, all routes protected) |
| 6 | Shared User Management (core + Creator Engagement) – **DONE** |
| 6.5 | Messaging – **DONE** |
| 6.6 | Assignments & Deadlines – **DONE** |
| 6.7 | Course Creation UI – **DONE** |
| 6.8 | Groups (Lesson Groups, Course Groups) – **DONE** |
| 7 | Hub System – **DONE** (shelves, management, SSO config, hub switcher, default hub) |
| 8 | Notifications – **DONE** (real-time bell, messages modal, invites) |

---

## Current State Summary

**Authentication**

- No real auth: `environment.defaultUserId`, `environment.tenantId`, `environment.userRole` used everywhere
- `x-user-id`, `x-tenant-id` passed via headers from env/localStorage
- [AUTHENTICATION_PLAN.md](AUTHENTICATION_PLAN.md) exists with detailed Cognito design; not implemented
- `docker-compose.yml` has `COGNITO_*` env vars (placeholder values)

**Personalisation**

- **Done**: `user_personalization` table, `personalization_options`, onboarding flow at `/onboarding`

**Content/Image Generation**

- [GeneratedImage](Upora/backend/src/entities/generated-image.entity.ts): stores `prompt`, `lessonId`, `accountId`, `substageId`, `interactionId`, `metadata` - no cache key
- [ImageGeneratorService](Upora/backend/src/services/image-generator.service.ts): always generates; no lookup before generation
- [ProcessedContentOutput](Upora/backend/src/entities/processed-content-output.entity.ts): no parameter hash or cache lookup

**Routing**

- [app.routes.ts](Upora/frontend/src/app/app.routes.ts): AuthGuard redirects to onboarding; lesson-view loads

---

## Architecture Overview

```mermaid
flowchart TB
    subgraph Unauthenticated [Unauthenticated User]
        Visit[Visits lesson-view or protected URL]
        Onboarding[Onboarding Modals - lesson blurred behind]
        AuthChoice[Sign in with Google OR Create Account]
        Verify[Email verification link]
        Return[Return to original URL + auto-login]
    end
    
    subgraph Personalisation [Personalisation Storage]
        UserProfile[User / UserPublicProfile]
        UserPrefs[user_personalization table]
    end
    
    subgraph ContentCache [Content Caching]
        GenReq[Generate image/process content]
        CacheLookup[Lookup by param hash + user pref tags]
        Hit[Return cached output]
        Miss[Generate new + store with tags]
    end
    
    Visit --> Onboarding
    Onboarding --> AuthChoice
    AuthChoice --> Verify
    Verify --> Return
    Return --> UserProfile
    
    GenReq --> CacheLookup
    CacheLookup -->|found| Hit
    CacheLookup -->|not found| Miss
    Miss --> UserPrefs
```

---

## Phase 1: AWS Cognito Authentication

### 1.1 Backend (NestJS)

- Install: `@nestjs/passport`, `passport`, `passport-jwt`, `jwks-rsa`
- Create `AuthModule` with JWT strategy using Cognito JWKS
- Create `JwtAuthGuard`, `RolesGuard`, `@Roles()` decorator
- Create or update `UsersModule` to sync Cognito users (on first login: create/update user by `sub` or email)
- Add `cognitoSub` column to `users` table (migration) if not present
- Apply guards to protected endpoints; keep `x-user-id`/`x-tenant-id` optional for backward compatibility during rollout
- Optional-auth middleware: accept JWT OR headers for gradual migration

**Key files**

- `backend/src/modules/auth/` (auth.module.ts, jwt.strategy.ts, auth.guard.ts, roles.guard.ts)
- `backend/src/common/decorators/roles.decorator.ts`
- Update controllers: lessons, image-generator, interaction-data, etc.

### 1.2 Frontend (Ionic/Angular)

- Install: `@aws-amplify/auth`, `@aws-amplify/core` (or `amazon-cognito-identity-js` if lighter)
- Create `AuthService`: `login`, `signUp`, `signOut`, `currentSession`, `getCurrentUser`, `isAuthenticated`
- Create `AuthGuard`: redirect unauthenticated users; store `returnUrl` in sessionStorage
- Create `/login` and `/signup` routes and components
- Configure Cognito in `environment.ts`: `userPoolId`, `clientId`, `region`
- Update `ApiService` and `InteractionAISDK.getHeaders()` to use JWT from AuthService instead of `environment.defaultUserId`

### 1.3 Cognito User Pool (AWS)

- Create User Pool with:
  - Sign-in: Email
  - Attributes: email (required), name, custom:tenantId, custom:role
  - App client with Secret (if needed) or public client for SPA
  - Enable "Hosted UI" or configure Google as IdP for "Sign in with Google"
- For Email/Password: enable email verification (verification link)
- Configure callback URLs for verification and redirect (e.g. `https://yourapp.com/auth/callback`)

### 1.4 Verification Link & Return URL

- Verification link format: `https://yourapp.com/auth/verify?token=...&returnUrl=/lesson-view/abc123`
- Frontend `/auth/verify` route:
  - Confirm user with token (Cognito `confirmSignUp` or similar)
  - Log user in
  - Redirect to `returnUrl` from query (or `/home` if missing)
- During signup, pass `returnUrl` so verification email can include it (Cognito custom message or Lambda trigger)

---

## Phase 2: Personalisation Data Model & API (DONE)

### 2.1 Database Schema

- **Done**: `user_personalization` table, migration, entity
- **Done**: `UserPersonalizationService`, `UserPersonalizationController` (CRUD, get current user's prefs)
- **Done**: Curated lists seeded (see Phase 2.2)

### 2.2 Curated Lists (DONE)

- **Done**: `personalization_options` table with TV/movies, hobbies, learning_areas
- Stored in `docker/postgres/init/05-personalization.sql`

---

## Phase 3: Onboarding Flow (DONE)

- **Done**: Onboarding route `/onboarding`, steps (Welcome → Profile → Interests → Learning → Done)
- **Done**: AuthGuard redirect, return URL handling
- **Done**: Step components: `onboarding-container.component.ts`, profile, interests, learning, done steps
- See `Upora/PHASE3_ONBOARDING_COMPLETE.md`

---

## Phase 4: Content Caching & Tagging

### 4.1 Goals

- Before generating an image or processed content, check if we already have output for the same **parameters + user personalisation tags**
- If hit: return cached result (avoid LLM cost)
- If miss: generate, store, tag with parameters and user preference tags

### 4.2 Image Cache

**Extend `generated_images` or add cache lookup table:**

- Add `content_hash` (or `param_hash`) column: hash of `{ lessonId, substageId, interactionId, prompt, userInput, customInstructions, personalisationTags }`
- `personalisationTags`: e.g. `["lord-of-the-rings", "sci-fi"]` from user's favourite TV/movies and hobbies
- Add index on `(param_hash, tenant_id)` for fast lookup

**ImageGeneratorService changes:**

1. Before `generateImage`:
   - Build param object including `personalisationTags` from `UserPersonalization` (via userId)
   - Compute `param_hash` (e.g. SHA-256 of sorted JSON)
   - Query `generated_images` WHERE `param_hash = ?` (and optionally `lesson_id`, `tenant_id`)
   - If found: return existing `imageUrl`, `imageId` (no generation)
2. After generation: Store with `param_hash`, `personalisation_tags` (JSONB)

**Fallback when user has no personalisation:** Use `param_hash` without personalisation tags (generic cache) or `param_hash` with empty `personalisationTags`.

### 4.3 Processed Content Cache

**New table `processed_content_cache`:**

```sql
CREATE TABLE processed_content_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL,
  content_type VARCHAR(50) NOT NULL,
  param_hash VARCHAR(64) NOT NULL,
  source_content_id UUID,
  lesson_id UUID,
  output_reference_id UUID,
  output_type VARCHAR(50),
  personalisation_tags TEXT[],
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, content_type, param_hash)
);
```

### 4.4 Passing Personalisation to Generation

- `ImageGeneratorService.generateImage` and any LLM-based content generator need `userId` to fetch `user_personalization`
- Add `personalisationTags` (or full prefs) to prompt/context for better generation

### 4.5 Image Generation: Key Components with Coordinates (Optional Flag)

- Add `includeComponentMap?: boolean` and `componentPromptContent?: string` to requests
- Store component map in `generated_images.metadata.componentMap`
- Reuse existing image + component map when available; otherwise run LLM on existing image or generate new

### 4.6 Image Dictionary for Simple Words

- Tag images from short prompts (nouns, verbs, adjectives) with dictionary labels
- Lookup image dictionary before generating for simple-word requests
- Storage: extend `generated_images` with `dictionary_labels` or separate `image_dictionary` table

---

## Phase 5: Route Protection & UX

### 5.1 Routes Requiring Auth

- `/lesson-view/:id` – require auth (with onboarding flow)
- `/profile`, `/my-list` – require auth
- `/lesson-builder`, `/interaction-builder`, `/content-library`, `/content-approvals` – require auth + role
- `/super-admin/*` – require auth + super-admin role
- `/hubs/:id/manage` – require auth + hub-admin role for that hub (or super-admin); added in Phase 7

### 5.2 Public Routes (No Auth)

- `/home`, `/categories`, `/search`, `/lesson-overview/:id` – can stay public for browsing

### 5.3 Flag for "Needs Auth"

- Add `data: { requiresAuth: true }` or `data: { requiresOnboarding: true }` on routes
- Guard checks and triggers onboarding flow for unauthenticated users

---

## Phase 6: Shared User Management

**Design principle**: One set of components for user management. No duplicate code. Super admin, hub admins, lesson-creators, and course-creators use the **same views**; features are scoped by `viewerContext.role`.

### 6.1 Viewer Context (Extended)

```typescript
type ViewerRole = 'super-admin' | 'hub-admin' | 'lesson-creator' | 'course-creator' | 'self';

interface ViewerContext {
  role: ViewerRole;
  hubId?: string;
  lessonId?: string;
  courseId?: string;
}
```

- **super-admin**: Full access. Password reset, lesson engagement transcriptions, search across all users visible.
- **hub-admin**: Same UI, scope limited to hub members; super-admin-only sections hidden.
- **lesson-creator**: Engagers of own lessons; can message, mark assignments, set deadlines.
- **course-creator**: Engagers of own courses; same actions as lesson-creator.
- **self**: Logged-in user viewing own data (profile).

### 6.2 Role Scoping Matrix

| Feature | Super Admin | Hub Admin | Lesson Creator | Course Creator |
|---------|-------------|-----------|----------------|----------------|
| User Management (search/list) | All users | Hub members | Engagers of own lessons | Engagers of own courses |
| User Dashboard (detail) | Full | Full (hub scope) | Limited (no password reset, no transcriptions) | Same |
| Messaging users | Yes | Yes (hub members) | Yes (own engagers) | Yes (own engagers) |
| View timeline / progress | Yes | Yes | Yes (own lessons) | Yes (own lessons in courses) |
| Mark offline assignments done | No | No | Yes (own lessons) | Yes (own courses) |
| Set deadlines | No | Yes (hub) | Yes (own lessons) | Yes (own courses) |
| Password reset | Yes | No | No | No |
| Lesson transcriptions | Yes | No | No | No |

**Data sources for engagers:**
- Lesson creator: users with `usages` or `user_interaction_progress` for lessons where `lesson.createdBy = currentUserId`
- Course creator: users who engaged with any lesson in courses where `course.createdBy = currentUserId`

### 6.3 Usage Locations

| Location | Route | Scope | viewerContext |
|----------|-------|-------|---------------|
| Super Admin | `/super-admin/user-management` | All users | `{ role: 'super-admin' }` |
| Hub Admin | `/hubs/:id/manage` (Members tab) | Hub members | `{ role: 'hub-admin', hubId }` |
| Lesson Builder | `/lesson-editor/:id/engagers` | Users who took this lesson | `{ role: 'lesson-creator', lessonId }` |
| Course Creator | `/course-details/:id/engagers` | Users who took lessons in this course | `{ role: 'course-creator', courseId }` |
| User Profile | `/profile` or `/profile/dashboard` | Own data | `{ role: 'self' }` |

### 6.4 Creator Engagement View

- **Component**: Reuse `UserManagementComponent` and `UserDashboardComponent` with `viewerContext.role = 'lesson-creator' | 'course-creator'`
- **Entry points**: Lesson-editor "View Engagers" tab; Course-details "View Engagers" tab
- **Backend APIs**: `GET /lessons/:id/engagers?q=...`, `GET /courses/:id/engagers?q=...`

### 6.5 User Dashboard Data Sections

1. Account & Profile (password reset visible only when `viewerContext.role === 'super-admin'`)
2. Personalisation
3. Personal Settings
4. Lesson Engagement
5. Lesson Progress
6. Interaction Results
7. Usage Metrics
8. LLM Query Usage (reuse `llm_generation_logs`)
9. Other Standard Data
10. Lesson Engagement Transcriptions (super-admin only)
11. Hub Membership

### 6.6 Lesson Engagement Transcriptions

- New table `lesson_engagement_transcriptions`
- Capture from lesson-view: chat, script blocks, interaction events
- API: `POST /interaction-data/session/:sessionId/transcript`, `GET /super-admin/users/:userId/transcriptions`

### 6.7 Backend API

**Super Admin:** `GET /super-admin/users/search`, `GET /super-admin/users/:id/dashboard`, `GET /super-admin/users/:id/transcriptions`, `POST /super-admin/users/:id/send-password-reset`

**Hub Admin:** `GET /hubs/:hubId/members`, `GET /hubs/:hubId/members/:userId/dashboard`

**Logged-in user:** `GET /profile/dashboard`, `GET /profile/llm-usage`

**Shared logic:** `getUserDashboard(userId, { viewerRole, hubId? })` – omit transcriptions and password reset when `viewerRole !== 'super-admin'`.

---

## Phase 6.5: Messaging (Unified with Notifications)

- Messaging is a notification type; same delivery stack (Socket.io, email via N8N)
- Use `notifications` with `type = 'direct_message'`, `from_user_id`, `to_user_id`
- API: `POST /messages`, `GET /messages`, `PATCH /messages/:id/read`
- Permissions: super-admin (any), hub-admin (hub members), lesson-creator (own engagers), course-creator (own engagers)
- UI: "Message" button on user row; modal or `/messages` page

---

## Phase 6.6+6.8 (Combined): Lesson Groups, Assignments & Deadlines

**Rationale**: Groups and Assignments are tightly coupled — assignments are scoped to groups, deadlines are per-group, and the group management view is the natural home for assignment management. Building them together avoids refactoring.

### 6.6.1 Lesson Groups (built first, Course Groups follow in Phase 6.7)

**Group Types:**
- **Default Group**: Auto-created per lesson, containing all engagers (from `usages` + `user_interaction_progress`). No manual membership — membership is derived from engagement data.
- **Custom Groups**: Creator can create named groups, invite specific users. Useful for cohorts, classes, etc.

**Data Model:**
- `lesson_groups`: `id`, `lesson_id`, `created_by`, `tenant_id`, `name`, `description`, `is_default` (boolean), `created_at`, `updated_at`
- `group_members`: `id`, `group_id`, `user_id`, `role` (member/moderator), `invited_at`, `joined_at`, `invited_by`
- Default groups have `is_default = true`; their members are computed dynamically from engagers (not stored in `group_members`)

**Group Management View** — accessed from lesson-editor "Groups" tab or "Manage Groups" button:
- Group selector (default group + custom groups, create new)
- Tabs within group view:
  - **Members**: List with search, message button, remove (custom groups only)
  - **Assignments**: Create/manage assignments, view submissions, grade
  - **Deadlines**: Set per-member or bulk deadlines
  - **Progress**: Aggregate view of interaction scores, completion, timeline

### 6.6.2 Assignment Types (Moodle-inspired)

- **Offline**: Creator manually marks complete (e.g. "present your project in class")
- **File Submission**: Student uploads homework file (uses existing S3/MinIO file upload infrastructure)
- **Interaction-based**: Auto-completed when student finishes specified lesson interactions (leverages `user_interaction_progress`)

**Data Model:**
- `assignments`: `id`, `lesson_id`, `group_id` (nullable; null = applies to all groups), `title`, `description`, `type` (offline/file/interaction), `allowed_file_types`, `max_file_size_bytes`, `max_score`, `stage_id`, `substage_id`, `sort_order`, `is_published`, `created_by`, `created_at`, `updated_at`
- `assignment_submissions`: `id`, `assignment_id`, `user_id`, `status` (not_started/in_progress/submitted/graded/late/resubmit_requested), `file_url`, `file_name`, `file_size`, `student_comment`, `score`, `grader_feedback`, `graded_by`, `graded_at`, `submitted_at`, `is_late`, `created_at`, `updated_at`

**Submission Status Workflow:**
```
not_started → in_progress → submitted → graded
                                      → resubmit_requested → submitted (resubmit)
If submitted after deadline → is_late = true
```

**Grading:** Creator can set score (0 to max_score) and leave feedback comment. Student is notified via bell icon. Optional email notification.

### 6.6.3 Deadlines

- `user_lesson_deadlines`: `id`, `user_id`, `lesson_id`, `group_id` (nullable), `course_id` (nullable), `deadline_at`, `set_by_user_id`, `note`, `created_at`, `updated_at`
- Bulk deadline setting: set deadline for all members of a group at once
- Late flag auto-set on submissions after deadline
- Future: deadline reminder notifications via N8N cron

### 6.6.4 Student "My Assignments" View

- Route: `/assignments`
- Shows all assignments across all lessons the student is engaged with
- Grouped by lesson, sorted by deadline (upcoming first)
- Status badges: Not Started, In Progress, Submitted, Graded, Late
- Click to view details, upload file, see grade/feedback

### 6.6.5 API Endpoints

**Groups:**
- `GET /lessons/:lessonId/groups` — list groups for a lesson (default + custom)
- `POST /lessons/:lessonId/groups` — create custom group
- `PATCH /lesson-groups/:groupId` — update group name/description
- `DELETE /lesson-groups/:groupId` — delete custom group (not default)
- `GET /lesson-groups/:groupId/members` — list members (dynamic for default, stored for custom)
- `POST /lesson-groups/:groupId/members` — add member to custom group
- `DELETE /lesson-groups/:groupId/members/:userId` — remove member

**Assignments:**
- `GET /lessons/:lessonId/assignments` — list assignments for a lesson
- `POST /lessons/:lessonId/assignments` — create assignment
- `PATCH /assignments/:id` — update assignment
- `DELETE /assignments/:id` — delete assignment
- `GET /assignments/:id/submissions` — list all submissions (creator view)
- `POST /assignments/:id/submit` — student submits (with optional file upload)
- `PATCH /assignment-submissions/:id/grade` — creator grades a submission
- `PATCH /assignment-submissions/:id/resubmit-request` — creator requests resubmission
- `GET /my/assignments` — student's aggregate view (all their assignments across lessons)

**Deadlines:**
- `GET /lessons/:lessonId/deadlines` — list deadlines for a lesson
- `POST /lessons/:lessonId/deadlines` — set deadline (single user or bulk for group)
- `PATCH /deadlines/:id` — update deadline
- `DELETE /deadlines/:id` — remove deadline
- `GET /my/deadlines` — student's upcoming deadlines

### 6.6.6 Entry Points

- **Lesson-editor**: "Groups" tab (replaces/augments "View Engagers")
  - Default group shows current engagers (same data as View Engagers)
  - Custom groups can be created
  - Within each group: Members, Assignments, Deadlines, Progress tabs
- **Student nav**: "My Assignments" link → `/assignments`
- **Lesson view**: Assignment panel showing pending assignments for current lesson

---

## Phase 6.7: Course Creation UI + Course Groups

- **Current state**: `lesson-builder.component.ts` has `createNewCourse()` → `alert('Course creation coming soon!')`; `course.entity.ts` and `lesson.entity.ts` exist; lessons have `courseId`
- **Backend**: Add CoursesModule, CoursesService, CoursesController; endpoints `POST /courses`, `GET /courses`, `PATCH /courses/:id`, `GET /courses/:id/lessons`
- **Frontend**: Replace `createNewCourse()` with modal or route `/lesson-builder/courses/new`; form for title, description; "Add lessons" from creator's lessons; course-details: "Add Lesson" / "Remove from Course"
- **Course Groups**: Same pattern as Lesson Groups but scoped to courses. `course_groups` table follows `lesson_groups` pattern. Course engagers = union of all lesson engagers within the course. Group management view reused.
- **Course Assignments & Deadlines**: Same as lesson-level, but `course_id` column links to course context

### 6.8.6 Open Questions

- Group–hub relationship: Can a group be linked to a hub? (Recommendation: keep groups independent; defer.)
- Notice delivery: Socket.io + email via N8N, same as notifications.

---

## Phase 7: Hub System with Filtered Views

### 7.1 Design Principles

- Unified UI: Netflix-like home; hubs act as filters
- Public hub (default) + tenant/scoped hubs
- Hub switch updates state (RxJS); content re-queries; no full page reload

### 7.2 Data Model

- `hubs`: `id`, `tenant_id`, `name`, `slug`, `is_public`, `owner_id`
- `hub_members`: `id`, `hub_id`, `user_id`, `role`
- `hub_content_links`: `id`, `hub_id`, `lesson_id`, `status`, `released_at`
- `users.can_create_hubs`

### 7.3 Key Features

- Hub switcher; `GET /api/lessons?hub_id=:id`
- Hub manage page at `/hubs/:id/manage`; embeds UserManagementComponent with `viewerContext.role = 'hub-admin'`
- Super-admin: `/super-admin/hub-management`; hub creation page `/hubs/create` for users with `can_create_hubs`

---

## Phase 8: Notifications

### 8.1 Notification Types

| Type | Trigger |
|------|---------|
| New Content Released | Admin releases lesson/course to hub |
| Admin Announcements | Admin creates post via hub manage |
| Progress Reminders | Incomplete lesson after N days |
| Assignment/Score Updates | Admin marks complete or scores interaction |
| Hub Invites/Changes | Invite accepted, role updated |
| direct_message | From messaging (Phase 6.5) |
| assignment_marked_done | Creator marks offline assignment done |
| deadline_reminder | N days before deadline (cron + N8N) |

### 8.2 Data Model

- `notifications`: `id`, `user_id`, `hub_id`, `type`, `title`, `body`, `action_url`, `read_at`
- `hub_posts`: `id`, `hub_id`, `author_id`, `title`, `body`, `metadata`
- `notification_prefs`: `user_id`, `mode`, `email_enabled`, `push_enabled`

### 8.3 Tech Stack

- Socket.io for real-time; NestJS scheduler for reminders; N8N for email

---

## Suggested Implementation Order

1. **Phase 1**: Cognito + basic login/signup + JWT validation (backend + frontend)
2. **Phase 2**: DONE
3. **Phase 3**: DONE
4. **Phase 4**: DONE – Content cache (param_hash, dictionary labels, component map on generated_images; ProcessedContentCache entity + table; ContentCacheService for image and content dedup; ImageGeneratorService and ContentAnalyzerService integrated; Process Explorer interaction type as testbed)
5. **Phase 5**: Apply guards to all protected routes, polish UX
6. **Phase 6 (core)**: DONE – Shared User Management – UserManagementComponent, UserDashboardComponent, super-admin tile, backend APIs
7. **Phase 6.5 Creator Engagement View**: DONE (lessons) – engagers APIs (`GET /lessons/:id/engagers`, `/lessons/:lessonId/engagers/:userId/dashboard`), View Engagers tab in lesson-editor, engager details modal, messaging, user profile navigation. Course engagers deferred to Phase 6.7.
8. **Phase 6.5 Messaging**: DONE – messages/notifications, compose modal, Message buttons on user rows, feedback system, email via N8N/Brevo, real-time bell alerts
9. **Phase 6.6+6.8 (Combined)**: DONE – Lesson Groups + Assignments & Deadlines – lesson_groups, group_members, assignments, assignment_submissions, user_lesson_deadlines tables; group management UI (Members/Assignments/Deadlines/Progress tabs); 3 assignment types (offline, file submission, interaction); grading + resubmission; bulk deadlines; student "My Assignments" page with file uploads; "Assignments" nav item
10. **Phase 6.7**: Course Creation UI – Courses CRUD, frontend create/add-lessons flow, course engagers, course groups (follows lesson groups pattern)
12. **Phase 7**: Hub System
13. **Phase 8**: Notifications (full system)

---

## File Checklist

| Area | New/Updated Files |
|------|-------------------|
| Backend Auth | `auth.module.ts`, `jwt.strategy.ts`, `auth.guard.ts`, `roles.guard.ts` |
| Backend Personalisation | DONE |
| Backend Content Cache | Migration for `param_hash`/cache table; `image-generator.service.ts`; `content-cache.service.ts` |
| Backend Phase 6+ | `super-admin-users.controller.ts`, `super-admin-users.service.ts`; engagers APIs; `user_assignment_completions`, `user_lesson_deadlines`; `courses.module.ts`; `POST /messages`, `GET /messages` |
| Frontend Auth | `auth.service.ts`, `auth.guard.ts`, `login.component`, `signup.component`, `auth-verify.component` |
| Frontend Onboarding | DONE |
| Frontend Phase 6+ | `user-dashboard.component.ts`, `user-management.component.ts`; Creator Engagement View; Course create modal; Message compose modal; Groups UI |
| Migrations | `param_hash`/cache; `lesson_engagement_transcriptions`; `users.subscription_renewal_at`; `user_assignment_completions`; `user_lesson_deadlines`; group tables |
| Hubs | `hubs`, `hub_members`, `hub_content_links`; `HubService`; hub switcher |
| Notifications | `notifications`, `hub_posts`, `notification_prefs` |

---

## Open Questions

1. **Lesson-overview vs lesson-view**: Should `/lesson-overview/:id` remain public, with only `/lesson-view/:id` requiring auth?
2. **Google Sign-In**: Cognito Hosted UI (redirect) or embedded Google button?
3. **Personalisation for builders**: Should lesson-builders also go through onboarding? (Assumption: students primary.)
4. **Cache scope**: Per-tenant only, or global for public content?
5. **Messaging model**: Separate `user_messages` table vs. `notifications` with `type=direct_message`?
6. **Course–hub relationship**: Should courses be assignable to hubs?
7. **Groups–hub relationship**: Keep groups independent from hubs?

---

**Last Updated:** February 2025  
**Source:** Consolidated from `c:\Users\Lenovo\.cursor\plans\auth_personalisation_content_cache_*.plan.md`
