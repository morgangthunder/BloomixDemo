import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lesson } from '../entities/lesson.entity';
import { AiAssistantService, ChatMessage as AssistantChatMessage } from '../services/ai-assistant.service';
import { User } from '../entities/user.entity';
import { InteractionType } from '../entities/interaction-type.entity';
import { InteractionAIContextService, InteractionEvent } from '../services/interaction-ai-context.service';
import { AITeacherPromptBuilderService } from '../services/ai-teacher-prompt-builder.service';
import { InteractionResponseParserService, LLMResponse } from '../services/interaction-response-parser.service';
import { GrokService } from '../services/grok.service';

interface ChatMessage {
  lessonId: string;
  userId: string;
  tenantId: string;
  message: string;
  timestamp: Date;
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>; // Optional conversation history
  lessonData?: any; // Optional lesson JSON (if not provided, will be fetched from DB)
  screenshot?: string; // Optional base64-encoded screenshot image
  isScreenshotRequest?: boolean; // True if this message is a screenshot response to a request
  currentStageInfo?: { // Current stage and sub-stage the student is viewing
    stageId?: string | number | null;
    subStageId?: string | number | null;
    stage?: { id: string | number; title: string; type?: string } | null;
    subStage?: { id: string | number; title: string; type?: string } | null;
  };
  isTimeoutFallback?: boolean; // True if this is a timeout fallback resend
}

interface JoinLessonPayload {
  lessonId: string;
  userId: string;
  tenantId: string;
}

