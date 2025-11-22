import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LlmGenerationLog } from '../../entities/llm-generation-log.entity';
import { User } from '../../entities/user.entity';
import { UserRole } from '../../common/enums/approval-status.enum';
import { LlmProvider } from '../../entities/llm-provider.entity';
import { AiPromptsService } from '../ai-prompts/ai-prompts.service';

@Injectable()
export class SuperAdminService {
  private readonly logger = new Logger(SuperAdminService.name);
  private readonly grokPricePerMillionTokens = 5.0; // $5 per 1M tokens (example pricing)

  constructor(
    @InjectRepository(LlmGenerationLog)
    private llmLogRepository: Repository<LlmGenerationLog>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(LlmProvider)
    private llmProviderRepository: Repository<LlmProvider>,
    private aiPromptsService: AiPromptsService,
  ) {}

  async getTokenUsageDashboard() {
    this.logger.log('[SuperAdmin] 📊 Fetching token usage dashboard data...');

    // Get all providers for mapping IDs to names and costs
    const providers = await this.llmProviderRepository.find();
    const providerMap = providers.reduce((acc, p) => {
      acc[p.id] = p.name;
      return acc;
    }, {} as Record<string, string>);

    // Get default provider for pricing info
    const defaultProvider = providers.find(p => p.isDefault) || providers[0];
    const pricePerMillionTokens = defaultProvider 
      ? parseFloat(defaultProvider.costPerMillionTokens as any) 
      : 5.0;

    // Get all users with their token usage
    const users = await this.userRepository.find({
      select: ['id', 'email', 'tenantId', 'role', 'subscription', 'grokTokensUsed', 'grokTokenLimit'],
    });

    // Also get unique user IDs from logs that might not be in users table (e.g., 'default-user')
    // Get all logs to find users that have usage but aren't in users table
    const allLogsForUsers = await this.llmLogRepository.find({
      select: ['userId', 'tenantId', 'createdAt'],
    });
    
    // Filter to current month
    const startOfMonthForUsers = new Date();
    startOfMonthForUsers.setDate(1);
    startOfMonthForUsers.setHours(0, 0, 0, 0);
    const monthlyLogsForUsers = allLogsForUsers.filter(log => {
      const logDate = new Date(log.createdAt);
      return logDate >= startOfMonthForUsers;
    });
    
    const logUserIds = [...new Set(monthlyLogsForUsers.map(log => log.userId).filter(Boolean))];
    const existingUserIds = new Set(users.map(u => u.id));
    const missingUserIds = logUserIds.filter(id => !existingUserIds.has(id));
    
    // Create placeholder users for missing IDs
    for (const userId of missingUserIds) {
      const userLogs = monthlyLogsForUsers.filter(log => log.userId === userId);
      const now = new Date();
      const placeholderUser = {
        id: userId,
        email: userId.includes('@') ? userId : `${userId}@system.local`,
        tenantId: userLogs[0]?.tenantId || 'default-tenant',
        role: UserRole.STUDENT,
        subscription: 'free',
        grokTokensUsed: 0,
        grokTokenLimit: 100000,
        createdAt: now,
        updatedAt: now,
      };
      users.push(placeholderUser as any as User);
    }

    // Calculate usage per user
    const accountsData = await Promise.all(
      users.map(async (user) => {
        // Get current month's usage from logs
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const logs = await this.llmLogRepository.find({
          where: {
            userId: user.id,
            // createdAt >= startOfMonth (TypeORM doesn't support this easily, so we query all and filter)
          },
        });

        const monthlyLogs = logs.filter(log => log.createdAt >= startOfMonth);
        const monthlyUsed = monthlyLogs.reduce((sum, log) => sum + log.tokensUsed, 0);
        
        // Get assistant breakdown for this account (with all-time logs for "to date")
        const assistantBreakdown = await this.getAssistantBreakdownForAccount(
          user.id,
          monthlyLogs,
          pricePerMillionTokens,
          logs, // Pass all logs for "to date" calculation
        );
        
        // Calculate average latency
        const totalLatency = monthlyLogs.reduce((sum, log) => sum + (log.processingTimeMs || 0), 0);
        const avgLatency = monthlyLogs.length > 0 ? Math.round(totalLatency / monthlyLogs.length) : 0;
        
        // Get most used provider
        const providerCounts = monthlyLogs.reduce((acc, log) => {
          if (log.providerId) {
            acc[log.providerId] = (acc[log.providerId] || 0) + 1;
          }
          return acc;
        }, {} as Record<string, number>);
        
        const mostUsedProviderId = Object.keys(providerCounts).length > 0
          ? Object.entries(providerCounts).sort((a, b) => b[1] - a[1])[0][0]
          : null;
        
        const tokenLimit = user.grokTokenLimit || this.getDefaultLimit(user.subscription);
        const percentUsed = tokenLimit > 0 ? (monthlyUsed / tokenLimit) * 100 : 0;
        const remaining = Math.max(0, tokenLimit - monthlyUsed);

        // Estimate overage date
        const daysInMonth = new Date(startOfMonth.getFullYear(), startOfMonth.getMonth() + 1, 0).getDate();
        const daysPassed = new Date().getDate();
        const avgDailyUsage = monthlyUsed / daysPassed;
        const daysUntilExceed = remaining > 0 ? remaining / avgDailyUsage : 0;
        const willExceed = percentUsed > 100 || (daysUntilExceed < (daysInMonth - daysPassed));
        
        const exceedDate = willExceed && daysUntilExceed > 0
          ? new Date(Date.now() + daysUntilExceed * 24 * 60 * 60 * 1000)
          : null;

        // Calculate cost for this account
        const accountCost = (monthlyUsed / 1000000) * pricePerMillionTokens;

        return {
          accountId: user.id,
          email: user.email,
          name: (user as any).username || user.email?.split('@')[0] || 'Unknown',
          tenantId: user.tenantId,
          subscriptionTier: user.subscription || 'free',
          tokenLimit,
          tokenUsed: monthlyUsed,
          tokenRemaining: remaining,
          percentUsed: Math.round(percentUsed),
          willExceed,
          estimatedExceedDate: exceedDate ? exceedDate.toISOString().split('T')[0] : null,
          currentPeriodStart: startOfMonth.toISOString().split('T')[0],
          currentPeriodEnd: new Date(startOfMonth.getFullYear(), startOfMonth.getMonth() + 1, 0).toISOString().split('T')[0],
          llmProvider: mostUsedProviderId ? providerMap[mostUsedProviderId] || 'N/A' : 'N/A',
          avgLatencyMs: avgLatency,
          costThisPeriod: parseFloat(accountCost.toFixed(6)), // Keep 6 decimals for precision
          assistantBreakdown, // Add assistant breakdown
        };
      }),
    );

    // Calculate totals
    const totalUsed = accountsData.reduce((sum, acc) => sum + acc.tokenUsed, 0);
    const totalLimit = accountsData.reduce((sum, acc) => sum + acc.tokenLimit, 0);
    const estimatedCost = (totalUsed / 1000000) * pricePerMillionTokens;

    // Get overall assistant breakdown (across all accounts) for AI Assistant Breakdown tab
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    const allLogs = await this.llmLogRepository.find();
    const monthlyLogsAll = allLogs.filter(log => log.createdAt >= startOfMonth);
    const overallAssistantBreakdown = await this.getOverallAssistantBreakdown(
      monthlyLogsAll,
      allLogs,
      pricePerMillionTokens,
    );

    // Get usage breakdown by category
    const allLogsForCategoryBreakdown = await this.llmLogRepository.find();
    const usageByCategory = allLogsForCategoryBreakdown.reduce((acc, log) => {
      acc[log.useCase] = (acc[log.useCase] || 0) + log.tokensUsed;
      return acc;
    }, {} as Record<string, number>);

    return {
      accounts: accountsData.sort((a, b) => b.percentUsed - a.percentUsed), // Sort by % used descending
      totals: {
        totalUsed,
        totalLimit,
        estimatedCost: parseFloat(estimatedCost.toFixed(6)), // Keep 6 decimals for small costs
        currency: 'USD',
      },
      usageByCategory,
      overallAssistantBreakdown, // Add overall assistant breakdown
      pricing: {
        perMillionTokens: pricePerMillionTokens,
        provider: defaultProvider?.name || 'No provider configured',
      },
    };
  }

