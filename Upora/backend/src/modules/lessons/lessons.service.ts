import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lesson } from '../../entities/lesson.entity';
import { Usage } from '../../entities/usage.entity';
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
    // Increment view count
    await this.lessonsRepository.increment({ id: lessonId }, 'views', 1);
    
    // Track usage for commission
    const usage = this.usagesRepository.create({
      tenantId,
      userId,
      lessonId,
      usageType: 'lesson_view',
      commissionEarned: 0.10, // Mock commission rate
    });
    
    await this.usagesRepository.save(usage);
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
    
    // Track usage for commission
    const usage = this.usagesRepository.create({
      tenantId,
      userId,
      lessonId,
      usageType: 'lesson_completion',
      commissionEarned: 1.00, // Mock commission for completion
    });
    
    await this.usagesRepository.save(usage);
  }
}
