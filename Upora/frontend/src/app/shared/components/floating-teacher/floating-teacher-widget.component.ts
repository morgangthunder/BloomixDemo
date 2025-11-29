import { Component, Input, Output, EventEmitter, OnChanges, OnDestroy, SimpleChanges, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
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
  role: 'user' | 'assistant' | 'error';
  content: string;
  timestamp?: Date;
  isError?: boolean;
}

@Component({
  selector: 'app-floating-teacher-widget',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="teacher-widget" 
         [class.minimized]="isMinimized" 
         [class.hidden]="isHidden"
         [class.draggable]="isDraggable"
         [style.left.px]="isDraggable && widgetLeft > 0 ? widgetLeft : null"
         [style.top.px]="isDraggable && widgetTop > 0 ? widgetTop : null">
      <!-- Minimized State -->
      <div *ngIf="isMinimized" class="teacher-icon-minimized" (click)="restore()">
        <div class="avatar">🎓</div>
        <div *ngIf="isPlaying" class="speaking-indicator">...</div>
      </div>

      <!-- Expanded State -->
      <div *ngIf="!isMinimized" class="teacher-card">
        <!-- Header -->
        <div class="teacher-header"
             [class.draggable-header]="isDraggable"
             (mousedown)="startDrag($event)"
             (touchstart)="startDrag($event)">
          <div class="teacher-avatar" [class.speaking]="isPlaying" (click)="onAvatarClick($event)" [title]="isDraggable ? 'Hold to drag' : 'Minimize'">
            <span class="avatar-emoji">🎓</span>
          </div>
          <div class="teacher-title">AI Teacher</div>
          <div class="header-controls">
            <button class="control-btn" (click)="close()" title="Minimize">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <rect x="3" y="7" width="10" height="2" rx="1"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- Current Script (if playing) -->
        <div *ngIf="currentScript" class="current-script">
          <div class="script-header">
            <div class="script-label">📜 Script:</div>
            <button class="script-close-btn" (click)="closeScript()" title="Close script">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                <path d="M14 1.41L12.59 0L7 5.59L1.41 0L0 1.41L5.59 7L0 12.59L1.41 14L7 8.41L12.59 14L14 12.59L8.41 7L14 1.41Z"/>
              </svg>
            </button>
          </div>
          <div class="script-text">{{ currentScript.text }}</div>
        </div>

        <!-- Chat History -->
        <div class="chat-history" #chatHistory>
          <div *ngIf="chatMessages.length === 0" class="no-messages">
            <span class="muted-text">Ask me anything about this lesson!</span>
          </div>
          <div *ngFor="let msg of chatMessages; let i = index" 
               [class.user-message]="msg.role === 'user'"
               [class.ai-message]="msg.role === 'assistant'"
               [class.error-message]="msg.role === 'error' || msg.isError"
               class="message"
               [attr.data-message-index]="i">
            <div class="message-content">
              <div class="message-icon">{{ msg.role === 'user' ? '👤' : msg.role === 'error' ? '⚠️' : '👨‍🏫' }}</div>
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
            [disabled]="!isConnected"
            [maxlength]="2000"
            [title]="chatInput.length >= 1900 ? 'Character limit: ' + chatInput.length + '/2000' : ''">
          <div *ngIf="chatInput.length >= 1900" class="char-count-warning">
            {{ chatInput.length }}/2000
          </div>
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
      z-index: 10001; /* Always above fullscreen and header */
      max-height: calc(100vh - 8rem); /* Prevent going above header */
      transition: all 0.3s ease;
    }

    .teacher-widget.draggable {
      bottom: auto !important;
      right: auto !important;
      transition: none; /* Disable transitions when dragging */
    }

    .teacher-widget.hidden {
      opacity: 0;
      pointer-events: none;
    }

    .draggable-header {
      cursor: move;
      cursor: grab;
    }

    .draggable-header:active {
      cursor: grabbing;
    }

    /* Minimized State */
    .teacher-icon-minimized {
      width: 80px;
      height: 80px;
      background: #000000;
      border: 2px solid #ff3b3f;
      border-radius: 50%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(255, 59, 63, 0.4);
      transition: all 0.3s ease;
    }

    .teacher-icon-minimized:hover {
      transform: scale(1.1);
      box-shadow: 0 6px 20px rgba(255, 59, 63, 0.6);
      background: #1a1a1a;
    }

    .teacher-icon-minimized .avatar {
      font-size: 2.5rem;
      line-height: 1;
    }

    .speaking-indicator {
      position: absolute;
      bottom: -5px;
      background: #ff3b3f;
      color: #ffffff;
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
      background: #000000;
      border: 2px solid #ff3b3f;
      border-radius: 16px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.8);
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
      background: #1a1a1a;
      border-bottom: 1px solid #333333;
    }

    .teacher-avatar {
      width: 48px;
      height: 48px;
      background: #ff3b3f;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      transition: all 0.3s ease;
      cursor: pointer;
    }

    .teacher-avatar:hover {
      transform: scale(1.05);
      box-shadow: 0 0 12px rgba(255, 59, 63, 0.6);
    }

    .teacher-avatar.speaking {
      animation: avatarPulse 1.5s ease-in-out infinite;
    }

    @keyframes avatarPulse {
      0%, 100% { transform: scale(1); box-shadow: 0 0 0 rgba(255, 59, 63, 0.4); }
      50% { transform: scale(1.05); box-shadow: 0 0 20px rgba(255, 59, 63, 0.8); }
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
      background: #1a1a1a;
      border-bottom: 1px solid #333333;
    }

    .script-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.5rem;
    }

    .script-label {
      font-size: 0.75rem;
      color: rgba(255, 255, 255, 0.6);
      font-weight: 600;
    }

    .script-close-btn {
      width: 24px;
      height: 24px;
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 4px;
      color: rgba(255, 255, 255, 0.6);
      cursor: pointer;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .script-close-btn:hover {
      background: #ff3b3f;
      border-color: #ff3b3f;
      color: #ffffff;
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
      background: #0a0a0a;
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
      background: #ff3b3f;
      color: #ffffff;
    }

    .ai-message .message-text {
      background: #1a1a1a;
      color: #ffffff;
      border: 1px solid #333333;
    }

    .error-message .message-text {
      background: rgba(255, 59, 63, 0.1);
      color: #ff6b6b;
      border: 1px solid rgba(255, 59, 63, 0.3);
    }

    .error-message .message-icon {
      color: #ff6b6b;
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
      border-top: 1px solid #333333;
      background: #0a0a0a;
      position: relative;
    }

    .char-count-warning {
      position: absolute;
      bottom: 4px;
      right: 50px;
      font-size: 11px;
      color: #ff9800;
      font-weight: 500;
      z-index: 10;
    }

    .raise-hand-btn {
      width: 44px;
      height: 44px;
      background: #1a1a1a;
      border: 1px solid #333333;
      border-radius: 8px;
      font-size: 1.5rem;
      cursor: pointer;
      transition: all 0.2s ease;
      flex-shrink: 0;
    }

    .raise-hand-btn:hover {
      background: #ff3b3f;
      border-color: #ff3b3f;
      transform: scale(1.05);
    }

    .chat-input {
      flex: 1;
      background: #1a1a1a;
      border: 1px solid #333333;
      border-radius: 8px;
      padding: 0.75rem 1rem;
      color: #ffffff;
      font-size: 0.875rem;
    }

    .chat-input::placeholder {
      color: #666666;
    }

    .chat-input:focus {
      outline: none;
      border-color: #ff3b3f;
      background: #1a1a1a;
    }

    .chat-input:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .send-btn {
      width: 44px;
      height: 44px;
      background: #ff3b3f;
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
      box-shadow: 0 4px 12px rgba(255, 59, 63, 0.4);
    }

    .send-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* Mobile Responsive */
    @media (max-width: 768px) {
      .teacher-widget {
        bottom: calc(56px + 1rem);
        right: 1rem;
        left: 1rem;
      }

      .teacher-card {
        width: 100%;
        max-height: calc(100vh - 10rem);
        display: flex;
        flex-direction: column;
      }

      .chat-history {
        max-height: calc(100vh - 24rem);
        flex: 1;
      }

      .teacher-icon-minimized {
        width: 64px;
        height: 64px;
      }

      .teacher-icon-minimized .avatar {
        font-size: 2rem;
      }

      .chat-input-container {
        padding: 0.75rem;
      }

      .raise-hand-btn, .send-btn {
        width: 40px;
        height: 40px;
      }

      .chat-input {
        font-size: 0.8125rem;
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
export class FloatingTeacherWidgetComponent implements OnChanges, OnDestroy, AfterViewChecked {
  @Input() currentScript: ScriptBlock | null = null;
  @Input() autoPlay: boolean = true;
  @Input() chatMessages: ChatMessage[] = [];
  @Input() isAITyping: boolean = false;
  @Input() isConnected: boolean = false;
  @Input() isDraggable: boolean = false; // Enable dragging in fullscreen
  
  @Output() play = new EventEmitter<void>();
  @Output() pause = new EventEmitter<void>();
  @Output() skipRequested = new EventEmitter<void>();
  @Output() closed = new EventEmitter<void>();
  @Output() sendChat = new EventEmitter<string>();
  @Output() raiseHandClicked = new EventEmitter<void>();
  @Output() scriptClosed = new EventEmitter<void>();

  // Public methods for programmatic control
  /**
   * Add a message to the chat history programmatically
   */
  addChatMessage(content: string, role: 'user' | 'assistant' | 'error' = 'assistant'): void {
    const message: ChatMessage = {
      role,
      content,
      timestamp: new Date(),
    };
    this.chatMessages = [...this.chatMessages, message];
    this.scrollToBottom();
  }

  /**
   * Show a script block programmatically
   */
  showScript(text: string): void {
    const script: ScriptBlock = {
      text,
      estimatedDuration: 10,
    };
    this.currentScript = script;
    this.isMinimized = false; // Ensure widget is visible
  }

  /**
   * Open/restore the widget if minimized
   */
  openWidget(): void {
    this.isMinimized = false;
    this.isHidden = false;
  }

  @ViewChild('chatHistory') chatHistory?: ElementRef<HTMLDivElement>;

  isPlaying = false;
  isMinimized = false;
  isHidden = false;
  chatInput = '';
  
  // Dragging state
  private isDragging = false;
  private dragStartX = 0;
  private dragStartY = 0;
  widgetLeft = 0; // Public for template binding
  widgetTop = 0;  // Public for template binding
  
  // Track previous message count for auto-scroll
  private previousMessageCount = 0;

  ngAfterViewChecked() {
    // Auto-scroll to show the start of new AI responses
    if (this.chatMessages.length > this.previousMessageCount) {
      const newMessages = this.chatMessages.slice(this.previousMessageCount);
      const lastNewMessage = newMessages[newMessages.length - 1];
      
      // Only auto-scroll if the last new message is from the assistant
      if (lastNewMessage && lastNewMessage.role === 'assistant' && this.chatHistory) {
        setTimeout(() => {
          this.scrollToMessageStart(this.chatMessages.length - 1);
        }, 100);
      }
      
      this.previousMessageCount = this.chatMessages.length;
    }
  }

  private scrollToMessageStart(messageIndex: number) {
    if (!this.chatHistory) return;
    
    const chatElement = this.chatHistory.nativeElement;
    const messageElement = chatElement.querySelector(`[data-message-index="${messageIndex}"]`) as HTMLElement;
    
    if (messageElement) {
      // Scroll to show the start of the message at the top of the visible area
      const chatRect = chatElement.getBoundingClientRect();
      const messageRect = messageElement.getBoundingClientRect();
      const relativeTop = messageRect.top - chatRect.top + chatElement.scrollTop;
      
      chatElement.scrollTop = relativeTop - 10; // 10px padding from top
    }
  }

  /**
   * Scroll chat history to bottom
   */
  scrollToBottom(): void {
    if (this.chatHistory) {
      setTimeout(() => {
        const chatElement = this.chatHistory!.nativeElement;
        chatElement.scrollTop = chatElement.scrollHeight;
      }, 100);
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    console.log('[TeacherWidget] ngOnChanges:', Object.keys(changes));
    
    // Track message count changes
    if (changes['chatMessages']) {
      const oldCount = changes['chatMessages'].previousValue?.length || 0;
      const newCount = changes['chatMessages'].currentValue?.length || 0;
      if (newCount > oldCount) {
        this.previousMessageCount = oldCount;
      }
    }
    
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

    // Initialize drag position when becoming draggable
    if (changes['isDraggable']) {
      console.log('[TeacherWidget] isDraggable changed:', changes['isDraggable'].previousValue, '→', changes['isDraggable'].currentValue);
      
      if (changes['isDraggable'].currentValue && !changes['isDraggable'].previousValue) {
        // Set initial position to bottom-right when fullscreen activates
        this.widgetLeft = window.innerWidth - 420; // 400px width + 20px margin
        this.widgetTop = window.innerHeight - 420; // Approximate height + margin
        console.log('[TeacherWidget] Initialized drag position:', this.widgetLeft, this.widgetTop);
      }

      // Reset position when no longer draggable
      if (!changes['isDraggable'].currentValue && changes['isDraggable'].previousValue) {
        this.widgetLeft = 0;
        this.widgetTop = 0;
        console.log('[TeacherWidget] Reset position to 0, 0');
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
    
    // Enforce character limit (2000 chars)
    const message = this.chatInput.trim().substring(0, 2000);
    this.sendChat.emit(message);
    this.chatInput = '';
  }

  raiseHand() {
    this.raiseHandClicked.emit();
  }

  closeScript() {
    // Don't change isPlaying - parent will handle it
    this.scriptClosed.emit();
  }

  onAvatarClick(event: Event) {
    // If draggable, don't minimize on click (use drag instead)
    if (this.isDraggable) {
      console.log('[TeacherWidget] Avatar click ignored - use drag to move');
      return;
    }
    
    // Otherwise, minimize
    event.stopPropagation();
    this.close();
  }

  startDrag(event: MouseEvent | TouchEvent) {
    if (!this.isDraggable) {
      console.log('[TeacherWidget] Drag disabled - isDraggable:', this.isDraggable);
      return;
    }
    
    // Don't drag if clicking on buttons or input (but allow avatar and title)
    const target = event.target as HTMLElement;
    if (target.tagName === 'BUTTON' || target.closest('button:not(.teacher-avatar)') || target.closest('input')) {
      console.log('[TeacherWidget] Ignoring drag - clicked on:', target.tagName);
      return;
    }
    
    console.log('[TeacherWidget] Starting drag from:', target.className);
    // Don't prevent default on avatar to allow click
    if (!target.closest('.teacher-avatar')) {
      event.preventDefault();
    }
    this.isDragging = true;
    
    const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX;
    const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY;
    
    // If first drag, initialize position from current computed position
    if (this.widgetLeft === 0 && this.widgetTop === 0) {
      const rect = (event.currentTarget as HTMLElement).closest('.teacher-widget')?.getBoundingClientRect();
      if (rect) {
        this.widgetLeft = rect.left;
        this.widgetTop = rect.top;
        console.log('[TeacherWidget] Initialized position:', this.widgetLeft, this.widgetTop);
      }
    }
    
    this.dragStartX = clientX - this.widgetLeft;
    this.dragStartY = clientY - this.widgetTop;
    
    console.log('[TeacherWidget] Drag start:', { clientX, clientY, dragStartX: this.dragStartX, dragStartY: this.dragStartY });
    
    // Add global listeners
    document.addEventListener('mousemove', this.onDrag);
    document.addEventListener('mouseup', this.stopDrag);
    document.addEventListener('touchmove', this.onDrag);
    document.addEventListener('touchend', this.stopDrag);
  }

  private onDrag = (event: MouseEvent | TouchEvent) => {
    if (!this.isDragging || !this.isDraggable) return;
    
    const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX;
    const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY;
    
    this.widgetLeft = clientX - this.dragStartX;
    this.widgetTop = clientY - this.dragStartY;
    
    // Keep within viewport bounds
    const maxX = window.innerWidth - 400; // widget width
    const maxY = window.innerHeight - 400; // approx widget height
    
    this.widgetLeft = Math.max(0, Math.min(this.widgetLeft, maxX));
    this.widgetTop = Math.max(0, Math.min(this.widgetTop, maxY));
  }

  private stopDrag = () => {
    this.isDragging = false;
    document.removeEventListener('mousemove', this.onDrag);
    document.removeEventListener('mouseup', this.stopDrag);
    document.removeEventListener('touchmove', this.onDrag);
    document.removeEventListener('touchend', this.stopDrag);
  }

  ngOnDestroy() {
    this.stopDrag();
  }
}

