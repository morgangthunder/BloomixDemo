import { IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class OptionItemDto {
  @IsString()
  id: string;

  @IsString()
  label: string;
}

export class UpdateOnboardingOptionsDto {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OptionItemDto)
  options?: OptionItemDto[];

  @IsOptional()
  @IsString()
  ageRange?: string;

  @IsOptional()
  @IsString()
  gender?: string;
}
