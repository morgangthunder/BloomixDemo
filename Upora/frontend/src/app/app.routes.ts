import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/home',
    pathMatch: 'full'
  },
  {
    path: 'home',
    loadComponent: () => import('./features/home/home.component').then(m => m.HomeComponent)
  },
  {
    path: 'categories',
    loadComponent: () => import('./features/categories/categories.component').then(m => m.CategoriesComponent)
  },
  {
    path: 'my-list',
    loadComponent: () => import('./features/my-list/my-list.component').then(m => m.MyListComponent)
  },
  {
    path: 'search',
    loadComponent: () => import('./features/search/search.component').then(m => m.SearchComponent)
  },
  {
    path: 'lesson-overview/:id',
    loadComponent: () => import('./features/lesson-overview/lesson-overview.component').then(m => m.LessonOverviewComponent)
  },
  {
    path: 'lesson-view/:id',
    loadComponent: () => import('./features/lesson-view/lesson-view.component').then(m => m.LessonViewComponent)
  },
  {
    path: 'lesson-builder',
    loadComponent: () => import('./features/lesson-builder/lesson-builder.component').then(m => m.LessonBuilderComponent)
  },
  {
    path: 'lesson-editor/:id',
    loadComponent: () => import('./features/lesson-editor/lesson-editor-v2.component').then(m => m.LessonEditorV2Component)
  },
  {
    path: 'interaction-builder',
    loadComponent: () => import('./features/interaction-builder/interaction-builder.component').then(m => m.InteractionBuilderComponent)
  },
  {
    path: 'content-library',
    loadComponent: () => import('./features/content-library/content-library.component').then(m => m.ContentLibraryComponent)
  },
  {
    path: 'content-approvals',
    loadComponent: () => import('./features/content-approvals/content-approvals.component').then(m => m.ContentApprovalsComponent)
  },
  {
    path: 'profile',
    loadComponent: () => import('./features/profile/profile.component').then(m => m.ProfileComponent)
  },
  {
    path: 'course-details/:id',
    loadComponent: () => import('./features/course-details/course-details.component').then(m => m.CourseDetailsComponent)
  },
  {
    path: 'super-admin',
    loadComponent: () => import('./features/super-admin/super-admin-dashboard.component').then(m => m.SuperAdminDashboardComponent)
  },
  {
    path: 'super-admin/llm-usage',
    loadComponent: () => import('./features/super-admin/llm-token-usage.component').then(m => m.LlmTokenUsageComponent)
  },
  {
    path: 'super-admin/ai-prompts',
    loadComponent: () => import('./features/super-admin/ai-prompts.component').then(m => m.AiPromptsComponent)
  },
  {
    path: 'super-admin/approval-queue',
    loadComponent: () => import('./features/super-admin/approval-queue.component').then(m => m.ApprovalQueueComponent)
  },
  {
    path: 'super-admin/tests',
    loadComponent: () => import('./features/super-admin/tests.component').then(m => m.TestsComponent)
  },
  {
    path: 'super-admin/view-screenshot',
    loadComponent: () => import('./features/super-admin/view-screenshot.component').then(m => m.ViewScreenshotComponent)
  },
  {
    path: 'super-admin/view-queries',
    loadComponent: () => import('./features/super-admin/view-queries.component').then(m => m.ViewQueriesComponent)
  },
  {
    path: '**',
    loadComponent: () => import('./shared/components/not-found/not-found.component').then(m => m.NotFoundComponent)
  }
];