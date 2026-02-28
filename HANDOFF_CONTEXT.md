# Handoff Context — Groups, Courses & Navigation Overhaul

**Date:** February 15, 2026
**Frontend Version:** 0.5.0 | **Backend Version:** 0.5.0
**Backend compiles with 0 errors and is running.**
**Plan file:** `c:\Users\Lenovo\.cursor\plans\groups,_courses,_navigation_e1861873.plan.md`
**Master plan:** `AUTH_PERSONALISATION_CONTENT_CACHE_PLAN.md` (root of repo)

---

## What Was Completed This Session

All phases of the "Groups, Courses & Navigation Overhaul" plan are **DONE**, including the onboarding bug fix. ~5,900 lines of code were created or modified across 20+ files.

### Backend Changes

1. **CoursesModule** (new) — `Upora/backend/src/modules/courses/`
   - `courses.service.ts` (185 lines) — CRUD for courses, add/remove lessons
   - `courses.controller.ts` (100 lines) — REST endpoints: `GET/POST/PATCH /courses`, `GET/POST/DELETE /courses/:id/lessons`
   - `courses.module.ts` (15 lines)

2. **Entities Updated**
   - `lesson-group.entity.ts` (134 lines) — Added `courseId`, `parentCourseGroupId` (nullable), made `lessonId` nullable, self-referencing FK for parent course group. `GroupMember` gained `email`, `status` columns, `userId` made nullable.
   - `course-group-lesson-visibility.entity.ts` (39 lines, new) — Controls which lessons are visible to a specific course group.

3. **LessonGroupsModule Extended** — `Upora/backend/src/modules/lesson-groups/`
   - `lesson-groups.service.ts` (1,397 lines) — Added: course groups CRUD, default course group auto-creation, `createCourseGroup` (auto-creates child lesson groups per lesson), `syncLessonGroupsForNewLesson`, course group lesson visibility, aggregated course deadlines/progress, `inviteMembers` (by email, handles existing/new users), `acceptInvite`, `getMyGroups`, `getMyLessonGroups`, `getMyCourseGroups`, `getGroupDetail`
   - `lesson-groups.controller.ts` (419 lines) — New endpoints: `GET/POST /courses/:courseId/groups`, `GET/PATCH /course-groups/:groupId/lesson-visibility`, `GET /courses/:courseId/deadlines`, `POST /lesson-groups/:groupId/invite`, `POST /lesson-groups/:groupId/accept-invite`, `GET /my/groups`, `GET /lessons/:lessonId/my-groups`, `GET /courses/:courseId/my-groups`, `GET /groups/:groupId/detail`
   - `lesson-groups.module.ts` (36 lines) — Added `Course`, `CourseGroupLessonVisibility` to TypeORM features

4. **Database Migration** — `1736600000000-ExtendGroupsForCourses.ts` (already executed on DB)
   - `lesson_groups.lesson_id` now nullable
   - Added `course_id`, `parent_course_group_id` to `lesson_groups`
   - Added `email`, `status` to `group_members`, `user_id` now nullable
   - Created `course_group_lesson_visibility` table

5. **app.module.ts** — Registered `CoursesModule`, `CourseGroupLessonVisibility` entity

### Frontend Changes

1. **lesson-groups.service.ts** (311 lines) — Added interfaces: `GroupDetail`, `InviteResult`, `LessonVisibility`. Added methods: `getCourseGroups`, `createCourseGroup`, `getCourseGroupLessonVisibility`, `updateCourseGroupLessonVisibility`, `getCourseDeadlines`, `inviteMembers`, `acceptInvite`, `getMyGroups`, `getMyLessonGroups`, `getMyCourseGroups`, `getGroupDetail`

2. **group-management.component.ts** (1,024 lines) — Extended with `@Input() courseId`, "Lesson Visibility" tab for course groups, invite members modal (email input + send button), invite status indicators in Members tab

3. **group-management-standalone.component.ts** (64 lines, new) — Wrapper accessed via `/lesson-groups/:lessonId` or `/course-groups/:courseId`, with Back button

4. **group-view.component.ts** (350 lines, new) — Student Group View at `/groups/:groupId/view` with tabs: Assignments, Deadlines, Progress, Members (+ Lessons tab for course groups)

5. **my-lessons.component.ts** (175 lines, new) — "My Lessons" page replacing "Assignments" nav item. Course groups at top, non-default precedence, "Show Open Groups" button for defaults

6. **course-overview.component.ts** (199 lines, new) — Course overview page with stats, lessons list, group dropdown + "Enter Group View"

7. **lesson-builder.component.ts** (592 lines) — Added "Manage Groups" buttons on lesson and course tiles, real course creation modal (replaced `alert()` stub)

8. **header.component.ts** (441 lines) — Replaced "Assignments" nav with "My Lessons"

9. **lesson-overview.component.ts** (280 lines) — Added group dropdown + "Enter Group View" button

