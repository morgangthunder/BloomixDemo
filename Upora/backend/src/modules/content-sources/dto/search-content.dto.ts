import { IsString, IsOptional, IsNumber, Min, Max } from 'class-validator';

export class SearchContentDto {
  @IsString()
  query: string;

  @IsString()
  tenantId: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  offset?: number;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  status?: string;
}

