import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SuperAdminController } from './super-admin.controller';
import { SuperAdminService } from './super-admin.service';
import { LlmGenerationLog } from '../../entities/llm-generation-log.entity';
import { User } from '../../entities/user.entity';
import { LlmProvider } from '../../entities/llm-provider.entity';
import { AiPromptsModule } from '../ai-prompts/ai-prompts.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([LlmGenerationLog, User, LlmProvider]),
    AiPromptsModule, // For accessing AiPromptsService
  ],
  controllers: [SuperAdminController],
  providers: [SuperAdminService],
  exports: [SuperAdminService],
})
export class SuperAdminModule {}

