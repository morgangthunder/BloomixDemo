import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Headers,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ContentSourcesService } from './content-sources.service';
import { CreateContentSourceDto } from './dto/create-content-source.dto';
import { UpdateContentSourceDto } from './dto/update-content-source.dto';
import { SearchContentDto } from './dto/search-content.dto';

@Controller('content-sources')
export class ContentSourcesController {
  constructor(private readonly contentSourcesService: ContentSourcesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body() createDto: CreateContentSourceDto,
    @Headers('x-tenant-id') tenantId: string,
    @Headers('x-user-id') userId: string,
  ) {
    return this.contentSourcesService.create({
      ...createDto,
      tenantId,
      createdBy: userId,
    });
  }

  @Get()
  findAll(
    @Headers('x-tenant-id') tenantId?: string,
    @Query('status') status?: string,
  ) {
    return this.contentSourcesService.findAll(tenantId, status);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-tenant-id') tenantId?: string,
  ) {
    return this.contentSourcesService.findOne(id, tenantId);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateContentSourceDto,
    @Headers('x-tenant-id') tenantId?: string,
  ) {
    return this.contentSourcesService.update(id, updateDto, tenantId);
  }

  @Post(':id/submit')
  @HttpCode(HttpStatus.OK)
  submit(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-tenant-id') tenantId?: string,
  ) {
    return this.contentSourcesService.submit(id, tenantId);
  }

  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  approve(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-user-id') approvedBy: string,
    @Headers('x-tenant-id') tenantId?: string,
  ) {
    return this.contentSourcesService.approve(id, approvedBy, tenantId);
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('reason') reason: string,
    @Headers('x-user-id') rejectedBy: string,
    @Headers('x-tenant-id') tenantId?: string,
  ) {
    return this.contentSourcesService.reject(id, reason, rejectedBy, tenantId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-tenant-id') tenantId?: string,
  ) {
    return this.contentSourcesService.remove(id, tenantId);
  }

  @Post('search')
  @HttpCode(HttpStatus.OK)
  semanticSearch(@Body() searchDto: SearchContentDto) {
    return this.contentSourcesService.semanticSearch(searchDto);
  }

  @Post('link-to-lesson')
  @HttpCode(HttpStatus.CREATED)
  linkToLesson(
    @Body('lessonId') lessonId: string,
    @Body('contentSourceId') contentSourceId: string,
    @Body('relevanceScore') relevanceScore?: number,
  ) {
    return this.contentSourcesService.linkToLesson(lessonId, contentSourceId, relevanceScore);
  }

  @Get('lesson/:lessonId')
  getLinkedContent(@Param('lessonId', ParseUUIDPipe) lessonId: string) {
    return this.contentSourcesService.getLinkedContent(lessonId);
  }

  @Delete('lesson/:lessonId/content/:contentSourceId')
  @HttpCode(HttpStatus.NO_CONTENT)
  unlinkFromLesson(
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
    @Param('contentSourceId', ParseUUIDPipe) contentSourceId: string,
  ) {
    return this.contentSourcesService.unlinkFromLesson(lessonId, contentSourceId);
  }
}