  /**
   * Get overall assistant breakdown across all accounts
   */
  private async getOverallAssistantBreakdown(
    monthlyLogs: LlmGenerationLog[],
    allTimeLogs: LlmGenerationLog[],
    pricePerMillionTokens: number,
  ): Promise<Array<{
    assistantId: string;
    assistantName: string;
    tokensUsed: number; // This period
    tokensUsedToDate: number; // To date
    cost: number; // This period
    costToDate: number; // To date
    callCount: number;
    callCountToDate: number;
  }>> {
    // Get all assistants from ai-prompts
    const allPrompts = await this.aiPromptsService.findAll();
    const assistantIds = [...new Set(allPrompts.map(p => p.assistantId))];
    
    // Get assistant names
    const assistantNameMap: Record<string, string> = {
      'inventor': 'Inventor',
      'auto-populator': 'Auto-Populator',
      'content-analyzer': 'Content Analyzer',
      'teacher': 'Teacher',
      'lesson-builder': 'Lesson-Builder Assistant',
      'scaffolder': 'Scaffolder',
      'image-generator': 'Image Generator',
    };
    
    const assistantNames: Record<string, string> = {};
    assistantIds.forEach(id => {
      assistantNames[id] = assistantNameMap[id] || id.split('-').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ');
    });

    // Calculate usage per assistant (this period)
    const assistantUsage = monthlyLogs.reduce((acc, log) => {
      const assistantId = log.assistantId || 'unknown';
      if (!acc[assistantId]) {
        acc[assistantId] = { tokensUsed: 0, callCount: 0 };
      }
      acc[assistantId].tokensUsed += log.tokensUsed;
      acc[assistantId].callCount += 1;
      return acc;
    }, {} as Record<string, { tokensUsed: number; callCount: number }>);

    // Calculate usage per assistant (to date)
    const assistantUsageToDate = allTimeLogs.reduce((acc, log) => {
      const assistantId = log.assistantId || 'unknown';
      if (!acc[assistantId]) {
        acc[assistantId] = { tokensUsed: 0, callCount: 0 };
      }
      acc[assistantId].tokensUsed += log.tokensUsed;
      acc[assistantId].callCount += 1;
      return acc;
    }, {} as Record<string, { tokensUsed: number; callCount: number }>);

    // Build breakdown array for all assistants
    const breakdown = assistantIds.map(assistantId => {
      const usage = assistantUsage[assistantId] || { tokensUsed: 0, callCount: 0 };
      const usageToDate = assistantUsageToDate[assistantId] || { tokensUsed: 0, callCount: 0 };
      const cost = (usage.tokensUsed / 1000000) * pricePerMillionTokens;
      const costToDate = (usageToDate.tokensUsed / 1000000) * pricePerMillionTokens;

      return {
        assistantId,
        assistantName: assistantNames[assistantId] || assistantId,
        tokensUsed: usage.tokensUsed,
        tokensUsedToDate: usageToDate.tokensUsed,
        cost: parseFloat(cost.toFixed(6)),
        costToDate: parseFloat(costToDate.toFixed(6)),
        callCount: usage.callCount,
        callCountToDate: usageToDate.callCount,
      };
    });

    // Sort by tokens used (descending)
    return breakdown.sort((a, b) => b.tokensUsed - a.tokensUsed);
  }

