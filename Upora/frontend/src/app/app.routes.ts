import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { onboardingGuard } from './core/guards/onboarding.guard';
import { requireOnboardingGuard } from './core/guards/require-onboarding.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/home',
    pathMatch: 'full'
  },
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
    path: 'onboarding',
    canActivate: [onboardingGuard],
    loadComponent: () => import('./features/onboarding/onboarding-container.component').then(m => m.OnboardingContainerComponent)
  },
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
    path: 'my-list',
    canActivate: [requireOnboardingGuard],
    loadComponent: () => import('./features/my-list/my-list.component').then(m => m.MyListComponent)
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
    path: 'lesson-view/:id',
    canActivate: [requireOnboardingGuard],
    loadComponent: () => import('./features/lesson-view/lesson-view.component').then(m => m.LessonViewComponent)
  },
  {
    path: 'lesson-builder',
    canActivate: [authGuard],
    loadComponent: () => import('./features/lesson-builder/lesson-builder.component').then(m => m.LessonBuilderComponent)
  },
  {
    path: 'lesson-editor/:lessonId/engagers/:userId',
    canActivate: [authGuard],
    loadComponent: () => import('./features/super-admin/user-dashboard/user-dashboard.component').then(m => m.UserDashboardComponent)
  },
  {
    path: 'lesson-editor/:id',
    canActivate: [authGuard],
    loadComponent: () => import('./features/lesson-editor/lesson-editor-v2.component').then(m => m.LessonEditorV2Component)
  },
  {
    path: 'interaction-builder',
    canActivate: [authGuard],
    loadComponent: () => import('./features/interaction-builder/interaction-builder.component').then(m => m.InteractionBuilderComponent)
  },
  {
    path: 'content-library',
    canActivate: [authGuard],
    loadComponent: () => import('./features/content-library/content-library.component').then(m => m.ContentLibraryComponent)
  },
  {
    path: 'content-approvals',
    canActivate: [authGuard],
    loadComponent: () => import('./features/content-approvals/content-approvals.component').then(m => m.ContentApprovalsComponent)
  },
  {
    path: 'profile',
    canActivate: [authGuard, requireOnboardingGuard],
    loadComponent: () => import('./features/profile/profile.component').then(m => m.ProfileComponent)
  },
  {
    path: 'course-details/:id',
    canActivate: [requireOnboardingGuard],
    loadComponent: () => import('./features/course-details/course-details.component').then(m => m.CourseDetailsComponent)
  },
  {
    path: 'super-admin',
    canActivate: [authGuard],
    loadComponent: () => import('./features/super-admin/super-admin-dashboard.component').then(m => m.SuperAdminDashboardComponent)
  },
  {
    path: 'super-admin/user-management',
    canActivate: [authGuard],
    loadComponent: () => import('./features/super-admin/user-management/user-management.component').then(m => m.UserManagementComponent)
  },
  {
    path: 'super-admin/user-management/:userId',
    canActivate: [authGuard],
    loadComponent: () => import('./features/super-admin/user-dashboard/user-dashboard.component').then(m => m.UserDashboardComponent)
  },
  {
    path: 'super-admin/llm-usage',
    canActivate: [authGuard],
    loadComponent: () => import('./features/super-admin/llm-token-usage.component').then(m => m.LlmTokenUsageComponent)
  },
  {
    path: 'super-admin/ai-prompts',
    canActivate: [authGuard],
    loadComponent: () => import('./features/super-admin/ai-prompts.component').then(m => m.AiPromptsComponent)
  },
  {
    path: 'super-admin/approval-queue',
    canActivate: [authGuard],
    loadComponent: () => import('./features/super-admin/approval-queue.component').then(m => m.ApprovalQueueComponent)
  },
  {
    path: 'super-admin/onboarding',
    canActivate: [authGuard],
    loadComponent: () => import('./features/super-admin/onboarding.component').then(m => m.OnboardingComponent)
  },
  {
    path: 'super-admin/message-email-settings',
    canActivate: [authGuard],
    loadComponent: () => import('./features/super-admin/message-email-settings.component').then(m => m.MessageEmailSettingsComponent)
  },
  {
    path: 'super-admin/n8n-flows',
    canActivate: [authGuard],
    loadComponent: () => import('./features/super-admin/n8n-flows.component').then(m => m.N8nFlowsComponent)
  },
  {
    path: 'super-admin/tests',
    canActivate: [authGuard],
    loadComponent: () => import('./features/super-admin/tests.component').then(m => m.TestsComponent)
  },
  {
    path: 'super-admin/view-screenshot',
    canActivate: [authGuard],
    loadComponent: () => import('./features/super-admin/view-screenshot.component').then(m => m.ViewScreenshotComponent)
  },
  {
    path: 'super-admin/view-queries',
    canActivate: [authGuard],
    loadComponent: () => import('./features/super-admin/view-queries.component').then(m => m.ViewQueriesComponent)
  },
  {
    path: '**',
    loadComponent: () => import('./shared/components/not-found/not-found.component').then(m => m.NotFoundComponent)
  }
];