import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { IonContent } from '@ionic/angular/standalone';
import { LessonService } from '../../core/services/lesson.service';
import { Observable } from 'rxjs';
import { Course, HubLesson } from '../../core/models/lesson.model';
import { HubsService, HubSummary } from '../../core/services/hubs.service';

@Component({
  selector: 'app-lesson-builder',
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent],
  template: `
    <div class="h-screen text-white font-sans overflow-hidden flex flex-col lesson-builder-wrapper" style="background-color: #000;">
      <!-- Header -->
      <header class="builder-header" style="background-color: #0a0a0a;">
        <div class="header-row-1">
          <button (click)="handleBackButton()" class="text-white hover:text-brand-red transition-colors">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
            </svg>
          </button>
          <div class="flex-1">
            <h1 class="text-xl md:text-2xl font-bold">{{currentView === 'courses' ? 'Lesson Builder Hub' : selectedCourse?.title || 'Course Lessons'}}</h1>
            <p class="text-sm text-gray-400" *ngIf="currentView === 'course-lessons'">
              {{getCourseLessons().length}} lesson{{getCourseLessons().length === 1 ? '' : 's'}}
            </p>
          </div>
        </div>
        <div class="header-row-2">
          <button 
            (click)="createNewCourse()"
            class="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 md:px-6 rounded transition flex items-center space-x-2">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
            </svg>
            <span class="hidden sm:inline">New Course</span>
            <span class="sm:hidden">Course</span>
          </button>
          <button 
            (click)="createNewLesson()"
            class="bg-brand-red hover:bg-opacity-80 text-white font-bold py-2 px-4 md:px-6 rounded transition flex items-center space-x-2">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
            </svg>
            <span class="hidden sm:inline">New Lesson</span>
            <span class="sm:hidden">Lesson</span>
          </button>
        </div>
      </header>

      <ion-content [scrollEvents]="true" class="ion-content-black">
        <div class="container mx-auto px-4 md:px-6 lg:px-8 py-8">
          
          <!-- COURSES VIEW (Main View) -->
          <div *ngIf="currentView === 'courses'">
            <!-- No Course Group (Uncategorized Lessons) -->
            <div class="mb-8" *ngIf="noCourseGroup.length > 0">
              <div class="course-group-card" (click)="viewNoCourseGroup()">
                <div class="course-header">
                  <div>
                    <h3 class="text-xl font-bold text-white">📚 No Course</h3>
                    <p class="text-sm text-gray-400 mt-1">Uncategorized lessons</p>
                  </div>
                  <div class="lesson-count">
                    {{noCourseGroup.length}} lesson{{noCourseGroup.length === 1 ? '' : 's'}}
                  </div>
                </div>
                <div class="flex items-center text-gray-400 text-sm mt-4">
                  <span>Click to view lessons</span>
                  <svg class="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                  </svg>
                </div>
              </div>
            </div>

            <!-- Course Groups -->
            <div class="mb-6" *ngIf="courseGroups.size > 0">
              <h2 class="text-2xl font-bold text-white mb-4">My Courses</h2>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" *ngIf="realCourses.length > 0">
              <div *ngFor="let course of realCourses" class="course-group-card" (click)="viewCourseById(course.id)">
                <div class="course-header">
                  <div class="flex-1">
                    <h3 class="text-xl font-bold text-white mb-2">{{ course.title }}</h3>
                    <span class="text-xs px-2 py-1 rounded text-white"
                          [class.bg-green-600]="course.status === 'approved' || course.status === 'Published'"
                          [class.bg-yellow-600]="course.status === 'pending' || course.status === 'draft'"
                          [class.bg-gray-600]="!course.status || course.status === 'Build In Progress'">
                      {{ course.status || 'draft' }}
                    </span>
                  </div>
                  <div class="lesson-count">
                    {{ course.lessons?.length || 0 }}
                  </div>
                </div>

                <div class="grid grid-cols-2 gap-3 text-sm mt-4">
                  <div>
                    <p class="text-gray-400">Views</p>
                    <p class="text-white font-semibold">{{ course.viewCount || 0 }}</p>
                  </div>
                  <div>
                    <p class="text-gray-400">Completion</p>
                    <p class="text-white font-semibold">{{ course.completionCount || 0 }}</p>
                  </div>
                </div>

                <div class="flex items-center justify-between text-sm mt-4">
                  <span class="text-gray-400 flex items-center">Click to view lessons
                    <svg class="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                    </svg>
                  </span>
                  <button (click)="manageCourseGroups(course, $event)" class="text-xs px-3 py-1 rounded border border-cyan-600 text-cyan-400 hover:bg-cyan-900/30 transition">Manage Groups</button>
                  <button (click)="openHubPublish('course', course, $event)" class="text-xs px-3 py-1 rounded border border-purple-600 text-purple-400 hover:bg-purple-900/30 transition">Publish to Hubs</button>
                </div>
              </div>
            </div>

            <!-- Fallback for mock courseGroups if no real courses loaded -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" *ngIf="realCourses.length === 0 && courseGroups.size > 0">
              <div class="course-group-card" (click)="viewCourseWithId('40000000-0000-0000-0000-000000000001')">
                <div class="course-header">
                  <div class="flex-1">
                    <h3 class="text-xl font-bold text-white mb-2">JavaScript Mastery Course</h3>
                    <span class="text-xs px-2 py-1 rounded text-white bg-green-600">Published</span>
                  </div>
                  <div class="lesson-count">{{getLessonsInCourse('40000000-0000-0000-0000-000000000001').length}}</div>
                </div>
                <div class="flex items-center text-gray-400 text-sm mt-4">
                  <span>Click to view lessons</span>
                  <svg class="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
                </div>
              </div>
            </div>
          </div>

          <!-- COURSE LESSONS VIEW (Drill-Down) -->
          <div *ngIf="currentView === 'course-lessons'">
            <!-- Course Settings Panel -->
            <div *ngIf="selectedCourse" class="course-settings-panel mb-6">
              <div class="flex items-center justify-between mb-3">
                <h3 class="text-lg font-semibold text-white">Course Settings</h3>
                <button (click)="showCourseSettings = !showCourseSettings"
                  class="text-xs px-3 py-1 rounded border border-gray-600 text-gray-400 hover:text-white hover:border-gray-500 transition">
                  {{ showCourseSettings ? 'Hide' : 'Show' }} Settings
                </button>
              </div>
              <div *ngIf="showCourseSettings" class="course-settings-body">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label class="block text-xs text-gray-400 mb-1">Access Level</label>
                    <select [(ngModel)]="courseAccessLevel" (ngModelChange)="onCourseAccessChange()"
                      class="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:border-cyan-500 outline-none">
                      <option value="public">Public (no login required)</option>
                      <option value="login_required">Login Required</option>
                      <option value="paid" disabled>Paid (coming soon)</option>
                    </select>
                  </div>
                  <div *ngIf="courseAccessLevel === 'login_required'">
                    <label class="block text-xs text-gray-400 mb-1">Required Subscription Tier</label>
                    <select [(ngModel)]="courseRequiredTier" (ngModelChange)="onCourseAccessChange()"
                      class="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:border-cyan-500 outline-none">
                      <option value="free">Free (any logged-in user)</option>
                      <option value="pro">Pro</option>
                      <option value="enterprise">Enterprise</option>
                    </select>
                  </div>
                </div>
                <div class="flex gap-2 justify-end">
                  <button (click)="saveCourseSettings()" [disabled]="savingCourseSettings"
                    class="text-xs px-4 py-2 rounded bg-cyan-700 hover:bg-cyan-600 text-white font-bold transition disabled:opacity-50">
                    {{ savingCourseSettings ? 'Saving...' : 'Save Settings' }}
                  </button>
                </div>
              </div>
            </div>

            <!-- Lesson List with Reorder -->
            <div class="space-y-3">
              <div *ngFor="let lesson of getCourseLessons(); let i = index; let first = first; let last = last"
                   class="lesson-card-row"
                   (click)="editLesson(lesson)">
                <!-- Reorder Arrows -->
                <div class="reorder-arrows" *ngIf="selectedCourse" (click)="$event.stopPropagation()">
                  <button (click)="moveLessonUp(i)" [disabled]="first || reordering"
                    class="reorder-btn" [class.disabled]="first" title="Move up">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"/>
                    </svg>
                  </button>
                  <span class="text-xs text-gray-500 font-mono">{{ i + 1 }}</span>
                  <button (click)="moveLessonDown(i)" [disabled]="last || reordering"
                    class="reorder-btn" [class.disabled]="last" title="Move down">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                    </svg>
                  </button>
                </div>

                <!-- Lesson Content -->
                <div class="flex-1 min-w-0">
                  <div class="lesson-header">
                    <h3 class="text-lg font-bold text-white mb-1 truncate">{{ lesson.title }}</h3>
                    <div class="flex items-center gap-2 flex-wrap">
                      <span 
                        [class.bg-green-600]="lesson.status === 'approved' || lesson.status === 'Published'"
                        [class.bg-yellow-600]="lesson.status === 'pending' || lesson.status === 'Pending Approval'"
                        [class.bg-red-600]="lesson.status === 'rejected'"
                        [class.bg-gray-600]="lesson.status === 'Build In Progress'"
                        class="text-xs px-2 py-0.5 rounded text-white">
                        {{ lesson.status }}
                      </span>
                      <span *ngIf="lesson.accessLevel && lesson.accessLevel !== 'public'"
                        class="text-xs px-2 py-0.5 rounded border"
                        [class.border-yellow-600]="lesson.accessLevel === 'login_required'"
                        [class.text-yellow-400]="lesson.accessLevel === 'login_required'"
                        [class.border-purple-600]="lesson.accessLevel === 'paid'"
                        [class.text-purple-400]="lesson.accessLevel === 'paid'">
                        {{ lesson.accessLevel === 'login_required' ? '🔒 Login' : '💰 Paid' }}
                        <span *ngIf="lesson.requiredSubscriptionTier && lesson.requiredSubscriptionTier !== 'free'">
                          ({{ lesson.requiredSubscriptionTier }})
                        </span>
                      </span>
                    </div>
                  </div>

                  <div class="flex items-center gap-4 text-sm mt-2">
                    <span class="text-gray-400">{{ lesson.views || 0 }} views</span>
                    <span class="text-gray-400">{{ lesson.completionRate || '0' }}% completion</span>
                  </div>
                </div>

                <!-- Actions -->
                <div class="flex items-center gap-2 flex-shrink-0" (click)="$event.stopPropagation()">
                  <button (click)="manageGroups(lesson, $event)" class="text-xs px-3 py-1 rounded border border-cyan-600 text-cyan-400 hover:bg-cyan-900/30 transition" title="Manage Groups">Groups</button>
                  <button (click)="openHubPublish('lesson', lesson, $event)" class="text-xs px-3 py-1 rounded border border-purple-600 text-purple-400 hover:bg-purple-900/30 transition" title="Publish to Hubs">Hubs</button>
                  <svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                  </svg>
                </div>
              </div>
            </div>
            <div *ngIf="getCourseLessons().length === 0" class="text-center text-gray-500 py-12">
              <p class="text-lg">No lessons in this course yet</p>
              <p class="text-sm mt-2">Create a new lesson to get started</p>
            </div>
          </div>
        </div>
      </ion-content>

      <!-- Create Course Modal -->
      <div *ngIf="showCreateCourseModal" class="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" (click)="showCreateCourseModal = false">
        <div class="bg-gray-900 rounded-xl border border-gray-700 p-6 w-full max-w-md" (click)="$event.stopPropagation()">
          <h2 class="text-xl font-bold text-white mb-4">Create New Course</h2>
          <input [(ngModel)]="newCourseTitle" placeholder="Course title..." class="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white mb-3 focus:border-cyan-500 outline-none" />
          <textarea [(ngModel)]="newCourseDescription" placeholder="Description (optional)" rows="3" class="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white mb-4 focus:border-cyan-500 outline-none"></textarea>
          <div class="flex gap-3 justify-end">
            <button (click)="showCreateCourseModal = false" class="px-4 py-2 rounded text-gray-400 hover:text-white border border-gray-600 hover:border-gray-500 transition">Cancel</button>
            <button (click)="submitNewCourse()" [disabled]="!newCourseTitle.trim() || creatingCourse" class="px-4 py-2 rounded bg-brand-red text-white font-bold hover:bg-opacity-90 transition disabled:opacity-50">
              {{ creatingCourse ? 'Creating...' : 'Create Course' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Hub Publish Modal -->
      <div *ngIf="showHubPublishModal" class="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" (click)="showHubPublishModal = false">
        <div class="bg-gray-900 rounded-xl border border-gray-700 p-6 w-full max-w-md" (click)="$event.stopPropagation()">
          <h2 class="text-xl font-bold text-white mb-2">Publish to Hubs</h2>
          <p class="text-sm text-gray-400 mb-4">Select which hubs to publish "{{ hubPublishItemName }}" to:</p>
          <div *ngIf="hubPublishOptions.length === 0" class="text-gray-500 text-sm py-4 text-center">
            You are not a member of any hubs yet.
          </div>
          <div class="max-h-60 overflow-y-auto space-y-2 mb-4">
            <label *ngFor="let opt of hubPublishOptions" class="flex items-center gap-3 p-3 bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-750 transition">
              <input type="checkbox" [(ngModel)]="opt.selected" class="accent-cyan-500 w-4 h-4" />
              <span class="inline-flex items-center justify-center w-7 h-7 rounded bg-cyan-900/30 text-cyan-400 text-xs font-bold flex-shrink-0">{{ opt.name.charAt(0).toUpperCase() }}</span>
              <span class="text-white text-sm">{{ opt.name }}</span>
              <span *ngIf="opt.alreadyLinked" class="text-xs text-green-400 ml-auto">Linked</span>
            </label>
          </div>
          <div *ngIf="hubPublishSnack" class="text-sm text-yellow-400 bg-yellow-900/30 rounded px-3 py-2 mb-3">{{ hubPublishSnack }}</div>
          <div class="flex gap-3 justify-end">
            <button (click)="showHubPublishModal = false" class="px-4 py-2 rounded text-gray-400 hover:text-white border border-gray-600 hover:border-gray-500 transition">Cancel</button>
            <button (click)="confirmHubPublish()" [disabled]="hubPublishing" class="px-4 py-2 rounded bg-purple-600 text-white font-bold hover:bg-purple-500 transition disabled:opacity-50">
              {{ hubPublishing ? 'Publishing...' : 'Publish' }}
            </button>
          </div>
        </div>
      </div>
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
    
    /* Header Layout */
    .builder-header {
      border-bottom: 1px solid #333;
      padding: 1rem;
      flex-shrink: 0;
    }
    .header-row-1 {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 1rem;
    }
    .header-row-2 {
      display: flex;
      gap: 0.75rem;
      justify-content: flex-end;
    }
    @media (min-width: 768px) {
      .builder-header {
        padding: 1.5rem;
      }
      .header-row-1 {
        margin-bottom: 0;
      }
      .builder-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .header-row-2 {
        justify-content: flex-start;
      }
    }
    
    /* Course Group Card */
    .course-group-card {
      background: #0a0a0a;
      border: 1px solid #333;
      border-radius: 12px;
      padding: 1.5rem;
      cursor: pointer;
      transition: all 0.2s;
    }
    .course-group-card:hover {
      border-color: #cc0000;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(204, 0, 0, 0.2);
    }
    .course-header {
      display: flex;
      justify-content: space-between;
      align-items: start;
    }
    .lesson-count {
      background: #cc0000;
      color: white;
      min-width: 48px;
      height: 48px;
      border-radius: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0 0.75rem;
      font-size: 0.875rem;
      font-weight: 600;
      flex-shrink: 0;
    }
    
    .ion-content-black {
      --background: #000 !important;
    }
    ion-content {
      --background: #000 !important;
    }
    
    /* Lesson Card */
    .lesson-card {
      background: #0a0a0a;
      border: 1px solid #333;
      border-radius: 12px;
      padding: 1.5rem;
      cursor: pointer;
      transition: all 0.2s;
    }
    .lesson-card:hover {
      border-color: #cc0000;
      transform: translateY(-2px);
    }
    .lesson-header {
      margin-bottom: 1rem;
    }

    /* Lesson Card Row (Course Lessons View) */
    .lesson-card-row {
      display: flex;
      align-items: center;
      gap: 1rem;
      background: #0a0a0a;
      border: 1px solid #333;
      border-radius: 12px;
      padding: 1rem 1.5rem;
      cursor: pointer;
      transition: all 0.2s;
    }
    .lesson-card-row:hover {
      border-color: #cc0000;
      background: #111;
    }
    .reorder-arrows {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
      flex-shrink: 0;
    }
    .reorder-btn {
      color: #888;
      padding: 2px;
      border-radius: 4px;
      transition: all 0.2s;
      background: transparent;
      border: none;
      cursor: pointer;
    }
    .reorder-btn:hover:not(.disabled) {
      color: #fff;
      background: rgba(255,255,255,0.1);
    }
    .reorder-btn.disabled {
      opacity: 0.3;
      cursor: not-allowed;
    }

    /* Course Settings Panel */
    .course-settings-panel {
      background: #0a0a0a;
      border: 1px solid #333;
      border-radius: 12px;
      padding: 1.25rem 1.5rem;
    }
    .course-settings-body {
      border-top: 1px solid #333;
      padding-top: 1rem;
      margin-top: 0.5rem;
    }
  `]
})
export class LessonBuilderComponent implements OnInit {
  courses$: Observable<Course[]>;
  hubLessons$: Observable<HubLesson[]>;
  unassignedLessons: HubLesson[] = [];
  realLessons: any[] = [];
  realCourses: any[] = [];
  loading = false;
  
