import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { IonContent } from '@ionic/angular/standalone';
import { UserManagementService, UserDashboard } from '../../../core/services/user-management.service';
import { FeedbackService, FeedbackItem, FeedbackReply } from '../../../core/services/feedback.service';
import { FormsModule } from '@angular/forms';
import { MessagesModalComponent } from '../../../shared/components/messages-modal/messages-modal.component';

@Component({
  selector: 'app-user-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, IonContent, FormsModule, MessagesModalComponent],
  template: `
    <ion-content [style.--padding-top]="'80px'" [style.--padding]="'0'">
      <div class="user-dashboard" *ngIf="dashboard; else notLoaded">
        <div class="header">
          <button class="back-btn" (click)="goBack()">← Back</button>
          <div class="header-content">
            <div>
              <h1>{{ dashboard.account.email }}</h1>
              <p class="subtitle">User ID: {{ dashboard.account.userId }}</p>
            </div>
            <button class="message-btn" (click)="openMessageModal()" title="Send message">💬 Message</button>
          </div>
        </div>

        <div class="sections">
          <section class="card">
            <h2>Account</h2>
            <dl>
              <dt>Email</dt>
              <dd>{{ dashboard.account.email }}</dd>
              <dt>Role</dt>
              <dd>{{ dashboard.account.role }}</dd>
              <dt>Tenant</dt>
              <dd>{{ dashboard.account.tenantId }}</dd>
              <dt>Subscription</dt>
              <dd>{{ dashboard.account.subscriptionTier }}</dd>
              <dt>Created</dt>
              <dd>{{ dashboard.account.createdAt | date:'medium' }}</dd>
            </dl>
            <button class="action-btn" *ngIf="!isCreatorView" (click)="sendPasswordReset()" [disabled]="passwordResetSending">
              {{ passwordResetSending ? 'Sending…' : 'Send password reset email' }}
            </button>
            <p class="message success" *ngIf="passwordResetMessage">{{ passwordResetMessage }}</p>
          </section>

          <!-- Feedback Section -->
          <section class="card" *ngIf="!isCreatorView">
            <h2>Feedback</h2>
            <div class="feedback-toggle-row">
              <label class="toggle-label">
                <input type="checkbox" [checked]="dashboard.account.feedbackEnabled" (change)="toggleFeedbackEnabled($event)">
                <span>Feedback enabled for this user</span>
              </label>
            </div>
            <div *ngIf="userFeedback.length === 0 && !feedbackLoading" class="feedback-empty">No feedback from this user.</div>
            <div *ngIf="feedbackLoading" class="feedback-empty">Loading feedback...</div>
            <div *ngFor="let fb of userFeedback" class="feedback-thread-card">
              <div class="fb-thread-header">
                <span class="fb-thread-subject">{{ fb.subject }}</span>
                <span class="fb-thread-status" [class]="'fbs-' + fb.status">{{ formatFeedbackStatus(fb.status) }}</span>
                <span class="fb-thread-date">{{ fb.createdAt | date:'short' }}</span>
              </div>
              <div class="fb-thread-body">{{ fb.body }}</div>
              <!-- Replies -->
              <div *ngFor="let r of fb.replies" class="fb-reply" [class.fb-reply-admin]="r.fromUserId !== fb.userId">
                <div class="fb-reply-meta">{{ r.fromUser?.email || (r.fromUserId === fb.userId ? 'User' : 'Admin') }} · {{ r.createdAt | date:'short' }}</div>
                <div class="fb-reply-body">{{ r.body }}</div>
              </div>
              <!-- Quick reply -->
              <div class="fb-quick-reply">
                <input type="text" [(ngModel)]="feedbackReplyTexts[fb.id]" placeholder="Reply..." (keydown.enter)="replyToFeedback(fb)">
                <label class="email-check">
                  <input type="checkbox" [checked]="feedbackEmailFlags[fb.id]" (change)="feedbackEmailFlags[fb.id] = !feedbackEmailFlags[fb.id]">
                  <span>Email</span>
                </label>
                <button class="btn-sm" [disabled]="!feedbackReplyTexts[fb.id]?.trim()" (click)="replyToFeedback(fb)">Reply</button>
              </div>
            </div>
          </section>

          <section class="card" *ngIf="dashboard.personalisation">
            <h2>Personalisation</h2>
            <dl>
              <dt>Full name</dt>
              <dd>{{ dashboard.personalisation?.fullName || '—' }}</dd>
              <dt>Age range</dt>
              <dd>{{ dashboard.personalisation?.ageRange || '—' }}</dd>
              <dt>Gender</dt>
              <dd>{{ dashboard.personalisation?.gender || '—' }}</dd>
              <dt>Favourite TV / movies</dt>
              <dd>{{ (dashboard.personalisation?.favouriteTvMovies?.length ? dashboard.personalisation.favouriteTvMovies.join(', ') : null) || '—' }}</dd>
              <dt>Hobbies & interests</dt>
              <dd>{{ (dashboard.personalisation?.hobbiesInterests?.length ? dashboard.personalisation.hobbiesInterests.join(', ') : null) || '—' }}</dd>
              <dt>Learning areas</dt>
              <dd>{{ (dashboard.personalisation?.learningAreas?.length ? dashboard.personalisation.learningAreas.join(', ') : null) || '—' }}</dd>
              <dt>Onboarding</dt>
              <dd>{{ dashboard.personalisation?.skippedOnboarding ? 'Skipped' : (dashboard.personalisation?.onboardingCompletedAt | date:'medium') || 'Not completed' }}</dd>
            </dl>
          </section>

          <section class="card">
            <h2>Usage Metrics</h2>
            <dl>
              <dt>Lesson views</dt>
              <dd>{{ dashboard.usageMetrics.lessonViews }}</dd>
              <dt>Last activity</dt>
              <dd>{{ dashboard.usageMetrics.lastActivity | date:'medium' || '—' }}</dd>
            </dl>
          </section>

          <section class="card">
            <h2>LLM Usage</h2>
            <dl>
              <dt>Tokens this period</dt>
              <dd>{{ dashboard.llmUsage.tokensUsedThisPeriod | number }}</dd>
              <dt>Limit</dt>
              <dd>{{ dashboard.llmUsage.tokenLimit | number }}</dd>
              <dt>Credits remaining</dt>
              <dd>{{ dashboard.llmUsage.percentRemaining }}%</dd>
              <dt>Renewal</dt>
              <dd>{{ dashboard.llmUsage.renewalAt | date:'mediumDate' || '—' }}</dd>
            </dl>
            <div *ngIf="dashboard.llmUsage.assistantBreakdown?.length" class="breakdown">
              <h3>By assistant</h3>
              <ul>
                <li *ngFor="let a of dashboard.llmUsage.assistantBreakdown">
                  {{ a.assistantId }}: {{ a.tokensUsed | number }} tokens, {{ a.callCount }} calls
                </li>
              </ul>
            </div>
          </section>

          <section class="card" *ngIf="dashboard.lessonEngagement?.length">
            <h2>Lesson Engagement</h2>
            <ul class="lesson-list">
              <li *ngFor="let le of dashboard.lessonEngagement">
                {{ le.title }} — {{ le.viewCount }} views, last: {{ le.lastViewed | date:'short' }}
              </li>
            </ul>
          </section>

          <section class="card" *ngIf="!isCreatorView && dashboard.lessonEngagementTranscriptions?.length">
            <h2>Lesson Engagement Transcriptions</h2>
            <ul class="transcript-row-list">
              <li *ngFor="let t of dashboard.lessonEngagementTranscriptions" class="transcript-row">
                <span class="transcript-row-label">Lesson {{ t.lessonId }} — {{ t.transcriptLength }} entries</span>
                <button type="button" class="action-btn secondary btn-sm" (click)="openTranscriptModal(t.id)">View transcription</button>
              </li>
            </ul>
          </section>

          <!-- Transcript modal -->
          <div class="modal-backdrop" *ngIf="transcriptModalVisible" (click)="closeTranscriptModal()"></div>
          <div class="modal transcript-modal" *ngIf="transcriptModalVisible" role="dialog" aria-modal="true">
            <div class="modal-header">
              <h3>Transcription</h3>
              <button type="button" class="modal-close" (click)="closeTranscriptModal()" aria-label="Close">×</button>
            </div>
            <div class="modal-body">
              <div *ngIf="transcriptModalLoading" class="modal-loading">Loading…</div>
              <div *ngIf="!transcriptModalLoading && selectedTranscriptForModal" class="transcript-modal-content">
                <div class="transcript-modal-meta">Lesson {{ selectedTranscriptForModal.lessonId }} — {{ (selectedTranscriptForModal.transcript || []).length }} entries — {{ selectedTranscriptForModal.createdAt | date:'medium' }}</div>
                <div class="transcript-entries scrollable" *ngIf="selectedTranscriptForModal.transcript?.length">
                  <div *ngFor="let e of (selectedTranscriptForModal.transcript || []); let i = index" class="transcript-entry">
                    <span class="entry-meta">[{{ e.timestamp ? (e.timestamp | date:'shortTime') : '—' }}] {{ e.type || 'event' }} ({{ e.speaker || 'system' }}):</span>
                    <span class="entry-content">{{ e.content }}</span>
                  </div>
                </div>
                <div *ngIf="!selectedTranscriptForModal.transcript?.length" class="transcript-empty">No entries</div>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="action-btn secondary" (click)="copyTranscript()">Copy</button>
              <button type="button" class="action-btn" (click)="closeTranscriptModal()">Close</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Messages modal -->
      <app-messages-modal
        *ngIf="showMessageModal"
        [toUserId]="dashboard?.account.userId"
        [toUserEmail]="dashboard?.account.email"
        [onClose]="closeMessageModal">
      </app-messages-modal>

      <ng-template #notLoaded>
        <div class="loading" *ngIf="!errorMessage">Loading...</div>
        <div class="error" *ngIf="errorMessage">
          <p>{{ errorMessage }}</p>
          <button class="back-btn" (click)="goBack()">← Back</button>
        </div>
      </ng-template>
    </ion-content>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      height: 100%;
    }
    ion-content {
      --background: linear-gradient(135deg, #0f0f23 0%, #1a1a2e 100%);
      --padding-start: 0;
      --padding-end: 0;
      --padding-top: 0;
      --padding-bottom: 0;
    }
    .user-dashboard {
      min-height: 100vh;
      background: linear-gradient(135deg, #0f0f23 0%, #1a1a2e 100%);
      padding: 2rem;
      max-width: 900px;
      margin: 0 auto;
      box-sizing: border-box;
    }
    .header {
      margin-bottom: 2rem;
    }
    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 1rem;
    }
    .message-btn {
      background: rgba(0, 212, 255, 0.1);
      border: 1px solid rgba(0, 212, 255, 0.3);
      border-radius: 6px;
      padding: 0.75rem 1.5rem;
      color: #00d4ff;
      cursor: pointer;
      font-size: 0.95rem;
      transition: all 0.2s;
      white-space: nowrap;
    }
    .message-btn:hover {
      background: rgba(0, 212, 255, 0.2);
      border-color: #00d4ff;
    }
    .back-btn {
      background: none;
      border: none;
      color: #00d4ff;
      cursor: pointer;
      font-size: 0.9rem;
      margin-bottom: 1rem;
      padding: 0;
    }
    .back-btn:hover {
      text-decoration: underline;
    }
    .header h1 {
      font-size: 1.5rem;
      color: #fff;
      margin: 0 0 0.25rem 0;
    }
    .subtitle {
      color: rgba(255,255,255,0.5);
      margin: 0;
      font-size: 0.85rem;
      font-family: monospace;
    }
    .sections {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }
    .card {
      background: rgba(255,255,255,0.05);
      border-radius: 12px;
      padding: 1.5rem;
    }
    .card h2 {
      font-size: 1.1rem;
      color: #fff;
      margin: 0 0 1rem 0;
    }
    .card h3 {
      font-size: 0.95rem;
      color: rgba(255,255,255,0.8);
      margin: 1rem 0 0.5rem 0;
    }
    .card dl {
      display: grid;
      grid-template-columns: 140px 1fr;
      gap: 0.5rem 1.5rem;
    }
    .card dt {
      color: rgba(255,255,255,0.5);
      font-size: 0.9rem;
    }
    .card dd {
      color: #fff;
      margin: 0;
      font-size: 0.9rem;
    }
    .breakdown ul, .lesson-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    .breakdown li, .lesson-list li {
      color: rgba(255,255,255,0.8);
      font-size: 0.9rem;
      padding: 0.25rem 0;
    }
    .loading {
      color: rgba(255,255,255,0.6);
      text-align: center;
      padding: 4rem;
    }
    .error {
      color: #ff6b6b;
      padding: 2rem;
    }
    .error p {
      margin-bottom: 1rem;
    }
    .action-btn {
      margin-top: 1rem;
      padding: 0.5rem 1rem;
      background: #00d4ff;
      color: #0f0f23;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-size: 0.9rem;
    }
    .action-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    .action-btn.secondary {
      background: rgba(255,255,255,0.1);
      color: #00d4ff;
    }
    .action-btn.btn-sm {
      padding: 0.35rem 0.75rem;
      font-size: 0.85rem;
    }
    .transcript-row-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    .transcript-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 0.5rem 0;
      border-bottom: 1px solid rgba(255,255,255,0.08);
      color: #e8e8e8;
      font-size: 0.9rem;
    }
    .transcript-row:last-child {
      border-bottom: none;
    }
    .transcript-row-label {
      flex: 1;
      min-width: 0;
    }
    .transcript-entries {
      overflow-y: auto;
    }
    .transcript-entries.scrollable {
      max-height: 60vh;
      min-height: 120px;
    }
    .transcript-modal-meta {
      color: #00d4ff;
      font-size: 0.9rem;
      margin-bottom: 0.75rem;
    }
    .transcript-entry {
      display: block;
      padding: 0.35rem 0;
      border-bottom: 1px solid rgba(255,255,255,0.08);
      font-size: 0.85rem;
      color: #e0e0e0;
    }
    .transcript-entry:last-child {
      border-bottom: none;
    }
    .entry-meta {
      color: rgba(255,255,255,0.6);
      margin-right: 0.5rem;
      font-size: 0.8rem;
    }
    .entry-content {
      color: #e8e8e8;
      word-break: break-word;
    }
    .transcript-empty {
      color: rgba(255,255,255,0.5);
      font-style: italic;
    }
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.6);
      z-index: 9998;
    }
    .transcript-modal {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 90%;
      max-width: 560px;
      max-height: 85vh;
      display: flex;
      flex-direction: column;
      background: linear-gradient(135deg, #1a1a2e 0%, #0f0f23 100%);
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.5);
      z-index: 9999;
      border: 1px solid rgba(255,255,255,0.1);
    }
    .modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1rem 1.25rem;
      border-bottom: 1px solid rgba(255,255,255,0.1);
    }
    .modal-header h3 {
      margin: 0;
      font-size: 1.1rem;
      color: #fff;
    }
    .modal-close {
      background: none;
      border: none;
      color: #e8e8e8;
      font-size: 1.5rem;
      line-height: 1;
      cursor: pointer;
      padding: 0 0.25rem;
    }
    .modal-close:hover {
      color: #00d4ff;
    }
    .modal-body {
      padding: 1rem 1.25rem;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      min-height: 0;
    }
    .modal-loading {
      color: rgba(255,255,255,0.7);
      text-align: center;
      padding: 2rem;
    }
    .transcript-modal-content {
      display: flex;
      flex-direction: column;
      min-height: 0;
    }
    .modal-footer {
      display: flex;
      gap: 0.75rem;
      justify-content: flex-end;
      padding: 1rem 1.25rem;
      border-top: 1px solid rgba(255,255,255,0.1);
    }
    .message {
      margin-top: 0.5rem;
      font-size: 0.9rem;
    }
    .message.success {
      color: #00d4ff;
    }
    /* Feedback section */
    .feedback-toggle-row { margin-bottom: 1rem; }
    .toggle-label { display: flex; align-items: center; gap: 0.5rem; color: rgba(255,255,255,0.8); cursor: pointer; font-size: 0.9rem; }
    .toggle-label input[type=checkbox] { accent-color: #00d4ff; width: 18px; height: 18px; }
    .feedback-empty { color: rgba(255,255,255,0.4); font-size: 0.85rem; }
    .feedback-thread-card { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 0.75rem 1rem; margin-bottom: 0.75rem; }
    .fb-thread-header { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 0.3rem; }
    .fb-thread-subject { color: #fff; font-weight: 600; font-size: 0.9rem; }
    .fb-thread-status { font-size: 0.65rem; padding: 1px 7px; border-radius: 10px; font-weight: 600; }
    .fbs-pending { background: rgba(234,179,8,0.15); color: #eab308; }
    .fbs-replied { background: rgba(0,212,255,0.15); color: #00d4ff; }
    .fbs-addressed { background: rgba(34,197,94,0.15); color: #22c55e; }
    .fbs-wont_do { background: rgba(239,68,68,0.15); color: #ef4444; }
    .fbs-archived { background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.4); }
    .fb-thread-date { color: rgba(255,255,255,0.35); font-size: 0.75rem; margin-left: auto; }
    .fb-thread-body { color: rgba(255,255,255,0.7); font-size: 0.85rem; white-space: pre-wrap; margin-bottom: 0.5rem; }
    .fb-reply { padding: 0.5rem 0.75rem; margin-top: 0.4rem; border-radius: 6px; background: rgba(0,212,255,0.04); border-left: 2px solid rgba(0,212,255,0.3); }
    .fb-reply-admin { background: rgba(255,255,255,0.04); border-left-color: rgba(255,255,255,0.2); }
    .fb-reply-meta { color: rgba(255,255,255,0.4); font-size: 0.7rem; margin-bottom: 0.15rem; }
    .fb-reply-body { color: rgba(255,255,255,0.8); font-size: 0.85rem; }
    .fb-quick-reply { display: flex; gap: 0.5rem; margin-top: 0.5rem; }
    .fb-quick-reply input { flex: 1; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.15); border-radius: 6px; padding: 0.4rem 0.6rem; color: #fff; font-size: 0.85rem; }
    .fb-quick-reply input:focus { border-color: #00d4ff; outline: none; }
    .fb-quick-reply .btn-sm { background: #00d4ff; color: #000; border: none; padding: 0.35rem 0.75rem; border-radius: 5px; font-size: 0.8rem; cursor: pointer; font-weight: 600; }
    .fb-quick-reply .btn-sm:disabled { opacity: 0.4; cursor: not-allowed; }
    .email-check { display: flex; align-items: center; gap: 0.25rem; color: rgba(255,255,255,0.6); font-size: 0.75rem; white-space: nowrap; cursor: pointer; }
    .email-check input[type=checkbox] { accent-color: #00d4ff; width: 14px; height: 14px; }
  `],
})
export class UserDashboardComponent implements OnInit, OnDestroy {
  @Input() userId!: string;
  @Input() showTranscriptions = false;

