import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { IonContent } from '@ionic/angular/standalone';
import { UserManagementService, UserDashboard } from '../../../core/services/user-management.service';
import { MessagesModalComponent } from '../../../shared/components/messages-modal/messages-modal.component';

@Component({
  selector: 'app-user-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, IonContent, MessagesModalComponent],
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

  constructor(
    private userMgmt: UserManagementService,
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
}