  // View state
  currentView: 'courses' | 'course-lessons' = 'courses';
  selectedCourse: Course | null = null;
  
  // Grouped lessons
  noCourseGroup: any[] = [];
  courseGroups: Map<number, {course: Course, lessons: any[]}> = new Map();

  // Hub Publish
  showHubPublishModal = false;
  hubPublishOptions: { id: string; name: string; slug: string; selected: boolean; alreadyLinked: boolean }[] = [];
  hubPublishing = false;
  hubPublishItemType: 'lesson' | 'course' = 'lesson';
  hubPublishItemId = '';
  hubPublishItemName = '';

  constructor(
    private lessonService: LessonService,
    private router: Router,
    private hubsService: HubsService
  ) {
    this.courses$ = this.lessonService.courses$;
    this.hubLessons$ = this.lessonService.hubLessons$;
  }

  async ngOnInit() {
    this.lessonService.setCurrentPage('lesson-builder');
    this.lessonService.setLessonBuilderSubPage('hub');
    
    // Load real lessons and courses from API
    await this.loadRealLessons();
    await this.loadRealCourses();
    
    // Get unassigned lessons (from mock data for now)
    this.lessonService.hubLessons$.subscribe(lessons => {
      this.unassignedLessons = lessons.filter(l => l.courseId === null);
    });
  }

