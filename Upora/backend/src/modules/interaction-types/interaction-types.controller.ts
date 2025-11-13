import { Controller, Get, Param, Post, Put, Body, Headers } from '@nestjs/common';
import { InteractionTypesService } from './interaction-types.service';
import { CreateInteractionTypeDto, UpdateInteractionTypeDto } from './dto/interaction-type.dto';

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

  @Post()
  async create(
    @Body() dto: CreateInteractionTypeDto,
    @Headers('x-user-id') userId: string,
    @Headers('x-tenant-id') tenantId: string,
  ) {
    // TODO: Add super-admin role check
    return this.interactionTypesService.create(dto);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: any, // Use any for now to avoid DTO validation issues
    @Headers('x-user-id') userId: string,
    @Headers('x-tenant-id') tenantId: string,
  ) {
    // TODO: Add super-admin role check
    // Remove fields that shouldn't be updated
    const { id: bodyId, createdAt, updatedAt, ...updateData } = dto;
    return this.interactionTypesService.update(id, updateData);
  }

  @Post('seed')
  async seed() {
    await this.interactionTypesService.seedTrueFalseSelection();
    return { message: 'True/False Selection seeded successfully' };
  }
}