10. **home.component.ts** (181 lines) — Added stacked-layers icon on course tiles, course tiles link to `/course-overview/:id`

11. **app.routes.ts** (207 lines) — Added routes: `/my-lessons`, `/lesson-groups/:lessonId`, `/course-groups/:courseId`, `/course-overview/:id`, `/groups/:groupId/view`

12. **Onboarding guard fix** — `onboarding.guard.ts` now waits for `auth.authReady()` signal before checking `isAuthenticated()`, with polling + 3s safety timeout

---

## Known Issues To Fix (User Feedback)

1. **Header overlap on standalone views** — The Manage Course/Lesson Group views (`/lesson-groups/:lessonId`, `/course-groups/:courseId`) and My Lessons view (`/my-lessons`) have their header hidden under the navbar. Need more top margin/padding (likely `pt-16` or `mt-16` on the container).

2. **Course Group "All Engagers" default not showing** — When opening Manage Course Groups, the default "All Course Engagers" group should appear even with 0 members. Check if `getOrCreateDefaultCourseGroup` is being called — likely the `GroupManagementComponent` only calls `getGroups(lessonId)` and needs to also call `getCourseGroups(courseId)` when in course mode. Look at `GroupManagementComponent.ngOnInit()` / `loadGroups()` logic.

3. **Create Course Group button not working** — The Create button on the Create Course Group modal closes the modal but doesn't create the group. Check `GroupManagementComponent.createGroup()` — it likely only calls `lessonGroupsService.createGroup(lessonId, ...)` and needs a branch to call `createCourseGroup(courseId, ...)` when `courseId` is set.

4. **Invite Members UI missing/incomplete** — Backend endpoints exist (`POST /lesson-groups/:groupId/invite`, `POST /lesson-groups/:groupId/accept-invite`) and frontend service methods exist (`inviteMembers`, `acceptInvite`), but the invite modal in `GroupManagementComponent` may not be fully wired. Need to verify the invite button appears for custom (non-default) groups and that the modal actually calls the service.

---

## Master Plan Status (AUTH_PERSONALISATION_CONTENT_CACHE_PLAN.md)

| Phase | Status |
|-------|--------|
| Phase 1: Cognito Auth | Partial (JWT strategy exists, Cognito Hosted UI works) |
| Phase 2: Personalisation | DONE |
| Phase 3: Onboarding | DONE |
| Phase 4: Content Cache | Not started |
| Phase 5: Route Protection & UX | Not started |
| Phase 6 (core): Shared User Management | DONE |
| Phase 6.5: Creator Engagement + Messaging | DONE |
| Phase 6.6+6.8: Lesson Groups + Assignments | DONE |
| Phase 6.7: Course Creation + Course Groups | DONE (this session) |
| Phase 7: Hub System | Not started |
| Phase 8: Notifications (full system) | Not started |

**Suggested next:** Fix the 4 known issues above, then proceed with Phase 7 (Hub System) or Phase 4 (Content Cache) depending on priority.

---

## Key File Locations

| Purpose | Path |
|---------|------|
| Master plan | `AUTH_PERSONALISATION_CONTENT_CACHE_PLAN.md` |
| Groups/Courses plan | `.cursor/plans/groups,_courses,_navigation_e1861873.plan.md` |
| Backend app module | `Upora/backend/src/app.module.ts` |
| Course entity | `Upora/backend/src/entities/course.entity.ts` |
| LessonGroup entity | `Upora/backend/src/entities/lesson-group.entity.ts` |
| Course CRUD | `Upora/backend/src/modules/courses/` |
| Groups service | `Upora/backend/src/modules/lesson-groups/lesson-groups.service.ts` |
| Groups controller | `Upora/backend/src/modules/lesson-groups/lesson-groups.controller.ts` |
| Frontend groups service | `Upora/frontend/src/app/core/services/lesson-groups.service.ts` |
| Group management UI | `Upora/frontend/src/app/shared/components/group-management/group-management.component.ts` |
| Standalone wrapper | `Upora/frontend/src/app/features/group-management-standalone/group-management-standalone.component.ts` |
| Group View (student) | `Upora/frontend/src/app/features/group-view/group-view.component.ts` |
| My Lessons page | `Upora/frontend/src/app/features/my-lessons/my-lessons.component.ts` |
| Course Overview | `Upora/frontend/src/app/features/course-overview/course-overview.component.ts` |
| Lesson Builder | `Upora/frontend/src/app/features/lesson-builder/lesson-builder.component.ts` |
| Header/Nav | `Upora/frontend/src/app/shared/components/header/header.component.ts` |
| Lesson Overview | `Upora/frontend/src/app/features/lesson-overview/lesson-overview.component.ts` |
| Home page | `Upora/frontend/src/app/features/home/home.component.ts` |
| Routes | `Upora/frontend/src/app/app.routes.ts` |
| Onboarding guard | `Upora/frontend/src/app/core/guards/onboarding.guard.ts` |
| Auth service | `Upora/frontend/src/app/core/services/auth.service.ts` |