  async loadRealCourses() {
    try {
      const response = await fetch('http://127.0.0.1:3000/api/courses', {
        headers: {
          'x-tenant-id': '00000000-0000-0000-0000-000000000001',
          'x-user-id': localStorage.getItem('userId') || '',
          'x-user-role': localStorage.getItem('userRole') || 'super-admin',
        }
      });
      this.realCourses = await response.json();
      console.log('[LessonBuilder] Loaded', this.realCourses.length, 'real courses');
    } catch (err) {
      console.error('[LessonBuilder] Failed to load courses:', err);
    }
  }

  async loadRealLessons() {
    this.loading = true;
    try {
      // Load lessons DIRECTLY from the API (bypass categories$ to get raw data)
      const response = await fetch('http://127.0.0.1:3000/api/lessons?status=approved', {
        headers: {
          'x-tenant-id': '00000000-0000-0000-0000-000000000001'
        }
      });
      const backendLessons = await response.json();
      
      console.log('[LessonBuilder] Raw API response:', backendLessons);
      
      // Map to HubLesson format for display
      const hubLessons: HubLesson[] = backendLessons.map((lesson: any, index: number) => ({
        id: index + 1000, // Generate numeric ID for display only
        title: lesson.title,
        status: lesson.status === 'approved' ? 'Published' : 
                lesson.status === 'pending' ? 'Pending Approval' : 
                'Build In Progress',
        stageCount: lesson.data?.stages?.length || 0,
        courseId: null, // Legacy field
        stats: {
          views: lesson.views || 0,
          completionRate: lesson.completionRate ? Math.round(parseFloat(String(lesson.completionRate))) : 0,
          completions: lesson.completions || 0,
        },
        isClickable: true,
        realId: lesson.id, // DIRECT from backend - this is the UUID!
        realCourseId: lesson.courseId || null, // DIRECT from backend
        earnings: 0
      } as HubLesson & { realId?: string, realCourseId?: string | null }));

      this.realLessons = hubLessons;
      console.log('[LessonBuilder] ✅ Loaded', hubLessons.length, 'real lessons from API');
      console.log('[LessonBuilder] ✅ Lessons with correct IDs:', hubLessons.map(l => ({
        title: l.title,
        displayId: l.id,
        realId: l.realId,
        realCourseId: l.realCourseId
      })));
      
      // Group lessons by course
      this.groupLessonsByCourse();
    } catch (error) {
      console.error('[LessonBuilder] Failed to load lessons:', error);
    } finally {
      this.loading = false;
    }
  }
  