  dashboard: UserDashboard | null = null;
  errorMessage: string | null = null;
  passwordResetSending = false;
  passwordResetMessage: string | null = null;
  fullTranscriptions: Array<{ id: string; lessonId: string; transcript: any[]; createdAt: string }> | null = null;
  transcriptModalVisible = false;
  transcriptModalLoading = false;
  selectedTranscriptForModal: { id: string; lessonId: string; transcript: any[]; createdAt: string } | null = null;
  /** When true, we are on lesson-editor/:lessonId/engagers/:userId (creator view: no password reset, no transcriptions). */
  isCreatorView = false;
  lessonIdForBack: string | null = null;
  showMessageModal = false;

  // Feedback
  userFeedback: FeedbackItem[] = [];
  feedbackLoading = false;
  feedbackReplyTexts: Record<string, string> = {};
  feedbackEmailFlags: Record<string, boolean> = {};

  constructor(
    private userMgmt: UserManagementService,
    private feedbackService: FeedbackService,
    private router: Router,
    private route: ActivatedRoute,
  ) {}

  ngOnInit() {
    const id = this.userId || this.route.snapshot.paramMap.get('userId');
    const lessonId = this.route.snapshot.paramMap.get('lessonId');
    if (!id) return;
    this.userId = id;
    this.isCreatorView = !!lessonId;
    this.lessonIdForBack = lessonId;
    const req = lessonId
      ? this.userMgmt.getLessonEngagerDashboard(lessonId, id)
      : this.userMgmt.getUserDashboard(id);
    req.subscribe({
      next: (d) => {
        this.dashboard = d;
        this.errorMessage = null;
        if (!this.isCreatorView) this.loadUserFeedback();
      },
      error: (err) => {
        this.dashboard = null;
        this.errorMessage = err?.message || 'Failed to load user dashboard. Check backend logs for details.';
      },
    });
  }

