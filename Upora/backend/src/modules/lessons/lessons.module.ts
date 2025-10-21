import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LessonsController } from './lessons.controller';
import { LessonsService } from './lessons.service';
import { Lesson } from '../../entities/lesson.entity';
import { User } from '../../entities/user.entity';
import { Usage } from '../../entities/usage.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Lesson, User, Usage])],
  controllers: [LessonsController],
  providers: [LessonsService],
  exports: [LessonsService],
})
export class LessonsModule {}
