import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SuperAdminController } from './super-admin.controller';
import { SuperAdminService } from './super-admin.service';
import { SuperAdminUsersController } from './super-admin-users.controller';
import { SuperAdminUsersService } from './super-admin-users.service';
import { N8nApiService } from './n8n-api.service';
import { MessageDeliverySettingsModule } from '../message-delivery-settings/message-delivery-settings.module';
import { LlmGenerationLog } from '../../entities/llm-generation-log.entity';
import { User } from '../../entities/user.entity';
import { LlmProvider } from '../../entities/llm-provider.entity';
import { UserPublicProfile } from '../../entities/user-public-profile.entity';
import { UserPersonalization } from '../../entities/user-personalization.entity';
import { Usage } from '../../entities/usage.entity';
import { UserInteractionProgress } from '../../entities/user-interaction-progress.entity';
import { LessonEngagementTranscription } from '../../entities/lesson-engagement-transcription.entity';
import { Lesson } from '../../entities/lesson.entity';
import { AiPromptsModule } from '../ai-prompts/ai-prompts.module';
import { UserPersonalizationModule } from '../user-personalization/user-personalization.module';
import { FileStorageService } from '../../services/file-storage.service';

@Module({
  imports: [
    MessageDeliverySettingsModule,
    TypeOrmModule.forFeature([
      LlmGenerationLog,
      User,
      LlmProvider,
      UserPublicProfile,
      UserPersonalization,
      Usage,
      UserInteractionProgress,
      LessonEngagementTranscription,
      Lesson,
    ]),
    AiPromptsModule,
    UserPersonalizationModule,
  ],
  controllers: [SuperAdminController, SuperAdminUsersController],
  providers: [SuperAdminService, SuperAdminUsersService, N8nApiService, FileStorageService],
  exports: [SuperAdminService, SuperAdminUsersService],
})
export class SuperAdminModule {}

