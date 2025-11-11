import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InteractionResultsController } from './interaction-results.controller';
import { InteractionResultsService } from './interaction-results.service';
import { InteractionResult } from '../../entities/interaction-result.entity';
import { InteractionAverage } from '../../entities/interaction-average.entity';

@Module({
  imports: [TypeOrmModule.forFeature([InteractionResult, InteractionAverage])],
  controllers: [InteractionResultsController],
  providers: [InteractionResultsService],
  exports: [InteractionResultsService],
})
export class InteractionResultsModule {}