  groupLessonsByCourse() {
    // Load courses and group lessons
    this.courses$.subscribe(courses => {
      // Separate lessons with no course
      this.noCourseGroup = this.realLessons.filter(l => !l.realCourseId);
      
      console.log('[LessonBuilder] No Course Group:', this.noCourseGroup.map(l => ({
        title: l.title,
        realId: l.realId,
        realCourseId: l.realCourseId
      })));
      
      // Group lessons by course
      this.courseGroups.clear();
      courses.forEach(course => {
        const courseLessons = this.realLessons.filter(l => 
          l.realCourseId === String(course.id)
        );
        if (courseLessons.length > 0 || true) { // Show all courses even if empty
          this.courseGroups.set(course.id, { course, lessons: courseLessons });
        }
      });
      
      console.log('[LessonBuilder] Grouped:', this.noCourseGroup.length, 'in No Course,', this.courseGroups.size, 'courses');
    });
  }
  
  handleBackButton() {
    if (this.currentView === 'course-lessons') {
      // Go back to courses view
      this.currentView = 'courses';
      this.selectedCourse = null;
    } else {
      // Go back to home
      this.lessonService.exitBuilderHub();
      this.router.navigate(['/home']);
    }
  }
  
  viewCourseGroup(course: Course) {
    this.selectedCourse = course;
    this.currentView = 'course-lessons';
  }
  
