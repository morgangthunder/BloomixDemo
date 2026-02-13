import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../../environments/environment';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'error';
  content: string;
  timestamp: Date;
  userId?: string;
  tokensUsed?: number;
  isError?: boolean;
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
  private screenshotRequestSubject = new BehaviorSubject<{ message: string; timestamp: Date } | null>(null);
  screenshotRequest$ = this.screenshotRequestSubject.asObservable();
  
  // Interaction AI response events
  private interactionAIResponseSubject = new BehaviorSubject<any>(null);
  interactionAIResponse$ = this.interactionAIResponseSubject.asObservable();

  // Direct message notifications (when someone sends you a message)
  private newMessageSubject = new BehaviorSubject<{
    id: string;
    fromUserId: string;
    toUserId: string;
    title: string;
    body: string;
    createdAt: string;
    fromUser?: { id: string; email: string; username?: string };
  } | null>(null);
  newMessage$ = this.newMessageSubject.asObservable();
  
  // Timeout tracking for AI responses
  private responseTimeout: any = null;
  private readonly RESPONSE_TIMEOUT_MS = 30000; // 30 seconds

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
   * Join user-specific room for direct message notifications.
   * Call after connect() so you receive new_message events when someone messages you.
   */
  joinUserRoom(userId: string): void {
    if (!this.socket) {
      this.connect();
    }
    this.socket?.emit('join-user', { userId }, (ack: any) => {
      if (ack?.success) {
        console.log('[WebSocketService] ✅ Joined user room for notifications');
      }
    });
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
   * Send a chat message with conversation history and lesson data
   */
  sendMessage(
    message: string,
    conversationHistory?: ChatMessage[],
    lessonData?: any,
    screenshot?: string,
    isScreenshotRequest?: boolean,
    currentStageInfo?: any,
    isTimeoutFallback?: boolean,
  ): void {
    if (!this.socket) {
      console.error('[WebSocketService] ❌ Cannot send message - socket not initialized');
      const errorMessage: ChatMessage = {
        role: 'error',
        content: '⚠️ Not connected to server. Please refresh the page and try again.',
        timestamp: new Date(),
        isError: true,
      };
      const currentMessages = this.messagesSubject.value;
      this.messagesSubject.next([...currentMessages, errorMessage]);
      return;
    }
    
    if (!this.currentLessonId) {
      console.error('[WebSocketService] ❌ Cannot send message - not joined to a lesson');
      const errorMessage: ChatMessage = {
        role: 'error',
        content: '⚠️ Not connected to lesson. Please refresh the page and try again.',
        timestamp: new Date(),
        isError: true,
      };
      const currentMessages = this.messagesSubject.value;
      this.messagesSubject.next([...currentMessages, errorMessage]);
      return;
    }
    
    if (!this.socket.connected) {
      console.error('[WebSocketService] ❌ Cannot send message - socket not connected');
      const errorMessage: ChatMessage = {
        role: 'error',
        content: '⚠️ Connection lost. Attempting to reconnect...',
        timestamp: new Date(),
        isError: true,
      };
      const currentMessages = this.messagesSubject.value;
      this.messagesSubject.next([...currentMessages, errorMessage]);
      // Try to reconnect
      this.connect();
      return;
    }

    console.log(`[WebSocketService] 📤 Sending message: ${message.substring(0, 50)}...`);
    console.log(`[WebSocketService] 📤 Socket connected: ${this.socket.connected}`);
    console.log(`[WebSocketService] 📤 Lesson ID: ${this.currentLessonId}`);
    console.log(`[WebSocketService] 📤 User ID: ${this.currentUserId}`);
    console.log(`[WebSocketService] 📤 Tenant ID: ${this.currentTenantId}`);
    console.log(`[WebSocketService] 📤 Conversation history: ${conversationHistory?.length || 0} messages`);
    if (screenshot) {
      console.log(`[WebSocketService] 📤 Including screenshot (${screenshot.length} chars)`);
    }
    if (currentStageInfo) {
      console.log(`[WebSocketService] 📤 Current stage: ${currentStageInfo.stage?.title || 'N/A'}, Sub-stage: ${currentStageInfo.subStage?.title || 'N/A'}`);
    }

    // Format conversation history for backend (exclude current message)
    const formattedHistory = (conversationHistory || []).map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    // Clear any existing timeout
    if (this.responseTimeout) {
      clearTimeout(this.responseTimeout);
      this.responseTimeout = null;
    }

    // Set timeout for AI response
    this.responseTimeout = setTimeout(() => {
      console.warn('[WebSocketService] ⏱️ AI response timeout - no response received within 30 seconds');
      const errorMessage: ChatMessage = {
        role: 'error',
        content: '⚠️ Connection to AI Teacher lost. The AI did not respond within 30 seconds. Please check your connection and try again.',
        timestamp: new Date(),
        isError: true,
      };
      const currentMessages = this.messagesSubject.value;
      this.messagesSubject.next([...currentMessages, errorMessage]);
      this.typingSubject.next(false);
      this.responseTimeout = null;
    }, this.RESPONSE_TIMEOUT_MS);

    // Send to server (server will echo back the user message)
    const payload = {
      lessonId: this.currentLessonId,
      userId: this.currentUserId,
      tenantId: this.currentTenantId,
      message,
      timestamp: new Date(),
      conversationHistory: formattedHistory,
      lessonData: lessonData, // Optional - backend will fetch if not provided
      screenshot: screenshot || null, // Optional - base64 screenshot
      isScreenshotRequest: isScreenshotRequest || false, // True if this is a screenshot response
      currentStageInfo: currentStageInfo, // Current stage and sub-stage the student is viewing
      isTimeoutFallback: isTimeoutFallback || false, // True if this is a timeout fallback resend
    };
    
    console.log(`[WebSocketService] 📤 Emitting 'send-message' with payload:`, {
      lessonId: payload.lessonId,
      userId: payload.userId,
      tenantId: payload.tenantId,
      messageLength: payload.message?.length || 0,
      hasConversationHistory: !!payload.conversationHistory,
      hasLessonData: !!payload.lessonData,
      hasScreenshot: !!payload.screenshot,
      screenshotLength: payload.screenshot?.length || 0,
      isScreenshotRequest: payload.isScreenshotRequest,
      hasCurrentStageInfo: !!payload.currentStageInfo,
    });
    
    this.socket.emit('send-message', payload, (ack: any) => {
      if (ack) {
        console.log(`[WebSocketService] ✅ Server acknowledged message:`, ack);
      }
    });
  }

  /**
   * Capture screenshot of a specific element and return as base64
   */
  async captureScreenshot(elementSelector?: string): Promise<string | null> {
    try {
      // Use html2canvas if available, or fallback to browser screenshot API
      // For now, we'll use a simple approach - the component will handle this
      return null;
    } catch (error) {
      console.error('[WebSocketService] Failed to capture screenshot:', error);
      return null;
    }
  }

  /**
   * Get socket instance (for advanced usage)
   */
  getSocket(): Socket | null {
    return this.socket;
  }

  /**
   * Emit custom event (for interaction events)
   */
  emitCustomEvent(eventName: string, data: any): void {
    if (this.socket?.connected) {
      this.socket.emit(eventName, data);
    } else {
      console.warn('[WebSocketService] Cannot emit event - socket not connected');
    }
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


    this.socket.on('connect_error', (error: any) => {
      console.error('[WebSocketService] Connection error:', error);
      this.connectedSubject.next(false);
    });

    // Lesson room events
    this.socket.on('joined-lesson', (data: any) => {
      console.log('[WebSocketService] ✅ Joined lesson room:', data);
    });

    // Listen for screenshot requests from AI
    this.socket.on('screenshot-request', (data: { message: string; timestamp: Date }) => {
      // Screenshot requested silently - don't log the message content
      console.log('[WebSocketService] 📸 Screenshot requested by AI (silently)');
      this.screenshotRequestSubject.next(data);
    });

    // Chat message events
    this.socket.on('message', (message: ChatMessage) => {
      console.log('[WebSocketService] 💬 Received message:', message.role, message.content.substring(0, 50));
      
      // Clear timeout since we received a response
      if (this.responseTimeout) {
        clearTimeout(this.responseTimeout);
        this.responseTimeout = null;
      }
      
      const currentMessages = this.messagesSubject.value;
      const lastMessage = currentMessages[currentMessages.length - 1];
      const isDuplicate =
        lastMessage &&
        lastMessage.role === message.role &&
        lastMessage.content === message.content;

      if (isDuplicate) {
        console.warn('[WebSocketService] ⚠️ Duplicate message suppressed');
        return;
      }

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

    // Interaction AI response events
    this.socket.on('interaction-ai-response', (data: any) => {
      console.log('[WebSocketService] 🎮 Interaction AI response received:', data);
      this.interactionAIResponseSubject.next(data);
    });

    // Direct message notification (Phase 6.5)
    this.socket.on('new_message', (data: any) => {
      console.log('[WebSocketService] 📬 New direct message:', data?.title);
      this.newMessageSubject.next(data);
    });

    // Error events
    this.socket.on('error', (error: any) => {
      console.error('[WebSocketService] ❌ Error:', error);
      
      // Clear timeout
      if (this.responseTimeout) {
        clearTimeout(this.responseTimeout);
        this.responseTimeout = null;
      }
      
      // Add error message to chat
      const errorMessage: ChatMessage = {
        role: 'error',
        content: '⚠️ Connection error: Unable to communicate with AI Teacher. Please check your connection and try again.',
        timestamp: new Date(),
        isError: true,
      };
      const currentMessages = this.messagesSubject.value;
      this.messagesSubject.next([...currentMessages, errorMessage]);
      this.typingSubject.next(false);
    });

    // Handle disconnection errors
    this.socket.on('disconnect', (reason: string) => {
      console.log(`[WebSocketService] ❌ Disconnected: ${reason}`);
      this.connectedSubject.next(false);
      
      // Clear timeout
      if (this.responseTimeout) {
        clearTimeout(this.responseTimeout);
        this.responseTimeout = null;
      }
      
      // Add error message if we were waiting for a response
      if (this.typingSubject.value) {
        const errorMessage: ChatMessage = {
          role: 'error',
          content: '⚠️ Connection to AI Teacher lost. Please try reconnecting.',
          timestamp: new Date(),
          isError: true,
        };
        const currentMessages = this.messagesSubject.value;
        this.messagesSubject.next([...currentMessages, errorMessage]);
        this.typingSubject.next(false);
      }
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

