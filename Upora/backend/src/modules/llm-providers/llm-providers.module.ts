import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LlmProvidersController } from './llm-providers.controller';
import { LlmProvidersService } from './llm-providers.service';
import { LlmProvider } from '../../entities/llm-provider.entity';

@Module({
  imports: [TypeOrmModule.forFeature([LlmProvider])],
  controllers: [LlmProvidersController],
  providers: [LlmProvidersService],
  exports: [LlmProvidersService],
})
export class LlmProvidersModule {}

