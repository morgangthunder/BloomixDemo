import { Module } from '@nestjs/common';
import { ChatGateway } from '../../gateway/chat.gateway';
import { GrokService } from '../../services/grok.service';
import { TokenTrackingService } from '../../services/token-tracking.service';

@Module({
  providers: [ChatGateway, GrokService, TokenTrackingService],
  exports: [ChatGateway, GrokService, TokenTrackingService],
})
export class ChatModule {}

