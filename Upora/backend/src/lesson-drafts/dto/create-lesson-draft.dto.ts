import { IsString, IsUUID, IsOptional, IsNumber, IsObject } from 'class-validator';

export class CreateLessonDraftDto {
  @IsUUID('all')
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