  sendPasswordReset() {
    if (!this.userId || this.passwordResetSending) return;
    this.passwordResetSending = true;
    this.passwordResetMessage = null;
    this.userMgmt.sendPasswordReset(this.userId).subscribe({
      next: (res) => {
        this.passwordResetSending = false;
        this.passwordResetMessage = res.sent ? 'Password reset email sent.' : res.message;
      },
      error: (err) => {
        this.passwordResetSending = false;
        this.passwordResetMessage = err?.message || 'Failed to send password reset.';
      },
    });
  }

  private hideNavForModal() {
    document.body.style.overflow = 'hidden';
    const header = document.querySelector('app-header');
    if (header) {
      (header as HTMLElement).style.display = 'none';
    }
  }

  private restoreNavAfterModal() {
    document.body.style.overflow = '';
    const header = document.querySelector('app-header');
    if (header) {
      (header as HTMLElement).style.display = '';
    }
  }

  openTranscriptModal(transcriptId: string) {
    this.transcriptModalVisible = true;
    this.hideNavForModal();
    this.transcriptModalLoading = true;
    this.selectedTranscriptForModal = null;
    this.userMgmt.getTranscriptions(this.userId).subscribe({
      next: (list) => {
        this.fullTranscriptions = list;
        const found = list.find((t: any) => t.id === transcriptId);
        this.selectedTranscriptForModal = found || null;
        this.transcriptModalLoading = false;
      },
      error: () => {
        this.fullTranscriptions = [];
        this.transcriptModalLoading = false;
      },
    });
  }

