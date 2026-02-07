import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SuperAdminController } from './super-admin.controller';
import { SuperAdminService } from './super-admin.service';
import { LlmGenerationLog } from '../../entities/llm-generation-log.entity';
import { User } from '../../entities/user.entity';
import { LlmProvider } from '../../entities/llm-provider.entity';
import { AiPromptsModule } from '../ai-prompts/ai-prompts.module';
import { UserPersonalizationModule } from '../user-personalization/user-personalization.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([LlmGenerationLog, User, LlmProvider]),
    AiPromptsModule, // For accessing AiPromptsService
    UserPersonalizationModule, // For onboarding popular selections and options
  ],
  controllers: [SuperAdminController],
  providers: [SuperAdminService],
  exports: [SuperAdminService],
})
export class SuperAdminModule {}

