import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LlmGenerationLog } from '../../entities/llm-generation-log.entity';
import { User } from '../../entities/user.entity';
import { LlmProvider } from '../../entities/llm-provider.entity';

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
      select: ['id', 'email', 'username', 'tenantId', 'role', 'subscription', 'grokTokensUsed', 'grokTokenLimit'],
    });

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
          name: user.username || 'Unknown',
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
        };
      }),
    );

    // Calculate totals
    const totalUsed = accountsData.reduce((sum, acc) => sum + acc.tokenUsed, 0);
    const totalLimit = accountsData.reduce((sum, acc) => sum + acc.tokenLimit, 0);
    const estimatedCost = (totalUsed / 1000000) * pricePerMillionTokens;

    // Get usage breakdown by category
    const allLogs = await this.llmLogRepository.find();
    const usageByCategory = allLogs.reduce((acc, log) => {
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
      pricing: {
        perMillionTokens: pricePerMillionTokens,
        provider: defaultProvider?.name || 'No provider configured',
      },
    };
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

