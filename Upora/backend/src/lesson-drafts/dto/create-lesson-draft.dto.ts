import { IsString, IsUUID, IsOptional, IsNumber, IsObject, Matches } from 'class-validator';

export class CreateLessonDraftDto {
  @IsString()
  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, {
    message: 'lessonId must be a valid UUID format'
  })
  lessonId: string;

  @IsOptional()
  @IsUUID()
  tenantId?: string;

  @IsOptional()
  @IsUUID()
  accountId?: string;

  @IsObject()
  draftData: any;

  @IsOptional()
  @IsString()
  changeSummary?: string;

  @IsOptional()
  @IsNumber()
  changesCount?: number;
}

