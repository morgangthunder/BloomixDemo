import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface ScriptBlock {
  text: string;
  estimatedDuration?: number; // seconds
  voiceConfig?: {
    speed?: number;
    pitch?: number;
    voice?: string;
  };
}

@Component({
  selector: 'app-floating-teacher-widget',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="teacher-widget" [class.minimized]="isMinimized" [class.hidden]="isHidden">
      <!-- Minimized State -->
      <div *ngIf="isMinimized" class="teacher-icon-minimized" (click)="restore()">
        <div class="avatar">👨‍🏫</div>
        <div *ngIf="isPlaying" class="speaking-indicator">...</div>
      </div>

      <!-- Expanded State -->
      <div *ngIf="!isMinimized" class="teacher-card">
        <!-- Header -->
        <div class="teacher-header">
          <div class="teacher-avatar" [class.speaking]="isPlaying">
            <span class="avatar-emoji">👨‍🏫</span>
          </div>
          <div class="teacher-title">AI Teacher</div>
          <div class="header-controls">
            <button class="control-btn" (click)="minimize()" title="Minimize">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <rect x="3" y="7" width="10" height="2" rx="1"/>
              </svg>
            </button>
            <button class="control-btn" (click)="close()" title="Close">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- Speech Bubble -->
        <div class="speech-bubble" [class.empty]="!currentScript">
          <div *ngIf="currentScript" class="script-text">
            {{ currentScript.text }}
          </div>
          <div *ngIf="!currentScript" class="no-script">
            <span class="muted-text">Ready to teach...</span>
          </div>
        </div>

        <!-- Controls -->
        <div class="teacher-controls">
          <button 
            class="control-button"
            (click)="togglePlay()"
            [disabled]="!currentScript"
            [title]="isPlaying ? 'Pause' : 'Play'">
            <span *ngIf="!isPlaying">▶️ Play</span>
            <span *ngIf="isPlaying">⏸️ Pause</span>
          </button>
          <button 
            class="control-button secondary"
            (click)="skip()"
            [disabled]="!currentScript"
            title="Skip current script">
            ⏭️ Skip
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .teacher-widget {
      position: fixed;
      bottom: 2rem;
      right: 2rem;
      z-index: 1000;
      transition: all 0.3s ease;
    }

    .teacher-widget.hidden {
      opacity: 0;
      pointer-events: none;
    }

    /* Minimized State */
    .teacher-icon-minimized {
      width: 80px;
      height: 80px;
      background: linear-gradient(135deg, #00d4ff 0%, #0099cc 100%);
      border-radius: 50%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0, 212, 255, 0.4);
      transition: all 0.3s ease;
    }

    .teacher-icon-minimized:hover {
      transform: scale(1.1);
      box-shadow: 0 6px 20px rgba(0, 212, 255, 0.6);
    }

    .teacher-icon-minimized .avatar {
      font-size: 2.5rem;
      line-height: 1;
    }

    .speaking-indicator {
      position: absolute;
      bottom: -5px;
      background: rgba(255, 255, 255, 0.9);
      color: #0099cc;
      padding: 2px 8px;
      border-radius: 10px;
      font-size: 0.75rem;
      font-weight: 600;
      animation: pulse 1.5s ease-in-out infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.7; transform: scale(0.95); }
    }

    /* Expanded State */
    .teacher-card {
      width: 400px;
      max-width: calc(100vw - 4rem);
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      border: 2px solid rgba(0, 212, 255, 0.3);
      border-radius: 16px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
      overflow: hidden;
      animation: slideUp 0.3s ease;
    }

    @keyframes slideUp {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    /* Header */
    .teacher-header {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 1rem;
      background: rgba(0, 212, 255, 0.1);
      border-bottom: 1px solid rgba(0, 212, 255, 0.2);
    }

    .teacher-avatar {
      width: 48px;
      height: 48px;
      background: linear-gradient(135deg, #00d4ff 0%, #0099cc 100%);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      transition: all 0.3s ease;
    }

    .teacher-avatar.speaking {
      animation: avatarPulse 1.5s ease-in-out infinite;
    }

    @keyframes avatarPulse {
      0%, 100% { transform: scale(1); box-shadow: 0 0 0 rgba(0, 212, 255, 0.4); }
      50% { transform: scale(1.05); box-shadow: 0 0 20px rgba(0, 212, 255, 0.8); }
    }

    .avatar-emoji {
      font-size: 1.75rem;
      line-height: 1;
    }

    .teacher-title {
      flex: 1;
      font-size: 1rem;
      font-weight: 700;
      color: #ffffff;
    }

    .header-controls {
      display: flex;
      gap: 0.5rem;
    }

    .control-btn {
      width: 32px;
      height: 32px;
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: rgba(255, 255, 255, 0.7);
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .control-btn:hover {
      background: rgba(255, 255, 255, 0.2);
      color: #ffffff;
      border-color: rgba(255, 255, 255, 0.4);
    }

    /* Speech Bubble */
    .speech-bubble {
      padding: 1.5rem;
      min-height: 100px;
      max-height: 300px;
      overflow-y: auto;
    }

    .speech-bubble.empty {
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .script-text {
      font-size: 1rem;
      line-height: 1.6;
      color: #ffffff;
      white-space: pre-wrap;
    }

    .no-script {
      text-align: center;
    }

    .muted-text {
      color: rgba(255, 255, 255, 0.4);
      font-style: italic;
    }

    /* Controls */
    .teacher-controls {
      display: flex;
      gap: 0.75rem;
      padding: 1rem;
      border-top: 1px solid rgba(0, 212, 255, 0.2);
      background: rgba(0, 0, 0, 0.2);
    }

    .control-button {
      flex: 1;
      padding: 0.75rem 1rem;
      background: linear-gradient(135deg, #00d4ff 0%, #0099cc 100%);
      border: none;
      border-radius: 8px;
      color: #ffffff;
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .control-button:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 212, 255, 0.4);
    }

    .control-button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .control-button.secondary {
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
    }

    .control-button.secondary:hover:not(:disabled) {
      background: rgba(255, 255, 255, 0.2);
      box-shadow: 0 4px 12px rgba(255, 255, 255, 0.2);
    }

    /* Mobile Responsive */
    @media (max-width: 768px) {
      .teacher-widget {
        bottom: 1rem;
        right: 1rem;
      }

      .teacher-card {
        width: calc(100vw - 2rem);
      }

      .teacher-icon-minimized {
        width: 64px;
        height: 64px;
      }

      .teacher-icon-minimized .avatar {
        font-size: 2rem;
      }
    }

    /* Scrollbar Styling */
    .speech-bubble::-webkit-scrollbar {
      width: 6px;
    }

    .speech-bubble::-webkit-scrollbar-track {
      background: rgba(255, 255, 255, 0.05);
      border-radius: 3px;
    }

    .speech-bubble::-webkit-scrollbar-thumb {
      background: rgba(0, 212, 255, 0.3);
      border-radius: 3px;
    }

    .speech-bubble::-webkit-scrollbar-thumb:hover {
      background: rgba(0, 212, 255, 0.5);
    }
  `]
})
export class FloatingTeacherWidgetComponent implements OnChanges {
  @Input() currentScript: ScriptBlock | null = null;
  @Input() autoPlay: boolean = true;
  
  @Output() play = new EventEmitter<void>();
  @Output() pause = new EventEmitter<void>();
  @Output() skip = new EventEmitter<void>();
  @Output() closed = new EventEmitter<void>();

  isPlaying = false;
  isMinimized = false;
  isHidden = false;

  ngOnChanges(changes: SimpleChanges) {
    if (changes['currentScript']) {
      const newScript = changes['currentScript'].currentValue;
      const oldScript = changes['currentScript'].previousValue;
      
      // Auto-restore and auto-play when new script arrives
      if (newScript && newScript !== oldScript) {
        this.isHidden = false;
        this.isMinimized = false;
        
        if (this.autoPlay) {
          this.isPlaying = true;
          this.play.emit();
        }
      }
      
      // Hide when script is cleared
      if (!newScript && oldScript) {
        this.isPlaying = false;
      }
    }
  }

  togglePlay() {
    if (!this.currentScript) return;
    
    this.isPlaying = !this.isPlaying;
    
    if (this.isPlaying) {
      this.play.emit();
    } else {
      this.pause.emit();
    }
  }

  skip() {
    if (!this.currentScript) return;
    
    this.isPlaying = false;
    this.skip.emit();
  }

  minimize() {
    this.isMinimized = true;
  }

  restore() {
    this.isMinimized = false;
  }

  close() {
    this.isHidden = true;
    this.isPlaying = false;
    this.closed.emit();
  }
}

