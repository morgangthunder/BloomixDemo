import { IsString, IsOptional, IsEnum, IsObject, ValidateIf } from 'class-validator';

export class CreateContentSourceDto {
  @IsEnum(['url', 'pdf', 'image', 'api', 'text'])
  type: 'url' | 'pdf' | 'image' | 'api' | 'text';

  @IsOptional()
  @IsString()
  @ValidateIf((o) => o.sourceUrl !== '' && o.sourceUrl !== null)
  sourceUrl?: string;

  @IsOptional()
  @IsString()
  @ValidateIf((o) => o.filePath !== '' && o.filePath !== null)
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

  // NOTE: tenantId and createdBy are injected by the controller from headers
  // They should NOT be part of the request body
}

