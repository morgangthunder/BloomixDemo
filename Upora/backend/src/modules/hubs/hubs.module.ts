import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HubsService } from './hubs.service';
import { HubsController } from './hubs.controller';
import { HubsAuthController } from './hubs-auth.controller';
import { HubsAuthService } from './hubs-auth.service';
import { Hub } from '../../entities/hub.entity';
import { HubMember } from '../../entities/hub-member.entity';
import { HubContentLink } from '../../entities/hub-content-link.entity';
import { User } from '../../entities/user.entity';
import { Lesson } from '../../entities/lesson.entity';
import { Course } from '../../entities/course.entity';
import { Notification } from '../../entities/notification.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Hub,
      HubMember,
      HubContentLink,
      User,
      Lesson,
      Course,
      Notification,
    ]),
  ],
  controllers: [HubsController, HubsAuthController],
  providers: [HubsService, HubsAuthService],
  exports: [HubsService, HubsAuthService],
})
export class HubsModule {}
