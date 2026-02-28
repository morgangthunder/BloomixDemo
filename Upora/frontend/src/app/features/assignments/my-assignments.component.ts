import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { LessonGroupsService, MyAssignment, UserLessonDeadline } from '../../core/services/lesson-groups.service';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-my-assignments',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="assignments-page">
      <div class="page-header">
        <h1>My Assignments</h1>
        <div class="tab-row">
          <button class="tab" [class.active]="activeTab === 'assignments'" (click)="activeTab = 'assignments'">
            Assignments <span *ngIf="pendingCount > 0" class="count-badge">{{ pendingCount }}</span>
          </button>
          <button class="tab" [class.active]="activeTab === 'deadlines'" (click)="activeTab = 'deadlines'">
            Deadlines <span *ngIf="upcomingDeadlines > 0" class="count-badge">{{ upcomingDeadlines }}</span>
          </button>
        </div>
      </div>

      <!-- ASSIGNMENTS TAB -->
      <div *ngIf="activeTab === 'assignments'" class="tab-content">
        <div *ngIf="loading" class="loading">Loading assignments...</div>
        <div *ngIf="!loading && assignments.length === 0" class="empty-state">
          <p>No assignments found. Complete lessons to see assignments from your teachers.</p>
        </div>

        <!-- Group by lesson -->
        <div *ngFor="let lesson of lessonGroups" class="lesson-group">
          <h2 class="lesson-title" (click)="navigateToLesson(lesson.lessonId)">
            {{ lesson.lessonTitle }}
            <span class="lesson-arrow">→</span>
          </h2>

          <div class="assignment-list">
            <div *ngFor="let a of lesson.assignments" class="assignment-card" [class.graded]="a.status === 'graded'" [class.late]="a.isLate">
              <div class="card-header">
                <div class="card-title-row">
                  <h3>{{ a.title }}</h3>
                  <span class="type-badge" [attr.data-type]="a.type">{{ a.type }}</span>
                  <span class="status-badge" [attr.data-status]="a.status">{{ formatStatus(a.status) }}</span>
                  <span *ngIf="a.isLate" class="late-badge">LATE</span>
                </div>
                <span *ngIf="a.deadline" class="deadline-label" [class.past]="isDeadlinePast(a.deadline)">
                  Due: {{ formatDate(a.deadline) }}
                </span>
              </div>

              <p *ngIf="a.description" class="card-desc">{{ a.description }}</p>

              <!-- Score display (if graded) -->
              <div *ngIf="a.status === 'graded'" class="grade-display">
                <span class="score">{{ a.score }}/{{ a.maxScore }}</span>
                <span class="percentage" [class.score-good]="getPercentage(a) >= 70" [class.score-low]="getPercentage(a) < 70">
                  ({{ getPercentage(a) }}%)
                </span>
                <p *ngIf="a.graderFeedback" class="feedback">{{ a.graderFeedback }}</p>
              </div>

              <!-- File submission -->
              <div *ngIf="a.type === 'file' && a.status !== 'graded'" class="submission-area">
                <div *ngIf="a.fileName" class="current-file">
                  📎 {{ a.fileName }}
                </div>
                <div class="upload-row">
                  <input type="file" [id]="'file-' + a.id" (change)="onFileSelect($event, a)" class="file-input" />
                  <label [for]="'file-' + a.id" class="upload-label">{{ a.fileName ? 'Replace File' : 'Upload File' }}</label>
                </div>
                <textarea [(ngModel)]="commentDrafts[a.id]" placeholder="Add a comment (optional)" class="comment-input" rows="2"></textarea>
                <button class="btn-submit" (click)="submitAssignment(a)" [disabled]="submitting[a.id]">
                  {{ submitting[a.id] ? 'Submitting...' : (a.status === 'resubmit_requested' ? 'Resubmit' : 'Submit') }}
                </button>
              </div>

              <!-- Offline assignment (just show status) -->
              <div *ngIf="a.type === 'offline' && a.status === 'not_started'" class="offline-note">
                This assignment will be marked complete by your teacher.
              </div>

              <!-- Interaction-based -->
              <div *ngIf="a.type === 'interaction' && a.status === 'not_started'" class="offline-note">
                Complete the lesson interaction to finish this assignment.
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- DEADLINES TAB -->
      <div *ngIf="activeTab === 'deadlines'" class="tab-content">
        <div *ngIf="loadingDeadlines" class="loading">Loading deadlines...</div>
        <div *ngIf="!loadingDeadlines && deadlines.length === 0" class="empty-state">
          <p>No deadlines set for you yet.</p>
        </div>
        <div class="deadline-list">
          <div *ngFor="let d of deadlines" class="deadline-card" [class.past]="d.isPast">
            <div class="deadline-info">
              <h3>{{ d.lessonTitle }}</h3>
              <span class="deadline-date" [class.past]="d.isPast">
                {{ formatDate(d.deadlineAt) }}
                <span *ngIf="d.isPast" class="past-label">PAST DUE</span>
              </span>
              <p *ngIf="d.note" class="deadline-note">{{ d.note }}</p>
            </div>
            <button class="btn-go" (click)="navigateToLesson(d.lessonId)">Go to Lesson →</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; min-height: 100vh; background: linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%); }
    .assignments-page { max-width: 900px; margin: 0 auto; padding: 2rem 1.5rem; color: #fff; }

    .page-header { margin-bottom: 2rem; }
    .page-header h1 { margin: 0 0 1rem; font-size: 1.8rem; }
    .tab-row { display: flex; gap: 0; border-bottom: 1px solid rgba(255,255,255,0.1); }
    .tab {
      padding: 0.75rem 1.25rem; background: none; border: none;
      border-bottom: 2px solid transparent; color: rgba(255,255,255,0.6);
      cursor: pointer; font-size: 0.95rem; display: flex; align-items: center; gap: 0.5rem;
    }
    .tab:hover { color: #fff; }
    .tab.active { color: #00d4ff; border-bottom-color: #00d4ff; }
    .count-badge {
      background: #00d4ff; color: #000; border-radius: 10px; padding: 0.1rem 0.5rem;
      font-size: 0.75rem; font-weight: 600;
    }

    .tab-content { margin-top: 1.5rem; }
    .loading { color: rgba(255,255,255,0.5); text-align: center; padding: 2rem; }
    .empty-state { text-align: center; padding: 3rem; color: rgba(255,255,255,0.4); }

    .lesson-group { margin-bottom: 2rem; }
    .lesson-title {
      font-size: 1.2rem; margin: 0 0 0.75rem; color: #00d4ff; cursor: pointer;
      display: flex; align-items: center; gap: 0.5rem;
    }
    .lesson-title:hover { text-decoration: underline; }
    .lesson-arrow { font-size: 0.9rem; opacity: 0.6; }

    .assignment-list { display: flex; flex-direction: column; gap: 0.75rem; }
    .assignment-card {
      padding: 1rem 1.25rem; background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.08); border-radius: 10px;
    }
    .assignment-card.graded { border-color: rgba(34,197,94,0.3); }
    .assignment-card.late { border-color: rgba(239,68,68,0.3); }
    .card-header { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 0.5rem; }
    .card-title-row { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
    .card-title-row h3 { margin: 0; font-size: 1rem; }
    .card-desc { font-size: 0.85rem; color: rgba(255,255,255,0.6); margin: 0.5rem 0 0; }

    .type-badge {
      display: inline-block; padding: 0.15rem 0.5rem; border-radius: 4px;
      font-size: 0.7rem; text-transform: uppercase; font-weight: 600;
    }
    .type-badge[data-type="offline"] { background: rgba(168,85,247,0.2); color: #a855f7; }
    .type-badge[data-type="file"] { background: rgba(59,130,246,0.2); color: #3b82f6; }
    .type-badge[data-type="interaction"] { background: rgba(34,197,94,0.2); color: #22c55e; }

    .status-badge {
      display: inline-block; padding: 0.15rem 0.5rem; border-radius: 4px;
      font-size: 0.7rem; text-transform: uppercase; font-weight: 600;
    }
    .status-badge[data-status="not_started"] { background: rgba(255,255,255,0.1); color: rgba(255,255,255,0.5); }
    .status-badge[data-status="in_progress"] { background: rgba(59,130,246,0.2); color: #3b82f6; }
    .status-badge[data-status="submitted"] { background: rgba(251,191,36,0.2); color: #fbbf24; }
    .status-badge[data-status="graded"] { background: rgba(34,197,94,0.2); color: #22c55e; }
    .status-badge[data-status="late"] { background: rgba(239,68,68,0.2); color: #ef4444; }
    .status-badge[data-status="resubmit_requested"] { background: rgba(168,85,247,0.2); color: #a855f7; }
    .late-badge { background: rgba(239,68,68,0.2); color: #ef4444; padding: 0.15rem 0.4rem; border-radius: 4px; font-size: 0.7rem; font-weight: 600; }

    .deadline-label { font-size: 0.8rem; color: rgba(255,255,255,0.5); }
    .deadline-label.past { color: #ef4444; }

    .grade-display { margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px solid rgba(255,255,255,0.08); }
    .score { font-size: 1.2rem; font-weight: 600; color: #22c55e; }
    .percentage { font-size: 0.9rem; margin-left: 0.5rem; }
    .score-good { color: #22c55e; }
    .score-low { color: #fbbf24; }
    .feedback { font-size: 0.85rem; color: rgba(255,255,255,0.6); margin: 0.5rem 0 0; font-style: italic; }

    .submission-area { margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px solid rgba(255,255,255,0.08); display: flex; flex-direction: column; gap: 0.5rem; }
    .current-file { font-size: 0.85rem; color: rgba(255,255,255,0.6); }
    .upload-row { display: flex; gap: 0.5rem; align-items: center; }
    .file-input { display: none; }
    .upload-label {
      display: inline-block; padding: 0.4rem 0.75rem; background: rgba(59,130,246,0.15);
      border: 1px solid rgba(59,130,246,0.3); border-radius: 6px; color: #3b82f6;
      cursor: pointer; font-size: 0.85rem;
    }
    .upload-label:hover { background: rgba(59,130,246,0.25); }
    .comment-input {
      padding: 0.5rem 0.75rem; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.15);
      border-radius: 6px; color: #fff; font-size: 0.85rem; resize: vertical;
    }
    .comment-input::placeholder { color: rgba(255,255,255,0.3); }
    .btn-submit {
      align-self: flex-start; padding: 0.5rem 1.25rem; background: #00d4ff; color: #000;
      border: none; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 0.85rem;
    }
    .btn-submit:disabled { opacity: 0.5; cursor: not-allowed; }
    .offline-note { font-size: 0.85rem; color: rgba(255,255,255,0.4); margin-top: 0.5rem; font-style: italic; }

    /* Deadlines */
    .deadline-list { display: flex; flex-direction: column; gap: 0.75rem; }
    .deadline-card {
      display: flex; justify-content: space-between; align-items: center;
      padding: 1rem 1.25rem; background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.08); border-radius: 10px;
    }
    .deadline-card.past { border-color: rgba(239,68,68,0.3); }
    .deadline-info h3 { margin: 0 0 0.25rem; font-size: 1rem; }
    .deadline-date { font-size: 0.9rem; color: rgba(255,255,255,0.6); }
    .deadline-date.past { color: #ef4444; }
    .past-label { font-size: 0.7rem; font-weight: 600; color: #ef4444; margin-left: 0.5rem; }
    .deadline-note { font-size: 0.85rem; color: rgba(255,255,255,0.4); margin: 0.25rem 0 0; }
    .btn-go {
      padding: 0.4rem 0.75rem; background: rgba(0,212,255,0.15); border: 1px solid rgba(0,212,255,0.3);
      border-radius: 6px; color: #00d4ff; cursor: pointer; font-size: 0.85rem; white-space: nowrap;
    }
    .btn-go:hover { background: rgba(0,212,255,0.25); }
  `],
})
export class MyAssignmentsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  activeTab: 'assignments' | 'deadlines' = 'assignments';
  loading = false;
  loadingDeadlines = false;
  assignments: MyAssignment[] = [];
  deadlines: UserLessonDeadline[] = [];
  lessonGroups: { lessonId: string; lessonTitle: string; assignments: MyAssignment[] }[] = [];
  pendingCount = 0;
  upcomingDeadlines = 0;

  // File uploads
  selectedFiles: { [assignmentId: string]: File } = {};
  commentDrafts: { [assignmentId: string]: string } = {};
  submitting: { [assignmentId: string]: boolean } = {};

  constructor(
    private groupsService: LessonGroupsService,
    private apiService: ApiService,
    private router: Router,
  ) {}

  ngOnInit() {
    this.loadAssignments();
    this.loadDeadlines();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  async loadAssignments() {
    this.loading = true;
    try {
      this.assignments = await new Promise<MyAssignment[]>((resolve, reject) => {
        this.groupsService.getMyAssignments()
          .pipe(takeUntil(this.destroy$))
          .subscribe({ next: resolve, error: reject });
      });

      // Group by lesson
      const map = new Map<string, { lessonId: string; lessonTitle: string; assignments: MyAssignment[] }>();
      for (const a of this.assignments) {
        if (!map.has(a.lessonId)) {
          map.set(a.lessonId, { lessonId: a.lessonId, lessonTitle: a.lessonTitle, assignments: [] });
        }
        map.get(a.lessonId)!.assignments.push(a);
      }
      this.lessonGroups = Array.from(map.values());

      // Count pending
      this.pendingCount = this.assignments.filter((a) =>
        a.status === 'not_started' || a.status === 'in_progress' || a.status === 'resubmit_requested'
      ).length;
    } catch (err) {
      console.error('[MyAssignments] Failed to load:', err);
    } finally {
      this.loading = false;
    }
  }

  async loadDeadlines() {
    this.loadingDeadlines = true;
    try {
      this.deadlines = await new Promise<UserLessonDeadline[]>((resolve, reject) => {
        this.groupsService.getMyDeadlines()
          .pipe(takeUntil(this.destroy$))
          .subscribe({ next: resolve, error: reject });
      });
      this.upcomingDeadlines = this.deadlines.filter((d) => !d.isPast).length;
    } catch (err) {
      console.error('[MyAssignments] Failed to load deadlines:', err);
    } finally {
      this.loadingDeadlines = false;
    }
  }

  onFileSelect(event: Event, assignment: MyAssignment) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFiles[assignment.id] = input.files[0];
    }
  }

  async submitAssignment(a: MyAssignment) {
    this.submitting[a.id] = true;
    try {
      const file = this.selectedFiles[a.id];
      const comment = this.commentDrafts[a.id]?.trim() || undefined;
      await new Promise((resolve, reject) => {
        this.groupsService.submitAssignment(a.id, comment, file)
          .pipe(takeUntil(this.destroy$))
          .subscribe({ next: resolve, error: reject });
      });
      delete this.selectedFiles[a.id];
      delete this.commentDrafts[a.id];
      await this.loadAssignments();
    } catch (err: any) {
      alert(err?.error?.message || 'Failed to submit assignment');
    } finally {
      this.submitting[a.id] = false;
    }
  }

  navigateToLesson(lessonId: string) {
    this.router.navigate(['/lesson-view', lessonId]);
  }

  formatDate(date: string | Date): string {
    if (!date) return '–';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  formatStatus(status: string): string {
    return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }

  isDeadlinePast(deadline: string | null): boolean {
    if (!deadline) return false;
    return new Date() > new Date(deadline);
  }

  getPercentage(a: MyAssignment): number {
    if (a.score == null || !a.maxScore) return 0;
    return Math.round((a.score / a.maxScore) * 100);
  }
}
