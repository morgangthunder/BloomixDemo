import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProcessedContentOutput } from '../../entities/processed-content-output.entity';
import { ScriptBlock } from '../../entities/script-block.entity';
import { Lesson } from '../../entities/lesson.entity';

@Injectable()
export class LessonEditorService {
  constructor(
    @InjectRepository(ProcessedContentOutput)
    private processedOutputRepo: Repository<ProcessedContentOutput>,
    @InjectRepository(ScriptBlock)
    private scriptBlockRepo: Repository<ScriptBlock>,
    @InjectRepository(Lesson)
    private lessonRepo: Repository<Lesson>,
  ) {}

  // ========== Processed Content Outputs ==========

  async getProcessedOutputs(lessonId: string): Promise<ProcessedContentOutput[]> {
    return this.processedOutputRepo.find({
      where: { lessonId },
      relations: ['contentSource'],
      order: { createdAt: 'DESC' },
    });
  }

  async getProcessedOutput(id: string): Promise<ProcessedContentOutput> {
    const output = await this.processedOutputRepo.findOne({
      where: { id },
      relations: ['contentSource', 'lesson'],
    });

    if (!output) {
      throw new NotFoundException(`Processed output ${id} not found`);
    }

    return output;
  }

  async createProcessedOutput(
    data: Partial<ProcessedContentOutput>,
  ): Promise<ProcessedContentOutput> {
    const output = this.processedOutputRepo.create(data);
    return this.processedOutputRepo.save(output);
  }

  async updateProcessedOutput(
    id: string,
    data: Partial<ProcessedContentOutput>,
  ): Promise<ProcessedContentOutput> {
    await this.processedOutputRepo.update(id, data);
    return this.getProcessedOutput(id);
  }

  async deleteProcessedOutput(id: string): Promise<void> {
    const result = await this.processedOutputRepo.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Processed output ${id} not found`);
    }
  }

  // ========== Script Blocks ==========

  async getScriptBlocks(
    lessonId: string,
    substageId: string,
  ): Promise<ScriptBlock[]> {
    return this.scriptBlockRepo.find({
      where: { lessonId, substageId },
      order: { sequenceOrder: 'ASC' },
    });
  }

  async getScriptBlock(id: string): Promise<ScriptBlock> {
    const block = await this.scriptBlockRepo.findOne({
      where: { id },
      relations: ['lesson'],
    });

    if (!block) {
      throw new NotFoundException(`Script block ${id} not found`);
    }

    return block;
  }

  async createScriptBlock(
    data: Partial<ScriptBlock>,
  ): Promise<ScriptBlock> {
    // Auto-assign sequence order
    if (data.sequenceOrder === undefined && data.lessonId && data.substageId) {
      const maxOrder = await this.scriptBlockRepo
        .createQueryBuilder('block')
        .select('MAX(block.sequenceOrder)', 'max')
        .where('block.lessonId = :lessonId', { lessonId: data.lessonId })
        .andWhere('block.substageId = :substageId', { substageId: data.substageId })
        .getRawOne();

      data.sequenceOrder = (maxOrder?.max || -1) + 1;
    }

    const block = this.scriptBlockRepo.create(data);
    return this.scriptBlockRepo.save(block);
  }

  async updateScriptBlock(
    id: string,
    data: Partial<ScriptBlock>,
  ): Promise<ScriptBlock> {
    await this.scriptBlockRepo.update(id, data);
    return this.getScriptBlock(id);
  }

  async deleteScriptBlock(id: string): Promise<void> {
    const result = await this.scriptBlockRepo.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Script block ${id} not found`);
    }
  }

  async reorderScriptBlocks(
    lessonId: string,
    substageId: string,
    blockOrders: Array<{ id: string; sequenceOrder: number }>,
  ): Promise<void> {
    await Promise.all(
      blockOrders.map((item) =>
        this.scriptBlockRepo.update(
          { id: item.id, lessonId, substageId },
          { sequenceOrder: item.sequenceOrder },
        ),
      ),
    );
  }

  // ========== Lesson Data Management ==========

  async updateLessonStages(
    lessonId: string,
    stagesData: any,
  ): Promise<Lesson> {
    const lesson = await this.lessonRepo.findOne({ where: { id: lessonId } });
    
    if (!lesson) {
      throw new NotFoundException(`Lesson ${lessonId} not found`);
    }

    // Update lesson.data.stages
    const updatedData = {
      ...lesson.data,
      stages: stagesData,
    };

    await this.lessonRepo.update(lessonId, { data: updatedData });

    const updatedLesson = await this.lessonRepo.findOne({ where: { id: lessonId } });
    if (!updatedLesson) {
      throw new NotFoundException(`Lesson ${lessonId} not found after update`);
    }
    return updatedLesson;
  }
}

