import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Headers,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';
import { LessonsService } from './lessons.service';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';

@Controller('lessons')
export class LessonsController {
  constructor(private readonly lessonsService: LessonsService) {}

  @Post()
  create(@Body() createLessonDto: CreateLessonDto) {
    return this.lessonsService.create(createLessonDto);
  }

  @Get()
  findAll(
    @Headers('x-tenant-id') tenantId?: string,
    @Query('status') status?: string,
    @Query('approved') approved?: string,
  ) {
    // Support both ?status=approved and ?approved=true for backwards compatibility
    const onlyApproved = status === 'approved' || approved === 'true';
    console.log(`[LessonsController] GET /lessons - tenantId: ${tenantId}, status: ${status}, onlyApproved: ${onlyApproved}`);
    return this.lessonsService.findAll(tenantId, onlyApproved);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-tenant-id') tenantId?: string,
  ) {
    return this.lessonsService.findOne(id, tenantId);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateLessonDto: UpdateLessonDto,
    @Headers('x-user-id') userId: string,
    @Headers('x-tenant-id') tenantId?: string,
  ) {
    console.log('🔥🔥🔥 BACKEND LESSONS API VERSION 0.0.1 🔥🔥🔥');
    console.log('[LessonsController] PATCH /:id - Version 0.0.1');
    console.log('[LessonsController] Updating lesson:', id);
    console.log('[LessonsController] Payload keys:', Object.keys(updateLessonDto));
    console.log('[LessonsController] Has data field:', !!updateLessonDto.data);
    
    return this.lessonsService.update(id, updateLessonDto, userId, tenantId);
  }

  @Delete(':id')
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-user-id') userId: string,
    @Headers('x-tenant-id') tenantId?: string,
  ) {
    return this.lessonsService.remove(id, userId, tenantId);
  }

  @Post(':id/submit')
  submitForApproval(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-user-id') userId: string,
    @Headers('x-tenant-id') tenantId?: string,
  ) {
    return this.lessonsService.submitForApproval(id, userId, tenantId);
  }

  @Post(':id/approve')
  approve(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-tenant-id') tenantId?: string,
  ) {
    return this.lessonsService.approve(id, tenantId);
  }

  @Post(':id/reject')
  reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-tenant-id') tenantId?: string,
  ) {
    return this.lessonsService.reject(id, tenantId);
  }

  @Post(':id/view')
  trackView(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-user-id') userId: string,
    @Headers('x-tenant-id') tenantId: string,
  ) {
    return this.lessonsService.trackView(id, userId, tenantId);
  }

  @Post(':id/complete')
  markCompletion(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-user-id') userId: string,
    @Headers('x-tenant-id') tenantId: string,
  ) {
    return this.lessonsService.markCompletion(id, userId, tenantId);
  }
}
