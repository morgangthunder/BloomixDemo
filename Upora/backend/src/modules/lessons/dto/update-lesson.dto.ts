import { IsString, IsOptional, IsObject, IsEnum, IsNumber, IsArray, ValidateIf } from 'class-validator';
import { ApprovalStatus } from '../../../common/enums/approval-status.enum';

export class UpdateLessonDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  difficulty?: string;

  @IsOptional()
  @IsNumber()
  durationMinutes?: number;

  @IsOptional()
  @IsString()
  thumbnailUrl?: string;

  @IsOptional()
  @IsArray()
  tags?: string[];

  @IsOptional()
  @IsObject()
  data?: any;

  @IsOptional()
  @IsEnum(ApprovalStatus)
  status?: ApprovalStatus;

  @IsOptional()
  @IsString()
  accessLevel?: string;

  @IsOptional()
  @ValidateIf((o) => o.requiredSubscriptionTier !== null)
  @IsString()
  requiredSubscriptionTier?: string | null;

  @IsOptional()
  @IsObject()
  objectives?: any;
}
