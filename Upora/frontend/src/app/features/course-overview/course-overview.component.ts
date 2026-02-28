import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { IonContent } from '@ionic/angular/standalone';
import { Subject, takeUntil, forkJoin, of, catchError } from 'rxjs';
import { LessonGroupsService, LessonGroup } from '../../core/services/lesson-groups.service';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-course-overview',
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent],
  template: `
    <ion-content>
    <div class="min-h-screen bg-brand-black text-white page-with-header">
      <!-- Back button -->
      <button (click)="goBack()" class="fixed top-20 left-4 z-30 bg-black/60 hover:bg-black/80 text-white p-2 rounded-full transition">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
        </svg>
      </button>

      <div *ngIf="course">
        <!-- Hero section with first lesson thumbnail -->
        <div class="relative h-[300px] md:h-[400px]">
          <div class="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent z-10"></div>
          <img [src]="getHeroImage()" alt="" class="w-full h-full object-cover" />
          <div class="absolute bottom-0 left-0 right-0 p-6 md:p-12 z-20">
            <div class="max-w-5xl mx-auto">
              <div class="flex items-center gap-2 mb-3">
                <svg class="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
                </svg>
                <span class="text-xs text-cyan-400 uppercase tracking-wider font-semibold">Course</span>
                <span class="text-xs text-gray-400 ml-2">{{ lessons.length }} lesson{{ lessons.length !== 1 ? 's' : '' }}</span>
              </div>
              <h1 class="text-3xl md:text-5xl font-bold text-white mb-3">{{ course.title }}</h1>
              <p *ngIf="course.description" class="text-gray-300 text-lg mb-5 max-w-2xl">{{ course.description }}</p>
              <div class="flex items-center gap-3 flex-wrap">
                <button *ngIf="lessons.length > 0" (click)="scrollToEpisodes()"
                        class="bg-white text-black font-bold py-3 px-8 rounded hover:bg-opacity-80 transition flex items-center gap-2">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                  </svg>
                  View Lessons
                </button>
                <button *ngIf="myGroups.length > 0" (click)="showGroupSelector = !showGroupSelector"
                        class="bg-gray-600/80 text-white font-bold py-3 px-6 rounded hover:bg-gray-600 transition flex items-center gap-2">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"></path>
                  </svg>
                  My Groups
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="max-w-5xl mx-auto px-4 md:px-6">
          <!-- Group Selector (collapsible) -->
          <div *ngIf="showGroupSelector && myGroups.length > 0" class="mt-6 bg-gray-900 border border-gray-800 rounded-lg p-5">
            <h2 class="text-lg font-semibold text-white mb-3">Your Groups</h2>
            <div class="flex flex-wrap gap-2">
              <button *ngFor="let g of myGroups" (click)="enterGroupView(g)"
                      class="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg hover:border-cyan-600 hover:text-cyan-400 transition text-sm flex items-center gap-2">
                <span>{{ g.name }}</span>
                <span *ngIf="g.isDefault" class="text-xs text-gray-500">(Open)</span>
              </button>
            </div>
          </div>

          <!-- Lessons List -->
          <div class="mt-8 mb-12" #episodesSection>
            <h2 class="text-xl md:text-2xl font-bold text-white mb-6">
              Lessons
              <span class="text-gray-500 text-base font-normal ml-2">{{ lessons.length }} lesson{{ lessons.length !== 1 ? 's' : '' }}</span>
            </h2>
            <div *ngIf="lessons.length === 0" class="text-gray-500 text-center py-12">No lessons in this course yet.</div>
            <div class="space-y-3">
              <div *ngFor="let lesson of lessons; let i = index"
                   (click)="goToLesson(lesson)"
                   class="episode-card group flex items-start gap-4 p-4 rounded-lg cursor-pointer transition hover:bg-gray-900/80">
                <!-- Lesson number -->
                <div class="flex-shrink-0 w-8 text-center pt-1">
                  <span class="text-lg text-gray-500 font-semibold">{{ i + 1 }}</span>
                </div>
                <!-- Thumbnail -->
                <div class="flex-shrink-0 w-32 md:w-40 h-20 md:h-24 rounded overflow-hidden relative">
                  <img [src]="lesson.thumbnailUrl || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=300'"
                       [alt]="lesson.title"
                       class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  <div class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
                    <svg class="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 010 1.972l-11.54 6.347a1.125 1.125 0 01-1.667-.986V5.653z"></path>
                    </svg>
                  </div>
                </div>
                <!-- Info -->
                <div class="flex-1 min-w-0">
                  <div class="flex items-center justify-between gap-2">
                    <h3 class="font-semibold text-white group-hover:text-cyan-400 transition-colors truncate">{{ lesson.title }}</h3>
                    <span *ngIf="lesson.durationMinutes" class="text-xs text-gray-500 flex-shrink-0">{{ lesson.durationMinutes }}m</span>
                  </div>
                  <p class="text-sm text-gray-400 mt-1 line-clamp-2">{{ lesson.description || lesson.category || 'Lesson' }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div *ngIf="!course && !loading" class="flex items-center justify-center min-h-screen">
        <p class="text-gray-400">Course not found.</p>
      </div>
      <div *ngIf="loading" class="flex items-center justify-center min-h-screen">
        <p class="text-gray-400">Loading course...</p>
      </div>
    </div>
    </ion-content>
  `,
  styles: [`
    :host { display: block; min-height: 100vh; background: #000; }
    :host ::ng-deep ion-content {
      --background: #000;
      --color: #fff;
    }
    .page-with-header { padding-top: 64px; }
    @media (min-width: 768px) { .page-with-header { padding-top: 80px; } }
    .episode-card { border-bottom: 1px solid rgba(255,255,255,0.05); }
    .episode-card:last-child { border-bottom: none; }
    .line-clamp-2 {
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
  `]
})
export class CourseOverviewComponent implements OnInit, OnDestroy {
  @ViewChild('episodesSection') episodesSection!: ElementRef;
  private destroy$ = new Subject<void>();
  courseId = '';
  course: any = null;
  lessons: any[] = [];
  myGroups: LessonGroup[] = [];
  selectedGroupId = '';
  showGroupSelector = false;
  loading = true;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: ApiService,
    private groupsService: LessonGroupsService,
  ) {}

  ngOnInit() {
    this.courseId = this.route.snapshot.paramMap.get('id') || '';
    if (this.courseId) {
      this.loadCourse();
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadCourse() {
    this.loading = true;
    forkJoin({
      course: this.api.get<any>(`/courses/${this.courseId}`).pipe(catchError(() => of(null))),
      myGroups: this.groupsService.getMyCourseGroups(this.courseId).pipe(catchError(() => of([]))),
    }).pipe(takeUntil(this.destroy$)).subscribe(({ course, myGroups }) => {
      this.course = course;
      this.lessons = course?.lessons || [];
      // Sort: non-default first
      this.myGroups = [...myGroups].sort((a, b) => {
        if (a.isDefault && !b.isDefault) return 1;
        if (!a.isDefault && b.isDefault) return -1;
        return 0;
      });
      if (this.myGroups.length > 0) {
        this.selectedGroupId = this.myGroups[0].id;
      }
      this.loading = false;
    });
  }

  getHeroImage(): string {
    // Use first lesson's thumbnail or a default
    const firstLesson = this.lessons[0];
    if (firstLesson?.thumbnailUrl) return firstLesson.thumbnailUrl;
    return 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=1200';
  }

  enterGroupView(group: LessonGroup) {
    this.router.navigate(['/groups', group.id, 'view']);
  }

  goToLesson(lesson: any) {
    this.router.navigate(['/lesson-overview', lesson.id]);
  }

  scrollToEpisodes() {
    if (this.episodesSection) {
      this.episodesSection.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  goBack() {
    this.router.navigate(['/home']);
  }
}
