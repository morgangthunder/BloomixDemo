import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';
import { MessageDeliverySettingsModule } from '../message-delivery-settings/message-delivery-settings.module';
import { Notification } from '../../entities/notification.entity';
import { User } from '../../entities/user.entity';
import { Usage } from '../../entities/usage.entity';
import { UserInteractionProgress } from '../../entities/user-interaction-progress.entity';
import { Lesson } from '../../entities/lesson.entity';
import { ChatModule } from '../chat/chat.module';

@Module({
  imports: [
    MessageDeliverySettingsModule,
    TypeOrmModule.forFeature([
      Notification,
      User,
      Usage,
      UserInteractionProgress,
      Lesson,
    ]),
    ChatModule,
  ],
  controllers: [MessagesController],
  providers: [MessagesService],
  exports: [MessagesService],
})
export class MessagesModule {}
