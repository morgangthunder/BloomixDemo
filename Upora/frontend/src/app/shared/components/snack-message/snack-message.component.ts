import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SnackMessageService, SnackMessage } from '../../../core/services/snack-message.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-snack-message',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="currentMessage" 
         class="snack-message"
         [class.show]="currentMessage">
      <div class="snack-content">
        <div class="snack-icon">💬</div>
        <div class="snack-body">
          <div class="snack-text">{{ currentMessage.content }}</div>
          <div *ngIf="currentMessage.actions?.length" class="snack-actions">
            <button *ngFor="let action of currentMessage.actions"
                    class="snack-action-btn"
                    (click)="onActionClick(action)">{{ action }}</button>
          </div>
        </div>
        <button class="snack-close" (click)="close()" title="Close">
          <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
            <path d="M16 1.41L14.59 0L8 6.59L1.41 0L0 1.41L6.59 8L0 14.59L1.41 16L8 9.41L14.59 16L16 14.59L9.41 8L16 1.41Z"/>
          </svg>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .snack-message {
      position: fixed;
      bottom: 70px;
      left: calc(50% + 100px);
      transform: translateX(-50%) translateY(100px);
      z-index: 99999;
      max-width: 90%;
      width: 100%;
      max-width: 600px;
      opacity: 0;
      pointer-events: none;
      transition: all 0.3s ease;
    }

    .snack-message.show {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
      pointer-events: all;
    }

    .snack-content {
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      border: 1px solid #00d4ff;
      border-radius: 10px;
      padding: 0.5rem 0.75rem;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      box-shadow: 0 4px 16px rgba(0, 212, 255, 0.25);
      backdrop-filter: blur(10px);
    }

    .snack-icon {
      font-size: 1rem;
      flex-shrink: 0;
    }

    .snack-body {
      flex: 1;
      min-width: 0;
      text-align: center;
    }

    .snack-text {
      color: #ffffff;
      font-size: 0.715rem;
      line-height: 1.4;
      word-wrap: break-word;
    }

    .snack-actions {
      display: flex;
      gap: 8px;
      margin-top: 6px;
      flex-wrap: wrap;
      justify-content: center;
    }

    .snack-action-btn {
      padding: 2px 10px;
      border-radius: 5px;
      background: rgba(0, 212, 255, 0.15);
      border: 1px solid rgba(0, 212, 255, 0.4);
      color: #00d4ff;
      cursor: pointer;
      font-size: 0.6rem;
      font-weight: 600;
      transition: all 0.15s ease;
    }

    .snack-action-btn:hover {
      background: rgba(0, 212, 255, 0.3);
      border-color: #00d4ff;
    }

    .snack-close {
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 5px;
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: rgba(255, 255, 255, 0.7);
      cursor: pointer;
      transition: all 0.2s ease;
      flex-shrink: 0;
    }

    .snack-close:hover {
      background: rgba(255, 255, 255, 0.2);
      color: #ffffff;
      border-color: rgba(255, 255, 255, 0.4);
    }

    @media (max-width: 768px) {
      .snack-message {
        bottom: 70px;
        max-width: calc(100% - 2rem);
        left: 1rem;
        right: 1rem;
        transform: translateY(100px);
      }

      .snack-message.show {
        transform: translateY(0);
      }

      .snack-content {
        padding: 0.4rem 0.6rem;
      }

      .snack-text {
        font-size: 0.66rem;
      }
    }
  `],
})
export class SnackMessageComponent implements OnInit, OnDestroy {
  currentMessage: SnackMessage | null = null;
  private subscription?: Subscription;

  constructor(private snackService: SnackMessageService) {}

  ngOnInit() {
    console.log('[SnackMessageComponent] ✅ Component initialized');
    this.subscription = this.snackService.currentMessage.subscribe(
      (message) => {
        console.log('[SnackMessageComponent] 📨 Received message:', message ? message.content.substring(0, 50) + '...' : 'null');
        this.currentMessage = message;
      }
    );
  }

  ngOnDestroy() {
    this.subscription?.unsubscribe();
  }

  close() {
    this.snackService.hide();
  }

  onActionClick(action: string) {
    this.snackService.onAction(action);
  }
}