  viewNoCourseGroup() {
    this.selectedCourse = null;
    this.currentView = 'course-lessons';
  }
  
  viewCourseWithId(courseId: string) {
    // Temporary method until we have full course API
    this.selectedCourse = { id: courseId as any, title: 'JavaScript Mastery Course' } as Course;
    this.currentView = 'course-lessons';
  }
  
  getLessonsInCourse(courseId: string): any[] {
    return this.realLessons.filter(l => l.realCourseId === courseId);
  }
  
  getCourseLessons(): any[] {
    if (this.selectedCourse) {
      if (this.courseLessons.length > 0) {
        return this.courseLessons;
      }
      const courseId = typeof this.selectedCourse.id === 'string' ? this.selectedCourse.id : String(this.selectedCourse.id);
      return this.realLessons.filter(l => l.realCourseId === courseId);
    } else {
      return this.noCourseGroup;
    }
  }

  goBack() {
    this.handleBackButton();
  }

  manageCourseGroups(course: any, event: Event) {
    event.stopPropagation();
    this.router.navigate(['/course-groups', course.id]);
  }

  manageGroups(lesson: any, event: Event) {
    event.stopPropagation();
    const lessonId = lesson.realId || lesson.id;
    this.router.navigate(['/lesson-groups', lessonId]);
  }

