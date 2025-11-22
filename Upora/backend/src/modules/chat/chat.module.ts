import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatGateway } from '../../gateway/chat.gateway';
import { GrokService } from '../../services/grok.service';
import { TokenTrackingService } from '../../services/token-tracking.service';
import { LlmProvider } from '../../entities/llm-provider.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([LlmProvider]),
  ],
  providers: [ChatGateway, GrokService, TokenTrackingService],
  exports: [ChatGateway, GrokService, TokenTrackingService],
})
export class ChatModule {}

