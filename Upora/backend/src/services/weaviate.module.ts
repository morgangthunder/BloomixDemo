import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WeaviateService } from './weaviate.service';
import { ProcessedContentOutput } from '../entities/processed-content-output.entity';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([ProcessedContentOutput])],
  providers: [WeaviateService],
  exports: [WeaviateService],
})
export class WeaviateModule {}

