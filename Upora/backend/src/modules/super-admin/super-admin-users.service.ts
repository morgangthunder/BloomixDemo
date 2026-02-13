import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';
import { UserPublicProfile } from '../../entities/user-public-profile.entity';
import { UserPersonalization } from '../../entities/user-personalization.entity';
import { Usage } from '../../entities/usage.entity';
import { UserInteractionProgress } from '../../entities/user-interaction-progress.entity';
import { LlmGenerationLog } from '../../entities/llm-generation-log.entity';
import { LessonEngagementTranscription } from '../../entities/lesson-engagement-transcription.entity';
import { Lesson } from '../../entities/lesson.entity';
import { LlmProvider } from '../../entities/llm-provider.entity';
import { FileStorageService } from '../../services/file-storage.service';

export type ViewerRole = 'super-admin' | 'hub-admin' | 'lesson-creator' | 'course-creator' | 'self';

export interface ViewerContext {
  role: ViewerRole;
  hubId?: string;
  lessonId?: string;
  courseId?: string;
}

export interface GetUserDashboardOptions {
  viewerRole: ViewerRole;
  hubId?: string;
  lessonId?: string;
  courseId?: string;
}

@Injectable()
export class SuperAdminUsersService {
  private readonly logger = new Logger(SuperAdminUsersService.name);

  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(UserPublicProfile)
    private profileRepo: Repository<UserPublicProfile>,
    @InjectRepository(UserPersonalization)
    private personalizationRepo: Repository<UserPersonalization>,
    @InjectRepository(Usage)
    private usageRepo: Repository<Usage>,
    @InjectRepository(UserInteractionProgress)
    private progressRepo: Repository<UserInteractionProgress>,
    @InjectRepository(LlmGenerationLog)
    private llmLogRepo: Repository<LlmGenerationLog>,
    @InjectRepository(LessonEngagementTranscription)
    private transcriptRepo: Repository<LessonEngagementTranscription>,
    @InjectRepository(Lesson)
    private lessonRepo: Repository<Lesson>,
    @InjectRepository(LlmProvider)
    private llmProviderRepo: Repository<LlmProvider>,
    private fileStorage: FileStorageService,
  ) {}

  async searchUsers(q: string, by: 'email' | 'id' | 'name' = 'email'): Promise<any[]> {
    if (!q || q.trim().length < 2) {
      return [];
    }
    const term = `%${q.trim().toLowerCase()}%`;
    const query = this.userRepo
      .createQueryBuilder('u')
      .select(['u.id', 'u.email', 'u.tenantId', 'u.role', 'u.username', 'u.createdAt'])
      .where('LOWER(u.email) LIKE :term', { term })
      .orWhere('LOWER(u.id::text) LIKE :term', { term })
      .orWhere('LOWER(COALESCE(u.username, \'\')) LIKE :term', { term })
      .orderBy('u.createdAt', 'DESC')
      .take(50);
    const users = await query.getMany();
    return users.map((u) => ({
      id: u.id,
      email: u.email,
      tenantId: u.tenantId,
      role: u.role,
      name: (u as any).username || u.email?.split('@')[0] || 'Unknown',
      createdAt: u.createdAt,
    }));
  }

  async getUserDashboard(
    userId: string,
    options: GetUserDashboardOptions,
    requestingUserId: string,
  ): Promise<any> {
    try {
      const { viewerRole } = options;

      if (viewerRole === 'self' && userId !== requestingUserId) {
        throw new ForbiddenException('You can only view your own dashboard');
      }

      const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      if (options.viewerRole === 'lesson-creator') {
        return this.buildMinimalDashboardForEngager(userId);
      }
      throw new NotFoundException(`User ${userId} not found`);
    }

    const [profile, personalization, usagesResult, progressRecords, llmLogs] = await Promise.all([
      this.profileRepo.findOne({ where: { userId } }),
      this.personalizationRepo.findOne({ where: { userId } }),
      this.usageRepo
        .find({
          where: { userId } as any,
          order: { createdAt: 'DESC' } as any,
          take: 100,
        })
        .catch((err) => {
          this.logger.warn(`Could not fetch usages for user ${userId}, using empty:`, err?.message);
          return [];
        }),
      this.progressRepo.find({
        where: { userId },
        order: { startTimestamp: 'DESC' },
        take: 100,
      }),
      this.llmLogRepo.find({
        where: { userId },
        order: { createdAt: 'DESC' },
        take: 50,
      }),
    ]);

    const includeTranscriptions = viewerRole === 'super-admin';
    let transcriptions: any[] = [];
    if (includeTranscriptions) {
      transcriptions = await this.transcriptRepo.find({
        where: { userId },
        order: { createdAt: 'DESC' },
        take: 20,
      });
    }

    const providers = await this.llmProviderRepo.find();
    const defaultProvider = providers.find((p) => p.isDefault) || providers[0];
    const pricePerMillion = defaultProvider
      ? parseFloat(defaultProvider.costPerMillionTokens as any)
      : 5.0;

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const monthlyLogs = llmLogs.filter((l) => l.createdAt >= startOfMonth);
    const monthlyTokens = monthlyLogs.reduce((s, l) => s + l.tokensUsed, 0);
    const tokenLimit = user.grokTokenLimit || 10000;
    const percentRemaining =
      tokenLimit > 0 ? Math.max(0, ((tokenLimit - monthlyTokens) / tokenLimit) * 100) : 100;

    const assistantBreakdown = this.buildAssistantBreakdown(monthlyLogs, pricePerMillion);

    const usages = Array.isArray(usagesResult) ? usagesResult : [];
    const lessonIds = [...new Set(usages.map((u: any) => u.lessonId).filter(Boolean))] as string[];
    const lessons =
      lessonIds.length > 0
        ? await this.lessonRepo.find({
            where: lessonIds.map((id) => ({ id })),
            select: ['id', 'title'],
          })
        : [];
    const lessonMap = Object.fromEntries(lessons.map((l) => [l.id, l.title]));

    const lessonEngagement = usages
      .filter((u: any) => u.lessonId)
      .reduce((acc, u: any) => {
        const id = u.lessonId!;
        if (!acc[id]) {
          acc[id] = { lessonId: id, title: lessonMap[id] || 'Unknown', viewCount: 0, lastViewed: u.createdAt };
        }
        acc[id].viewCount += 1;
        if (u.createdAt > acc[id].lastViewed) acc[id].lastViewed = u.createdAt;
        return acc;
      }, {} as Record<string, { lessonId: string; title: string; viewCount: number; lastViewed: Date }>);

    const result: any = {
      account: {
        userId: user.id,
        email: user.email,
        tenantId: user.tenantId,
        role: user.role,
        firstName: (user as any).username,
        subscriptionTier: user.subscription || 'free',
        authProvider: 'cognito',
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      personalisation: personalization
        ? {
            fullName: personalization.fullName,
            ageRange: personalization.ageRange,
            gender: personalization.gender,
            favouriteTvMovies: personalization.favouriteTvMovies,
            hobbiesInterests: personalization.hobbiesInterests,
            learningAreas: personalization.learningAreas,
            onboardingCompletedAt: personalization.onboardingCompletedAt,
            skippedOnboarding: personalization.skippedOnboarding,
          }
        : null,
      personalSettings: profile
        ? {
            displayName: profile.displayName,
            preferences: profile.preferences,
            publicAvatarUrl: profile.publicAvatarUrl,
            shareName: profile.shareName,
            sharePreferences: profile.sharePreferences,
          }
        : null,
      lessonEngagement: Object.values(lessonEngagement),
      lessonProgress: progressRecords.map((p) => ({
        id: p.id,
        lessonId: p.lessonId,
        stageId: p.stageId,
        substageId: p.substageId,
        interactionTypeId: p.interactionTypeId,
        completed: p.completed,
        score: p.score,
        attempts: p.attempts,
        startTimestamp: p.startTimestamp,
        completeTimestamp: p.completeTimestamp,
      })),
      usageMetrics: {
        lessonViews: usages.filter((u: any) => u.usageType === 'lesson_view').length,
        lastActivity:
          usages.length > 0
            ? usages.reduce((max: Date, u: any) => (u.createdAt > max ? u.createdAt : max), usages[0].createdAt)
            : null,
      },
      llmUsage: {
        tokenLimit,
        tokensUsedThisPeriod: monthlyTokens,
        percentRemaining: Math.round(percentRemaining),
        renewalAt: (user as any).subscriptionRenewalAt,
        assistantBreakdown,
        recentQueries: llmLogs.slice(0, 10).map((l) => ({
          id: l.id,
          assistantId: l.assistantId,
          tokensUsed: l.tokensUsed,
          createdAt: l.createdAt,
        })),
      },
    };

    if (includeTranscriptions) {
      result.lessonEngagementTranscriptions = transcriptions.map((t) => ({
        id: t.id,
        lessonId: t.lessonId,
        createdAt: t.createdAt,
        transcriptLength: t.entryCount ?? t.transcript?.length ?? 0,
      }));
    }

    return result;
    } catch (err) {
      this.logger.error(`getUserDashboard failed for userId=${userId}`, err instanceof Error ? err.stack : err);
      throw err;
    }
  }

  /**
   * Build minimal dashboard for an engager who has no row in users table (e.g. Cognito user not yet synced).
   * Uses same DB schema as lessons.service: usages have resource_type, resource_id, action.
   */
  private async buildMinimalDashboardForEngager(userId: string): Promise<any> {
    const [usageRows, progressRecords] = await Promise.all([
      this.usageRepo.query(
        `SELECT resource_id as "lessonId", action, created_at as "createdAt"
         FROM usages
         WHERE user_id = $1 AND resource_type = 'lesson'
         ORDER BY created_at DESC
         LIMIT 100`,
        [userId],
      ).catch(() => []),
      this.progressRepo.find({
        where: { userId },
        order: { startTimestamp: 'DESC' },
        take: 100,
      }).catch(() => []),
    ]);
    const usages = Array.isArray(usageRows) ? usageRows : [];
    const lessonIds = [...new Set(usages.map((u: any) => u.lessonId).filter(Boolean))] as string[];
    const lessons = lessonIds.length > 0
      ? await this.lessonRepo.find({ where: lessonIds.map((id) => ({ id })), select: ['id', 'title'] })
      : [];
    const lessonMap = Object.fromEntries(lessons.map((l) => [l.id, l.title]));
    const lessonEngagement = usages
      .filter((u: any) => u.lessonId)
      .reduce((acc: Record<string, { lessonId: string; title: string; viewCount: number; lastViewed: Date }>, u: any) => {
        const id = u.lessonId;
        if (!acc[id]) {
          acc[id] = { lessonId: id, title: lessonMap[id] || 'Unknown', viewCount: 0, lastViewed: u.createdAt };
        }
        acc[id].viewCount += 1;
        if (u.createdAt > acc[id].lastViewed) acc[id].lastViewed = u.createdAt;
        return acc;
      }, {});
    const lastActivity = usages.length > 0
      ? usages.reduce((max: Date, u: any) => (u.createdAt > max ? u.createdAt : max), usages[0].createdAt)
      : null;
    return {
      account: {
        userId,
        email: `(user-${userId.slice(0, 8)})`,
        tenantId: null,
        role: 'student',
        firstName: null,
        subscriptionTier: 'free',
        authProvider: 'cognito',
        createdAt: null,
        updatedAt: null,
      },
      personalisation: null,
      personalSettings: null,
      lessonEngagement: Object.values(lessonEngagement),
      lessonProgress: progressRecords.map((p) => ({
        id: p.id,
        lessonId: p.lessonId,
        stageId: p.stageId,
        substageId: p.substageId,
        interactionTypeId: p.interactionTypeId,
        completed: p.completed,
        score: p.score,
        attempts: p.attempts,
        startTimestamp: p.startTimestamp,
        completeTimestamp: p.completeTimestamp,
      })),
      usageMetrics: {
        lessonViews: usages.filter((u: any) => u.action === 'view').length,
        lastActivity,
      },
      llmUsage: {
        tokenLimit: 10000,
        tokensUsedThisPeriod: 0,
        percentRemaining: 100,
        renewalAt: null,
        assistantBreakdown: [],
        recentQueries: [],
      },
    };
  }

  async getTranscriptions(userId: string): Promise<any[]> {
    const rows = await this.transcriptRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
    const result: any[] = [];
    for (const t of rows) {
      let transcript = t.transcript;
      if (t.storageKey && this.fileStorage.getTranscriptContent) {
        try {
          const content = await this.fileStorage.getTranscriptContent(t.storageKey);
          transcript = (content as any)?.transcript ?? transcript;
        } catch {
          // keep DB transcript or []
        }
      }
      result.push({
        id: t.id,
        userId: t.userId,
        lessonId: t.lessonId,
        transcript: transcript ?? [],
        createdAt: t.createdAt,
      });
    }
    return result;
  }

  /**
   * Save lesson engagement transcript (chat, script blocks, interaction events from lesson-view).
   * Full transcript is stored in MinIO/S3 at transcripts/{tenantId}/{userId}/{sessionId}.json;
   * DB row stores storage_key for lookup (transcript column left empty when using storage).
   * Called from POST /interaction-data/session/:sessionId/transcript.
   */
  async saveEngagementTranscript(
    sessionId: string,
    userId: string,
    lessonId: string,
    tenantId: string,
    transcript: Array<{ timestamp: string; speaker: 'user' | 'assistant' | 'system'; type: string; content: string; metadata?: Record<string, any> }>,
  ): Promise<LessonEngagementTranscription> {
    const storageKey = `transcripts/${tenantId}/${userId}/${sessionId}.json`;
    const payload = {
      transcript: transcript || [],
      lessonId,
      userId,
      tenantId,
      sessionId,
      savedAt: new Date().toISOString(),
    };
    let savedToStorage = false;
    try {
      await this.fileStorage.saveTranscript(storageKey, payload);
      savedToStorage = true;
    } catch (err) {
      this.logger.warn(`Failed to save transcript to MinIO/S3 (${storageKey}), saving to DB only: ${(err as Error)?.message}`);
    }
    const existing = await this.transcriptRepo.findOne({
      where: { userSessionId: sessionId, userId, lessonId },
    });
    const entryCount = (transcript || []).length;
    const transcriptForDb = savedToStorage ? [] : (transcript || []);
    const storageKeyForDb = savedToStorage ? storageKey : null;
    if (existing) {
      existing.storageKey = storageKeyForDb;
      existing.transcript = transcriptForDb;
      existing.entryCount = entryCount;
      existing.updatedAt = new Date();
      return this.transcriptRepo.save(existing);
    }
    const row = this.transcriptRepo.create({
      userSessionId: sessionId,
      userId,
      lessonId,
      tenantId,
      storageKey: storageKeyForDb,
      entryCount,
      transcript: transcriptForDb,
    });
    return this.transcriptRepo.save(row);
  }

  async sendPasswordReset(userId: string): Promise<{ sent: boolean; message: string }> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }
    // TODO: Integrate with Cognito AdminInitiateAuth / ForgotPassword
    return {
      sent: false,
      message: 'Password reset email integration coming soon. Configure Cognito ForgotPassword flow.',
    };
  }

  private buildAssistantBreakdown(
    logs: LlmGenerationLog[],
    pricePerMillion: number,
  ): Array<{ assistantId: string; tokensUsed: number; cost: number; callCount: number }> {
    const byAssistant = logs.reduce(
      (acc, log) => {
        const aid = log.assistantId || 'unknown';
        if (!acc[aid]) acc[aid] = { tokensUsed: 0, callCount: 0 };
        acc[aid].tokensUsed += log.tokensUsed;
        acc[aid].callCount += 1;
        return acc;
      },
      {} as Record<string, { tokensUsed: number; callCount: number }>,
    );
    return Object.entries(byAssistant).map(([assistantId, data]) => ({
      assistantId,
      tokensUsed: data.tokensUsed,
      cost: parseFloat(((data.tokensUsed / 1000000) * pricePerMillion).toFixed(6)),
      callCount: data.callCount,
    }));
  }
}
