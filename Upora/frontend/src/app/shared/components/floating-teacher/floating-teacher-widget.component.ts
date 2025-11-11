import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface ScriptBlock {
  text: string;
  estimatedDuration?: number; // seconds
  voiceConfig?: {
    speed?: number;
    pitch?: number;
    voice?: string;
  };
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date;
}

@Component({
  selector: 'app-floating-teacher-widget',
  standalone: true,
  imports: [CommonModule, FormsModule],
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

        <!-- Current Script (if playing) -->
        <div *ngIf="currentScript" class="current-script">
          <div class="script-label">📜 Script:</div>
          <div class="script-text">{{ currentScript.text }}</div>
        </div>

        <!-- Chat History -->
        <div class="chat-history" #chatHistory>
          <div *ngIf="chatMessages.length === 0" class="no-messages">
            <span class="muted-text">Ask me anything about this lesson!</span>
          </div>
          <div *ngFor="let msg of chatMessages" 
               [class.user-message]="msg.role === 'user'"
               [class.ai-message]="msg.role === 'assistant'"
               class="message">
            <div class="message-content">
              <div class="message-icon">{{ msg.role === 'user' ? '👤' : '👨‍🏫' }}</div>
              <div class="message-text">{{ msg.content }}</div>
            </div>
          </div>
          <div *ngIf="isAITyping" class="ai-message message">
            <div class="message-content">
              <div class="message-icon">👨‍🏫</div>
              <div class="message-text typing-indicator">
                <span></span><span></span><span></span>
              </div>
            </div>
          </div>
        </div>

        <!-- Chat Input -->
        <div class="chat-input-container">
          <button 
            class="raise-hand-btn"
            (click)="raiseHand()"
            title="Raise Hand">
            ✋
          </button>
          <input 
            type="text"
            [(ngModel)]="chatInput"
            (keydown.enter)="sendMessage()"
            placeholder="Ask the AI teacher..."
            class="chat-input"
            [disabled]="!isConnected">
          <button 
            class="send-btn"
            (click)="sendMessage()"
            [disabled]="!chatInput.trim() || !isConnected"
            title="Send">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
            </svg>
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

    /* Current Script Banner */
    .current-script {
      padding: 1rem;
      background: rgba(0, 212, 255, 0.1);
      border-bottom: 1px solid rgba(0, 212, 255, 0.2);
    }

    .script-label {
      font-size: 0.75rem;
      color: rgba(255, 255, 255, 0.6);
      margin-bottom: 0.5rem;
      font-weight: 600;
    }

    .script-text {
      font-size: 0.875rem;
      line-height: 1.5;
      color: #ffffff;
      white-space: pre-wrap;
    }

    /* Chat History */
    .chat-history {
      padding: 1rem;
      min-height: 200px;
      max-height: 350px;
      overflow-y: auto;
      background: rgba(0, 0, 0, 0.2);
    }

    .no-messages {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 200px;
      text-align: center;
    }

    .muted-text {
      color: rgba(255, 255, 255, 0.4);
      font-style: italic;
      font-size: 0.875rem;
    }

    .message {
      margin-bottom: 1rem;
    }

    .message-content {
      display: flex;
      gap: 0.75rem;
      align-items: flex-start;
    }

    .message-icon {
      font-size: 1.5rem;
      flex-shrink: 0;
      line-height: 1;
    }

    .message-text {
      flex: 1;
      padding: 0.75rem 1rem;
      border-radius: 12px;
      font-size: 0.875rem;
      line-height: 1.5;
      white-space: pre-wrap;
    }

    .user-message .message-text {
      background: linear-gradient(135deg, #ff3b3f 0%, #e02f33 100%);
      color: #ffffff;
    }

    .ai-message .message-text {
      background: rgba(255, 255, 255, 0.1);
      color: #ffffff;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }

    /* Typing Indicator */
    .typing-indicator {
      display: flex;
      gap: 0.25rem;
      padding: 0.5rem 1rem !important;
    }

    .typing-indicator span {
      width: 8px;
      height: 8px;
      background: rgba(255, 255, 255, 0.6);
      border-radius: 50%;
      animation: typingDot 1.4s infinite;
    }

    .typing-indicator span:nth-child(2) {
      animation-delay: 0.2s;
    }

    .typing-indicator span:nth-child(3) {
      animation-delay: 0.4s;
    }

    @keyframes typingDot {
      0%, 60%, 100% { opacity: 0.3; transform: scale(0.8); }
      30% { opacity: 1; transform: scale(1); }
    }

    /* Chat Input */
    .chat-input-container {
      display: flex;
      gap: 0.5rem;
      padding: 1rem;
      border-top: 1px solid rgba(0, 212, 255, 0.2);
      background: rgba(0, 0, 0, 0.3);
    }

    .raise-hand-btn {
      width: 44px;
      height: 44px;
      background: rgba(255, 184, 0, 0.2);
      border: 1px solid rgba(255, 184, 0, 0.4);
      border-radius: 8px;
      font-size: 1.5rem;
      cursor: pointer;
      transition: all 0.2s ease;
      flex-shrink: 0;
    }

    .raise-hand-btn:hover {
      background: rgba(255, 184, 0, 0.3);
      transform: scale(1.05);
    }

    .chat-input {
      flex: 1;
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 8px;
      padding: 0.75rem 1rem;
      color: #ffffff;
      font-size: 0.875rem;
    }

    .chat-input::placeholder {
      color: rgba(255, 255, 255, 0.4);
    }

    .chat-input:focus {
      outline: none;
      border-color: #00d4ff;
      background: rgba(255, 255, 255, 0.15);
    }

    .chat-input:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .send-btn {
      width: 44px;
      height: 44px;
      background: linear-gradient(135deg, #00d4ff 0%, #0099cc 100%);
      border: none;
      border-radius: 8px;
      color: #ffffff;
      cursor: pointer;
      transition: all 0.2s ease;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .send-btn:hover:not(:disabled) {
      transform: scale(1.05);
      box-shadow: 0 4px 12px rgba(0, 212, 255, 0.4);
    }

    .send-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
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
  @Input() chatMessages: ChatMessage[] = [];
  @Input() isAITyping: boolean = false;
  @Input() isConnected: boolean = false;
  
  @Output() play = new EventEmitter<void>();
  @Output() pause = new EventEmitter<void>();
  @Output() skipRequested = new EventEmitter<void>();
  @Output() closed = new EventEmitter<void>();
  @Output() sendChat = new EventEmitter<string>();
  @Output() raiseHandClicked = new EventEmitter<void>();

  isPlaying = false;
  isMinimized = false;
  isHidden = false;
  chatInput = '';

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
    this.skipRequested.emit();
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

  sendMessage() {
    if (!this.chatInput.trim() || !this.isConnected) return;
    
    this.sendChat.emit(this.chatInput.trim());
    this.chatInput = '';
  }

  raiseHand() {
    this.raiseHandClicked.emit();
  }
}

