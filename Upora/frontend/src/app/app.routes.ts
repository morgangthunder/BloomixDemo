import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { onboardingGuard } from './core/guards/onboarding.guard';
import { requireOnboardingGuard } from './core/guards/require-onboarding.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/home',
    pathMatch: 'full'
  },

  // ─── Auth pages (no guards) ───
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'signup',
    loadComponent: () => import('./features/auth/signup.component').then(m => m.SignupComponent)
  },
  {
    path: 'auth/verify',
    loadComponent: () => import('./features/auth/auth-verify.component').then(m => m.AuthVerifyComponent)
  },
  {
    path: 'auth/callback',
    loadComponent: () => import('./features/auth/auth-callback.component').then(m => m.AuthCallbackComponent)
  },
  {
    path: 'auth/forgot-password',
    loadComponent: () => import('./features/auth/forgot-password.component').then(m => m.ForgotPasswordComponent)
  },
  {
    path: 'auth/reset-password',
    loadComponent: () => import('./features/auth/reset-password.component').then(m => m.ResetPasswordComponent)
  },
  {
    path: 'unauthorized',
    loadComponent: () => import('./features/unauthorized/unauthorized.component').then(m => m.UnauthorizedComponent)
  },

  // ─── Onboarding ───
  {
    path: 'onboarding',
    canActivate: [onboardingGuard],
    loadComponent: () => import('./features/onboarding/onboarding-container.component').then(m => m.OnboardingContainerComponent)
  },

  // ─── Public routes (browsing) ───
  // requireOnboardingGuard lets unauthenticated users through but nudges
  // authenticated users who haven't completed onboarding.
  {
    path: 'home',
    canActivate: [requireOnboardingGuard],
    loadComponent: () => import('./features/home/home.component').then(m => m.HomeComponent)
  },
  {
    path: 'categories',
    canActivate: [requireOnboardingGuard],
    loadComponent: () => import('./features/categories/categories.component').then(m => m.CategoriesComponent)
  },
  {
    path: 'search',
    canActivate: [requireOnboardingGuard],
    loadComponent: () => import('./features/search/search.component').then(m => m.SearchComponent)
  },
  {
    path: 'lesson-overview/:id',
    canActivate: [requireOnboardingGuard],
    loadComponent: () => import('./features/lesson-overview/lesson-overview.component').then(m => m.LessonOverviewComponent)
  },
  {
    path: 'course-overview/:id',
    canActivate: [requireOnboardingGuard],
    loadComponent: () => import('./features/course-overview/course-overview.component').then(m => m.CourseOverviewComponent)
  },
  {
    path: 'course-details/:id',
    canActivate: [requireOnboardingGuard],
    loadComponent: () => import('./features/course-details/course-details.component').then(m => m.CourseDetailsComponent)
  },
  {
    path: 'hubs/create',
    canActivate: [authGuard],
    loadComponent: () => import('./features/hub-create/hub-create.component').then(m => m.HubCreateComponent)
  },
  {
    path: 'hubs/:slug/manage',
    canActivate: [authGuard],
    loadComponent: () => import('./features/hub-manage/hub-manage.component').then(m => m.HubManageComponent)
  },
  {
    path: 'hubs/:slug',
    canActivate: [requireOnboardingGuard],
    loadComponent: () => import('./features/hub-home/hub-home.component').then(m => m.HubHomeComponent)
  },
  {
    path: 'subscription/upgrade',
    canActivate: [requireOnboardingGuard],
    loadComponent: () => import('./features/subscription/subscription-upgrade.component').then(m => m.SubscriptionUpgradeComponent)
  },

  // ─── Lesson view (public route, access wall handled by component/backend) ───
  {
    path: 'lesson-view/:id',
    canActivate: [requireOnboardingGuard],
    loadComponent: () => import('./features/lesson-view/lesson-view.component').then(m => m.LessonViewComponent)
  },

  // ─── Authenticated routes (any role) ───
  {
    path: 'profile',
    canActivate: [authGuard, requireOnboardingGuard],
    loadComponent: () => import('./features/profile/profile.component').then(m => m.ProfileComponent)
  },
  {
    path: 'my-list',
    canActivate: [authGuard, requireOnboardingGuard],
    loadComponent: () => import('./features/my-list/my-list.component').then(m => m.MyListComponent)
  },
  {
    path: 'my-lessons',
    canActivate: [authGuard, requireOnboardingGuard],
    loadComponent: () => import('./features/my-lessons/my-lessons.component').then(m => m.MyLessonsComponent)
  },
  {
    path: 'assignments',
    canActivate: [authGuard, requireOnboardingGuard],
    loadComponent: () => import('./features/assignments/my-assignments.component').then(m => m.MyAssignmentsComponent)
  },
  {
    path: 'feedback',
    canActivate: [authGuard, requireOnboardingGuard],
    loadComponent: () => import('./features/feedback/feedback.component').then(m => m.FeedbackComponent)
  },
  {
    path: 'groups/:groupId/view',
    canActivate: [authGuard, requireOnboardingGuard],
    loadComponent: () => import('./features/group-view/group-view.component').then(m => m.GroupViewComponent)
  },

  // ─── Lesson builder routes (lesson-builder, admin, super-admin) ───
  {
    path: 'lesson-builder',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['lesson-builder'] },
    loadComponent: () => import('./features/lesson-builder/lesson-builder.component').then(m => m.LessonBuilderComponent)
  },
  {
    path: 'lesson-editor/:lessonId/engagers/:userId',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['lesson-builder'] },
    loadComponent: () => import('./features/super-admin/user-dashboard/user-dashboard.component').then(m => m.UserDashboardComponent)
  },
  {
    path: 'lesson-editor/:id',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['lesson-builder'] },
    loadComponent: () => import('./features/lesson-editor/lesson-editor-v2.component').then(m => m.LessonEditorV2Component)
  },
  {
    path: 'content-library',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['lesson-builder'] },
    loadComponent: () => import('./features/content-library/content-library.component').then(m => m.ContentLibraryComponent)
  },
  {
    path: 'content-approvals',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['admin'] },
    loadComponent: () => import('./features/content-approvals/content-approvals.component').then(m => m.ContentApprovalsComponent)
  },
  {
    path: 'lesson-groups/:lessonId',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['lesson-builder'] },
    loadComponent: () => import('./features/group-management-standalone/group-management-standalone.component').then(m => m.GroupManagementStandaloneComponent)
  },
  {
    path: 'course-groups/:courseId',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['lesson-builder'] },
    loadComponent: () => import('./features/group-management-standalone/group-management-standalone.component').then(m => m.GroupManagementStandaloneComponent)
  },

  // ─── Interaction builder routes (interaction-builder, admin, super-admin) ───
  {
    path: 'interaction-builder',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['interaction-builder'] },
    loadComponent: () => import('./features/interaction-builder/interaction-builder.component').then(m => m.InteractionBuilderComponent)
  },

  // ─── Hub management (moved above hubs/:slug to avoid wildcard match) ───

  // ─── Super Admin routes (admin or super-admin only) ───
  {
    path: 'super-admin',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['admin'] },
    loadComponent: () => import('./features/super-admin/super-admin-dashboard.component').then(m => m.SuperAdminDashboardComponent)
  },
  {
    path: 'super-admin/user-management',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['admin'] },
    loadComponent: () => import('./features/super-admin/user-management/user-management.component').then(m => m.UserManagementComponent)
  },
  {
    path: 'super-admin/user-management/:userId',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['admin'] },
    loadComponent: () => import('./features/super-admin/user-dashboard/user-dashboard.component').then(m => m.UserDashboardComponent)
  },
  {
    path: 'super-admin/llm-usage',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['admin'] },
    loadComponent: () => import('./features/super-admin/llm-token-usage.component').then(m => m.LlmTokenUsageComponent)
  },
  {
    path: 'super-admin/ai-prompts',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['admin'] },
    loadComponent: () => import('./features/super-admin/ai-prompts.component').then(m => m.AiPromptsComponent)
  },
  {
    path: 'super-admin/approval-queue',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['admin'] },
    loadComponent: () => import('./features/super-admin/approval-queue.component').then(m => m.ApprovalQueueComponent)
  },
  {
    path: 'super-admin/onboarding',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['admin'] },
    loadComponent: () => import('./features/super-admin/onboarding.component').then(m => m.OnboardingComponent)
  },
  {
    path: 'super-admin/feedback',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['admin'] },
    loadComponent: () => import('./features/super-admin/feedback-panel.component').then(m => m.FeedbackPanelComponent)
  },
  {
    path: 'super-admin/message-email-settings',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['admin'] },
    loadComponent: () => import('./features/super-admin/message-email-settings.component').then(m => m.MessageEmailSettingsComponent)
  },
  {
    path: 'super-admin/n8n-flows',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['admin'] },
    loadComponent: () => import('./features/super-admin/n8n-flows.component').then(m => m.N8nFlowsComponent)
  },
  {
    path: 'super-admin/tests',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['admin'] },
    loadComponent: () => import('./features/super-admin/tests.component').then(m => m.TestsComponent)
  },
  {
    path: 'super-admin/view-screenshot',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['admin'] },
    loadComponent: () => import('./features/super-admin/view-screenshot.component').then(m => m.ViewScreenshotComponent)
  },
  {
    path: 'super-admin/view-queries',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['admin'] },
    loadComponent: () => import('./features/super-admin/view-queries.component').then(m => m.ViewQueriesComponent)
  },

  // ─── Wildcard ───
  {
    path: '**',
    loadComponent: () => import('./shared/components/not-found/not-found.component').then(m => m.NotFoundComponent)
  }
];
