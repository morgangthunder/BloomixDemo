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
import { Logger } from '@nestjs/common';

interface ChatMessage {
  lessonId: string;
  userId: string;
  tenantId: string;
  message: string;
  timestamp: Date;
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
   * Handle chat messages (will be processed by Grok service)
   */
  @SubscribeMessage('send-message')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: ChatMessage,
  ) {
    const { lessonId, userId, tenantId, message } = payload;
    const roomName = `tenant-${tenantId}-lesson-${lessonId}`;
    
    this.logger.log(
      `Message from user ${userId} in lesson ${lessonId}: ${message.substring(0, 50)}...`,
    );
    
    // Echo user's message to the room (for chat history)
    this.server.to(roomName).emit('message', {
      role: 'user',
      content: message,
      userId,
      timestamp: new Date(),
    });
    
    // Show typing indicator
    this.server.to(roomName).emit('ai-typing', { typing: true });
    
    // This will be replaced with actual Grok service call
    // For now, return a mock response after a delay
    setTimeout(() => {
      const aiResponse = {
        role: 'assistant',
        content: this.getMockAIResponse(message),
        timestamp: new Date(),
        tokensUsed: Math.floor(Math.random() * 100) + 50,
      };
      
      this.server.to(roomName).emit('ai-typing', { typing: false });
      this.server.to(roomName).emit('message', aiResponse);
      
      // Emit token usage update
      this.server.to(roomName).emit('token-usage', {
        userId,
        tokensUsed: aiResponse.tokensUsed,
        timestamp: new Date(),
      });
      
      this.logger.log(`AI response sent to room ${roomName}`);
    }, 1500); // Simulate AI thinking time
    
    return { success: true, received: true };
  }

  /**
   * Mock AI responses (will be replaced with Grok API)
   */
  private getMockAIResponse(userMessage: string): string {
    const responses = [
      "That's a great question! Let me explain...",
      "I can help you with that. Here's what you need to know:",
      "Excellent observation! To understand this better, consider:",
      "Let me break this down for you step by step:",
      "That's an important concept. Here's how it works:",
    ];
    
    const randomResponse = responses[Math.floor(Math.random() * responses.length)];
    
    // Add context based on message keywords
    if (userMessage.toLowerCase().includes('how')) {
      return `${randomResponse} The process involves several key steps that work together to achieve the desired result.`;
    } else if (userMessage.toLowerCase().includes('why')) {
      return `${randomResponse} The reasoning behind this is based on fundamental principles that make the system more efficient and reliable.`;
    } else if (userMessage.toLowerCase().includes('what')) {
      return `${randomResponse} This is a core concept that refers to a specific technique used in modern development practices.`;
    }
    
    return `${randomResponse} I'm here to help you learn. Feel free to ask follow-up questions!`;
  }

  /**
   * Broadcast to a specific lesson room
   */
  broadcastToLesson(tenantId: string, lessonId: string, event: string, data: any) {
    const roomName = `tenant-${tenantId}-lesson-${lessonId}`;
    this.server.to(roomName).emit(event, data);
  }
}

