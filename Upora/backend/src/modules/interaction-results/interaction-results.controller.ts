import { Controller, Post, Get, Body, Param, Headers } from '@nestjs/common';
import { InteractionResultsService, SaveResultDto } from './interaction-results.service';

@Controller('interaction-results')
export class InteractionResultsController {
  constructor(private readonly resultsService: InteractionResultsService) {}

  @Post()
  async saveResult(
    @Body() body: Omit<SaveResultDto, 'studentId' | 'tenantId'>,
    @Headers('x-user-id') userId: string,
    @Headers('x-tenant-id') tenantId: string,
  ) {
    return await this.resultsService.saveResult({
      ...body,
      studentId: userId,
      tenantId,
    });
  }

  @Get('average/:interactionTypeId/:lessonId/:substageId')
  async getAverage(
    @Param('interactionTypeId') interactionTypeId: string,
    @Param('lessonId') lessonId: string,
    @Param('substageId') substageId: string,
    @Headers('x-tenant-id') tenantId?: string,
  ) {
    const average = await this.resultsService.getAverage(
      interactionTypeId,
      lessonId,
      substageId,
      tenantId
    );

    return {
      avgScore: average?.avgScore || null,
      totalAttempts: average?.totalAttempts || 0,
      avgTimeSeconds: average?.avgTimeSeconds || null,
    };
  }
}

