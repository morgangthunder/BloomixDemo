import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { IonContent } from '@ionic/angular/standalone';
import { LessonService } from '../../core/services/lesson.service';
import { CATEGORIES } from '../../core/data/lessons.data';

interface LessonProgress {
  id: string;
  title: string;
  description: string;
  thumbnailUrl?: string; // Optional to match Lesson model
  image?: string; // Alternative image property
  status: 'completed' | 'in-progress' | 'not-started';
  passed: boolean;
  public: boolean;
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent],
  template: `
    <ion-content [scrollEvents]="true" (ionScroll)="onScroll($event)">
      <div class="bg-brand-black min-h-screen text-brand-light-gray font-sans pt-20">
        <div class="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-6xl">
          <!-- Header -->
          <div class="flex items-center justify-between mb-8">
            <h1 class="text-3xl md:text-4xl font-bold text-white">Profile</h1>
            <button 
              (click)="goBack()"
              class="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-6 rounded transition">
              Back
            </button>
          </div>

          <!-- User Info Card -->
          <div class="bg-brand-dark rounded-lg p-6 mb-8 border border-gray-700">
            <div class="flex items-center space-x-4 mb-6">
              <div class="w-20 h-20 rounded-full bg-blue-500 flex items-center justify-center text-3xl font-bold text-white">
                {{ mockUser.username.charAt(0).toUpperCase() }}
              </div>
              <div>
                <h2 class="text-2xl font-bold text-white">{{ mockUser.username }}</h2>
                <p class="text-gray-400">{{ mockUser.email }}</p>
                <p class="text-sm text-brand-red font-semibold mt-1">{{ mockUser.subscription }}</p>
              </div>
            </div>

            <!-- Account Settings -->
            <div class="grid md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-brand-gray mb-1">Username</label>
                <input 
                  [(ngModel)]="mockUser.username"
                  type="text"
                  class="w-full bg-brand-dark border border-gray-600 rounded-md p-2 text-white focus:outline-none focus:ring-2 focus:ring-brand-red"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-brand-gray mb-1">Email</label>
                <input 
                  [(ngModel)]="mockUser.email"
                  type="email"
                  class="w-full bg-brand-dark border border-gray-600 rounded-md p-2 text-white focus:outline-none focus:ring-2 focus:ring-brand-red"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-brand-gray mb-1">Subscription Plan</label>
                <select 
                  [(ngModel)]="mockUser.subscription"
                  class="w-full bg-brand-dark border border-gray-600 rounded-md p-2 text-white focus:outline-none focus:ring-2 focus:ring-brand-red">
                  <option *ngFor="let plan of subscriptionPlans" [value]="plan">{{ plan }}</option>
                </select>
              </div>
              <div class="flex items-end">
                <button class="w-full bg-brand-red text-white font-bold py-2 px-4 rounded hover:bg-opacity-80 transition">
                  Save Changes
                </button>
              </div>
            </div>
          </div>

          <!-- Lesson Progress -->
          <div class="mb-8">
            <h2 class="text-2xl font-bold text-white mb-4">My Lesson Progress</h2>
            <div class="space-y-4">
              <div *ngFor="let lesson of lessonsWithProgress" 
                   class="bg-brand-dark rounded-lg p-4 border border-gray-700 flex items-center space-x-4">
                <img 
                  [src]="lesson.thumbnailUrl" 
                  [alt]="lesson.title"
                  class="w-24 h-16 object-cover rounded"
                />
                <div class="flex-1">
                  <h3 class="font-semibold text-white">{{ lesson.title }}</h3>
                  <p class="text-sm text-gray-400 line-clamp-1">{{ lesson.description }}</p>
                  <div class="flex items-center space-x-4 mt-2">
                    <span 
                      [class.bg-green-600]="lesson.status === 'completed'"
                      [class.bg-yellow-600]="lesson.status === 'in-progress'"
                      [class.bg-gray-600]="lesson.status === 'not-started'"
                      class="text-xs px-2 py-1 rounded text-white">
                      {{ lesson.status === 'not-started' ? 'Not Started' : 
                         lesson.status === 'in-progress' ? 'In Progress' : 'Completed' }}
                    </span>
                    <span *ngIf="lesson.passed" class="text-xs px-2 py-1 bg-blue-600 rounded text-white">
                      Passed
                    </span>
                    <label class="flex items-center space-x-2 text-sm">
                      <input 
                        type="checkbox"
                        [(ngModel)]="lesson.public"
                        class="form-checkbox h-4 w-4 text-brand-red rounded focus:ring-brand-red"
                      />
                      <span class="text-gray-400">Public</span>
                    </label>
                  </div>
                </div>
                <button 
                  (click)="viewLesson(lesson)"
                  class="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded transition">
                  View
                </button>
              </div>
            </div>
          </div>

          <!-- Statistics -->
          <div class="grid md:grid-cols-3 gap-4 mb-8">
            <div class="bg-brand-dark rounded-lg p-6 border border-gray-700 text-center">
              <div class="text-3xl font-bold text-brand-red mb-2">
                {{ completedLessons }}
              </div>
              <div class="text-gray-400">Lessons Completed</div>
            </div>
            <div class="bg-brand-dark rounded-lg p-6 border border-gray-700 text-center">
              <div class="text-3xl font-bold text-yellow-500 mb-2">
                {{ inProgressLessons }}
              </div>
              <div class="text-gray-400">In Progress</div>
            </div>
            <div class="bg-brand-dark rounded-lg p-6 border border-gray-700 text-center">
              <div class="text-3xl font-bold text-green-500 mb-2">
                {{ passedLessons }}
              </div>
              <div class="text-gray-400">Passed Lessons</div>
            </div>
          </div>

          <!-- Preferences -->
          <div class="bg-brand-dark rounded-lg p-6 border border-gray-700 mb-8">
            <h2 class="text-2xl font-bold text-white mb-4">Preferences</h2>
            <div class="space-y-4">
              <label class="flex items-center justify-between">
                <span class="text-gray-300">Email Notifications</span>
                <input 
                  type="checkbox"
                  checked
                  class="form-checkbox h-5 w-5 text-brand-red rounded focus:ring-brand-red"
                />
              </label>
              <label class="flex items-center justify-between">
                <span class="text-gray-300">Auto-play Next Lesson</span>
                <input 
                  type="checkbox"
                  class="form-checkbox h-5 w-5 text-brand-red rounded focus:ring-brand-red"
                />
              </label>
              <label class="flex items-center justify-between">
                <span class="text-gray-300">Show Progress Publicly</span>
                <input 
                  type="checkbox"
                  checked
                  class="form-checkbox h-5 w-5 text-brand-red rounded focus:ring-brand-red"
                />
              </label>
            </div>
          </div>
        </div>
      </div>
    </ion-content>
  `,
  styles: [`
    .line-clamp-1 {
      display: -webkit-box;
      -webkit-line-clamp: 1;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
  `]
})
export class ProfileComponent implements OnInit {
  mockUser = {
    username: 'Alex_Learner',
    email: 'alex.learner@example.com',
    subscription: 'Student: Premium Plan',
  };

