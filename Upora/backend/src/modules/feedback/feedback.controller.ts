import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { FeedbackService } from './feedback.service';
import { FeedbackStatus } from '../../entities/feedback.entity';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('feedback')
@UseGuards(JwtAuthGuard)
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  /** Submit feedback (authenticated user). */
  @Post()
  async submit(@Req() req: any, @Body('subject') subject: string, @Body('body') body: string) {
    const userId = req.user?.userId || req.user?.sub;
    return this.feedbackService.submitFeedback(userId, subject, body);
  }

  /** Get my submitted feedback (for Sent tab in Notifications). */
  @Get('mine')
  async getMine(@Req() req: any) {
    const userId = req.user?.userId || req.user?.sub;
    return this.feedbackService.getUserFeedback(userId);
  }

  /** Get a feedback thread (user can view their own). */
  @Get(':id/thread')
  async getThread(@Param('id') id: string) {
    return this.feedbackService.getFeedbackThread(id);
  }

  /** Reply to feedback (user or admin). */
  @Post(':id/reply')
  async reply(@Param('id') id: string, @Req() req: any, @Body('body') body: string, @Body('sendEmail') sendEmail?: boolean) {
    const userId = req.user?.userId || req.user?.sub;
    return this.feedbackService.replyToFeedback(id, userId, body, !!sendEmail);
  }
}
