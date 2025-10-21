import { IsString, IsUUID, IsObject, IsOptional, IsUrl } from 'class-validator';

export class CreateLessonDto {
  @IsUUID()
  tenantId: string;

  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsUrl()
  @IsOptional()
  thumbnailUrl?: string;

  @IsObject()
  data: {
    stages: any[];
    prompts?: any[];
    metadata?: any;
  };

  @IsUUID()
  createdBy: string;
}
