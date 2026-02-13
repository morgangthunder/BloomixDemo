import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lesson } from '../../entities/lesson.entity';
import { Usage } from '../../entities/usage.entity';
import { UserInteractionProgress } from '../../entities/user-interaction-progress.entity';
import { User } from '../../entities/user.entity';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import { ApprovalStatus } from '../../common/enums/approval-status.enum';

@Injectable()
export class LessonsService {
  constructor(
    @InjectRepository(Lesson)
    private lessonsRepository: Repository<Lesson>,
    @InjectRepository(Usage)
    private usagesRepository: Repository<Usage>,
    @InjectRepository(UserInteractionProgress)
    private progressRepository: Repository<UserInteractionProgress>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async create(createLessonDto: CreateLessonDto): Promise<Lesson> {
    const lesson = this.lessonsRepository.create({
      ...createLessonDto,
      status: ApprovalStatus.PENDING,
    });
    return await this.lessonsRepository.save(lesson);
  }

  async findAll(tenantId?: string, onlyApproved = false): Promise<Lesson[]> {
    const where: any = tenantId ? { tenantId } : {};
    
    if (onlyApproved) {
      where.status = ApprovalStatus.APPROVED;
    }
    
    console.log(`[LessonsService] findAll - tenantId: ${tenantId}, onlyApproved: ${onlyApproved}, where:`, where);
    
    const lessons = await this.lessonsRepository.find({ 
      where,
      relations: ['creator'],
      order: { createdAt: 'DESC' },
    });
    
    console.log(`[LessonsService] Found ${lessons.length} lessons:`, lessons.map(l => ({ 
      id: l.id, 
      title: l.title, 
      status: l.status,
      thumbnailUrl: l.thumbnailUrl,
      category: l.category,
      difficulty: l.difficulty,
      courseId: l.courseId
    })));
    
    return lessons;
  }

  async findOne(id: string, tenantId?: string): Promise<Lesson> {
    const where: any = { id };
    if (tenantId) {
      where.tenantId = tenantId;
    }
    
    const lesson = await this.lessonsRepository.findOne({ 
      where,
      relations: ['creator'],
    });
    
    if (!lesson) {
      throw new NotFoundException(`Lesson with ID ${id} not found`);
    }
    
    return lesson;
  }

  async update(
    id: string,
    updateLessonDto: UpdateLessonDto,
    userId: string,
    tenantId?: string,
  ): Promise<Lesson> {
    console.log('🔥🔥🔥 BACKEND LESSONS SERVICE VERSION 0.0.1 🔥🔥🔥');
    console.log('[LessonsService] update() - Version 0.0.1');
    console.log('[LessonsService] Updating lesson ID:', id);
    console.log('[LessonsService] User ID:', userId);
    console.log('[LessonsService] Update DTO:', JSON.stringify(updateLessonDto, null, 2));
    
    const lesson = await this.findOne(id, tenantId);
    
    console.log('[LessonsService] Found lesson:', lesson.title);
    console.log('[LessonsService] Lesson createdBy:', lesson.createdBy);
    
    // Only creator can update
    if (lesson.createdBy !== userId) {
      console.log('[LessonsService] ❌ Permission denied: User', userId, 'trying to update lesson by', lesson.createdBy);
      throw new ForbiddenException('You can only update your own lessons');
    }
    
    console.log('[LessonsService] ✅ Permission check passed');
    console.log('[LessonsService] Assigning updates...');
    
    Object.assign(lesson, updateLessonDto);
    
    console.log('[LessonsService] Saving to database...');
    const savedLesson = await this.lessonsRepository.save(lesson);
    
    console.log('[LessonsService] ✅ Lesson saved successfully');
    console.log('[LessonsService] Updated data:', JSON.stringify(savedLesson.data).substring(0, 200) + '...');
    
    return savedLesson;
  }

  async remove(id: string, userId: string, tenantId?: string): Promise<void> {
    const lesson = await this.findOne(id, tenantId);
    
    // Only creator can delete
    if (lesson.createdBy !== userId) {
      throw new ForbiddenException('You can only delete your own lessons');
    }
    
    await this.lessonsRepository.remove(lesson);
  }

  async submitForApproval(id: string, userId: string, tenantId?: string): Promise<Lesson> {
    const lesson = await this.findOne(id, tenantId);
    
    if (lesson.createdBy !== userId) {
      throw new ForbiddenException('You can only submit your own lessons');
    }
    
    lesson.status = ApprovalStatus.PENDING;
    return await this.lessonsRepository.save(lesson);
  }

  async approve(id: string, tenantId?: string): Promise<Lesson> {
    const lesson = await this.findOne(id, tenantId);
    lesson.status = ApprovalStatus.APPROVED;
    return await this.lessonsRepository.save(lesson);
  }

  async reject(id: string, tenantId?: string): Promise<Lesson> {
    const lesson = await this.findOne(id, tenantId);
    lesson.status = ApprovalStatus.REJECTED;
    return await this.lessonsRepository.save(lesson);
  }

  async trackView(lessonId: string, userId: string, tenantId: string): Promise<void> {
    console.log('[LessonsService] 📊 trackView called:', { lessonId, userId, tenantId });
    
    // Increment view count
    await this.lessonsRepository.increment({ id: lessonId }, 'views', 1);
    
    // Track usage for commission - use raw query to match actual DB schema
    // DB schema: resource_type, resource_id, action (not usageType, lessonId)
    await this.usagesRepository.query(
      `INSERT INTO usages (id, tenant_id, user_id, resource_type, resource_id, action, creator_id, commission_cents, created_at)
       VALUES (gen_random_uuid(), $1, $2, 'lesson', $3, 'view', $2, 10, NOW())`,
      [tenantId, userId, lessonId]
    );
    
    console.log('[LessonsService] ✅ Saved usage record for lesson view');
  }

  async markCompletion(lessonId: string, userId: string, tenantId: string): Promise<void> {
    const lesson = await this.findOne(lessonId, tenantId);
    
    // Increment completion count
    lesson.completions += 1;
    
    // Recalculate completion rate
    if (lesson.views > 0) {
      lesson.completionRate = (lesson.completions / lesson.views) * 100;
    }
    
    await this.lessonsRepository.save(lesson);
    
    // Track usage for commission - use raw query to match actual DB schema
    await this.usagesRepository.query(
      `INSERT INTO usages (id, tenant_id, user_id, resource_type, resource_id, action, creator_id, commission_cents, created_at)
       VALUES (gen_random_uuid(), $1, $2, 'lesson', $3, 'complete', $2, 100, NOW())`,
      [tenantId, userId, lessonId]
    );
  }

  /**
   * Assert the requesting user can view engagers for this lesson (creator or super-admin).
   * Throws ForbiddenException if not allowed.
   */
  async assertCanViewEngagers(lessonId: string, requestingUserId: string, tenantId?: string, userRole?: string): Promise<void> {
    const lesson = await this.findOne(lessonId, tenantId);
    const isAdmin = userRole === 'admin' || userRole === 'super-admin';
    const isMorganThunder = await this.isMorganThunder(requestingUserId);
    const isSuperAdmin = isAdmin || isMorganThunder;
    const isCreator = lesson.createdBy === requestingUserId;
    if (!isSuperAdmin && !isCreator) {
      throw new ForbiddenException('You can only view engagers for your own lessons');
    }
  }

  /**
   * Get users who have engaged with a lesson (viewed or interacted)
   * Used for creator engagement view (Phase 6.5)
   */
  async getEngagers(lessonId: string, userId: string, tenantId?: string, searchQuery?: string, userRole?: string): Promise<any[]> {
    console.log('[LessonsService] 📊 getEngagers called:', { lessonId, userId, tenantId, searchQuery, userRole });
    await this.assertCanViewEngagers(lessonId, userId, tenantId, userRole);
    const lesson = await this.findOne(lessonId, tenantId);

    // Get distinct user IDs from usages - use raw query to match actual DB schema
    // DB schema: resource_type='lesson', resource_id=lessonId, action='view' or 'complete'
    const usageUserIds = await this.usagesRepository.query(
      `SELECT DISTINCT user_id as "userId"
       FROM usages
       WHERE resource_type = 'lesson'
         AND resource_id = $1
         AND action IN ('view', 'complete')`,
      [lessonId]
    );
    console.log('[LessonsService] Found usage user IDs:', usageUserIds);

    // Get distinct user IDs from interaction progress
    const progressUserIds = await this.progressRepository.query(
      `SELECT DISTINCT user_id as "userId"
       FROM user_interaction_progress
       WHERE lesson_id = $1`,
      [lessonId]
    );
    console.log('[LessonsService] Found progress user IDs:', progressUserIds);

    // Combine both queries to get all unique engagers
    const allUserIds = [
      ...new Set([
        ...usageUserIds.map((r: any) => r.userId),
        ...progressUserIds.map((r: any) => r.userId),
      ]),
    ];

    console.log('[LessonsService] Combined user IDs:', allUserIds);

    if (allUserIds.length === 0) {
      console.log('[LessonsService] No engagers found');
      return [];
    }

    // Fetch user details
    let userQuery = this.userRepository
      .createQueryBuilder('u')
      .where('u.id IN (:...ids)', { ids: allUserIds });

    // Apply search filter if provided
    if (searchQuery && searchQuery.trim().length > 0) {
      const term = `%${searchQuery.trim().toLowerCase()}%`;
      userQuery = userQuery.andWhere(
        '(LOWER(u.email) LIKE :term OR LOWER(COALESCE(u.username, \'\')) LIKE :term)',
        { term },
      );
    }

    const users = await userQuery
      .orderBy('u.createdAt', 'DESC')
      .getMany();

    // Include "orphan" user IDs: those with progress/usages but no users record
    // (e.g. Cognito users not yet synced to users table)
    const foundIds = new Set(users.map((u) => u.id));
    const orphanIds = allUserIds.filter((id) => !foundIds.has(id));
    if (orphanIds.length > 0) {
      console.log('[LessonsService] Found orphan user IDs (progress/usages but no users record):', orphanIds);
    }
    // Build synthetic user records for orphans so their engagement data is visible
    const orphanUsers = orphanIds.map((id) => ({
      id,
      email: `(user-${id.slice(0, 8)})`,
      username: null,
      tenantId: null,
      role: 'student',
      createdAt: null,
    })) as any[];

    const allUsers = [...users, ...orphanUsers];

    // Get engagement stats for each user - use raw SQL to match DB schema
    const engagers = await Promise.all(
      allUsers.map(async (user) => {
        // Get view count - DB schema: resource_type='lesson', resource_id=lessonId, action='view'
        const viewCountResult = await this.usagesRepository.query(
          `SELECT COUNT(*) as count
           FROM usages
           WHERE resource_type = 'lesson'
             AND resource_id = $1
             AND user_id = $2
             AND action = 'view'`,
          [lessonId, user.id]
        );
        const viewCount = parseInt(viewCountResult[0]?.count || '0', 10);

        // Get completion count - DB schema: action='complete'
        const completionCountResult = await this.usagesRepository.query(
          `SELECT COUNT(*) as count
           FROM usages
           WHERE resource_type = 'lesson'
             AND resource_id = $1
             AND user_id = $2
             AND action = 'complete'`,
          [lessonId, user.id]
        );
        const completionCount = parseInt(completionCountResult[0]?.count || '0', 10);

        // Get interaction progress count
        const interactionCountResult = await this.progressRepository.query(
          `SELECT COUNT(*) as count
           FROM user_interaction_progress
           WHERE lesson_id = $1
             AND user_id = $2`,
          [lessonId, user.id]
        );
        const interactionCount = parseInt(interactionCountResult[0]?.count || '0', 10);

        // Get first view timestamp
        const firstViewResult = await this.usagesRepository.query(
          `SELECT created_at
           FROM usages
           WHERE resource_type = 'lesson'
             AND resource_id = $1
             AND user_id = $2
             AND action = 'view'
           ORDER BY created_at ASC
           LIMIT 1`,
          [lessonId, user.id]
        );
        const firstViewedAt = firstViewResult[0]?.created_at || null;

        // Get last activity timestamp
        const lastProgressResult = await this.progressRepository.query(
          `SELECT updated_at
           FROM user_interaction_progress
           WHERE lesson_id = $1
             AND user_id = $2
           ORDER BY updated_at DESC
           LIMIT 1`,
          [lessonId, user.id]
        );
        const lastActivityAt = lastProgressResult[0]?.updated_at || firstViewedAt;

        // Get average score from interactions (include 0 scores, exclude NULL)
        // First, get all scores to debug
        const allScoresResult = await this.progressRepository.query(
          `SELECT interaction_type_id, score, completed, substage_id
           FROM user_interaction_progress
           WHERE lesson_id = $1
             AND user_id = $2
           ORDER BY updated_at DESC`,
          [lessonId, user.id]
        );
        console.log(`[LessonsService] 🔍 All scores for ${user.email}:`, allScoresResult.map((r: any) => ({
          interactionTypeId: r.interaction_type_id,
          substageId: r.substage_id,
          score: r.score,
          scoreType: typeof r.score,
          completed: r.completed,
        })));
        
        const avgScoreResult = await this.progressRepository.query(
          `SELECT AVG(score) as avg_score, COUNT(*) as total_with_score, 
                  MIN(score) as min_score, MAX(score) as max_score
           FROM user_interaction_progress
           WHERE lesson_id = $1
             AND user_id = $2
             AND score IS NOT NULL`,
          [lessonId, user.id]
        );
        const avgScoreRaw = avgScoreResult[0]?.avg_score;
        const avgScore = avgScoreRaw !== null && avgScoreRaw !== undefined ? Math.round(parseFloat(String(avgScoreRaw))) : null;
        const totalWithScore = parseInt(avgScoreResult[0]?.total_with_score || '0', 10);
        console.log(`[LessonsService] 📊 Score calculation for ${user.email}:`, {
          avgScoreRaw,
          avgScore,
          totalWithScore,
          minScore: avgScoreResult[0]?.min_score,
          maxScore: avgScoreResult[0]?.max_score,
          scoresFound: allScoresResult.filter((r: any) => r.score !== null && r.score !== undefined).length,
          scoresNull: allScoresResult.filter((r: any) => r.score === null || r.score === undefined).length,
        });

        // Get all interaction progress records for detailed view - include all data fields
        console.log(`[LessonsService] 🔍 Querying interactions for user ${user.id} (${user.email}) in lesson ${lessonId}`);
        const allProgressResult = await this.progressRepository.query(
          `SELECT 
             id, stage_id, substage_id, interaction_type_id, 
             score, completed, attempts, time_taken_seconds,
             start_timestamp, complete_timestamp, updated_at,
             interaction_events, custom_data
           FROM user_interaction_progress
           WHERE lesson_id = $1
             AND user_id = $2`,
          [lessonId, user.id]
        );
        
        // Sort interactions by lesson script order (stage order, then substage order)
        const lessonData = lesson.data as any;
        // Stages are stored in data.structure.stages, not data.stages
        const stages = lessonData?.structure?.stages || lessonData?.stages || [];
        
        console.log(`[LessonsService] 🔍 Building order map from ${stages.length} stages`);
        if (stages.length === 0) {
          console.warn(`[LessonsService] ⚠️ No stages found in lesson data!`, {
            hasData: !!lessonData,
            hasStructure: !!lessonData?.structure,
            structureKeys: lessonData?.structure ? Object.keys(lessonData.structure) : [],
            hasStages: !!lessonData?.structure?.stages,
            directStages: !!lessonData?.stages,
            dataKeys: lessonData ? Object.keys(lessonData) : [],
          });
        }
        
        // Build a map of stage/substage positions for sorting
        const stageOrderMap = new Map<string, number>();
        const substageOrderMap = new Map<string, { stageOrder: number; substageOrder: number }>();
        
        stages.forEach((stage: any, stageIdx: number) => {
          const stageId = stage.id || stage.stageId;
          const stageOrder = stage.order !== undefined ? stage.order : stage.orderIndex !== undefined ? stage.orderIndex : stageIdx;
          stageOrderMap.set(stageId, stageOrder);
          
          const subStages = stage.subStages || stage.substages || [];
          console.log(`[LessonsService]   Stage ${stageId} (order: ${stageOrder}) has ${subStages.length} substages`);
          subStages.forEach((substage: any, substageIdx: number) => {
            const substageId = substage.id || substage.substageId;
            const substageOrder = substage.order !== undefined ? substage.order : substage.orderIndex !== undefined ? substage.orderIndex : substageIdx;
            substageOrderMap.set(substageId, { stageOrder, substageOrder });
            console.log(`[LessonsService]     Substage ${substageId} (order: ${substageOrder})`);
          });
        });
        
        console.log(`[LessonsService] 📊 Built order map with ${substageOrderMap.size} substages`);
        console.log(`[LessonsService] 📊 Interactions before sorting:`, allProgressResult.map((p: any) => ({
          substageId: p.substage_id,
          interactionTypeId: p.interaction_type_id,
          hasPosition: substageOrderMap.has(p.substage_id),
        })));
        
        // Sort interactions by script position
        const sortedProgress = allProgressResult.sort((a: any, b: any) => {
          const aPos = substageOrderMap.get(a.substage_id);
          const bPos = substageOrderMap.get(b.substage_id);
          
          // If positions found, sort by them
          if (aPos && bPos) {
            if (aPos.stageOrder !== bPos.stageOrder) {
              return aPos.stageOrder - bPos.stageOrder;
            }
            return aPos.substageOrder - bPos.substageOrder;
          }
          
          // Fallback: if only one has position, prioritize it
          if (aPos && !bPos) return -1;
          if (!aPos && bPos) return 1;
          
          // Fallback: sort by updated_at DESC if no position info
          const aTime = a.updated_at ? new Date(a.updated_at).getTime() : 0;
          const bTime = b.updated_at ? new Date(b.updated_at).getTime() : 0;
          return bTime - aTime;
        });
        
        console.log(`[LessonsService] 📊 Sorted ${sortedProgress.length} interactions by lesson script order:`, sortedProgress.map((p: any, idx: number) => ({
          index: idx,
          substageId: p.substage_id,
          interactionTypeId: p.interaction_type_id,
          position: substageOrderMap.get(p.substage_id),
          score: p.score,
        })));
        
        // Log all substage IDs from lesson for comparison
        console.log(`[LessonsService] 📋 Lesson substage IDs:`, Array.from(substageOrderMap.keys()));
        console.log(`[LessonsService] 📋 Progress substage IDs:`, allProgressResult.map((p: any) => p.substage_id));
        console.log(`[LessonsService] 📊 Found ${allProgressResult.length} interaction progress records for user ${user.id} (${user.email}) in lesson ${lessonId}:`, 
          allProgressResult.map((p: any) => ({
            id: p.id,
            interactionTypeId: p.interaction_type_id,
            stageId: p.stage_id,
            substageId: p.substage_id,
            score: p.score,
            completed: p.completed,
            attempts: p.attempts,
          }))
        );
        
        // Also log the raw query result to see if there's any data transformation issue
        if (allProgressResult.length > 0) {
          console.log(`[LessonsService] 🔍 Raw first interaction record:`, JSON.stringify(allProgressResult[0], null, 2));
        }

        return {
          id: user.id,
          email: user.email,
          name: user.username || user.email?.split('@')[0] || 'Unknown',
          tenantId: user.tenantId,
          role: user.role,
          createdAt: user.createdAt,
          engagement: {
            viewCount,
            completionCount,
            interactionCount,
            firstViewedAt,
            lastActivityAt,
            hasCompleted: completionCount > 0,
            averageScore: avgScore,
            totalScoredInteractions: totalWithScore,
            interactions: sortedProgress.map((p: any) => {
              const mapped = {
                id: p.id,
                stageId: p.stage_id,
                substageId: p.substage_id,
                interactionTypeId: p.interaction_type_id,
                score: p.score,
                completed: p.completed,
                attempts: p.attempts,
                timeTakenSeconds: p.time_taken_seconds,
                startTimestamp: p.start_timestamp,
                completeTimestamp: p.complete_timestamp,
                updatedAt: p.updated_at,
                interactionEvents: p.interaction_events || [],
                customData: p.custom_data || {},
              };
              console.log(`[LessonsService] 🔄 Mapped interaction:`, {
                interactionTypeId: mapped.interactionTypeId,
                score: mapped.score,
                completed: mapped.completed,
              });
              return mapped;
            }),
          },
        };
      }),
    );

    return engagers;
  }

  /**
   * Check if user is morganthunder@gmail.com or morganthunder@yahoo.com (super-admin)
   */
  private async isMorganThunder(userId: string): Promise<boolean> {
    try {
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user) return false;
      const email = user.email?.toLowerCase() || '';
      return email === 'morganthunder@gmail.com' || email === 'morganthunder@yahoo.com';
    } catch (error) {
      console.error('[LessonsService] Error checking morganthunder:', error);
      return false;
    }
  }
}
