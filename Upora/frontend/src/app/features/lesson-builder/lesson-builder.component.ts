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

            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" *ngIf="courseGroups.size > 0">
              <!-- Manually created course (not from API yet) -->
              <div class="course-group-card" (click)="viewCourseWithId('40000000-0000-0000-0000-000000000001')">
                <div class="course-header">
                  <div class="flex-1">
                    <h3 class="text-xl font-bold text-white mb-2">JavaScript Mastery Course</h3>
                    <span class="text-xs px-2 py-1 rounded text-white bg-green-600">
                      Published
                    </span>
                  </div>
                  <div class="lesson-count">
                    {{getLessonsInCourse('40000000-0000-0000-0000-000000000001').length}}
                  </div>
                </div>

                <div class="grid grid-cols-2 gap-3 text-sm mt-4">
                  <div>
                    <p class="text-gray-400">Views</p>
                    <p class="text-white font-semibold">523</p>
                  </div>
                  <div>
                    <p class="text-gray-400">Completion</p>
                    <p class="text-white font-semibold">87%</p>
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
          </div>

          <!-- COURSE LESSONS VIEW (Drill-Down) -->
          <div *ngIf="currentView === 'course-lessons'">
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div *ngFor="let lesson of getCourseLessons()"
                   class="lesson-card"
                   (click)="editLesson(lesson)">
                <div class="lesson-header">
                  <h3 class="text-lg font-bold text-white mb-2">{{ lesson.title }}</h3>
                  <span 
                    [class.bg-green-600]="lesson.status === 'approved' || lesson.status === 'Published'"
                    [class.bg-yellow-600]="lesson.status === 'pending' || lesson.status === 'Pending Approval'"
                    [class.bg-red-600]="lesson.status === 'rejected'"
                    [class.bg-gray-600]="lesson.status === 'Build In Progress'"
                    class="text-xs px-2 py-1 rounded text-white">
                    {{ lesson.status }}
                  </span>
                </div>

                <div class="grid grid-cols-2 gap-3 text-sm mt-4">
                  <div>
                    <p class="text-gray-400">Views</p>
                    <p class="text-white font-semibold">{{ lesson.views || 0 }}</p>
                  </div>
                  <div>
                    <p class="text-gray-400">Completion</p>
                    <p class="text-white font-semibold">{{ lesson.completionRate || '0' }}%</p>
                  </div>
                </div>

                <div class="flex items-center text-gray-400 text-sm mt-4">
                  <span>Click to edit</span>
                  <svg class="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                  </svg>
                </div>
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
  `]
})
export class LessonBuilderComponent implements OnInit {
  courses$: Observable<Course[]>;
  hubLessons$: Observable<HubLesson[]>;
  unassignedLessons: HubLesson[] = [];
  realLessons: any[] = [];
  loading = false;
  
  // View state
  currentView: 'courses' | 'course-lessons' = 'courses';
  selectedCourse: Course | null = null;
  
  // Grouped lessons
  noCourseGroup: any[] = [];
  courseGroups: Map<number, {course: Course, lessons: any[]}> = new Map();

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
      // Filter by selected course ID
      const courseId = typeof this.selectedCourse.id === 'string' ? this.selectedCourse.id : String(this.selectedCourse.id);
      return this.realLessons.filter(l => l.realCourseId === courseId);
    } else {
      // Return "No Course" lessons
      return this.noCourseGroup;
    }
  }

  goBack() {
    this.handleBackButton();
  }

  createNewCourse() {
    // TODO: Implement course creation modal/page
    alert('Course creation coming soon!');
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
}