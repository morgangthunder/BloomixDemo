import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InteractionTypesController } from './interaction-types.controller';
import { InteractionTypesService } from './interaction-types.service';
import { InteractionType } from '../../entities/interaction-type.entity';

@Module({
  imports: [TypeOrmModule.forFeature([InteractionType])],
  controllers: [InteractionTypesController],
  providers: [InteractionTypesService],
  exports: [InteractionTypesService],
})
export class InteractionTypesModule {}

