import { IsString, IsOptional, IsEnum, IsObject } from 'class-validator';

export class CreateContentSourceDto {
  @IsString()
  tenantId: string;

  @IsEnum(['url', 'pdf', 'image', 'api', 'text'])
  type: 'url' | 'pdf' | 'image' | 'api' | 'text';

  @IsOptional()
  @IsString()
  sourceUrl?: string;

  @IsOptional()
  @IsString()
  filePath?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  summary?: string;

  @IsOptional()
  @IsString()
  fullText?: string;

  @IsOptional()
  @IsObject()
  metadata?: any;

  @IsString()
  createdBy: string;
}

