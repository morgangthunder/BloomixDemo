import { IsString, IsOptional, IsBoolean, IsArray } from 'class-validator';

export class UpdateUserPersonalizationDto {
  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsString()
  ageRange?: string;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  favouriteTvMovies?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  hobbiesInterests?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  learningAreas?: string[];

  @IsOptional()
  @IsBoolean()
  skippedOnboarding?: boolean;
}
