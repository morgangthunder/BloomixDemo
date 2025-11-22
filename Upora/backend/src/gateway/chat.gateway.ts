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
    const { lessonId, userId, tenantId, message, conversationHistory, lessonData, screenshot, isScreenshotRequest } = payload;
    const roomName = `tenant-${tenantId}-lesson-${lessonId}`;
    
    this.logger.log(
      `Message from user ${userId} in lesson ${lessonId}: ${message.substring(0, 50)}...`,
    );
    
    // Echo user's message to the room (for chat history)
    // If it's a screenshot response, don't echo it as a regular message
    if (!isScreenshotRequest) {
      this.server.to(roomName).emit('message', {
        role: 'user',
        content: message,
        userId,
        timestamp: new Date(),
      });
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
      let userMessageToSend = message;
      if (screenshot && isScreenshotRequest) {
        // If screenshot is provided, add it to the message context
        userMessageToSend = `${message}\n\n[Screenshot provided - please analyze the visual content to better understand the student's question or the current state of the lesson interface]`;
      }

      // Call AI Assistant Service with teacher assistant
      this.logger.log(`[Teacher] Calling AI Assistant Service with lessonId: ${lessonId}`);
      this.logger.log(`[Teacher] Conversation history: ${formattedHistory.length} messages`);
      this.logger.log(`[Teacher] Lesson data size: ${JSON.stringify(lessonDataToUse).length} chars`);
      if (payload.currentStageInfo) {
        this.logger.log(`[Teacher] Current stage: ${payload.currentStageInfo.stage?.title || 'N/A'}, Sub-stage: ${payload.currentStageInfo.subStage?.title || 'N/A'}`);
      }
      
      const response = await this.aiAssistantService.chat(
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

      // Check if response contains screenshot request
      const screenshotRequestPattern = /\[SCREENSHOT_REQUEST\]/i;
      const hasScreenshotRequest = screenshotRequestPattern.test(response.content);

      if (hasScreenshotRequest) {
        // Remove the screenshot request marker from the response
        const cleanedContent = response.content.replace(screenshotRequestPattern, '').trim();
        
        // Emit a special event requesting a screenshot
        this.server.to(roomName).emit('ai-typing', { typing: false });
        this.server.to(roomName).emit('screenshot-request', {
          message: cleanedContent || 'I would like to see a screenshot of the lesson to better help you.',
          timestamp: new Date(),
        });

        this.logger.log(`Screenshot requested by AI for lesson ${lessonId}`);
        return { success: true, screenshotRequested: true };
      }

      // Emit AI response
      const aiResponse = {
        role: 'assistant',
        content: response.content,
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
      
      // Emit error to client
      this.server.to(roomName).emit('ai-typing', { typing: false });
      this.server.to(roomName).emit('message', {
        role: 'assistant',
        content: `Sorry, I encountered an error: ${error.message || 'Unknown error'}. Please try again.`,
        timestamp: new Date(),
        tokensUsed: 0,
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

