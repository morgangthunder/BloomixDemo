import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MessagesService, Message, CreateMessageDto } from '../../../core/services/messages.service';
import { FeedbackService, FeedbackItem } from '../../../core/services/feedback.service';
import { Subject, forkJoin, of } from 'rxjs';
import { takeUntil, catchError } from 'rxjs/operators';

@Component({
  selector: 'app-messages-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-backdrop" (click)="close()"></div>
    <div class="modal messages-modal" role="dialog" aria-modal="true">
      <div class="modal-header">
        <h3>{{ toUserId ? 'Send Message' : 'Notifications' }}</h3>
        <button type="button" class="modal-close" (click)="close()" aria-label="Close">×</button>
      </div>
      <div class="modal-body">
        <!-- Success banner (visible for 1.2s after send) -->
        <div *ngIf="sendSuccess" class="success-banner">✓ Message sent!</div>
        <!-- Compose form (when toUserId is provided and we haven't just switched to inbox) -->
        <div *ngIf="showCompose && toUserId && toUserEmail" class="compose-section">
          <form (ngSubmit)="sendMessage()" #messageForm="ngForm">
            <div class="form-group">
              <label>To:</label>
              <div class="to-user">{{ toUserEmail }}</div>
            </div>
            <div class="form-group">
              <label for="title">Subject:</label>
              <input
                type="text"
                id="title"
                name="title"
                [(ngModel)]="composeTitle"
                required
                maxlength="255"
                class="form-input"
                placeholder="Message subject">
            </div>
            <div class="form-group">
              <label for="body">Message:</label>
              <textarea
                id="body"
                name="body"
                [(ngModel)]="composeBody"
                required
                rows="6"
                class="form-textarea"
                placeholder="Type your message..."></textarea>
            </div>
            <div class="form-group delivery-options">
              <label>Delivery</label>
              <label class="checkbox-row">
                <input type="checkbox" [(ngModel)]="composeSendInApp" name="sendInApp">
                <span>In-app message</span>
              </label>
              <label class="checkbox-row">
                <input type="checkbox" [(ngModel)]="composeSendEmail" name="sendEmail">
                <span>Also send by email</span>
              </label>
            </div>
            <div class="form-actions">
              <button type="button" class="btn-secondary" (click)="close()">Cancel</button>
              <button type="submit" class="btn-primary" [disabled]="sending || !messageForm.valid">
                {{ sending ? 'Sending...' : 'Send' }}
              </button>
            </div>
            <div *ngIf="sendError" class="error-message">{{ sendError }}</div>
            <div *ngIf="sendSuccess" class="success-message">Message sent!</div>
          </form>
        </div>

        <!-- Messages list (all messages / sent & received) -->
        <div *ngIf="(!showCompose || !toUserId) && !selectedMessage" class="messages-list">
          <div class="tabs">
            <button
              class="tab-btn"
              [class.active]="activeTab === 'received'"
              (click)="activeTab = 'received'">
              Received ({{ receivedMessages.length }})
            </button>
            <button
              class="tab-btn"
              [class.active]="activeTab === 'sent'"
              (click)="activeTab = 'sent'">
              Sent ({{ sentMessages.length }})
            </button>
          </div>

          <div *ngIf="loading" class="loading">Loading messages...</div>
          <div *ngIf="!loading && activeTab === 'received' && receivedMessages.length === 0" class="empty">
            No received messages
          </div>
          <div *ngIf="!loading && activeTab === 'sent' && sentMessages.length === 0 && myFeedback.length === 0" class="empty">
            No sent messages or feedback
          </div>

          <div class="messages">
            <div
              *ngFor="let msg of (activeTab === 'received' ? receivedMessages : sentMessages)"
              class="message-item"
              [class.unread]="!msg.readAt && activeTab === 'received'"
              (click)="selectMessage(msg)">
              <div class="message-header">
                <span class="message-from">
                  {{ activeTab === 'received' ? (msg.fromUser?.email || msg.fromUserId) : (msg.toUser?.email || msg.toUserId) }}
                </span>
                <span class="message-date">{{ msg.createdAt | date:'short' }}</span>
              </div>
              <div class="message-title">
                {{ msg.title }}
                <span *ngIf="activeTab === 'sent' && msg.emailRequested" class="delivery-badge"
                      [class.delivery-sent]="msg.emailDeliveryStatus === 'sent'"
                      [class.delivery-failed]="msg.emailDeliveryStatus === 'failed'"
                      [class.delivery-pending]="msg.emailDeliveryStatus === 'pending' || !msg.emailDeliveryStatus">
                  {{ msg.emailDeliveryStatus === 'sent' ? 'Email delivered' : msg.emailDeliveryStatus === 'failed' ? 'Email failed' : 'Email pending' }}
                </span>
              </div>
              <div class="message-preview">{{ msg.body }}</div>
              <button *ngIf="!msg.readAt && activeTab === 'received'"
                      class="quick-read-btn"
                      (click)="quickMarkAsRead($event, msg)">
                Mark as read
              </button>
            </div>
            <!-- Feedback items in Sent tab -->
            <div *ngIf="activeTab === 'sent' && myFeedback.length > 0" class="feedback-divider">
              Feedback submissions
            </div>
            <div *ngFor="let fb of (activeTab === 'sent' ? myFeedback : [])"
                 class="message-item feedback-item"
                 (click)="navigateToFeedback(fb)">
              <div class="message-header">
                <span class="message-from feedback-tag">Feedback</span>
                <span class="feedback-status-badge" [class]="'fbs-' + fb.status">{{ formatFeedbackStatus(fb.status) }}</span>
                <span class="message-date">{{ fb.createdAt | date:'short' }}</span>
              </div>
              <div class="message-title">{{ fb.subject }}</div>
              <div class="message-preview">{{ fb.body | slice:0:120 }}{{ fb.body.length > 120 ? '...' : '' }}</div>
            </div>
          </div>
        </div>

        <!-- Message detail view (replaces list) -->
        <div *ngIf="selectedMessage" class="message-detail">
          <button class="back-to-list" (click)="selectedMessage = null">← Back</button>
          <div class="message-detail-header">
            <div class="message-detail-from">
              <strong>From:</strong> {{ selectedMessage.fromUser?.email || selectedMessage.fromUserId }}
            </div>
            <div class="message-detail-to">
              <strong>To:</strong> {{ selectedMessage.toUser?.email || selectedMessage.toUserId }}
            </div>
            <div class="message-detail-date">{{ selectedMessage.createdAt | date:'medium' }}</div>
          </div>
          <div class="message-detail-title">{{ selectedMessage.title }}</div>
          <div class="message-detail-body">{{ selectedMessage.body }}</div>
          <div *ngIf="!selectedMessage.readAt && activeTab === 'received'" class="message-actions">
            <button class="btn-primary" (click)="markAsRead(selectedMessage)">Mark as read</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modal-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.7);
      z-index: 10002;
    }
    .messages-modal {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
      z-index: 10003;
      max-width: 700px;
      width: 90%;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      color: #e8e8e8;
    }
    .modal-header {
      padding: 1.5rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .modal-header h3 {
      margin: 0;
      color: #00d4ff;
      font-size: 1.25rem;
    }
    .modal-close {
      background: none;
      border: none;
      color: #e8e8e8;
      font-size: 1.5rem;
      cursor: pointer;
      padding: 0;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .modal-close:hover {
      color: #00d4ff;
    }
    .modal-body {
      padding: 1.5rem;
      overflow-y: auto;
      flex: 1;
    }
    .compose-section {
      max-width: 600px;
    }
    .form-group {
      margin-bottom: 1rem;
    }
    .form-group label {
      display: block;
      margin-bottom: 0.5rem;
      color: #00d4ff;
      font-weight: 500;
    }
    .to-user {
      padding: 0.5rem;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 4px;
      color: #e8e8e8;
    }
    .form-input,
    .form-textarea {
      width: 100%;
      padding: 0.75rem;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 4px;
      color: #e8e8e8;
      font-family: inherit;
      font-size: 0.95rem;
    }
    .form-input:focus,
    .form-textarea:focus {
      outline: none;
      border-color: #00d4ff;
    }
    .form-textarea {
      resize: vertical;
    }
    .delivery-options {
      margin-top: 1rem;
    }
    .delivery-options > label:first-child {
      display: block;
      margin-bottom: 0.5rem;
      color: #00d4ff;
      font-weight: 500;
    }
    .checkbox-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.5rem;
      cursor: pointer;
      color: #e8e8e8;
      font-weight: normal;
    }
    .checkbox-row input {
      width: auto;
      margin: 0;
    }
    .form-actions {
      display: flex;
      gap: 1rem;
      justify-content: flex-end;
      margin-top: 1.5rem;
    }
    .btn-primary,
    .btn-secondary {
      padding: 0.75rem 1.5rem;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.95rem;
      font-weight: 500;
    }
    .btn-primary {
      background: #00d4ff;
      color: #0f0f23;
    }
    .btn-primary:hover:not(:disabled) {
      background: #00b8d4;
    }
    .btn-primary:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .btn-secondary {
      background: rgba(255, 255, 255, 0.1);
      color: #e8e8e8;
    }
    .btn-secondary:hover {
      background: rgba(255, 255, 255, 0.15);
    }
    .success-banner {
      margin: -0.5rem 0 1rem 0;
      padding: 0.75rem 1rem;
      background: rgba(0, 212, 255, 0.15);
      border: 1px solid rgba(0, 212, 255, 0.4);
      border-radius: 6px;
      color: #00d4ff;
      font-weight: 600;
      text-align: center;
    }
    .error-message {
      margin-top: 1rem;
      padding: 0.75rem;
      background: rgba(255, 0, 0, 0.1);
      border: 1px solid rgba(255, 0, 0, 0.3);
      border-radius: 4px;
      color: #ff6b6b;
    }
    .success-message {
      margin-top: 1rem;
      padding: 0.75rem;
      background: rgba(0, 212, 255, 0.1);
      border: 1px solid rgba(0, 212, 255, 0.3);
      border-radius: 4px;
      color: #00d4ff;
    }
    .tabs {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 1.5rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }
    .tab-btn {
      padding: 0.75rem 1.5rem;
      background: none;
      border: none;
      border-bottom: 2px solid transparent;
      color: #e8e8e8;
      cursor: pointer;
      font-size: 0.95rem;
    }
    .tab-btn.active {
      border-bottom-color: #00d4ff;
      color: #00d4ff;
    }
    .tab-btn:hover {
      color: #00d4ff;
    }
    .loading,
    .empty {
      text-align: center;
      padding: 2rem;
      color: #888;
    }
    .messages {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .message-item {
      padding: 1rem;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 6px;
      cursor: pointer;
      transition: background 0.2s;
    }
    .message-item:hover {
      background: rgba(255, 255, 255, 0.08);
    }
    .message-item.unread {
      border-left: 3px solid #00d4ff;
      background: rgba(0, 212, 255, 0.05);
    }
    .message-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 0.5rem;
      font-size: 0.9rem;
    }
    .message-from {
      color: #00d4ff;
      font-weight: 500;
    }
    .message-date {
      color: #888;
    }
    .message-title {
      font-weight: 600;
      margin-bottom: 0.25rem;
      color: #e8e8e8;
    }
    .message-preview {
      color: #aaa;
      font-size: 0.9rem;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .message-detail {
      max-width: 600px;
    }
    .back-to-list {
      background: none;
      border: none;
      color: #00d4ff;
      cursor: pointer;
      margin-bottom: 1rem;
      padding: 0;
    }
    .back-to-list:hover {
      text-decoration: underline;
    }
    .message-detail-header {
      margin-bottom: 1.5rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }
    .message-detail-from,
    .message-detail-to {
      margin-bottom: 0.5rem;
      color: #e8e8e8;
    }
    .message-detail-date {
      color: #888;
      font-size: 0.9rem;
    }
    .message-detail-title {
      font-size: 1.25rem;
      font-weight: 600;
      margin-bottom: 1rem;
      color: #00d4ff;
    }
    .message-detail-body {
      line-height: 1.6;
      color: #e8e8e8;
      white-space: pre-wrap;
    }
    .message-actions {
      margin-top: 1.5rem;
    }
    .delivery-badge {
      display: inline-block;
      font-size: 0.7rem;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 10px;
      margin-left: 0.5rem;
      vertical-align: middle;
    }
    .delivery-sent {
      background: rgba(34, 197, 94, 0.15);
      color: #22c55e;
      border: 1px solid rgba(34, 197, 94, 0.3);
    }
    .delivery-failed {
      background: rgba(239, 68, 68, 0.15);
      color: #ef4444;
      border: 1px solid rgba(239, 68, 68, 0.3);
    }
    .delivery-pending {
      background: rgba(234, 179, 8, 0.15);
      color: #eab308;
      border: 1px solid rgba(234, 179, 8, 0.3);
    }
    .quick-read-btn {
      margin-top: 0.5rem;
      background: rgba(0, 212, 255, 0.1);
      border: 1px solid rgba(0, 212, 255, 0.3);
      color: #00d4ff;
      padding: 3px 10px;
      border-radius: 4px;
      font-size: 0.75rem;
      cursor: pointer;
      transition: background 0.15s;
    }
    .quick-read-btn:hover {
      background: rgba(0, 212, 255, 0.2);
    }
    .feedback-divider {
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: rgba(0, 212, 255, 0.6);
      border-top: 1px solid rgba(255,255,255,0.08);
      margin-top: 0.75rem;
      padding-top: 0.75rem;
      padding-bottom: 0.25rem;
      font-weight: 600;
    }
    .feedback-item { border-left: 3px solid #00d4ff; }
    .feedback-tag {
      display: inline-block;
      background: rgba(0, 212, 255, 0.15);
      color: #00d4ff;
      font-size: 0.65rem;
      padding: 1px 6px;
      border-radius: 4px;
      font-weight: 600;
      text-transform: uppercase;
    }
    .feedback-status-badge {
      font-size: 0.65rem;
      padding: 1px 6px;
      border-radius: 10px;
      font-weight: 600;
    }
    .fbs-pending { background: rgba(234,179,8,0.15); color: #eab308; }
    .fbs-replied { background: rgba(0,212,255,0.15); color: #00d4ff; }
    .fbs-addressed { background: rgba(34,197,94,0.15); color: #22c55e; }
    .fbs-wont_do { background: rgba(239,68,68,0.15); color: #ef4444; }
    .fbs-archived { background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.4); }
  `],
})
export class MessagesModalComponent implements OnInit, OnDestroy {
  @Input() toUserId?: string;
  @Input() toUserEmail?: string;
  @Input() onClose?: () => void;
  /** When true, skip hiding the header (used when modal is rendered inside the header). */
  @Input() skipHideNav = false;
  /** Emits when a message is marked as read (so parent can decrement badge). */
  @Output() messageRead = new EventEmitter<void>();

  activeTab: 'received' | 'sent' = 'received';
  loading = false;
  sentMessages: Message[] = [];
  receivedMessages: Message[] = [];
  myFeedback: FeedbackItem[] = [];
  selectedMessage: Message | null = null;
  composeTitle = '';
  composeBody = '';
  composeSendInApp = true;
  composeSendEmail = false;
  sending = false;
  sendError: string | null = null;
  sendSuccess = false;
  /** When true, show compose form; when false, show messages list (used after send to show Sent list). */
  showCompose = true;

  private destroy$ = new Subject<void>();

  constructor(
    private messagesService: MessagesService,
    private feedbackService: FeedbackService,
    private router: Router,
  ) {}

  ngOnInit() {
    this.showCompose = !!this.toUserId;
    this.hideNavForModal();
    if (!this.toUserId) {
      this.loadMessages();
    }
  }

  ngOnDestroy() {
    this.restoreNavAfterModal();
    this.destroy$.next();
    this.destroy$.complete();
  }

  private hideNavForModal() {
    document.body.style.overflow = 'hidden';
    if (!this.skipHideNav) {
      const header = document.querySelector('app-header');
      if (header) {
        (header as HTMLElement).style.display = 'none';
      }
    }
  }

  private restoreNavAfterModal() {
    document.body.style.overflow = '';
    if (!this.skipHideNav) {
      const header = document.querySelector('app-header');
      if (header) {
        (header as HTMLElement).style.display = '';
      }
    }
  }

  loadMessages() {
    this.loading = true;
    forkJoin({
      messages: this.messagesService.getMessages().pipe(catchError(() => of({ sent: [], received: [] }))),
      feedback: this.feedbackService.getMine().pipe(catchError(() => of([] as FeedbackItem[]))),
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ messages, feedback }) => {
          this.sentMessages = messages.sent;
          this.receivedMessages = messages.received;
          this.myFeedback = feedback;
          this.loading = false;
        },
        error: (err) => {
          console.error('[MessagesModal] Failed to load messages:', err);
          this.loading = false;
        },
      });
  }

  sendMessage() {
    if (!this.toUserId || !this.composeTitle.trim() || !this.composeBody.trim()) {
      return;
    }
    if (!this.composeSendInApp && !this.composeSendEmail) {
      this.sendError = 'Select at least one: In-app message or email';
      return;
    }

    this.sending = true;
    this.sendError = null;
    this.sendSuccess = false;

    const dto: CreateMessageDto = {
      toUserId: this.toUserId,
      title: this.composeTitle.trim(),
      body: this.composeBody.trim(),
      sendInApp: this.composeSendInApp,
      sendEmail: this.composeSendEmail,
    };

    this.messagesService.createMessage(dto)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.sending = false;
          this.sendSuccess = true;
          this.composeTitle = '';
          this.composeBody = '';
          // After a short delay, switch to Sent list so user sees their message
          setTimeout(() => {
            this.sendSuccess = false;
            this.showCompose = false;
            this.selectedMessage = null;
            this.loadMessages();
            this.activeTab = 'sent';
          }, 1200);
        },
        error: (err) => {
          this.sending = false;
          this.sendError = err?.error?.message || err?.message || 'Failed to send message';
          console.error('[MessagesModal] Failed to send message:', err);
        },
      });
  }

  selectMessage(message: Message) {
    this.selectedMessage = message;
    if (!message.readAt && this.activeTab === 'received') {
      this.markAsRead(message);
    }
  }

  markAsRead(message: Message) {
    if (message.readAt) {
      return;
    }

    this.messagesService.markAsRead(message.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updated) => {
          message.readAt = updated.readAt;
          const idx = this.receivedMessages.findIndex((m) => m.id === message.id);
          if (idx >= 0) {
            this.receivedMessages[idx] = updated;
          }
          this.messageRead.emit();
        },
        error: (err) => {
          console.error('[MessagesModal] Failed to mark as read:', err);
        },
      });
  }

  /** Quick mark-as-read from the tile without opening the detail view. */
  quickMarkAsRead(event: Event, message: Message) {
    event.stopPropagation(); // Don't open the detail view
    this.markAsRead(message);
  }

  navigateToFeedback(fb: FeedbackItem) {
    this.close();
    this.router.navigate(['/feedback']);
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

  close() {
    this.restoreNavAfterModal();
    if (this.onClose) {
      this.onClose();
    }
  }
}
