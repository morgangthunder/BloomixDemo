import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { IonContent, IonSearchbar, IonSpinner } from '@ionic/angular/standalone';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, takeUntil } from 'rxjs/operators';
import { UserManagementService, UserSearchResult } from '../../../core/services/user-management.service';
import { MessagesService } from '../../../core/services/messages.service';
import { AuthService } from '../../../core/services/auth.service';
import { WebSocketService } from '../../../core/services/websocket.service';
import { MessagesModalComponent } from '../../../shared/components/messages-modal/messages-modal.component';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, IonContent, IonSearchbar, IonSpinner, MessagesModalComponent],
  template: `
    <ion-content [style.--padding-top]="'80px'" [style.--padding]="'0'">
      <div class="user-management">
        <div class="header">
          <div class="header-top">
            <button class="back-btn" (click)="goBack()">← Back</button>
            <button class="all-messages-btn" (click)="openAllMessagesModal()" title="View all messages">
              💬 Messages
              <span class="unread-badge" *ngIf="unreadCount > 0">{{ unreadCount > 99 ? '99+' : unreadCount }}</span>
            </button>
          </div>
          <h1>User Management</h1>
          <p class="subtitle">Search and manage users</p>
        </div>

        <div class="search-section">
          <ion-searchbar
            [value]="searchQuery"
            (ionInput)="onSearchInput($event)"
            placeholder="Search by email, ID, or name..."
            [debounce]="300"
            class="search-bar">
          </ion-searchbar>
          <div *ngIf="searching" class="searching">
            <ion-spinner name="crescent"></ion-spinner>
            <span>Searching...</span>
          </div>
        </div>

        <div class="results-section">
          <div *ngIf="!searchQuery || searchQuery.length < 2" class="hint">
            Enter at least 2 characters to search
          </div>
          <div *ngIf="searchQuery && searchQuery.length >= 2 && !searching && users.length === 0" class="empty">
            No users found
          </div>
          <div *ngIf="users.length > 0" class="users-list">
            <div
              *ngFor="let user of users"
              class="user-row">
              <div class="user-info" (click)="viewUser(user)">
                <span class="email">{{ user.email }}</span>
                <span class="meta">{{ user.name }} · {{ user.role }}</span>
              </div>
              <div class="user-actions">
                <button class="message-btn" (click)="openMessageModal(user)" title="Send message">💬</button>
                <span class="view-btn" (click)="viewUser(user)">View →</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Messages modal (compose to user, or all messages when selectedUserForMessage is null) -->
      <app-messages-modal
        *ngIf="showMessageModal"
        [toUserId]="selectedUserForMessage?.id"
        [toUserEmail]="selectedUserForMessage?.email"
        [onClose]="closeMessageModal">
      </app-messages-modal>
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
      --padding-top: 80px;
      --padding-bottom: 0;
    }
    :host {
      display: block;
      width: 100%;
      height: 100%;
    }
    .user-management {
      min-height: 100vh;
      background: linear-gradient(135deg, #0f0f23 0%, #1a1a2e 100%);
      padding: 2rem;
      margin: 0;
      width: 100%;
      box-sizing: border-box;
    }
    .header {
      margin-bottom: 2rem;
    }
    .header-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.5rem;
    }
    .all-messages-btn {
      background: rgba(0, 212, 255, 0.1);
      border: 1px solid rgba(0, 212, 255, 0.3);
      border-radius: 6px;
      padding: 0.5rem 1rem;
      color: #00d4ff;
      cursor: pointer;
      font-size: 0.9rem;
      transition: all 0.2s;
    }
    .all-messages-btn:hover {
      background: rgba(0, 212, 255, 0.2);
      border-color: #00d4ff;
    }
    .all-messages-btn {
      position: relative;
    }
    .unread-badge {
      position: absolute;
      top: -6px;
      right: -6px;
      min-width: 18px;
      height: 18px;
      padding: 0 5px;
      background: #e74c3c;
      color: #fff;
      font-size: 0.75rem;
      font-weight: 600;
      border-radius: 9px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
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
      font-size: 2rem;
      color: #fff;
      margin: 0 0 0.5rem 0;
    }
    .subtitle {
      color: rgba(255,255,255,0.6);
      margin: 0;
      font-size: 0.95rem;
    }
    .search-section {
      margin-bottom: 2rem;
    }
    .search-bar {
      --background: rgba(255,255,255,0.05);
      --border-radius: 12px;
      --box-shadow: none;
      --color: #ffffff;
      --placeholder-color: rgba(255,255,255,0.6);
      padding: 0;
    }
    .searching {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-top: 0.5rem;
      color: rgba(255,255,255,0.6);
      font-size: 0.9rem;
    }
    .results-section {
      background: rgba(255,255,255,0.03);
      border-radius: 12px;
      padding: 1rem;
      min-height: 200px;
    }
    .hint, .empty {
      color: rgba(255,255,255,0.5);
      text-align: center;
      padding: 3rem;
    }
    .users-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .user-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem 1.25rem;
      background: rgba(255,255,255,0.05);
      border-radius: 10px;
      cursor: pointer;
      transition: background 0.2s;
    }
    .user-row:hover {
      background: rgba(255,255,255,0.08);
    }
    .user-info {
      display: flex;
      flex-direction: column;
    }
    .user-info .email {
      color: #fff;
      font-weight: 500;
    }
    .user-info .meta {
      color: rgba(255,255,255,0.5);
      font-size: 0.85rem;
      margin-top: 0.25rem;
    }
    .user-actions {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .message-btn {
      background: rgba(0, 212, 255, 0.1);
      border: 1px solid rgba(0, 212, 255, 0.3);
      border-radius: 6px;
      padding: 0.5rem 0.75rem;
      color: #00d4ff;
      cursor: pointer;
      font-size: 1rem;
      transition: all 0.2s;
    }
    .message-btn:hover {
      background: rgba(0, 212, 255, 0.2);
      border-color: #00d4ff;
    }
    .view-btn {
      color: #00d4ff;
      font-size: 0.9rem;
    }
  `],
})
export class UserManagementComponent implements OnInit, OnDestroy {
  searchQuery = '';
  users: UserSearchResult[] = [];
  searching = false;
  showMessageModal = false;
  selectedUserForMessage: UserSearchResult | null = null;
  unreadCount = 0;
  private searchSubject = new Subject<string>();
  private destroy$ = new Subject<void>();

