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
    path: 'interaction-builder',
    loadComponent: () => import('./features/interaction-builder/interaction-builder.component').then(m => m.InteractionBuilderComponent)
  },
  {
    path: 'profile',
    loadComponent: () => import('./features/profile/profile.component').then(m => m.ProfileComponent)
  },
  {
    path: 'course-details/:id',
    loadComponent: () => import('./features/course-details/course-details.component').then(m => m.CourseDetailsComponent)
  }
];