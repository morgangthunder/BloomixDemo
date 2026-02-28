import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { IonContent } from '@ionic/angular/standalone';
import { Subject, takeUntil, forkJoin, of, catchError } from 'rxjs';
import {
  LessonGroupsService,
  GroupDetail,
  GroupMember,
  Assignment,
  AssignmentSubmission,
  UserLessonDeadline,
  GroupProgress,
  LessonVisibility,
  MyAssignment,
} from '../../core/services/lesson-groups.service';
import { ApiService } from '../../core/services/api.service';

type ViewTab = 'lessons' | 'assignments' | 'deadlines' | 'progress' | 'members';

@Component({
  selector: 'app-group-view',
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent],
  template: `
    <ion-content>
    <div class="min-h-screen bg-brand-black text-white pt-20">
      <div class="container mx-auto px-4 py-6 max-w-5xl">
        <!-- Back -->
        <button (click)="goBack()" class="mb-4 flex items-center gap-2 text-gray-400 hover:text-white transition">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
          </svg>
          Back
        </button>

        <div *ngIf="loading" class="text-gray-400 text-center py-12">Loading group...</div>

        <div *ngIf="!loading && group">
          <!-- Header -->
          <div class="mb-6">
            <div class="flex items-center gap-2 mb-1">
              <span class="text-xs text-cyan-400 uppercase tracking-wider font-semibold">
                {{ group.isCourseGroup ? 'Course Group' : 'Lesson Group' }}
              </span>
              <span *ngIf="group.isDefault" class="text-xs bg-gray-700 text-gray-400 px-2 py-0.5 rounded">Default</span>
            </div>
            <h1 class="text-2xl font-bold text-white">{{ group.name }}</h1>
            <div class="flex items-center gap-3">
              <p class="text-gray-400">{{ group.courseTitle || group.lessonTitle || '' }}</p>
              <button *ngIf="group.isCourseGroup && group.courseId"
                      (click)="goToCourseOverview()"
                      class="text-xs bg-cyan-900/50 text-cyan-400 border border-cyan-800 px-3 py-1 rounded hover:bg-cyan-800/50 transition">
                View Course Page
              </button>
              <button *ngIf="!group.isCourseGroup && group.lessonId"
                      (click)="goToLessonOverview()"
                      class="text-xs bg-cyan-900/50 text-cyan-400 border border-cyan-800 px-3 py-1 rounded hover:bg-cyan-800/50 transition">
                View Lesson Page
              </button>
            </div>
          </div>

          <!-- Tabs -->
          <div class="flex gap-1 mb-6 overflow-x-auto border-b border-gray-800 pb-0">
            <button *ngFor="let t of tabs"
                    (click)="activeTab = t.id; loadTabData()"
                    class="px-4 py-2 text-sm rounded-t transition whitespace-nowrap"
                    [class.bg-gray-800]="activeTab === t.id"
                    [class.text-white]="activeTab === t.id"
                    [class.text-gray-500]="activeTab !== t.id"
                    [class.border-b-2]="activeTab === t.id"
                    [class.border-cyan-500]="activeTab === t.id">
              {{ t.label }}
            </button>
          </div>

          <!-- ═══ LESSONS TAB (course groups only) ═══ -->
          <div *ngIf="activeTab === 'lessons'" class="space-y-3">
            <div *ngIf="courseLessons.length === 0" class="text-gray-500 text-center py-8">No lessons in this course.</div>
            <div *ngFor="let l of courseLessons; let i = index"
                 (click)="goToLesson(l)"
                 class="bg-gray-900 border border-gray-800 rounded-lg p-4 transition flex items-center gap-4"
                 [class.hover:border-cyan-700]="l.isVisible !== false"
                 [class.cursor-pointer]="l.isVisible !== false"
                 [class.opacity-50]="l.isVisible === false"
                 [class.cursor-not-allowed]="l.isVisible === false">
              <div class="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-sm font-bold text-gray-300 flex-shrink-0">{{ i + 1 }}</div>
              <div class="flex-1">
                <h3 class="font-semibold text-white">{{ l.title }}</h3>
                <p class="text-sm text-gray-400">{{ l.category || 'Lesson' }}</p>
              </div>
              <span *ngIf="l.isVisible === false" class="text-xs text-red-400 bg-red-900/30 px-2 py-0.5 rounded">Hidden for your group</span>
            </div>
          </div>

          <!-- ═══ ASSIGNMENTS TAB ═══ -->
          <div *ngIf="activeTab === 'assignments'">
            <div *ngIf="myAssignments.length === 0" class="text-gray-500 text-center py-8">No assignments yet.</div>
            <div class="space-y-3">
              <div *ngFor="let a of myAssignments" class="bg-gray-900 border border-gray-800 rounded-lg p-4">
                <div class="flex items-center justify-between mb-2">
                  <h3 class="font-semibold text-white">{{ a.title }}</h3>
                  <span class="text-xs px-2 py-0.5 rounded"
                        [class.bg-green-900]="a.status === 'graded'" [class.text-green-300]="a.status === 'graded'"
                        [class.bg-yellow-900]="a.status === 'submitted'" [class.text-yellow-300]="a.status === 'submitted'"
                        [class.bg-gray-700]="a.status === 'not_started'" [class.text-gray-400]="a.status === 'not_started'"
                        [class.bg-red-900]="a.status === 'late' || a.status === 'resubmit_requested'" [class.text-red-300]="a.status === 'late' || a.status === 'resubmit_requested'"
                        [class.bg-blue-900]="a.status === 'in_progress'" [class.text-blue-300]="a.status === 'in_progress'">
                    {{ a.status.replace('_', ' ') }}
                  </span>
                </div>
                <p *ngIf="a.description" class="text-sm text-gray-400 mb-2">{{ a.description }}</p>
                <div class="flex items-center gap-4 text-xs text-gray-500">
                  <span>{{ a.lessonTitle }}</span>
                  <span>Type: {{ a.type }}</span>
                  <span *ngIf="a.score !== null">Score: {{ a.score }}/{{ a.maxScore }}</span>
                  <span *ngIf="a.deadline">Due: {{ a.deadline | date:'mediumDate' }}</span>
                </div>
                <p *ngIf="a.graderFeedback" class="mt-2 text-sm text-yellow-300 bg-yellow-900/20 p-2 rounded">
                  Feedback: {{ a.graderFeedback }}
                </p>

                <!-- File submission -->
                <div *ngIf="a.type === 'file' && (a.status === 'not_started' || a.status === 'resubmit_requested')" class="mt-3">
                  <input type="file" (change)="onFileSelected($event, a)" class="text-sm text-gray-400" />
                  <button *ngIf="selectedFiles[a.id]" (click)="submitFile(a)" class="mt-2 px-3 py-1 bg-cyan-700 text-white text-sm rounded hover:bg-cyan-600 transition">
                    Submit File
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- ═══ DEADLINES TAB ═══ -->
          <div *ngIf="activeTab === 'deadlines'">
            <div *ngIf="deadlines.length === 0" class="text-gray-500 text-center py-8">No deadlines set.</div>
            <div class="space-y-3">
              <div *ngFor="let d of deadlines" class="bg-gray-900 border border-gray-800 rounded-lg p-4 flex items-center justify-between"
                   [class.border-red-800]="d.isPast">
                <div>
                  <h3 class="font-semibold text-white">{{ d.lessonTitle || 'Lesson' }}</h3>
                  <p *ngIf="d.note" class="text-sm text-gray-400">{{ d.note }}</p>
                </div>
                <div class="text-right">
                  <div class="text-sm" [class.text-red-400]="d.isPast" [class.text-gray-300]="!d.isPast">
                    {{ d.deadlineAt | date:'mediumDate' }}
                  </div>
                  <span *ngIf="d.isPast" class="text-xs text-red-400">Past due</span>
                </div>
              </div>
            </div>
          </div>

          <!-- ═══ PROGRESS TAB ═══ -->
          <div *ngIf="activeTab === 'progress'">
            <div *ngIf="progress.length === 0" class="text-gray-500 text-center py-8">No progress data yet.</div>
            <div *ngIf="progress.length > 0" class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                  <tr class="text-left text-gray-400 border-b border-gray-800">
                    <th class="py-2 px-3">Member</th>
                    <th class="py-2 px-3">Views</th>
                    <th class="py-2 px-3">Completions</th>
                    <th class="py-2 px-3">Interactions</th>
                    <th class="py-2 px-3">Avg Score</th>
                    <th class="py-2 px-3">Deadline</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let p of progress" class="border-b border-gray-800/50">
                    <td class="py-2 px-3 text-white">{{ p.name }}</td>
                    <td class="py-2 px-3">{{ p.views }}</td>
                    <td class="py-2 px-3">{{ p.completions }}</td>
                    <td class="py-2 px-3">{{ p.completedInteractions }}/{{ p.interactionCount }}</td>
                    <td class="py-2 px-3">{{ p.averageScore !== null ? p.averageScore + '%' : '-' }}</td>
                    <td class="py-2 px-3" [class.text-red-400]="p.isPastDeadline">
                      {{ p.deadline ? (p.deadline | date:'mediumDate') : '-' }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- ═══ MEMBERS TAB ═══ -->
          <div *ngIf="activeTab === 'members'">
            <div *ngIf="members.length === 0" class="text-gray-500 text-center py-8">No members yet.</div>
            <div class="space-y-2">
              <div *ngFor="let m of members" class="bg-gray-900 border border-gray-800 rounded-lg p-3 flex items-center justify-between">
                <div>
                  <span class="text-white font-medium">{{ m.name }}</span>
                  <span class="text-gray-500 text-sm ml-2">{{ m.email }}</span>
                </div>
                <div class="flex items-center gap-2">
                  <span *ngIf="m.status === 'invited'" class="text-xs bg-yellow-900/50 text-yellow-300 px-2 py-0.5 rounded">Invited</span>
                  <span *ngIf="m.status === 'joined' || !m.status" class="text-xs bg-green-900/50 text-green-300 px-2 py-0.5 rounded">Joined</span>
                  <span class="text-xs text-gray-500">{{ m.role }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </ion-content>
  `,
  styles: [`
    :host { display: block; min-height: 100vh; background: #000; }
    :host ::ng-deep ion-content { --background: #000; --color: #fff; }
  `]
})
export class GroupViewComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  groupId = '';
  group: GroupDetail | null = null;
  loading = true;

  tabs: { id: ViewTab; label: string }[] = [];
  activeTab: ViewTab = 'assignments';

  courseLessons: any[] = [];
  myAssignments: MyAssignment[] = [];
  deadlines: UserLessonDeadline[] = [];
  progress: GroupProgress[] = [];
  members: GroupMember[] = [];
  selectedFiles: Record<string, File> = {};

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private groupsService: LessonGroupsService,
    private api: ApiService,
  ) {}

  ngOnInit() {
    this.groupId = this.route.snapshot.paramMap.get('groupId') || '';
    if (this.groupId) {
      this.loadGroup();
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadGroup() {
    this.loading = true;
    this.groupsService.getGroupDetail(this.groupId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (detail) => {
        this.group = detail;

        // Build tabs
        this.tabs = [];
        if (detail.isCourseGroup) {
          this.tabs.push({ id: 'lessons', label: 'Lessons' });
        }
        this.tabs.push(
          { id: 'assignments', label: 'Assignments' },
          { id: 'deadlines', label: 'Deadlines' },
          { id: 'progress', label: 'Progress' },
          { id: 'members', label: 'Members' },
        );

        this.activeTab = detail.isCourseGroup ? 'lessons' : 'assignments';
        this.loading = false;
        this.loadTabData();
      },
      error: () => { this.loading = false; },
    });
  }

  loadTabData() {
    if (!this.group) return;

    if (this.activeTab === 'lessons' && this.group.isCourseGroup && this.group.courseId) {
      // Load both lessons and visibility for this group
      forkJoin({
        lessons: this.api.get<any[]>(`/courses/${this.group.courseId}/lessons`).pipe(catchError(() => of([]))),
        visibility: this.groupsService.getCourseGroupLessonVisibility(this.groupId).pipe(catchError(() => of([]))),
      }).pipe(takeUntil(this.destroy$)).subscribe(({ lessons, visibility }) => {
        const visMap = new Map(visibility.map((v: any) => [v.lessonId, v.isVisible]));
        this.courseLessons = lessons.map(l => ({
          ...l,
          // Default: visible. Only hidden if explicitly set to false.
          isVisible: visMap.has(l.id) ? visMap.get(l.id) : true,
        }));
      });
    }

    if (this.activeTab === 'assignments') {
      this.groupsService.getMyAssignments().pipe(
        takeUntil(this.destroy$),
        catchError(() => of([])),
      ).subscribe(assignments => {
        // Filter to relevant lesson(s)
        if (this.group!.lessonId) {
          this.myAssignments = assignments.filter(a => a.lessonId === this.group!.lessonId);
        } else if (this.group!.courseId) {
          // For course groups, show assignments from all lessons in the course
          const courseLessonIds = new Set(this.courseLessons.map(l => l.id));
          if (courseLessonIds.size > 0) {
            this.myAssignments = assignments.filter(a => courseLessonIds.has(a.lessonId));
          } else {
            this.myAssignments = assignments; // Fallback: show all
          }
        }
      });
    }

    if (this.activeTab === 'deadlines') {
      this.groupsService.getMyDeadlines().pipe(
        takeUntil(this.destroy$),
        catchError(() => of([])),
      ).subscribe(deadlines => {
        this.deadlines = deadlines;
      });
    }

    if (this.activeTab === 'progress') {
      this.groupsService.getGroupProgress(this.groupId).pipe(
        takeUntil(this.destroy$),
        catchError(() => of([])),
      ).subscribe(progress => {
        this.progress = progress;
      });
    }

    if (this.activeTab === 'members') {
      this.groupsService.getMembers(this.groupId).pipe(
        takeUntil(this.destroy$),
        catchError(() => of([])),
      ).subscribe(members => {
        this.members = members;
      });
    }
  }

  onFileSelected(event: Event, assignment: MyAssignment) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.selectedFiles[assignment.id] = input.files[0];
    }
  }

  submitFile(assignment: MyAssignment) {
    const file = this.selectedFiles[assignment.id];
    if (!file) return;
    this.groupsService.submitAssignment(assignment.id, undefined, file).pipe(
      takeUntil(this.destroy$),
    ).subscribe({
      next: () => {
        delete this.selectedFiles[assignment.id];
        this.loadTabData();
      },
      error: (err) => alert('Submission failed: ' + (err?.error?.message || err?.message || 'Unknown error')),
    });
  }

  goToLesson(lesson: any) {
    if (lesson.isVisible === false) {
      // Hidden lessons are not accessible for this group
      return;
    }
    this.router.navigate(['/lesson-overview', lesson.id]);
  }

  goToCourseOverview() {
    if (this.group?.courseId) {
      this.router.navigate(['/course-overview', this.group.courseId]);
    }
  }

  goToLessonOverview() {
    if (this.group?.lessonId) {
      this.router.navigate(['/lesson-overview', this.group.lessonId]);
    }
  }

  goBack() {
    if (this.group?.isCourseGroup && this.group.courseId) {
      this.router.navigate(['/course-overview', this.group.courseId]);
    } else if (this.group?.lessonId) {
      this.router.navigate(['/lesson-overview', this.group.lessonId]);
    } else {
      this.router.navigate(['/my-lessons']);
    }
  }
}
