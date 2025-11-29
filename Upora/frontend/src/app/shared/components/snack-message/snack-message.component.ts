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
        <div class="snack-text">{{ currentMessage.content }}</div>
        <button class="snack-close" (click)="close()" title="Close">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M16 1.41L14.59 0L8 6.59L1.41 0L0 1.41L6.59 8L0 14.59L1.41 16L8 9.41L14.59 16L16 14.59L9.41 8L16 1.41Z"/>
          </svg>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .snack-message {
      position: fixed;
      bottom: 20px; /* Bottom center of viewport */
      left: 50%;
      transform: translateX(-50%) translateY(100px);
      z-index: 99999; /* Very high z-index to appear above everything including fullscreen */
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
      border: 2px solid #00d4ff;
      border-radius: 12px;
      padding: 1rem 1.25rem;
      display: flex;
      align-items: center;
      gap: 1rem;
      box-shadow: 0 8px 32px rgba(0, 212, 255, 0.3);
      backdrop-filter: blur(10px);
    }

    .snack-icon {
      font-size: 1.5rem;
      flex-shrink: 0;
    }

    .snack-text {
      flex: 1;
      color: #ffffff;
      font-size: 0.9375rem;
      line-height: 1.5;
      word-wrap: break-word;
    }

    .snack-close {
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 6px;
      width: 28px;
      height: 28px;
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

    /* Mobile adjustments */
    @media (max-width: 768px) {
      .snack-message {
        bottom: 20px;
        max-width: calc(100% - 2rem);
        left: 1rem;
        right: 1rem;
        transform: translateY(100px);
      }

      .snack-message.show {
        transform: translateY(0);
      }

      .snack-content {
        padding: 0.875rem 1rem;
      }

      .snack-text {
        font-size: 0.875rem;
      }
    }

    /* Animation */
    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateX(-50%) translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateX(-50%) translateY(0);
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
}

