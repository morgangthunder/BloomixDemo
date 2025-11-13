import { IsString, IsOptional, IsBoolean, IsNumber, IsArray, IsObject, IsIn } from 'class-validator';

export class CreateInteractionTypeDto {
  @IsString()
  id: string; // e.g., 'custom-drag-drop'

  @IsString()
  name: string;

  @IsString()
  @IsIn(['html', 'pixijs', 'iframe'])
  interactionTypeCategory: 'html' | 'pixijs' | 'iframe';

  @IsOptional()
  @IsString()
  category?: string; // TEACH stage category

  @IsString()
  description: string;

  @IsOptional()
  @IsObject()
  schema?: any;

  @IsOptional()
  @IsString()
  generationPrompt?: string;

  @IsOptional()
  @IsString()
  pixiRenderer?: string;

  @IsOptional()
  @IsString()
  htmlCode?: string; // For HTML interactions

  @IsOptional()
  @IsString()
  cssCode?: string; // For HTML interactions

  @IsOptional()
  @IsString()
  jsCode?: string; // For HTML/PixiJS interactions

  @IsOptional()
  @IsString()
  iframeUrl?: string; // For iFrame interactions

  @IsOptional()
  @IsObject()
  iframeConfig?: any; // For iFrame interactions (width, height, permissions)

  @IsOptional()
  @IsNumber()
  minConfidence?: number;

  @IsOptional()
  @IsArray()
  teachStageFit?: string[];

  @IsOptional()
  @IsArray()
  requiresResources?: string[];

  @IsOptional()
  @IsString()
  cognitiveLoad?: string;

  @IsOptional()
  @IsNumber()
  estimatedDuration?: number;

  @IsOptional()
  @IsObject()
  assetRequirements?: any;

  @IsOptional()
  @IsObject()
  mobileAdaptations?: any;

  @IsOptional()
  @IsString()
  scoringLogic?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateInteractionTypeDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  @IsIn(['html', 'pixijs', 'iframe'])
  interactionTypeCategory?: 'html' | 'pixijs' | 'iframe';

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsObject()
  schema?: any;

  @IsOptional()
  @IsString()
  generationPrompt?: string;

  @IsOptional()
  @IsString()
  pixiRenderer?: string;

  @IsOptional()
  @IsString()
  htmlCode?: string;

  @IsOptional()
  @IsString()
  cssCode?: string;

  @IsOptional()
  @IsString()
  jsCode?: string;

  @IsOptional()
  @IsString()
  iframeUrl?: string;

  @IsOptional()
  @IsObject()
  iframeConfig?: any;

  @IsOptional()
  @IsNumber()
  minConfidence?: number;

  @IsOptional()
  @IsArray()
  teachStageFit?: string[];

  @IsOptional()
  @IsArray()
  requiresResources?: string[];

  @IsOptional()
  @IsString()
  cognitiveLoad?: string;

  @IsOptional()
  @IsNumber()
  estimatedDuration?: number;

  @IsOptional()
  @IsObject()
  assetRequirements?: any;

  @IsOptional()
  @IsObject()
  mobileAdaptations?: any;

  @IsOptional()
  @IsString()
  scoringLogic?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