  closeTranscriptModal() {
    this.transcriptModalVisible = false;
    this.selectedTranscriptForModal = null;
    this.restoreNavAfterModal();
  }

  copyTranscript() {
    if (!this.selectedTranscriptForModal?.transcript?.length) return;
    const lines = this.selectedTranscriptForModal.transcript.map((e: any) => {
      const time = e.timestamp ? new Date(e.timestamp).toLocaleTimeString() : '—';
      return `[${time}] ${e.type || 'event'} (${e.speaker || 'system'}): ${(e.content || '').replace(/\n/g, ' ')}`;
    });
    const text = lines.join('\n');
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        console.log('[UserDashboard] Transcript copied to clipboard');
      }).catch(() => {});
    }
  }

  goBack() {
    if (this.isCreatorView && this.lessonIdForBack) {
      this.router.navigate(['/lesson-editor', this.lessonIdForBack]);
    } else {
      this.router.navigate(['/super-admin/user-management']);
    }
  }

  openMessageModal() {
    this.showMessageModal = true;
  }

  closeMessageModal = () => {
    this.showMessageModal = false;
  };

  ngOnDestroy() {
    if (this.transcriptModalVisible) {
      this.restoreNavAfterModal();
    }
  }

  // ── Feedback ──────────────────────────────────────────────────────

  loadUserFeedback() {
    if (!this.userId) return;
    this.feedbackLoading = true;
    this.feedbackService.getForUser(this.userId).subscribe({
      next: (items) => { this.userFeedback = items; this.feedbackLoading = false; },
      error: () => { this.feedbackLoading = false; },
    });
  }

  toggleFeedbackEnabled(event: Event) {
    const enabled = (event.target as HTMLInputElement).checked;
    this.feedbackService.toggleUserFeedback(this.userId, enabled).subscribe({
      next: () => {
        if (this.dashboard) this.dashboard.account.feedbackEnabled = enabled;
      },
      error: () => {
        // Revert checkbox on error
        if (this.dashboard) this.dashboard.account.feedbackEnabled = !enabled;
      },
    });
  }

  replyToFeedback(fb: FeedbackItem) {
    const text = this.feedbackReplyTexts[fb.id]?.trim();
    if (!text) return;
    const sendEmail = !!this.feedbackEmailFlags[fb.id];
    this.feedbackService.adminReply(fb.id, text, sendEmail).subscribe({
      next: (reply) => {
        fb.replies = [...(fb.replies || []), reply];
        this.feedbackReplyTexts[fb.id] = '';
        this.feedbackEmailFlags[fb.id] = false;
      },
    });
  }

  formatFeedbackStatus(status: string): string {
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