  constructor(
    private userMgmt: UserManagementService,
    private messagesService: MessagesService,
    private authService: AuthService,
    private wsService: WebSocketService,
    private router: Router,
    private route: ActivatedRoute,
  ) {}

  ngOnInit() {
    const userId = this.authService.getUserId();
    if (userId) {
      this.wsService.connect();
      this.wsService.joinUserRoom(userId);
      this.loadUnreadCount();
      this.wsService.newMessage$.pipe(takeUntil(this.destroy$)).subscribe(() => this.loadUnreadCount());
    }
    this.searchSubject
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((q) => {
          this.searching = true;
          return this.userMgmt.searchUsers(q);
        }),
      )
      .subscribe({
        next: (result) => {
          this.users = result;
          this.searching = false;
        },
        error: () => {
          this.searching = false;
          this.users = [];
        },
      });
  }

  onSearchInput(event: CustomEvent) {
    const value = (event.detail?.value ?? (event.target && (event.target as any).value) ?? '') as string;
    this.searchQuery = value;
    this.searchSubject.next(this.searchQuery);
  }

  viewUser(user: UserSearchResult) {
    this.router.navigate(['/super-admin/user-management', user.id]);
  }

  goBack() {
    this.router.navigate(['/super-admin']);
  }

  openMessageModal(user: UserSearchResult) {
    this.selectedUserForMessage = user;
    this.showMessageModal = true;
  }

  /** Open modal in "all messages" view (Received / Sent tabs). */
  openAllMessagesModal() {
    this.selectedUserForMessage = null;
    this.showMessageModal = true;
  }

  closeMessageModal = () => {
    this.showMessageModal = false;
    this.selectedUserForMessage = null;
    this.loadUnreadCount();
  };

  private loadUnreadCount() {
    this.messagesService.getUnreadCount().subscribe({
      next: (res) => { this.unreadCount = res.count; },
      error: () => { this.unreadCount = 0; },
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
