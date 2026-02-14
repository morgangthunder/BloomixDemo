import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { FeedbackService, FeedbackItem, FeedbackReply } from '../../core/services/feedback.service';

@Component({
  selector: 'app-feedback',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="feedback-page">
      <div class="feedback-header">
        <h1>Feedback</h1>
        <p class="feedback-subtitle">Let us know how we can improve. Your feedback is valued.</p>
      </div>

      <!-- Tabs -->
      <div class="tabs">
        <button class="tab-btn" [class.active]="activeTab === 'submit'" (click)="activeTab = 'submit'">
          Submit Feedback
        </button>
        <button class="tab-btn" [class.active]="activeTab === 'history'" (click)="switchToHistory()">
          My Feedback ({{ myFeedback.length }})
        </button>
      </div>

      <!-- Submit Feedback Tab -->
      <div *ngIf="activeTab === 'submit'" class="feedback-form-card">
        <div class="form-group">
          <label for="subject">Subject</label>
          <input id="subject" type="text" [(ngModel)]="subject" placeholder="Brief summary of your feedback" maxlength="255" />
        </div>
        <div class="form-group">
          <label for="body">Details</label>
          <textarea id="body" [(ngModel)]="body" rows="5" placeholder="Describe your feedback, suggestion, or issue..."></textarea>
        </div>
        <div class="form-actions">
          <button class="btn-primary" [disabled]="!subject.trim() || !body.trim() || submitting" (click)="submitFeedback()">
            {{ submitting ? 'Sending...' : 'Submit Feedback' }}
          </button>
        </div>
        <div *ngIf="submitSuccess" class="success-msg">Feedback submitted successfully! Thank you.</div>
        <div *ngIf="submitError" class="error-msg">{{ submitError }}</div>
      </div>

      <!-- My Feedback Tab -->
      <div *ngIf="activeTab === 'history'" class="feedback-history">
        <div *ngIf="loading" class="loading">Loading...</div>
        <div *ngIf="!loading && myFeedback.length === 0" class="empty-state">
          No feedback submitted yet.
        </div>
        <div *ngFor="let fb of myFeedback" class="feedback-card" (click)="openThread(fb)">
          <div class="feedback-card-header">
            <span class="feedback-subject">{{ fb.subject }}</span>
            <span class="feedback-status" [class]="'status-' + fb.status">{{ formatStatus(fb.status) }}</span>
          </div>
          <div class="feedback-body-preview">{{ fb.body | slice:0:150 }}{{ fb.body.length > 150 ? '...' : '' }}</div>
          <div class="feedback-date">{{ fb.createdAt | date:'medium' }}</div>
        </div>
      </div>

      <!-- Thread Modal -->
      <div *ngIf="selectedFeedback" class="modal-overlay" (click)="closeThread()">
        <div class="modal-content thread-modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>{{ selectedFeedback.subject }}</h2>
            <span class="feedback-status" [class]="'status-' + selectedFeedback.status">{{ formatStatus(selectedFeedback.status) }}</span>
            <button class="modal-close" (click)="closeThread()">×</button>
          </div>
          <div class="thread-body">
            <!-- Original feedback -->
            <div class="thread-message thread-original">
              <div class="thread-meta">You · {{ selectedFeedback.createdAt | date:'medium' }}</div>
              <div class="thread-text">{{ selectedFeedback.body }}</div>
            </div>
            <!-- Replies -->
            <div *ngFor="let r of selectedFeedback.replies" class="thread-message" [class.thread-admin]="r.fromUserId !== selectedFeedback.userId">
              <div class="thread-meta">
                {{ r.fromUserId === selectedFeedback.userId ? 'You' : (r.fromUser?.username || r.fromUser?.email || 'Admin') }} · {{ r.createdAt | date:'medium' }}
              </div>
              <div class="thread-text">{{ r.body }}</div>
            </div>
          </div>
          <!-- Reply form -->
          <div class="thread-reply-form">
            <textarea [(ngModel)]="replyBody" rows="3" placeholder="Write a reply..."></textarea>
            <button class="btn-primary" [disabled]="!replyBody.trim() || replying" (click)="sendReply()">
              {{ replying ? 'Sending...' : 'Reply' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .feedback-page { max-width: 800px; margin: 0 auto; padding: 2rem 1.5rem; }
    .feedback-header h1 { color: #fff; font-size: 1.8rem; margin: 0 0 0.5rem 0; }
    .feedback-subtitle { color: rgba(255,255,255,0.6); margin: 0 0 1.25rem 0; }
    .tabs { display: flex; gap: 0.5rem; margin-bottom: 1.25rem; }
    .tab-btn {
      padding: 0.5rem 1.1rem; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1);
      background: rgba(255,255,255,0.03); color: rgba(255,255,255,0.6);
      cursor: pointer; font-size: 0.9rem; font-weight: 500; transition: all 0.15s;
    }
    .tab-btn.active { background: rgba(0,212,255,0.1); color: #00d4ff; border-color: rgba(0,212,255,0.3); }
    .tab-btn:hover:not(.active) { background: rgba(255,255,255,0.06); }
    .feedback-form-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 1.5rem; margin-bottom: 2rem; }
    .form-group { margin-bottom: 1rem; }
    .form-group label { display: block; color: rgba(255,255,255,0.7); font-size: 0.85rem; margin-bottom: 0.4rem; }
    .form-group input, .form-group textarea {
      width: 100%; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.15);
      border-radius: 8px; padding: 0.6rem 0.75rem; color: #fff; font-size: 0.9rem; resize: vertical;
      box-sizing: border-box;
    }
    .form-group input:focus, .form-group textarea:focus { border-color: #00d4ff; outline: none; }
    .form-actions { display: flex; justify-content: flex-end; }
    .btn-primary {
      background: #00d4ff; color: #000; border: none; padding: 0.5rem 1.25rem;
      border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 0.9rem;
    }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-primary:hover:not(:disabled) { background: #00b8e0; }
    .success-msg { color: #22c55e; margin-top: 0.75rem; font-size: 0.85rem; }
    .error-msg { color: #ef4444; margin-top: 0.75rem; font-size: 0.85rem; }
    .loading, .empty-state { color: rgba(255,255,255,0.5); font-size: 0.9rem; padding: 1rem 0; }
    .feedback-card {
      background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1);
      border-radius: 10px; padding: 1rem 1.25rem; margin-bottom: 0.75rem; cursor: pointer;
      transition: border-color 0.15s;
    }
    .feedback-card:hover { border-color: rgba(0,212,255,0.3); }
    .feedback-card-header { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; margin-bottom: 0.4rem; }
    .feedback-subject { color: #fff; font-weight: 600; font-size: 0.95rem; }
    .feedback-status {
      font-size: 0.7rem; padding: 2px 8px; border-radius: 10px; text-transform: uppercase; font-weight: 600;
    }
    .status-pending { background: rgba(234,179,8,0.15); color: #eab308; }
    .status-replied { background: rgba(0,212,255,0.15); color: #00d4ff; }
    .status-addressed { background: rgba(34,197,94,0.15); color: #22c55e; }
    .status-wont_do { background: rgba(239,68,68,0.15); color: #ef4444; }
    .status-archived { background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.4); }
    .feedback-body-preview { color: rgba(255,255,255,0.6); font-size: 0.85rem; margin-bottom: 0.3rem; }
    .feedback-date { color: rgba(255,255,255,0.35); font-size: 0.75rem; }

    /* Thread Modal */
    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 9999; }
    .modal-content { background: #1a1a2e; border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; width: 95%; max-width: 650px; max-height: 85vh; display: flex; flex-direction: column; }
    .modal-header { display: flex; align-items: center; gap: 0.75rem; padding: 1.25rem 1.5rem; border-bottom: 1px solid rgba(255,255,255,0.1); }
    .modal-header h2 { color: #fff; font-size: 1.1rem; margin: 0; flex: 1; }
    .modal-close { background: none; border: none; color: rgba(255,255,255,0.5); font-size: 1.5rem; cursor: pointer; padding: 0; }
    .thread-body { flex: 1; overflow-y: auto; padding: 1.25rem 1.5rem; }
    .thread-message { margin-bottom: 1rem; padding: 0.75rem 1rem; border-radius: 8px; }
    .thread-original { background: rgba(0,212,255,0.05); border-left: 3px solid #00d4ff; }
    .thread-admin { background: rgba(255,255,255,0.05); border-left: 3px solid rgba(255,255,255,0.3); }
    .thread-meta { color: rgba(255,255,255,0.4); font-size: 0.75rem; margin-bottom: 0.3rem; }
    .thread-text { color: rgba(255,255,255,0.85); font-size: 0.9rem; white-space: pre-wrap; }
    .thread-reply-form { display: flex; gap: 0.75rem; padding: 1rem 1.5rem; border-top: 1px solid rgba(255,255,255,0.1); align-items: flex-end; }
    .thread-reply-form textarea {
      flex: 1; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.15);
      border-radius: 8px; padding: 0.5rem 0.75rem; color: #fff; font-size: 0.85rem; resize: none;
    }
    .thread-reply-form textarea:focus { border-color: #00d4ff; outline: none; }
  `],
})
export class FeedbackComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  activeTab: 'submit' | 'history' = 'submit';
  subject = '';
  body = '';
  submitting = false;
  submitSuccess = false;
  submitError = '';

  loading = true;
  myFeedback: FeedbackItem[] = [];

  selectedFeedback: FeedbackItem | null = null;
  replyBody = '';
  replying = false;

  constructor(private feedbackService: FeedbackService) {}

  ngOnInit() {
    this.loadMyFeedback();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadMyFeedback() {
    this.loading = true;
    this.feedbackService.getMine().pipe(takeUntil(this.destroy$)).subscribe({
      next: (items) => { this.myFeedback = items; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }

  switchToHistory() {
    this.activeTab = 'history';
    // Refresh when switching to history tab
    this.loadMyFeedback();
  }

  submitFeedback() {
    this.submitting = true;
    this.submitSuccess = false;
    this.submitError = '';
    this.feedbackService.submit(this.subject.trim(), this.body.trim())
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (item) => {
          this.myFeedback.unshift(item);
          this.subject = '';
          this.body = '';
          this.submitting = false;
          this.submitSuccess = true;
          setTimeout(() => {
            this.submitSuccess = false;
            this.activeTab = 'history';
          }, 1500);
        },
        error: (err) => {
          this.submitError = err?.error?.message || 'Failed to submit feedback';
          this.submitting = false;
        },
      });
  }

  openThread(fb: FeedbackItem) {
    this.feedbackService.getThread(fb.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: (thread) => { this.selectedFeedback = thread; },
      error: () => { this.selectedFeedback = fb; },
    });
  }

  closeThread() {
    this.selectedFeedback = null;
    this.replyBody = '';
  }

  sendReply() {
    if (!this.selectedFeedback || !this.replyBody.trim()) return;
    this.replying = true;
    this.feedbackService.reply(this.selectedFeedback.id, this.replyBody.trim())
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (reply) => {
          if (this.selectedFeedback) {
            this.selectedFeedback.replies = [...(this.selectedFeedback.replies || []), reply];
          }
          this.replyBody = '';
          this.replying = false;
        },
        error: () => { this.replying = false; },
      });
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