  /**
   * Get assistant breakdown for a specific account
   */
  private async getAssistantBreakdownForAccount(
    userId: string,
    monthlyLogs: LlmGenerationLog[],
    pricePerMillionTokens: number,
    allTimeLogs?: LlmGenerationLog[], // Optional: all-time logs for "to date" calculation
  ): Promise<Array<{
    assistantId: string;
    assistantName: string;
    tokensUsed: number; // This period
    tokensUsedToDate: number; // To date
    cost: number; // This period
    costToDate: number; // To date
    percentOfAccount: number;
    callCount: number;
    callCountToDate: number;
  }>> {
    // Get all assistants from ai-prompts
    const allPrompts = await this.aiPromptsService.findAll();
    const assistantIds = [...new Set(allPrompts.map(p => p.assistantId))];
    
    // Get assistant names - use proper names that match ai-prompts page
    // Map assistant IDs to their display names (matching the ai-prompts component)
    const assistantNameMap: Record<string, string> = {
      'inventor': 'Inventor', // Short name for llm-usage (full name in ai-prompts is "Inventor (Interaction Builder)")
      'auto-populator': 'Auto-Populator',
      'content-analyzer': 'Content Analyzer',
      'teacher': 'Teacher',
      'lesson-builder': 'Lesson-Builder Assistant',
      'scaffolder': 'Scaffolder',
      'image-generator': 'Image Generator',
    };
    
    const assistantNames: Record<string, string> = {};
    assistantIds.forEach(id => {
      // Use the mapped name if available, otherwise fallback to friendly name
      if (assistantNameMap[id]) {
        assistantNames[id] = assistantNameMap[id];
      } else {
        // Fallback: create friendly name from assistantId
        assistantNames[id] = id.split('-').map(word => 
          word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
      }
    });

    // Calculate usage per assistant (this period)
    const assistantUsage = monthlyLogs.reduce((acc, log) => {
      const assistantId = log.assistantId || 'unknown';
      if (!acc[assistantId]) {
        acc[assistantId] = {
          tokensUsed: 0,
          callCount: 0,
        };
      }
      acc[assistantId].tokensUsed += log.tokensUsed;
      acc[assistantId].callCount += 1;
      return acc;
    }, {} as Record<string, { tokensUsed: number; callCount: number }>);

    // Calculate usage per assistant (to date) - use allTimeLogs if provided, otherwise just monthlyLogs
    const allTimeLogsToUse = allTimeLogs || monthlyLogs;
    const assistantUsageToDate = allTimeLogsToUse.reduce((acc, log) => {
      const assistantId = log.assistantId || 'unknown';
      if (!acc[assistantId]) {
        acc[assistantId] = {
          tokensUsed: 0,
          callCount: 0,
        };
      }
      acc[assistantId].tokensUsed += log.tokensUsed;
      acc[assistantId].callCount += 1;
      return acc;
    }, {} as Record<string, { tokensUsed: number; callCount: number }>);

    // Calculate total for this account
    const totalTokens = monthlyLogs.reduce((sum, log) => sum + log.tokensUsed, 0);

    // Build breakdown array for all assistants
    const breakdown = assistantIds.map(assistantId => {
      const usage = assistantUsage[assistantId] || { tokensUsed: 0, callCount: 0 };
      const usageToDate = assistantUsageToDate[assistantId] || { tokensUsed: 0, callCount: 0 };
      const cost = (usage.tokensUsed / 1000000) * pricePerMillionTokens;
      const costToDate = (usageToDate.tokensUsed / 1000000) * pricePerMillionTokens;
      const percentOfAccount = totalTokens > 0 ? (usage.tokensUsed / totalTokens) * 100 : 0;

      return {
        assistantId,
        assistantName: assistantNames[assistantId] || assistantId,
        tokensUsed: usage.tokensUsed,
        tokensUsedToDate: usageToDate.tokensUsed,
        cost: parseFloat(cost.toFixed(6)),
        costToDate: parseFloat(costToDate.toFixed(6)),
        percentOfAccount: parseFloat(percentOfAccount.toFixed(2)),
        callCount: usage.callCount,
        callCountToDate: usageToDate.callCount,
      };
    });

    // Sort by tokens used (descending)
    return breakdown.sort((a, b) => b.tokensUsed - a.tokensUsed);
  }

  private getDefaultLimit(tier: string): number {
    const limits = {
      free: 100000, // 100K tokens/month
      pro: 1000000, // 1M tokens/month
      enterprise: 10000000, // 10M tokens/month
    };
    return limits[tier] || limits.free;
  }
}

