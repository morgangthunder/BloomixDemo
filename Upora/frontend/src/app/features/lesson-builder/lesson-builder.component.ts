import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { IonContent } from '@ionic/angular/standalone';
import { LessonService } from '../../core/services/lesson.service';
import { Observable } from 'rxjs';
import { Course, HubLesson } from '../../core/models/lesson.model';

@Component({
  selector: 'app-lesson-builder',
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent],
  template: `
    <div class="h-screen bg-brand-dark text-white font-sans overflow-hidden flex flex-col lesson-builder-wrapper" style="background-color: #0a0a0a;">
      <!-- Header -->
      <header class="flex items-center justify-between p-4 md:p-6 bg-brand-black border-b border-gray-700 flex-shrink-0">
        <div class="flex items-center space-x-4">
          <button (click)="goBack()" class="text-white hover:text-brand-red transition-colors">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
            </svg>
          </button>
          <h1 class="text-2xl font-bold">Lesson Builder Hub</h1>
        </div>
        <button 
          (click)="createNewLesson()"
          class="bg-brand-red hover:bg-opacity-80 text-white font-bold py-2 px-6 rounded transition flex items-center space-x-2">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
          </svg>
          <span>New Lesson</span>
        </button>
      </header>

      <ion-content [scrollEvents]="true">
        <div class="container mx-auto px-4 md:px-6 lg:px-8 py-8">
          <!-- Courses Section -->
          <div class="mb-12">
            <div class="flex items-center justify-between mb-6">
              <h2 class="text-2xl font-bold text-white">My Courses</h2>
              <button class="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded transition flex items-center space-x-2">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                </svg>
                <span>New Course</span>
              </button>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div *ngFor="let course of courses$ | async"
                   class="bg-brand-black border border-gray-700 rounded-lg p-6 hover:border-brand-red transition-colors cursor-pointer"
                   (click)="viewCourse(course)">
                <div class="flex items-start justify-between mb-4">
                  <div class="flex-1">
                    <h3 class="text-xl font-bold text-white mb-2">{{ course.title }}</h3>
                    <span 
                      [class.bg-green-600]="course.status === 'Published'"
                      [class.bg-yellow-600]="course.status === 'Pending Approval'"
                      [class.bg-gray-600]="course.status === 'Build In Progress'"
                      class="text-xs px-2 py-1 rounded text-white">
                      {{ course.status }}
                    </span>
                  </div>
                </div>

                <div class="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p class="text-gray-400">Views</p>
                    <p class="text-white font-semibold">{{ course.stats.views | number }}</p>
                  </div>
                  <div>
                    <p class="text-gray-400">Completion</p>
                    <p class="text-white font-semibold">{{ course.stats.completionRate }}%</p>
                  </div>
                  <div>
                    <p class="text-gray-400">Completions</p>
                    <p class="text-white font-semibold">{{ course.stats.completions | number }}</p>
                  </div>
                  <div>
                    <p class="text-gray-400">Earnings</p>
                    <p class="text-green-500 font-semibold">\${{ course.earnings | number:'1.2-2' }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Lessons Section -->
          <div class="mb-12">
            <h2 class="text-2xl font-bold text-white mb-6">My Lessons</h2>

            <!-- Use real lessons if available, otherwise fall back to mock -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div *ngFor="let lesson of realLessons.length > 0 ? realLessons : (hubLessons$ | async)"
                   class="bg-brand-black border border-gray-700 rounded-lg p-6 hover:border-brand-red transition-colors"
                   [class.cursor-pointer]="lesson.isClickable"
                   [class.cursor-not-allowed]="!lesson.isClickable"
                   [class.opacity-60]="!lesson.isClickable"
                   (click)="lesson.isClickable && editLesson(lesson)">
                <div class="flex items-start justify-between mb-4">
                  <div class="flex-1">
                    <h3 class="text-xl font-bold text-white mb-2">{{ lesson.title }}</h3>
                    <div class="flex items-center space-x-2 mb-2">
                      <span 
                        [class.bg-green-600]="lesson.status === 'Published'"
                        [class.bg-yellow-600]="lesson.status === 'Pending Approval'"
                        [class.bg-gray-600]="lesson.status === 'Build In Progress'"
                        class="text-xs px-2 py-1 rounded text-white">
                        {{ lesson.status }}
                      </span>
                      <span class="text-xs text-gray-400">{{ lesson.stageCount }} stages</span>
                    </div>
                    <div *ngIf="lesson.courseId">
                      <p class="text-xs text-blue-400">
                        Course: {{ getCourseName(lesson.courseId) }}
                      </p>
                    </div>
                  </div>
                </div>

                <div class="grid grid-cols-2 gap-4 text-sm mb-4">
                  <div>
                    <p class="text-gray-400">Views</p>
                    <p class="text-white font-semibold">{{ lesson.stats.views | number }}</p>
                  </div>
                  <div>
                    <p class="text-gray-400">Completion</p>
                    <p class="text-white font-semibold">{{ lesson.stats.completionRate }}%</p>
                  </div>
                  <div>
                    <p class="text-gray-400">Completions</p>
                    <p class="text-white font-semibold">{{ lesson.stats.completions | number }}</p>
                  </div>
                  <div>
                    <p class="text-gray-400">Earnings</p>
                    <p class="text-green-500 font-semibold">\${{ lesson.earnings | number:'1.2-2' }}</p>
                  </div>
                </div>

                <button 
                  *ngIf="!lesson.courseId"
                  (click)="assignLessonToCourse($event, lesson)"
                  class="w-full bg-gray-700 hover:bg-gray-600 text-white text-sm py-2 px-4 rounded transition">
                  Assign to Course
                </button>
              </div>
            </div>
          </div>

          <!-- Unassigned Lessons -->
          <div *ngIf="unassignedLessons.length > 0">
            <h2 class="text-2xl font-bold text-white mb-6">Unassigned Lessons</h2>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div *ngFor="let lesson of unassignedLessons"
                   class="bg-brand-black border border-gray-700 rounded-lg p-4 hover:border-brand-red transition-colors">
                <h3 class="text-lg font-bold text-white mb-2">{{ lesson.title }}</h3>
                <p class="text-sm text-gray-400 mb-4">{{ lesson.stageCount }} stages</p>
                <button 
                  (click)="assignLessonToCourse($event, lesson)"
                  class="w-full bg-brand-red hover:bg-opacity-80 text-white text-sm py-2 px-4 rounded transition">
                  Assign to Course
                </button>
              </div>
            </div>
          </div>
        </div>
      </ion-content>
    </div>
  `,
  styles: [`
    .lesson-builder-wrapper {
      padding-top: 64px;
    }
    @media (min-width: 768px) {
      .lesson-builder-wrapper {
        padding-top: 80px;
      }
    }
  `]
})
export class LessonBuilderComponent implements OnInit {
  courses$: Observable<Course[]>;
  hubLessons$: Observable<HubLesson[]>;
  unassignedLessons: HubLesson[] = [];
  realLessons: any[] = [];
  loading = false;

