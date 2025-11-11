import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lesson } from './entities/lesson.entity';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class LessonLoaderService {
  private readonly logger = new Logger(LessonLoaderService.name);
  private readonly lessonsDir = path.join(__dirname, '../../../../lessons');

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

    // Create or update lesson in database
    const lesson = this.lessonRepository.create({
      id: lessonData.id,
      tenantId: lessonData.tenantId || '00000000-0000-0000-0000-000000000001',
      title: lessonData.title,
      description: lessonData.description,
      thumbnailUrl: lessonData.thumbnailUrl,
      category: lessonData.category,
      difficulty: lessonData.difficulty,
      duration: lessonData.estimatedDuration,
      tags: lessonData.tags || [],
      data: {
        stages: lessonData.stages,
        metadata: lessonData.metadata,
      },
      status: 'approved',
      createdBy: lessonData.metadata?.author || 'system',
      objectives: lessonData.objectives,
    });

    const savedLesson = await this.lessonRepository.save(lesson);
    
    this.logger.log(`✅ Lesson loaded: ${lessonData.title} (${lessonData.id})`);
    
    return savedLesson;
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

