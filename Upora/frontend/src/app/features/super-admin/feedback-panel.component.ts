import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { FeedbackService, FeedbackItem, FeedbackReply } from '../../core/services/feedback.service';

@Component({
  selector: 'app-feedback-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="feedback-panel">
      <div class="panel-header">
        <h1>Feedback Management</h1>
        <p class="subtitle">View and respond to all user feedback.</p>
      </div>

      <!-- Settings -->
      <div class="settings-card">
        <label class="toggle-label">
          <input type="checkbox" [checked]="feedbackEnabledByDefault" (change)="toggleGlobalDefault($event)">
          <span>Enable feedback for all new users by default</span>
        </label>
      </div>

      <!-- Tabs -->
      <div class="tabs">
        <button class="tab-btn" [class.active]="activeTab === 'active'" (click)="activeTab = 'active'">
          Active ({{ activeFeedback.length }})
        </button>
        <button class="tab-btn" [class.active]="activeTab === 'archived'" (click)="switchToArchived()">
          Archived ({{ archivedFeedback.length }})
        </button>
      </div>

      <!-- Search -->
      <div class="search-row">
        <input type="text" [(ngModel)]="searchQuery" placeholder="Search feedback..." class="search-input">
        <button *ngIf="searchQuery" class="clear-btn" (click)="searchQuery = ''">×</button>
      </div>

      <div *ngIf="loading" class="loading-text">Loading...</div>

      <!-- Active Tab -->
      <div *ngIf="activeTab === 'active' && !loading">
        <div *ngIf="filteredActive.length === 0" class="empty-text">No active feedback.</div>
        <div *ngFor="let fb of filteredActive" class="feedback-card">
          <div class="fb-card-top">
            <div class="fb-user-info" (click)="openUser(fb.userId)">
              {{ fb.user?.email || fb.userId }}
            </div>
            <span class="fb-status" [class]="'fbs-' + fb.status">{{ formatStatus(fb.status) }}</span>
            <span class="fb-date">{{ fb.createdAt | date:'short' }}</span>
          </div>
          <div class="fb-subject">{{ fb.subject }}</div>
          <div class="fb-body">{{ fb.body }}</div>

          <!-- Thread (expanded) -->
          <div *ngIf="expandedId === fb.id" class="fb-thread">
            <div *ngFor="let r of (threadData[fb.id]?.replies || [])" class="fb-reply" [class.fb-reply-admin]="r.fromUserId !== fb.userId">
              <div class="fb-reply-meta">{{ r.fromUser?.email || (r.fromUserId === fb.userId ? fb.user?.email || 'User' : 'Admin') }} · {{ r.createdAt | date:'short' }}</div>
              <div class="fb-reply-body">{{ r.body }}</div>
            </div>
            <div class="fb-reply-input">
              <input type="text" [(ngModel)]="replyTexts[fb.id]" placeholder="Reply..." (keydown.enter)="replyToFeedback(fb)">
              <label class="email-check">
                <input type="checkbox" [checked]="replyEmailFlags[fb.id]" (change)="replyEmailFlags[fb.id] = !replyEmailFlags[fb.id]">
                <span>Also send email</span>
              </label>
              <button class="btn-sm btn-primary" [disabled]="!replyTexts[fb.id]?.trim()" (click)="replyToFeedback(fb)">Reply</button>
            </div>
          </div>

          <div class="fb-actions">
            <button class="btn-sm" (click)="toggleExpand(fb)">{{ expandedId === fb.id ? 'Collapse' : 'View thread' }}</button>
            <select [(ngModel)]="statusSelects[fb.id]" (ngModelChange)="changeStatus(fb, $event)" class="status-select">
              <option value="" disabled>Set status...</option>
              <option value="pending">Pending</option>
              <option value="replied">Replied</option>
              <option value="addressed">Addressed</option>
              <option value="wont_do">Won't Do</option>
              <option value="archived">Archive</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Archived Tab -->
      <div *ngIf="activeTab === 'archived' && !loading">
        <div *ngIf="filteredArchived.length === 0" class="empty-text">No archived feedback.</div>
        <div *ngFor="let fb of filteredArchived" class="feedback-card archived-card">
          <div class="fb-card-top">
            <div class="fb-user-info" (click)="openUser(fb.userId)">
              {{ fb.user?.email || fb.userId }}
            </div>
            <span class="fb-status fbs-archived">Archived</span>
            <span class="fb-date">{{ fb.createdAt | date:'short' }}</span>
          </div>
          <div class="fb-subject">{{ fb.subject }}</div>
          <div class="fb-body">{{ fb.body }}</div>
          <div class="fb-actions">
            <button class="btn-sm" (click)="changeStatus(fb, 'pending')">Restore</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; height: 100vh; overflow-y: auto; background: linear-gradient(135deg, #0f0f23 0%, #1a1a2e 100%); }
    .feedback-panel { max-width: 900px; margin: 0 auto; padding: 6rem 1.5rem 2rem; }
    .panel-header h1 { color: #fff; font-size: 1.8rem; margin: 0 0 0.3rem; }
    .subtitle { color: rgba(255,255,255,0.5); margin: 0 0 1.5rem; }
    .settings-card {
      background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1);
      border-radius: 10px; padding: 1rem 1.25rem; margin-bottom: 1.5rem;
    }
    .toggle-label { display: flex; align-items: center; gap: 0.5rem; color: rgba(255,255,255,0.8); cursor: pointer; font-size: 0.9rem; }
    .toggle-label input[type=checkbox] { accent-color: #00d4ff; width: 18px; height: 18px; }
    .tabs { display: flex; gap: 0.5rem; margin-bottom: 1rem; }
    .tab-btn {
      padding: 0.5rem 1rem; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1);
      background: rgba(255,255,255,0.03); color: rgba(255,255,255,0.6);
      cursor: pointer; font-size: 0.85rem; transition: all 0.15s;
    }
    .tab-btn.active { background: rgba(0,212,255,0.1); color: #00d4ff; border-color: rgba(0,212,255,0.3); }
    .search-row { display: flex; gap: 0.5rem; margin-bottom: 1rem; }
    .search-input {
      flex: 1; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.15);
      border-radius: 8px; padding: 0.5rem 0.75rem; color: #fff; font-size: 0.9rem;
    }
    .search-input:focus { border-color: #00d4ff; outline: none; }
    .clear-btn { background: none; border: none; color: rgba(255,255,255,0.5); font-size: 1.3rem; cursor: pointer; }
    .loading-text, .empty-text { color: rgba(255,255,255,0.4); font-size: 0.9rem; padding: 1rem 0; }
    .feedback-card {
      background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1);
      border-radius: 10px; padding: 1rem 1.25rem; margin-bottom: 0.75rem;
    }
    .archived-card { opacity: 0.7; }
    .fb-card-top { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; margin-bottom: 0.3rem; }
    .fb-user-info { color: #00d4ff; font-size: 0.85rem; cursor: pointer; text-decoration: underline; }
    .fb-user-info:hover { color: #00b8e0; }
    .fb-status { font-size: 0.65rem; padding: 2px 8px; border-radius: 10px; font-weight: 600; text-transform: uppercase; }
    .fbs-pending { background: rgba(234,179,8,0.15); color: #eab308; }
    .fbs-replied { background: rgba(0,212,255,0.15); color: #00d4ff; }
    .fbs-addressed { background: rgba(34,197,94,0.15); color: #22c55e; }
    .fbs-wont_do { background: rgba(239,68,68,0.15); color: #ef4444; }
    .fbs-archived { background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.4); }
    .fb-date { color: rgba(255,255,255,0.35); font-size: 0.75rem; margin-left: auto; }
    .fb-subject { color: #fff; font-weight: 600; font-size: 0.95rem; margin-bottom: 0.2rem; }
    .fb-body { color: rgba(255,255,255,0.65); font-size: 0.85rem; white-space: pre-wrap; margin-bottom: 0.5rem; }
    .fb-thread { margin-top: 0.5rem; padding-top: 0.5rem; border-top: 1px solid rgba(255,255,255,0.08); }
    .fb-reply { padding: 0.5rem 0.75rem; margin-bottom: 0.4rem; border-radius: 6px; background: rgba(0,212,255,0.04); border-left: 2px solid rgba(0,212,255,0.3); }
    .fb-reply-admin { background: rgba(255,255,255,0.04); border-left-color: rgba(255,255,255,0.2); }
    .fb-reply-meta { color: rgba(255,255,255,0.4); font-size: 0.7rem; margin-bottom: 0.15rem; }
    .fb-reply-body { color: rgba(255,255,255,0.8); font-size: 0.85rem; }
    .fb-reply-input { display: flex; gap: 0.5rem; margin-top: 0.5rem; }
    .fb-reply-input input { flex: 1; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.15); border-radius: 6px; padding: 0.4rem 0.6rem; color: #fff; font-size: 0.85rem; }
    .fb-reply-input input[type=text]:focus { border-color: #00d4ff; outline: none; }
    .email-check { display: flex; align-items: center; gap: 0.3rem; color: rgba(255,255,255,0.6); font-size: 0.75rem; white-space: nowrap; cursor: pointer; }
    .email-check input[type=checkbox] { accent-color: #00d4ff; width: 14px; height: 14px; }
    .fb-actions { display: flex; gap: 0.5rem; align-items: center; margin-top: 0.5rem; }
    .btn-sm { background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); color: rgba(255,255,255,0.7); padding: 0.3rem 0.7rem; border-radius: 5px; font-size: 0.8rem; cursor: pointer; }
    .btn-sm:hover { background: rgba(255,255,255,0.12); }
    .btn-sm.btn-primary { background: #00d4ff; color: #000; border-color: #00d4ff; font-weight: 600; }
    .btn-sm.btn-primary:disabled { opacity: 0.4; cursor: not-allowed; }
    .status-select {
      background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.15);
      color: rgba(255,255,255,0.7); padding: 0.3rem 0.5rem; border-radius: 5px;
      font-size: 0.8rem; cursor: pointer;
    }
    .status-select:focus { border-color: #00d4ff; outline: none; }
    .status-select option { background: #1a1a2e; color: #fff; }
  `],
})
export class FeedbackPanelComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  feedbackEnabledByDefault = true;
  activeTab: 'active' | 'archived' = 'active';
  loading = true;
  searchQuery = '';

  activeFeedback: FeedbackItem[] = [];
  archivedFeedback: FeedbackItem[] = [];

  expandedId: string | null = null;
  threadData: Record<string, FeedbackItem> = {};
  replyTexts: Record<string, string> = {};
  replyEmailFlags: Record<string, boolean> = {};
  statusSelects: Record<string, string> = {};

  constructor(
    private feedbackService: FeedbackService,
    private router: Router,
  ) {}

  ngOnInit() {
    this.loadSettings();
    this.loadFeedback();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadSettings() {
    this.feedbackService.getFeedbackSettings().pipe(takeUntil(this.destroy$)).subscribe({
      next: (s) => { this.feedbackEnabledByDefault = s.feedbackEnabledByDefault; },
    });
  }

  loadFeedback() {
    this.loading = true;
    this.feedbackService.getAll().pipe(takeUntil(this.destroy$)).subscribe({
      next: (items) => {
        this.activeFeedback = items;
        items.forEach((fb) => { this.statusSelects[fb.id] = fb.status; });
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
  }

  switchToArchived() {
    this.activeTab = 'archived';
    if (this.archivedFeedback.length === 0) {
      this.feedbackService.getArchived().pipe(takeUntil(this.destroy$)).subscribe({
        next: (items) => { this.archivedFeedback = items; },
      });
    }
  }

  get filteredActive(): FeedbackItem[] {
    if (!this.searchQuery.trim()) return this.activeFeedback;
    const q = this.searchQuery.toLowerCase();
    return this.activeFeedback.filter((fb) =>
      fb.subject.toLowerCase().includes(q) ||
      fb.body.toLowerCase().includes(q) ||
      (fb.user?.email || '').toLowerCase().includes(q)
    );
  }

  get filteredArchived(): FeedbackItem[] {
    if (!this.searchQuery.trim()) return this.archivedFeedback;
    const q = this.searchQuery.toLowerCase();
    return this.archivedFeedback.filter((fb) =>
      fb.subject.toLowerCase().includes(q) ||
      fb.body.toLowerCase().includes(q) ||
      (fb.user?.email || '').toLowerCase().includes(q)
    );
  }

  toggleExpand(fb: FeedbackItem) {
    if (this.expandedId === fb.id) {
      this.expandedId = null;
      return;
    }
    this.expandedId = fb.id;
    // Load thread
    this.feedbackService.adminGetThread(fb.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: (thread) => { this.threadData[fb.id] = thread; },
    });
  }

  replyToFeedback(fb: FeedbackItem) {
    const text = this.replyTexts[fb.id]?.trim();
    if (!text) return;
    const sendEmail = !!this.replyEmailFlags[fb.id];
    this.feedbackService.adminReply(fb.id, text, sendEmail).pipe(takeUntil(this.destroy$)).subscribe({
      next: (reply) => {
        if (this.threadData[fb.id]) {
          this.threadData[fb.id].replies = [...(this.threadData[fb.id].replies || []), reply];
        }
        this.replyTexts[fb.id] = '';
        this.replyEmailFlags[fb.id] = false;
      },
    });
  }

  changeStatus(fb: FeedbackItem, status: string) {
    this.feedbackService.updateStatus(fb.id, status).pipe(takeUntil(this.destroy$)).subscribe({
      next: (updated) => {
        if (status === 'archived') {
          this.activeFeedback = this.activeFeedback.filter((f) => f.id !== fb.id);
          this.archivedFeedback.unshift({ ...fb, status: updated.status });
        } else if (fb.status === 'archived') {
          this.archivedFeedback = this.archivedFeedback.filter((f) => f.id !== fb.id);
          this.activeFeedback.unshift({ ...fb, status: updated.status });
        } else {
          fb.status = updated.status;
        }
        this.statusSelects[fb.id] = updated.status;
      },
    });
  }

  toggleGlobalDefault(event: Event) {
    const enabled = (event.target as HTMLInputElement).checked;
    this.feedbackService.updateFeedbackSettings(enabled).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => { this.feedbackEnabledByDefault = enabled; },
      error: () => { this.feedbackEnabledByDefault = !enabled; },
    });
  }

  openUser(userId: string) {
    this.router.navigate(['/super-admin/user-management', userId]);
  }

  formatStatus(status: string): string {
    switch (status) {
      case 'pending': return 'Pending';
      case 'replied': return 'Replied';
      case 'addressed': return 'Addressed';
      case 'wont_do': return "Won't Do";
      case 'archived': return 'Archived';
      default: return status;
    }
  }
}