  constructor(
    private lessonService: LessonService,
    private router: Router
  ) {
    this.courses$ = this.lessonService.courses$;
    this.hubLessons$ = this.lessonService.hubLessons$;
  }

  async ngOnInit() {
    this.lessonService.setCurrentPage('lesson-builder');
    this.lessonService.setLessonBuilderSubPage('hub');
    
    // Load real lessons from API
    await this.loadRealLessons();
    
    // Get unassigned lessons (from mock data for now)
    this.lessonService.hubLessons$.subscribe(lessons => {
      this.unassignedLessons = lessons.filter(l => l.courseId === null);
    });
  }

  async loadRealLessons() {
    this.loading = true;
    try {
      // Load lessons from the API (all lessons created by this user)
      await this.lessonService.loadLessonsFromAPI();
      
      // Transform API lessons to HubLesson format
      this.lessonService.categories$.subscribe(categories => {
        const allLessons = categories.flatMap(cat => cat.lessons);
        
        // Map to HubLesson format for display
        const hubLessons: HubLesson[] = allLessons.map((lesson, index) => ({
          id: index + 1000, // Generate numeric ID from index
          title: lesson.title,
          status: lesson.status === 'approved' ? 'Published' : 
                  lesson.status === 'pending' ? 'Pending Approval' : 
                  'Build In Progress',
          stageCount: lesson.data?.stages?.length || 0,
          courseId: null,
          stats: {
            views: lesson.views || 0,
            completionRate: lesson.completionRate ? Math.round(parseFloat(String(lesson.completionRate))) : 0,
            completions: lesson.completions || 0,
          },
          isClickable: true,
          realId: typeof lesson.id === 'string' ? lesson.id : String(lesson.id), // Store real UUID
          earnings: 0
        } as HubLesson & { realId?: string }));

        this.realLessons = hubLessons;
        console.log('[LessonBuilder] Loaded', hubLessons.length, 'real lessons from API');
      });
    } catch (error) {
      console.error('[LessonBuilder] Failed to load lessons:', error);
    } finally {
      this.loading = false;
    }
  }

  goBack() {
    this.lessonService.exitBuilderHub();
    this.router.navigate(['/home']);
  }

  createNewLesson() {
    this.lessonService.enterBuilder();
    this.router.navigate(['/lesson-editor', 'new']);
  }

  editLesson(lesson: any) {
    if (lesson.isClickable) {
      this.lessonService.enterBuilder();
      // Use realId (UUID) if available, otherwise use numeric id
      const lessonId = lesson.realId || lesson.id;
      this.router.navigate(['/lesson-editor', lessonId]);
    }
  }

  viewCourse(course: Course) {
    this.lessonService.viewCourse(course);
    this.router.navigate(['/course-details', course.id]);
  }

  assignLessonToCourse(event: Event, lesson: HubLesson) {
    event.stopPropagation();
    // Simple implementation - assign to first course for now
    const firstCourseId = 1;
    this.lessonService.assignLessonToCourse(lesson.id, firstCourseId);
  }

  getCourseName(courseId: number): string {
    let courseName = '';
    this.courses$.subscribe(courses => {
      const course = courses.find(c => c.id === courseId);
      courseName = course?.title || 'Unknown Course';
    }).unsubscribe();
    return courseName;
  }
}