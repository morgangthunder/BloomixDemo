import { Controller, Get, Param, Post } from '@nestjs/common';
import { InteractionTypesService } from './interaction-types.service';

@Controller('interaction-types')
export class InteractionTypesController {
  constructor(private readonly interactionTypesService: InteractionTypesService) {}

  @Get()
  async findAll() {
    return this.interactionTypesService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.interactionTypesService.findOne(id);
  }

  @Post('seed')
  async seed() {
    await this.interactionTypesService.seedTrueFalseSelection();
    return { message: 'True/False Selection seeded successfully' };
  }
}

