import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InteractionTypesController } from './interaction-types.controller';
import { InteractionTypesService } from './interaction-types.service';
import { InteractionType } from '../../entities/interaction-type.entity';
import { FileStorageService } from '../../services/file-storage.service';
import { ContentSourcesModule } from '../content-sources/content-sources.module';

@Module({
  imports: [TypeOrmModule.forFeature([InteractionType]), ContentSourcesModule],
  controllers: [InteractionTypesController],
  providers: [InteractionTypesService, FileStorageService],
  exports: [InteractionTypesService],
})
export class InteractionTypesModule {}

