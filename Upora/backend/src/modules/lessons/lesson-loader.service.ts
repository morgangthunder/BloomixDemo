import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lesson } from '../../entities/lesson.entity';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class LessonLoaderService {
  private readonly logger = new Logger(LessonLoaderService.name);
  private readonly lessonsDir = path.join(process.cwd(), 'lessons');

  constructor(
    @InjectRepository(Lesson)
    private lessonRepository: Repository<Lesson>,
  ) {}

  /**
   * Load a specific lesson from JSON file
   */
  async loadLessonFromFile(filename: string): Promise<Lesson> {
    const filePath = path.join(this.lessonsDir, filename);
    
    this.logger.log(`Loading lesson from: ${filePath}`);
    
    if (!fs.existsSync(filePath)) {
      throw new Error(`Lesson file not found: ${filename}`);
    }

    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const lessonData = JSON.parse(fileContent);

    // Validate required fields
    if (!lessonData.id || !lessonData.title) {
      throw new Error(`Invalid lesson data in ${filename}: missing id or title`);
    }

    // Check if lesson exists
    let lesson = await this.lessonRepository.findOne({ where: { id: lessonData.id } });
    
    if (lesson) {
      // Update existing lesson
      lesson.title = lessonData.title;
      lesson.description = lessonData.description;
      lesson.thumbnailUrl = lessonData.thumbnailUrl;
      lesson.category = lessonData.category;
      lesson.difficulty = lessonData.difficulty;
      lesson.durationMinutes = lessonData.estimatedDuration;
      lesson.tags = lessonData.tags || [];
      lesson.data = {
        ...lesson.data,
        metadata: lessonData.metadata || lesson.data.metadata,
        structure: {
          stages: lessonData.stages,
          totalDuration: lessonData.estimatedDuration,
          learningObjectives: lessonData.objectives?.learningObjectives || [],
        },
      };
      lesson.objectives = lessonData.objectives;
    } else {
      // Create new lesson
      const newLesson = this.lessonRepository.create({
        id: lessonData.id,
        tenantId: lessonData.tenantId || '00000000-0000-0000-0000-000000000001',
        title: lessonData.title,
        description: lessonData.description,
        thumbnailUrl: lessonData.thumbnailUrl,
        category: lessonData.category,
        difficulty: lessonData.difficulty,
        durationMinutes: lessonData.estimatedDuration,
        tags: lessonData.tags || [],
        data: {
          metadata: {
            version: lessonData.metadata?.version || '1.0',
            created: lessonData.metadata?.created || new Date().toISOString(),
            updated: lessonData.metadata?.updated || new Date().toISOString(),
            lessonId: lessonData.id,
            tenantId: lessonData.tenantId || '00000000-0000-0000-0000-000000000001',
            createdBy: lessonData.metadata?.author || 'system',
          },
          config: {
            title: lessonData.title,
            description: lessonData.description,
            category: lessonData.category,
            difficulty: lessonData.difficulty as any,
            durationMinutes: lessonData.estimatedDuration,
            thumbnailUrl: lessonData.thumbnailUrl,
            tags: lessonData.tags || [],
            status: 'approved' as any,
          },
          aiContext: {
            generalPrompt: '',
            defaultSubStagePrompts: {},
            customPrompts: {},
            contextData: {
              lessonObjectives: lessonData.objectives?.learningObjectives || [],
              prerequisites: [],
              keyConcepts: lessonData.objectives?.topics || [],
            },
          },
          structure: {
            stages: lessonData.stages,
            totalDuration: lessonData.estimatedDuration,
            learningObjectives: lessonData.objectives?.learningObjectives || [],
          },
          contentReferences: {
            contentSources: [],
            mediaAssets: [],
          },
          processedContent: {},
          interactions: {
            interactionTypes: [],
            customInteractions: [],
          },
          script: {
            blocks: [],
            totalDuration: 0,
            timing: {},
          },
          assessment: {
            checkpoints: [],
            evaluationCriteria: [],
            progressTracking: {},
          },
        },
        status: 'approved' as any,
        createdBy: lessonData.metadata?.author || 'system',
        objectives: lessonData.objectives,
      });
      lesson = newLesson;
    }

    if (!lesson) {
      throw new Error('Failed to create lesson entity');
    }

    const savedLesson = await this.lessonRepository.save(lesson as any);
    
    this.logger.log(`✅ Lesson loaded: ${lessonData.title} (${lessonData.id})`);
    
    return savedLesson as Lesson;
  }

  /**
   * Load all lessons from JSON files
   */
  async loadAllLessons(): Promise<Lesson[]> {
    this.logger.log(`Loading all lessons from: ${this.lessonsDir}`);
    
    if (!fs.existsSync(this.lessonsDir)) {
      this.logger.warn(`Lessons directory not found: ${this.lessonsDir}`);
      return [];
    }

    const files = fs.readdirSync(this.lessonsDir).filter(f => f.endsWith('.json'));
    
    this.logger.log(`Found ${files.length} lesson files`);
    
    const lessons: Lesson[] = [];
    
    for (const file of files) {
      try {
        const lesson = await this.loadLessonFromFile(file);
        lessons.push(lesson);
      } catch (error) {
        this.logger.error(`Failed to load lesson from ${file}:`, error.message);
      }
    }
    
    this.logger.log(`✅ Successfully loaded ${lessons.length} lessons`);
    
    return lessons;
  }

  /**
   * Get list of available lesson files
   */
  getAvailableLessonFiles(): string[] {
    if (!fs.existsSync(this.lessonsDir)) {
      return [];
    }
    
    return fs.readdirSync(this.lessonsDir).filter(f => f.endsWith('.json'));
  }

  /**
   * Reload a specific lesson (useful for development)
   */
  async reloadLesson(lessonId: string): Promise<Lesson> {
    const files = this.getAvailableLessonFiles();
    
    for (const file of files) {
      const filePath = path.join(this.lessonsDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(content);
      
      if (data.id === lessonId) {
        return await this.loadLessonFromFile(file);
      }
    }
    
    throw new Error(`No JSON file found for lesson ID: ${lessonId}`);
  }
}

