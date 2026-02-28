import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { IonContent } from '@ionic/angular/standalone';
import { Subject, takeUntil } from 'rxjs';
import { LessonGroupsService, LessonGroup } from '../../core/services/lesson-groups.service';

@Component({
  selector: 'app-my-lessons',
  standalone: true,
  imports: [CommonModule, IonContent],
  template: `
    <ion-content>
    <div class="min-h-screen bg-brand-black text-white pt-20">
      <div class="container mx-auto px-4 py-8 max-w-5xl">
        <h1 class="text-3xl font-bold mb-6">My Lessons</h1>
        <p class="text-gray-400 mb-8">Lessons and courses you're part of through groups.</p>

        <div *ngIf="loading" class="text-gray-400 text-center py-12">Loading your groups...</div>

        <div *ngIf="!loading && allGroups.length === 0" class="text-center py-12">
          <p class="text-gray-400 text-lg mb-2">You're not in any groups yet.</p>
          <p class="text-gray-500 text-sm">Browse lessons on the home page to get started.</p>
          <button (click)="router.navigate(['/home'])" class="mt-4 px-6 py-2 bg-brand-red text-white rounded hover:bg-opacity-90 transition">
            Browse Lessons
          </button>
        </div>

        <!-- Pending Invitations Section -->
        <div *ngIf="invitedGroups.length > 0" class="mb-10">
          <h2 class="text-xl font-semibold text-yellow-400 mb-4">Pending Invitations</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div *ngFor="let g of invitedGroups" class="group-card invite-card">
              <div class="flex items-center justify-between mb-2">
                <h3 class="font-bold text-white text-lg">{{ g.lessonTitle || g.courseTitle || g.name }}</h3>
                <span class="text-xs bg-yellow-900/50 text-yellow-300 px-2 py-0.5 rounded">Invited</span>
              </div>
              <p class="text-sm text-gray-400">{{ g.isCourseGroup ? 'Course' : 'Lesson' }} group: {{ g.name }}</p>
              <div class="flex items-center gap-3 mt-3">
                <button (click)="acceptInvite(g, $event)" class="px-4 py-1.5 bg-cyan-600 text-white text-sm rounded hover:bg-cyan-500 transition">
                  Accept Invite
                </button>
                <button (click)="openGroupView(g)" class="text-sm text-gray-400 hover:text-white transition">
                  View Group
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Course Groups Section -->
        <div *ngIf="courseGroups.length > 0" class="mb-10">
          <h2 class="text-xl font-semibold text-cyan-400 mb-4">Course Groups</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div *ngFor="let g of courseGroups"
                 (click)="openGroupView(g)"
                 class="group-card cursor-pointer">
              <div class="flex items-center justify-between mb-2">
                <h3 class="font-bold text-white text-lg">{{ g.courseTitle || 'Course' }}</h3>
                <span *ngIf="!g.isDefault" class="text-xs bg-cyan-900/50 text-cyan-300 px-2 py-0.5 rounded">{{ g.name }}</span>
                <span *ngIf="g.isDefault" class="text-xs bg-gray-700 text-gray-400 px-2 py-0.5 rounded">Open Group</span>
              </div>
              <p class="text-sm text-gray-400">Course group</p>
              <div class="flex items-center mt-3 text-sm text-gray-400">
                <span>Enter Group View</span>
                <svg class="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                </svg>
              </div>
            </div>
          </div>
        </div>

        <!-- Lesson Groups Section (non-course lessons only) -->
        <div *ngIf="lessonGroups.length > 0" class="mb-10">
          <h2 class="text-xl font-semibold text-cyan-400 mb-4">Lesson Groups</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div *ngFor="let g of lessonGroups"
                 (click)="openGroupView(g)"
                 class="group-card cursor-pointer">
              <div class="flex items-center justify-between mb-2">
                <h3 class="font-bold text-white text-lg">{{ g.lessonTitle || 'Lesson' }}</h3>
                <span *ngIf="!g.isDefault" class="text-xs bg-cyan-900/50 text-cyan-300 px-2 py-0.5 rounded">{{ g.name }}</span>
                <span *ngIf="g.isDefault" class="text-xs bg-gray-700 text-gray-400 px-2 py-0.5 rounded">Open Group</span>
              </div>
              <p class="text-sm text-gray-400">Lesson group</p>
              <div class="flex items-center mt-3 text-sm text-gray-400">
                <span>Enter Group View</span>
                <svg class="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                </svg>
              </div>
            </div>
          </div>
        </div>

        <!-- Hidden default groups -->
        <div *ngIf="hiddenDefaultGroups.length > 0 && !showOpenGroups" class="text-center">
          <button (click)="showOpenGroups = true" class="text-sm text-gray-400 hover:text-white border border-gray-700 px-4 py-2 rounded transition">
            Show Open Groups ({{ hiddenDefaultGroups.length }})
          </button>
        </div>

        <div *ngIf="showOpenGroups && hiddenDefaultGroups.length > 0" class="mb-10">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-xl font-semibold text-gray-500">Open Groups</h2>
            <button (click)="showOpenGroups = false" class="text-sm text-gray-400 hover:text-white border border-gray-700 px-3 py-1.5 rounded transition">
              Hide Open Groups
            </button>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div *ngFor="let g of hiddenDefaultGroups"
                 (click)="openGroupView(g)"
                 class="group-card cursor-pointer opacity-70 hover:opacity-100">
              <div class="flex items-center justify-between mb-2">
                <h3 class="font-bold text-white">{{ g.lessonTitle || g.courseTitle || 'Unknown' }}</h3>
                <span class="text-xs bg-gray-700 text-gray-400 px-2 py-0.5 rounded">Default</span>
              </div>
              <p class="text-sm text-gray-500">{{ g.isCourseGroup ? 'Course' : 'Lesson' }}</p>
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
    .group-card {
      background: #0a0a0a;
      border: 1px solid #333;
      border-radius: 12px;
      padding: 1.25rem;
      transition: all 0.2s;
    }
    .group-card:hover {
      border-color: #00bcd4;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 188, 212, 0.15);
    }
    .invite-card {
      border-color: rgba(234, 179, 8, 0.3);
      background: rgba(234, 179, 8, 0.03);
    }
    .invite-card:hover {
      border-color: rgba(234, 179, 8, 0.6);
      box-shadow: 0 4px 12px rgba(234, 179, 8, 0.15);
    }
  `]
})
export class MyLessonsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  allGroups: LessonGroup[] = [];
  invitedGroups: LessonGroup[] = [];
  courseGroups: LessonGroup[] = [];
  lessonGroups: LessonGroup[] = [];
  hiddenDefaultGroups: LessonGroup[] = [];
  loading = true;
  showOpenGroups = false;

  constructor(
    private groupsService: LessonGroupsService,
    public router: Router,
  ) {}

  private groupsUpdatedListener = () => this.loadGroups();

  ngOnInit() {
    this.loadGroups();
    // Reload when invites are accepted from the notification modal (or anywhere else)
    window.addEventListener('groupsUpdated', this.groupsUpdatedListener);
  }

  ngOnDestroy() {
    window.removeEventListener('groupsUpdated', this.groupsUpdatedListener);
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadGroups() {
    this.loading = true;
    this.groupsService.getMyGroups().pipe(takeUntil(this.destroy$)).subscribe({
      next: (groups) => {
        this.allGroups = groups;

        // Separate invited groups first (shown at top)
        this.invitedGroups = groups.filter(g => g.membershipStatus === 'invited');

        // Joined groups only for the main sections
        const joinedGroups = groups.filter(g => g.membershipStatus !== 'invited');
        const nonDefault = joinedGroups.filter(g => !g.isDefault);
        const defaults = joinedGroups.filter(g => g.isDefault);

        // Course groups (non-default) first
        this.courseGroups = nonDefault.filter(g => g.isCourseGroup);

        // Lesson groups (non-default, not part of a course group)
        this.lessonGroups = nonDefault.filter(g =>
          !g.isCourseGroup && !g.parentCourseGroupId
        );

        // Default groups that don't have a non-default counterpart
        const nonDefaultResourceIds = new Set([
          ...this.courseGroups.map(g => g.courseId),
          ...this.lessonGroups.map(g => g.lessonId),
        ]);
        this.hiddenDefaultGroups = defaults.filter(g => {
          const resourceId = g.isCourseGroup ? g.courseId : g.lessonId;
          return !nonDefaultResourceIds.has(resourceId);
        });

        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
  }

  acceptInvite(group: LessonGroup, event: Event) {
    event.stopPropagation();
    this.groupsService.acceptInvite(group.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        // Reload to refresh status
        this.loadGroups();
      },
      error: (err) => {
        console.error('[MyLessons] Failed to accept invite:', err);
        alert('Failed to accept invite. Please try again.');
      },
    });
  }

  openGroupView(group: LessonGroup) {
    this.router.navigate(['/groups', group.id, 'view']);
  }
}