@WebSocketGateway({
  cors: {
    origin: ['http://localhost:8100', 'http://localhost:4200'],
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger = new Logger('ChatGateway');

  constructor(
    private aiAssistantService: AiAssistantService,
    @InjectRepository(Lesson)
    private lessonRepository: Repository<Lesson>,
    @InjectRepository(InteractionType)
    private interactionTypeRepository: Repository<InteractionType>,
    private interactionContextService: InteractionAIContextService,
    private promptBuilderService: AITeacherPromptBuilderService,
    private responseParserService: InteractionResponseParserService,
    private grokService: GrokService,
  ) {}

  /**
   * Handle new client connections
   */
  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  /**
   * Handle client disconnections
   */
  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  /**
   * Handle joining a lesson room
   */
  @SubscribeMessage('join-lesson')
  handleJoinLesson(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: JoinLessonPayload,
  ) {
    const { lessonId, userId, tenantId } = payload;
    
    // Create tenant-namespaced room
    const roomName = `tenant-${tenantId}-lesson-${lessonId}`;
    
    client.join(roomName);
    
    this.logger.log(
      `User ${userId} joined lesson ${lessonId} in room ${roomName}`,
    );
    
    // Send confirmation to client
    client.emit('joined-lesson', {
      lessonId,
      roomName,
      message: 'Successfully joined lesson chat',
    });
    
    // Notify others in the room (for future multi-user support)
    client.to(roomName).emit('user-joined', {
      userId,
      timestamp: new Date(),
    });
    
    return { success: true, roomName };
  }

  /**
   * Join user-specific room for direct message notifications.
   * Client should emit 'join-user' with { userId } after connect.
   */
  @SubscribeMessage('join-user')
  handleJoinUser(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { userId: string },
  ) {
    const { userId } = payload;
    if (!userId) return { success: false };
    const roomName = `user-${userId}`;
    client.join(roomName);
    this.logger.log(`User ${userId} joined room ${roomName}`);
    return { success: true, roomName };
  }

  /**
   * Emit event to a specific user (e.g. new direct message).
   * Call from MessagesService when a message is created.
   */
  emitToUser(userId: string, event: string, data: any) {
    const roomName = `user-${userId}`;
    this.server.to(roomName).emit(event, data);
    this.logger.log(`Emitted ${event} to room ${roomName}`);
  }

  /**
   * Handle leaving a lesson room
   */
  @SubscribeMessage('leave-lesson')
  handleLeaveLesson(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { lessonId: string; tenantId: string; userId: string },
  ) {
    const { lessonId, tenantId, userId } = payload;
    const roomName = `tenant-${tenantId}-lesson-${lessonId}`;
    
    client.leave(roomName);
    
    this.logger.log(
      `User ${userId} left lesson ${lessonId} from room ${roomName}`,
    );
    
    // Notify others
    client.to(roomName).emit('user-left', {
      userId,
      timestamp: new Date(),
    });
    
    return { success: true };
  }

  /**
   * Handle chat messages - processed by AI Assistant Service (Teacher)
   */
  @SubscribeMessage('send-message')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: ChatMessage,
  ) {
    this.logger.log(`[ChatGateway] 🔔 Received 'send-message' event from client ${client.id}`);
    this.logger.log(`[ChatGateway] Payload keys: ${Object.keys(payload || {})}`);
    
    if (!payload) {
      this.logger.error(`[ChatGateway] ❌ No payload received in send-message`);
      return { success: false, error: 'No payload received' };
    }
    
    const { lessonId, userId, tenantId, message, conversationHistory, lessonData, screenshot, isScreenshotRequest, currentStageInfo, isTimeoutFallback } = payload;
    
    // For timeout fallback, message might be empty (we'll use conversation history)
    // For screenshot requests, message is empty (we'll use conversation history)
    // For normal messages, message must be present
    if (!lessonId || !userId || !tenantId) {
      this.logger.error(`[ChatGateway] ❌ Missing required fields - lessonId: ${lessonId}, userId: ${userId}, tenantId: ${tenantId}`);
      return { success: false, error: 'Missing required fields' };
    }
    
    // Message is only required for non-screenshot, non-timeout-fallback requests
    if (!isScreenshotRequest && !isTimeoutFallback && (!message || message.trim() === '')) {
      this.logger.error(`[ChatGateway] ❌ Missing message field`);
      return { success: false, error: 'Missing message field' };
    }
    
    const roomName = `tenant-${tenantId}-lesson-${lessonId}`;
    
    // Log message (handle empty messages for screenshot/timeout fallback)
    const messagePreview = message ? message.substring(0, 50) : '(empty - screenshot/timeout fallback)';
    this.logger.log(
      `[ChatGateway] 💬 Message from user ${userId} in lesson ${lessonId}: ${messagePreview}...`,
    );
    
    // Echo user's message to the room (for chat history)
    // If it's a screenshot response, don't echo it as a regular message (screenshot is sent silently)
    // If it's a timeout fallback, don't echo (message was already shown when first sent)
    if (!isScreenshotRequest) {
      // Don't echo timeout fallback messages - they're resends of already-shown messages
      if (!isTimeoutFallback) {
        this.server.to(roomName).emit('message', {
          role: 'user',
          content: message,
          userId,
          timestamp: new Date(),
        });
      } else {
        this.logger.log(`[ChatGateway] ⏰ Timeout fallback - skipping echo (message already in chat)`);
      }
    } else {
      // Screenshot is being sent - don't show the message, just process it silently
      this.logger.log(`[ChatGateway] 📸 Screenshot received from user ${userId} - processing silently`);
    }
    
    // Show typing indicator
    this.server.to(roomName).emit('ai-typing', { typing: true });
    
    try {
      // Get lesson data if not provided
      let lessonDataToUse = lessonData;
      if (!lessonDataToUse) {
        const lesson = await this.lessonRepository.findOne({
          where: { id: lessonId },
        });
        if (lesson) {
          lessonDataToUse = lesson.data;
        } else {
          throw new Error(`Lesson ${lessonId} not found`);
        }
      }

      // Create user object for AI assistant service
      const user: User = {
        id: userId,
        tenantId: tenantId,
      } as User;

      // Format conversation history for AI assistant
      const formattedHistory: AssistantChatMessage[] = (conversationHistory || []).map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      // Build user message - include screenshot if provided
      // If screenshot is provided, use the original question from conversation history
      let userMessageToSend = message;
      if (screenshot && isScreenshotRequest) {
        this.logger.log(`[ChatGateway] 📸 Screenshot received - length: ${screenshot.length} chars`);
        // Get the last user message from conversation history (the original question)
        const lastUserMessage = conversationHistory && conversationHistory.length > 0
          ? conversationHistory.filter((msg: any) => msg.role === 'user').pop()?.content || message
          : message;
        
        // If message is empty (screenshot sent silently), use the last user question
        if (!message || message.trim() === '') {
          userMessageToSend = lastUserMessage || 'Please analyze the screenshot and provide guidance.';
          this.logger.log(`[ChatGateway] 📸 Using last user message from history: ${userMessageToSend.substring(0, 50)}...`);
        } else {
          userMessageToSend = message;
        }
        
        // Add screenshot context
        userMessageToSend = `${userMessageToSend}\n\n[Screenshot provided - please analyze the visual content to better understand the student's question or the current state of the lesson interface]`;
        this.logger.log(`[ChatGateway] 📸 Screenshot will be included in AI context`);
      } else if (screenshot) {
        this.logger.warn(`[ChatGateway] ⚠️ Screenshot provided but isScreenshotRequest is false - screenshot will not be processed`);
      }

      // Call AI Assistant Service with teacher assistant
      this.logger.log(`[Teacher] Calling AI Assistant Service with lessonId: ${lessonId}`);
      this.logger.log(`[Teacher] Conversation history: ${formattedHistory.length} messages`);
      this.logger.log(`[Teacher] Lesson data size: ${JSON.stringify(lessonDataToUse).length} chars`);
      if (payload.currentStageInfo) {
        this.logger.log(`[Teacher] Current stage: ${payload.currentStageInfo.stage?.title || 'N/A'}, Sub-stage: ${payload.currentStageInfo.subStage?.title || 'N/A'}`);
      }
      
      let response;
      try {
        response = await this.aiAssistantService.chat(
          {
            assistantId: 'teacher',
            promptKey: 'general',
            userMessage: userMessageToSend,
            context: {
              lessonId: lessonId,
              lessonData: lessonDataToUse,
              screenshot: screenshot, // Pass screenshot to context
              currentStageInfo: payload.currentStageInfo, // Pass current stage/sub-stage info
            },
            conversationHistory: formattedHistory,
          },
          user,
        );
        
        this.logger.log(`[Teacher] AI Assistant response received: ${response.content.substring(0, 100)}...`);
        this.logger.log(`[Teacher] Tokens used: ${response.tokensUsed}`);
      } catch (error: any) {
        this.logger.error(`[Teacher] ❌ Error calling AI Assistant Service: ${error.message}`, error.stack);
        // Emit error message to user
        this.server.to(roomName).emit('ai-typing', { typing: false });
        this.server.to(roomName).emit('message', {
          role: 'assistant',
          content: '⚠️ We\'re experiencing technical issues connecting to the AI Teacher. Please try again in a moment.',
          timestamp: new Date(),
          tokensUsed: 0,
        });
        return { success: false, error: error.message };
      }

      // Check if response contains screenshot request
      const screenshotRequestPattern = /\[SCREENSHOT_REQUEST\]/i;
      const hasScreenshotRequest = screenshotRequestPattern.test(response.content);

      if (hasScreenshotRequest) {
        // AI requested a screenshot - show NO response to user
        // Wait for screenshot to be captured and sent, then show the proper response
        this.server.to(roomName).emit('ai-typing', { typing: false });
        this.server.to(roomName).emit('screenshot-request', {
          message: '', // Empty - no message shown to user
          timestamp: new Date(),
        });
        
        // Do NOT emit any message - wait for screenshot to be captured and sent
        // The next AI response (after screenshot is processed) will be shown
        this.logger.log(`Screenshot requested by AI for lesson ${lessonId} - waiting for screenshot before showing response`);
        return { success: true, screenshotRequested: true };
      }

      // Emit AI response
      // Add camera emoji if this response was based on a screenshot
      // Add clock emoji if this was a timeout fallback response
      let responseContent = response.content || '';
      
      // Add emojis using Unicode escape sequences to ensure proper encoding
      if (screenshot && isScreenshotRequest) {
        // Camera emoji: U+1F4F7
        responseContent = responseContent + ' \u{1F4F7}';
      }
      // Check if this is a timeout fallback (when message is resent without screenshot after timeout)
      const isTimeoutFallback = payload.isTimeoutFallback || false;
      if (isTimeoutFallback) {
        // Clock emoji: U+23F0
        responseContent = responseContent + ' \u{23F0}';
      }
      
      const aiResponse = {
        role: 'assistant',
        content: responseContent,
        timestamp: new Date(),
        tokensUsed: response.tokensUsed,
      };

      this.server.to(roomName).emit('ai-typing', { typing: false });
      this.server.to(roomName).emit('message', aiResponse);

      // Emit token usage update
      this.server.to(roomName).emit('token-usage', {
        userId,
        tokensUsed: response.tokensUsed,
        timestamp: new Date(),
      });

      this.logger.log(
        `AI response sent to room ${roomName} (${response.tokensUsed} tokens)`,
      );

      return { success: true, received: true };
    } catch (error: any) {
      this.logger.error(`Error processing AI teacher message: ${error.message}`);
      this.logger.error(`Error stack: ${error.stack}`);
      
      // Emit error to client with proper error flag
      this.server.to(roomName).emit('ai-typing', { typing: false });
      
      // Determine error message based on error type
      let errorMessage = '⚠️ Connection to AI Teacher lost. ';
      if (error.message?.includes('timeout') || error.message?.includes('ETIMEDOUT')) {
        errorMessage += 'The request timed out. Please try again.';
      } else if (error.message?.includes('ECONNREFUSED') || error.message?.includes('network')) {
        errorMessage += 'Network error. Please check your connection.';
      } else if (error.message?.includes('API key') || error.message?.includes('authentication')) {
        errorMessage += 'Authentication error. Please contact support.';
      } else {
        errorMessage += `An error occurred: ${error.message || 'Unknown error'}. Please try again.`;
      }
      
      this.server.to(roomName).emit('message', {
        role: 'error',
        content: errorMessage,
        timestamp: new Date(),
        tokensUsed: 0,
        isError: true,
      });

      return { success: false, error: error.message };
    }
  }


  /**
   * Handle interaction events from frontend
   */
  @SubscribeMessage('interaction-event')
  async handleInteractionEvent(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: {
      lessonId: string;
      substageId: string;
      interactionId: string;
      event: InteractionEvent;
      currentState: Record<string, any>;
      processedContentId?: string;
      userId: string;
      tenantId: string;
    },
  ) {
    this.logger.log(`[ChatGateway] 🎮 Received interaction event: ${payload.event.type}`);
    
    const { lessonId, substageId, interactionId, event, currentState, processedContentId, userId, tenantId } = payload;
    
    if (!lessonId || !substageId || !interactionId || !event) {
      this.logger.error('[ChatGateway] ❌ Missing required fields in interaction-event');
      return { success: false, error: 'Missing required fields' };
    }
    
    const roomName = `tenant-${tenantId}-lesson-${lessonId}`;
    
    try {
      // Get interaction type
      const interactionType = await this.interactionTypeRepository.findOne({
        where: { id: interactionId },
      });
      
      if (!interactionType) {
        this.logger.error(`[ChatGateway] ❌ Interaction type not found: ${interactionId}`);
        return { success: false, error: 'Interaction type not found' };
      }
      
      // Get or create context
      const context = await this.interactionContextService.getContext(
        lessonId,
        substageId,
        interactionId,
        processedContentId,
      );
      
      // Update state
      if (currentState && Object.keys(currentState).length > 0) {
        this.interactionContextService.updateState(context.id, currentState);
      }
      
      // Add event to context
      this.interactionContextService.addEvent(context.id, event);
      
      // Check if event should trigger LLM (check event handler config or event flag)
      const eventHandler = interactionType.aiEventHandlers?.[event.type];
      const shouldTriggerLLM = event.requiresLLMResponse || eventHandler?.triggerLLM || false;
      
      if (!shouldTriggerLLM) {
        this.logger.debug(`[ChatGateway] Event ${event.type} does not require LLM response`);
        return { success: true, llmResponse: false };
      }
      
      // Show typing indicator
      this.server.to(roomName).emit('ai-typing', { typing: true });
      
      // Build prompt
      const customPrompt = eventHandler?.customPrompt;
      const fullPrompt = await this.promptBuilderService.buildPrompt(
        interactionType,
        context,
        customPrompt,
      );
      
      // Call Grok API
      const grokResponse = await this.grokService.chatCompletion({
        messages: [
          {
            role: 'system',
            content: fullPrompt,
          },
          {
            role: 'user',
            content: `Event: ${event.type}\nData: ${JSON.stringify(event.data, null, 2)}`,
          },
        ],
        temperature: 0.7,
        maxTokens: 500,
      });
      
      // Parse response
      const parsedResponse: LLMResponse = this.responseParserService.parseResponse(
        grokResponse.content,
      );
      
      // Validate response
      if (!this.responseParserService.validateResponse(parsedResponse)) {
        this.logger.warn('[ChatGateway] Invalid response structure, using text fallback');
        parsedResponse.response = grokResponse.content;
      }
      
      // Update context state if response includes state updates
      if (parsedResponse.stateUpdates) {
        this.interactionContextService.updateState(context.id, parsedResponse.stateUpdates);
      }
      
      // Emit response to interaction
      this.server.to(roomName).emit('ai-typing', { typing: false });
      this.server.to(roomName).emit('interaction-ai-response', {
        interactionId,
        substageId,
        response: parsedResponse,
        timestamp: new Date(),
      });
      
      this.logger.log(`[ChatGateway] ✅ Interaction AI response sent for event ${event.type}`);
      
      return {
        success: true,
        llmResponse: true,
        tokensUsed: grokResponse.tokensUsed,
      };
    } catch (error: any) {
      this.logger.error(`[ChatGateway] ❌ Error processing interaction event: ${error.message}`, error.stack);
      
      this.server.to(roomName).emit('ai-typing', { typing: false });
      this.server.to(roomName).emit('interaction-ai-response', {
        interactionId,
        substageId,
        response: {
          response: '⚠️ Unable to process interaction event. Please try again.',
        },
        timestamp: new Date(),
        error: true,
      });
      
      return { success: false, error: error.message };
    }
  }

  /**
   * Broadcast to a specific lesson room
   */
  broadcastToLesson(tenantId: string, lessonId: string, event: string, data: any) {
    const roomName = `tenant-${tenantId}-lesson-${lessonId}`;
    this.server.to(roomName).emit(event, data);
  }
}


