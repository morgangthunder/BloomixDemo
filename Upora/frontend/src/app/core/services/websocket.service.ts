import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../../environments/environment';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  userId?: string;
  tokensUsed?: number;
}

/**
 * WebSocket Service - Manages Socket.io connection for real-time features
 */
@Injectable({
  providedIn: 'root',
})
export class WebSocketService {
  private socket: Socket | null = null;
  private connectedSubject = new BehaviorSubject<boolean>(false);
  private messagesSubject = new BehaviorSubject<ChatMessage[]>([]);
  private typingSubject = new BehaviorSubject<boolean>(false);
  private tokenUsageSubject = new BehaviorSubject<number>(0);

  // Observables
  connected$ = this.connectedSubject.asObservable();
  messages$ = this.messagesSubject.asObservable();
  typing$ = this.typingSubject.asObservable();
  tokenUsage$ = this.tokenUsageSubject.asObservable();

  private currentLessonId: string | null = null;
  private currentUserId: string | null = null;
  private currentTenantId: string | null = null;

  constructor() {
    console.log('[WebSocketService] Service initialized');
  }

  /**
   * Connect to WebSocket server
   */
  connect(): void {
    if (this.socket?.connected) {
      console.log('[WebSocketService] Already connected');
      return;
    }

    console.log('[WebSocketService] Connecting to:', environment.wsUrl);

    this.socket = io(environment.wsUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.setupEventListeners();
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    if (this.socket) {
      console.log('[WebSocketService] Disconnecting...');
      this.socket.disconnect();
      this.socket = null;
      this.connectedSubject.next(false);
      this.currentLessonId = null;
    }
  }

  /**
   * Join a lesson room for chat
   */
  joinLesson(lessonId: string, userId: string, tenantId: string): void {
    if (!this.socket) {
      this.connect();
    }

    this.currentLessonId = lessonId;
    this.currentUserId = userId;
    this.currentTenantId = tenantId;

    console.log(`[WebSocketService] Joining lesson ${lessonId}`);

    this.socket?.emit('join-lesson', {
      lessonId,
      userId,
      tenantId,
    });

    // Clear previous messages
    this.messagesSubject.next([]);
  }

  /**
   * Leave current lesson room
   */
  leaveLesson(): void {
    if (this.currentLessonId && this.socket) {
      console.log(`[WebSocketService] Leaving lesson ${this.currentLessonId}`);

      this.socket.emit('leave-lesson', {
        lessonId: this.currentLessonId,
        userId: this.currentUserId,
        tenantId: this.currentTenantId,
      });

      this.currentLessonId = null;
      this.messagesSubject.next([]);
    }
  }

  /**
   * Send a chat message
   */
  sendMessage(message: string): void {
    if (!this.socket || !this.currentLessonId) {
      console.error('[WebSocketService] Cannot send message - not connected to lesson');
      return;
    }

    console.log(`[WebSocketService] Sending message: ${message.substring(0, 50)}...`);

    // Send to server (server will echo back the user message)
    this.socket.emit('send-message', {
      lessonId: this.currentLessonId,
      userId: this.currentUserId,
      tenantId: this.currentTenantId,
      message,
      timestamp: new Date(),
    });
  }

  /**
   * Setup Socket.io event listeners
   */
  private setupEventListeners(): void {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      console.log('[WebSocketService] ✅ Connected to server');
      this.connectedSubject.next(true);
    });

    this.socket.on('disconnect', (reason: string) => {
      console.log(`[WebSocketService] ❌ Disconnected: ${reason}`);
      this.connectedSubject.next(false);
    });

    this.socket.on('connect_error', (error: any) => {
      console.error('[WebSocketService] Connection error:', error);
      this.connectedSubject.next(false);
    });

    // Lesson room events
    this.socket.on('joined-lesson', (data: any) => {
      console.log('[WebSocketService] ✅ Joined lesson room:', data);
    });

    // Chat message events
    this.socket.on('message', (message: ChatMessage) => {
      console.log('[WebSocketService] 💬 Received message:', message.role, message.content.substring(0, 50));
      
      const currentMessages = this.messagesSubject.value;
      this.messagesSubject.next([...currentMessages, message]);
    });

    // AI typing indicator
    this.socket.on('ai-typing', (data: { typing: boolean }) => {
      console.log('[WebSocketService] ⌨️  AI typing:', data.typing);
      this.typingSubject.next(data.typing);
    });

    // Token usage updates
    this.socket.on('token-usage', (data: { tokensUsed: number }) => {
      console.log('[WebSocketService] 🎟️  Tokens used:', data.tokensUsed);
      const current = this.tokenUsageSubject.value;
      this.tokenUsageSubject.next(current + data.tokensUsed);
    });

    // Error events
    this.socket.on('error', (error: any) => {
      console.error('[WebSocketService] ❌ Error:', error);
    });
  }

  /**
   * Get current connection status
   */
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  /**
   * Get current messages
   */
  getMessages(): ChatMessage[] {
    return this.messagesSubject.value;
  }

  /**
   * Clear chat history
   */
  clearMessages(): void {
    this.messagesSubject.next([]);
  }
}

