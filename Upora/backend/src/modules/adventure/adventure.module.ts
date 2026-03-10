import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdventureSession } from '../../entities/adventure-session.entity';
import { AdventureController } from './adventure.controller';
import { AdventureService } from './adventure.service';
import { GrokService } from '../../services/grok.service';
import { LlmProvider } from '../../entities/llm-provider.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([AdventureSession, LlmProvider]),
  ],
  controllers: [AdventureController],
  providers: [AdventureService, GrokService],
  exports: [AdventureService],
})
export class AdventureModule {}
