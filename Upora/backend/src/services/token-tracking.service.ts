import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

// Token tracking entity (simplified for now)
interface TokenTrackingRecord {
  tenantId: string;
  userId: string;
  usageType: 'ai_chat' | 'content_processing' | 'code_assistance';
  resourceType?: string;
  resourceId?: string;
  tokensUsed: number;
  costCents?: number;
  requestMetadata?: any;
}

/**
 * Token Tracking Service
 * Logs Grok API usage to database for billing and limits
 */
@Injectable()
export class TokenTrackingService {
  private logger = new Logger('TokenTrackingService');

  // TODO: Inject TokenTracking entity repository when entity is ready
  // constructor(
  //   @InjectRepository(TokenTracking)
  //   private tokenTrackingRepository: Repository<TokenTracking>,
  // ) {}

  /**
   * Log token usage for a chat interaction
   */
  async logChatTokens(
    userId: string,
    tenantId: string,
    lessonId: string,
    tokensUsed: number,
    messageContent: string,
  ): Promise<void> {
    try {
      const record: TokenTrackingRecord = {
        tenantId,
        userId,
        usageType: 'ai_chat',
        resourceType: 'lesson',
        resourceId: lessonId,
        tokensUsed,
        costCents: this.calculateCost(tokensUsed),
        requestMetadata: {
          messageLength: messageContent.length,
          timestamp: new Date(),
        },
      };

      // TODO: Save to database
      // await this.tokenTrackingRepository.save(record);

      this.logger.log(
        `Token usage logged: User ${userId} used ${tokensUsed} tokens in lesson ${lessonId}`,
      );

      // Check if user is approaching limits
      await this.checkTokenLimits(userId, tenantId);
    } catch (error) {
      this.logger.error(`Failed to log token usage: ${error.message}`);
    }
  }

  /**
   * Log token usage for content processing
   */
  async logContentProcessingTokens(
    userId: string,
    tenantId: string,
    workflowId: string,
    tokensUsed: number,
  ): Promise<void> {
    try {
      const record: TokenTrackingRecord = {
        tenantId,
        userId,
        usageType: 'content_processing',
        resourceType: 'workflow',
        resourceId: workflowId,
        tokensUsed,
        costCents: this.calculateCost(tokensUsed),
      };

      // TODO: Save to database
      // await this.tokenTrackingRepository.save(record);

      this.logger.log(
        `Content processing tokens logged: ${tokensUsed} tokens for workflow ${workflowId}`,
      );
    } catch (error) {
      this.logger.error(`Failed to log content processing tokens: ${error.message}`);
    }
  }

  /**
   * Get total token usage for a user
   */
  async getUserTokenUsage(userId: string, tenantId: string): Promise<number> {
    try {
      // TODO: Query database
      // const result = await this.tokenTrackingRepository
      //   .createQueryBuilder('tracking')
      //   .where('tracking.userId = :userId', { userId })
      //   .andWhere('tracking.tenantId = :tenantId', { tenantId })
      //   .select('SUM(tracking.tokensUsed)', 'total')
      //   .getRawOne();

      // return parseInt(result?.total || '0', 10);

      // Mock for now
      return Math.floor(Math.random() * 5000);
    } catch (error) {
      this.logger.error(`Failed to get user token usage: ${error.message}`);
      return 0;
    }
  }

  /**
   * Check if user is approaching token limits
   */
  private async checkTokenLimits(userId: string, tenantId: string): Promise<void> {
    const usage = await this.getUserTokenUsage(userId, tenantId);
    const limit = 10000; // TODO: Get from user record

    const percentUsed = (usage / limit) * 100;

    if (percentUsed >= 90) {
      this.logger.warn(
        `User ${userId} has used ${percentUsed.toFixed(1)}% of token limit (${usage}/${limit})`,
      );
      // TODO: Emit WebSocket notification to user
    } else if (percentUsed >= 75) {
      this.logger.log(
        `User ${userId} has used ${percentUsed.toFixed(1)}% of token limit (${usage}/${limit})`,
      );
    }
  }

  /**
   * Calculate cost in cents based on token usage
   * Mock pricing: ~$0.0001 per token (adjust based on actual Grok pricing)
   */
  private calculateCost(tokens: number): number {
    const costPerToken = 0.0001; // $0.0001 per token
    return Math.ceil(tokens * costPerToken * 100); // Convert to cents
  }

  /**
   * Get token usage statistics for a user
   */
  async getTokenStats(userId: string, tenantId: string) {
    const usage = await this.getUserTokenUsage(userId, tenantId);
    const limit = 10000; // TODO: Get from user record

    return {
      totalTokens: usage,
      tokenLimit: limit,
      percentUsed: ((usage / limit) * 100).toFixed(1),
      remainingTokens: limit - usage,
      estimatedCost: this.calculateCost(usage),
    };
  }
}

