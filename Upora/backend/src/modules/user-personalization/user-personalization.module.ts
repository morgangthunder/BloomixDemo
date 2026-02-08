import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserPersonalization } from '../../entities/user-personalization.entity';
import { PersonalizationOption } from '../../entities/personalization-option.entity';
import { UserPersonalizationService } from './user-personalization.service';
import { UserPersonalizationController } from './user-personalization.controller';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserPersonalization, PersonalizationOption]),
    UsersModule,
  ],
  controllers: [UserPersonalizationController],
  providers: [UserPersonalizationService],
  exports: [UserPersonalizationService],
})
export class UserPersonalizationModule {}