  // Course Settings
  showCourseSettings = false;
  courseAccessLevel = 'public';
  courseRequiredTier = 'free';
  savingCourseSettings = false;
  reordering = false;

  showCreateCourseModal = false;
  newCourseTitle = '';
  newCourseDescription = '';
  creatingCourse = false;

  createNewCourse() {
    this.showCreateCourseModal = true;
    this.newCourseTitle = '';
    this.newCourseDescription = '';
  }

  async submitNewCourse() {
    if (!this.newCourseTitle.trim()) return;
    this.creatingCourse = true;
    try {
      const response = await fetch('http://127.0.0.1:3000/api/courses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': '00000000-0000-0000-0000-000000000001',
          'x-user-id': localStorage.getItem('userId') || '',
          'x-user-role': localStorage.getItem('userRole') || 'super-admin',
        },
        body: JSON.stringify({ title: this.newCourseTitle.trim(), description: this.newCourseDescription.trim() || undefined }),
      });
      if (response.ok) {
        const newCourse = await response.json();
        console.log('[LessonBuilder] Course created:', newCourse);
        this.showCreateCourseModal = false;
        await this.loadRealCourses();
      } else {
        const err = await response.text();
        alert('Failed to create course: ' + err);
      }
    } catch (err) {
      alert('Failed to create course: ' + err);
    } finally {
      this.creatingCourse = false;
    }
  }

  createNewLesson() {
    this.lessonService.enterBuilder();
    this.router.navigate(['/lesson-editor', 'new']);
  }

  editLesson(lesson: any) {
    console.log('[LessonBuilder] ========== EDIT LESSON ==========');
    console.log('[LessonBuilder] Full lesson object:', lesson);
    console.log('[LessonBuilder] lesson.realId:', lesson.realId);
    console.log('[LessonBuilder] lesson.id:', lesson.id);
    console.log('[LessonBuilder] lesson.title:', lesson.title);
    
    if (lesson.isClickable !== false) {
      this.lessonService.enterBuilder();
      // ALWAYS use realId (UUID) - numeric IDs are just for display
      const lessonId = lesson.realId;
      
      if (!lessonId) {
        console.error('[LessonBuilder] ERROR: No realId found for lesson!', lesson);
        alert('Error: Lesson ID not found');
        return;
      }
      
      console.log('[LessonBuilder] ✓ Navigating to /lesson-editor/' + lessonId);
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

  // ─── Course Settings & Reorder ───

  viewCourseById(courseId: string) {
    const course = this.realCourses.find((c: any) => c.id === courseId);
    if (course) {
      this.selectedCourse = { id: courseId, title: course.title } as any;
      this.courseAccessLevel = course.accessLevel || 'public';
      this.courseRequiredTier = course.requiredSubscriptionTier || 'free';
    } else {
      this.selectedCourse = { id: courseId, title: 'Course' } as any;
    }
    this.currentView = 'course-lessons';
    this.showCourseSettings = false;
    this.loadCourseLessonsFromApi(courseId);
  }

  private courseLessons: any[] = [];

  async loadCourseLessonsFromApi(courseId: string) {
    try {
      const response = await fetch(`http://127.0.0.1:3000/api/courses/${courseId}/lessons`, {
        headers: {
          'x-tenant-id': '00000000-0000-0000-0000-000000000001',
          'x-user-id': localStorage.getItem('userId') || '',
          'x-user-role': localStorage.getItem('userRole') || 'super-admin',
        }
      });
      const lessons = await response.json();
      this.courseLessons = lessons.map((l: any) => ({
        ...l,
        realId: l.id,
        realCourseId: courseId,
        views: l.views || l.viewCount || 0,
        completionRate: l.completionRate || 0,
      }));
      console.log('[LessonBuilder] Loaded', this.courseLessons.length, 'lessons for course', courseId);
    } catch (err) {
      console.error('[LessonBuilder] Failed to load course lessons:', err);
      this.courseLessons = [];
    }
  }

  async onCourseAccessChange() {
    // Just updates local state; user must click Save Settings
  }

  async saveCourseSettings() {
    if (!this.selectedCourse) return;
    this.savingCourseSettings = true;
    try {
      const body: any = { accessLevel: this.courseAccessLevel };
      if (this.courseAccessLevel === 'login_required') {
        body.requiredSubscriptionTier = this.courseRequiredTier;
      } else {
        body.requiredSubscriptionTier = null;
      }
      const response = await fetch(`http://127.0.0.1:3000/api/courses/${this.selectedCourse.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': '00000000-0000-0000-0000-000000000001',
          'x-user-id': localStorage.getItem('userId') || '',
          'x-user-role': localStorage.getItem('userRole') || 'super-admin',
        },
        body: JSON.stringify(body),
      });
      if (response.ok) {
        alert('Course settings saved!');
        await this.loadRealCourses();
      } else {
        alert('Failed to save course settings: ' + await response.text());
      }
    } catch (err) {
      alert('Failed to save: ' + err);
    } finally {
      this.savingCourseSettings = false;
    }
  }

  async moveLessonUp(index: number) {
    if (index <= 0 || !this.selectedCourse || this.reordering) return;
    const lessons = this.getCourseLessons();
    [lessons[index - 1], lessons[index]] = [lessons[index], lessons[index - 1]];
    this.courseLessons = [...lessons];
    await this.persistLessonOrder();
  }

  async moveLessonDown(index: number) {
    const lessons = this.getCourseLessons();
    if (index >= lessons.length - 1 || !this.selectedCourse || this.reordering) return;
    [lessons[index], lessons[index + 1]] = [lessons[index + 1], lessons[index]];
    this.courseLessons = [...lessons];
    await this.persistLessonOrder();
  }

  private async persistLessonOrder() {
    if (!this.selectedCourse) return;
    this.reordering = true;
    const lessonIds = this.getCourseLessons().map(l => l.realId || l.id);
    try {
      const response = await fetch(`http://127.0.0.1:3000/api/courses/${this.selectedCourse.id}/lesson-order`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': '00000000-0000-0000-0000-000000000001',
          'x-user-id': localStorage.getItem('userId') || '',
          'x-user-role': localStorage.getItem('userRole') || 'super-admin',
        },
        body: JSON.stringify({ lessonIds }),
      });
      if (!response.ok) {
        console.error('[LessonBuilder] Failed to reorder:', await response.text());
      }
    } catch (err) {
      console.error('[LessonBuilder] Failed to reorder:', err);
    } finally {
      this.reordering = false;
    }
  }

  // ─── Hub Publish ───

  openHubPublish(type: 'lesson' | 'course', item: any, event: Event) {
    event.stopPropagation();
    this.hubPublishItemType = type;
    this.hubPublishItemId = item.realId || item.id;
    this.hubPublishItemName = item.title || item.name || 'Untitled';
    this.hubPublishOptions = [];
    this.hubPublishing = false;

    this.hubsService.getMyHubs().subscribe({
      next: (hubs) => {
        this.hubPublishOptions = hubs
          .filter(h => h.myStatus === 'joined')
          .map(h => ({
            id: h.id, name: h.name, slug: h.slug,
            selected: false, alreadyLinked: false,
          }))
          .sort((a, b) => {
            if (a.slug === 'default') return -1;
            if (b.slug === 'default') return 1;
            return a.name.localeCompare(b.name);
          });
        this.showHubPublishModal = true;
      },
      error: () => alert('Failed to load hubs'),
    });
  }

  hubPublishSnack = '';

  confirmHubPublish() {
    const selectedIds = this.hubPublishOptions.filter(o => o.selected && !o.alreadyLinked).map(o => o.id);
    if (selectedIds.length === 0) {
      this.hubPublishSnack = 'You must select at least 1 hub to publish to';
      setTimeout(() => this.hubPublishSnack = '', 3000);
      return;
    }
    this.hubPublishSnack = '';
    this.hubPublishing = true;

    const obs = this.hubPublishItemType === 'course'
      ? this.hubsService.publishCourseToHubs(this.hubPublishItemId, selectedIds)
      : this.hubsService.publishLessonToHubs(this.hubPublishItemId, selectedIds);

    obs.subscribe({
      next: (result) => {
        this.hubPublishing = false;
        this.showHubPublishModal = false;
        alert(`Published to ${result.linked} hub(s)!`);
      },
      error: (err) => {
        this.hubPublishing = false;
        alert(err?.error?.message || 'Failed to publish to hubs');
      },
    });
  }
}