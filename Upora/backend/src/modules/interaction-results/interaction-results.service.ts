import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InteractionResult } from '../../entities/interaction-result.entity';
import { InteractionAverage } from '../../entities/interaction-average.entity';

export interface SaveResultDto {
  studentId: string;
  tenantId: string;
  lessonId: string;
  stageId: string;
  substageId: string;
  interactionTypeId: string;
  score: number;
  timeTakenSeconds?: number;
  attempts?: number;
  resultData: any;
}

@Injectable()
export class InteractionResultsService {
  constructor(
    @InjectRepository(InteractionResult)
    private resultsRepo: Repository<InteractionResult>,
    @InjectRepository(InteractionAverage)
    private averagesRepo: Repository<InteractionAverage>,
  ) {}

  /**
   * Save an interaction result and update averages
   */
  async saveResult(dto: SaveResultDto) {
    // 1. Save individual result
    const result = this.resultsRepo.create({
      studentId: dto.studentId,
      tenantId: dto.tenantId,
      lessonId: dto.lessonId,
      stageId: dto.stageId,
      substageId: dto.substageId,
      interactionTypeId: dto.interactionTypeId,
      score: dto.score,
      timeTakenSeconds: dto.timeTakenSeconds,
      attempts: dto.attempts || 1,
      resultData: dto.resultData,
    });

    await this.resultsRepo.save(result);

    // 2. Update or create average
    await this.updateAverage(dto);

    // 3. Get updated average to return
    const average = await this.getAverage(
      dto.interactionTypeId,
      dto.lessonId,
      dto.substageId,
      dto.tenantId
    );

    // 4. Calculate percentile
    const percentile = await this.calculatePercentile(
      dto.score,
      dto.interactionTypeId,
      dto.lessonId,
      dto.substageId,
      dto.tenantId
    );

    return {
      saved: true,
      yourScore: dto.score,
      classAverage: average?.avgScore || dto.score,
      totalAttempts: average?.totalAttempts || 1,
      percentile,
    };
  }

  /**
   * Update average for this interaction
   */
  private async updateAverage(dto: SaveResultDto) {
    // Find existing average
    let average = await this.averagesRepo.findOne({
      where: {
        interactionTypeId: dto.interactionTypeId,
        lessonId: dto.lessonId,
        substageId: dto.substageId,
        tenantId: dto.tenantId,
      },
    });

    if (!average) {
      // Create new average
      average = this.averagesRepo.create({
        interactionTypeId: dto.interactionTypeId,
        lessonId: dto.lessonId,
        substageId: dto.substageId,
        tenantId: dto.tenantId,
        totalAttempts: 1,
        avgScore: dto.score,
        avgTimeSeconds: dto.timeTakenSeconds,
      });
    } else {
      // Update existing average using incremental formula
      const newTotal = average.totalAttempts + 1;
      average.avgScore = Number(
        ((average.avgScore * average.totalAttempts + dto.score) / newTotal).toFixed(2)
      );
      
      if (dto.timeTakenSeconds && average.avgTimeSeconds) {
        average.avgTimeSeconds = Math.round(
          (average.avgTimeSeconds * average.totalAttempts + dto.timeTakenSeconds) / newTotal
        );
      } else if (dto.timeTakenSeconds) {
        average.avgTimeSeconds = dto.timeTakenSeconds;
      }
      
      average.totalAttempts = newTotal;
    }

    await this.averagesRepo.save(average);
  }

  /**
   * Get average for an interaction
   */
  async getAverage(
    interactionTypeId: string,
    lessonId: string,
    substageId: string,
    tenantId?: string
  ) {
    const whereClause: any = {
      interactionTypeId,
      lessonId,
      substageId,
    };
    
    if (tenantId) {
      whereClause.tenantId = tenantId;
    }
    
    return await this.averagesRepo.findOne({
      where: whereClause,
    });
  }

  /**
   * Calculate percentile (what % of students did you beat?)
   */
  private async calculatePercentile(
    score: number,
    interactionTypeId: string,
    lessonId: string,
    substageId: string,
    tenantId?: string
  ): Promise<number> {
    // Count how many results are below this score
    const countBelow = await this.resultsRepo.count({
      where: {
        interactionTypeId,
        lessonId,
        substageId,
        tenantId,
        score: score as any, // TypeORM uses LessThan() for proper query
      },
    });

    // Get total count
    const total = await this.resultsRepo.count({
      where: {
        interactionTypeId,
        lessonId,
        substageId,
        tenantId,
      },
    });

    if (total === 0) return 50; // No data, return median

    return Math.round((countBelow / total) * 100);
  }
}

