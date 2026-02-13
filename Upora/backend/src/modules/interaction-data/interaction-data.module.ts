import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InteractionDataController } from './interaction-data.controller';
import { InteractionDataService } from '../../services/interaction-data.service';
import { InteractionInstanceData } from '../../entities/interaction-instance-data.entity';
import { UserInteractionProgress } from '../../entities/user-interaction-progress.entity';
import { UserPublicProfile } from '../../entities/user-public-profile.entity';
import { InteractionType } from '../../entities/interaction-type.entity';
import { SuperAdminModule } from '../super-admin/super-admin.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      InteractionInstanceData,
      UserInteractionProgress,
      UserPublicProfile,
      InteractionType,
    ]),
    SuperAdminModule,
  ],
  controllers: [InteractionDataController],
  providers: [InteractionDataService],
  exports: [InteractionDataService],
})
export class InteractionDataModule {}