  subscriptionPlans = [
    'Student: Free Plan',
    'Student: Premium Plan',
    'Lesson-builder',
    'Interaction Builder'
  ];

  mockLessonProgress = [
    { id: '9', status: 'completed' as const, passed: true, public: true },
    { id: '1', status: 'completed' as const, passed: true, public: false },
    { id: '2', status: 'in-progress' as const, passed: false, public: false },
    { id: '17', status: 'in-progress' as const, passed: false, public: false },
    { id: '25', status: 'not-started' as const, passed: false, public: false },
  ];

  lessonsWithProgress: LessonProgress[] = [];

  get completedLessons(): number {
    return this.lessonsWithProgress.filter(l => l.status === 'completed').length;
  }

  get inProgressLessons(): number {
    return this.lessonsWithProgress.filter(l => l.status === 'in-progress').length;
  }

  get passedLessons(): number {
    return this.lessonsWithProgress.filter(l => l.passed).length;
  }

  constructor(
    private lessonService: LessonService,
    private router: Router
  ) {}

  ngOnInit() {
    this.lessonService.setCurrentPage('profile');
    
    // Merge lesson data with progress
    const allLessons = CATEGORIES.flatMap(c => c.lessons);
    this.lessonsWithProgress = allLessons
      .filter(lesson => this.mockLessonProgress.some(p => p.id === lesson.id))
      .map(lesson => {
        const progress = this.mockLessonProgress.find(p => p.id === lesson.id)!;
        return {
          id: lesson.id,
          title: lesson.title,
          description: lesson.description,
          thumbnailUrl: lesson.thumbnailUrl,
          image: lesson.image,
          status: progress.status,
          passed: progress.passed,
          public: progress.public
        } as LessonProgress;
      });
  }

  onScroll(event: any) {
    const scrollTop = event.detail.scrollTop;
    this.lessonService.updateScrollPosition(scrollTop);
  }

  viewLesson(lesson: any) {
    this.lessonService.showOverview(lesson);
    this.router.navigate(['/lesson-overview', lesson.id]);
  }

  goBack() {
    this.lessonService.exitProfile();
    this.router.navigate(['/home']);
  }
}