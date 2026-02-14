import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Feedback, FeedbackReply } from '../../entities/feedback.entity';
import { User } from '../../entities/user.entity';
import { FeedbackService } from './feedback.service';
import { FeedbackController } from './feedback.controller';
import { MessagesModule } from '../messages/messages.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Feedback, FeedbackReply, User]),
    forwardRef(() => MessagesModule),
  ],
  controllers: [FeedbackController],
  providers: [FeedbackService],
  exports: [FeedbackService],
})
export class FeedbackModule {}
