import { Injectable, NotFoundException, ForbiddenException, Inject, forwardRef, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { Feedback, FeedbackReply, FeedbackStatus } from '../../entities/feedback.entity';
import { User } from '../../entities/user.entity';
import { MessagesService } from '../messages/messages.service';

export interface FeedbackResponse {
  id: string;
  userId: string;
  subject: string;
  body: string;
  status: FeedbackStatus;
  createdAt: Date;
  updatedAt: Date;
  user?: { id: string; email: string; username?: string };
  replies?: FeedbackReplyResponse[];
}

export interface FeedbackReplyResponse {
  id: string;
  feedbackId: string;
  fromUserId: string;
  body: string;
  createdAt: Date;
  fromUser?: { id: string; email: string; username?: string };
}

@Injectable()
export class FeedbackService {
  private readonly logger = new Logger(FeedbackService.name);

  constructor(
    @InjectRepository(Feedback) private readonly feedbackRepo: Repository<Feedback>,
    @InjectRepository(FeedbackReply) private readonly replyRepo: Repository<FeedbackReply>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @Inject(forwardRef(() => MessagesService)) private readonly messagesService: MessagesService,
  ) {}

  /** Submit feedback (from a user). */
  async submitFeedback(userId: string, subject: string, body: string): Promise<FeedbackResponse> {
    const user = await this.userRepo.findOne({ where: { id: userId }, select: ['id', 'feedbackEnabled'] });
    if (!user) throw new NotFoundException('User not found');
    if (!user.feedbackEnabled) throw new ForbiddenException('Feedback is not enabled for your account');

    const feedback = this.feedbackRepo.create({ userId, subject, body, status: FeedbackStatus.PENDING });
    const saved = await this.feedbackRepo.save(feedback);
    return this.toResponse(saved);
  }

  /** Get all feedback submitted by a specific user (for their Sent tab). */
  async getUserFeedback(userId: string): Promise<FeedbackResponse[]> {
    const items = await this.feedbackRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 100,
    });
    return items.map((f) => this.toResponse(f));
  }

  /** Get all non-archived feedback (super admin). */
  async getAllFeedback(includeArchived = false): Promise<FeedbackResponse[]> {
    const where = includeArchived ? {} : { status: Not(FeedbackStatus.ARCHIVED) };
    const items = await this.feedbackRepo.find({
      where,
      order: { createdAt: 'DESC' },
      take: 500,
    });
    // Load user info
    const userIds = [...new Set(items.map((f) => f.userId))];
    const users = userIds.length > 0
      ? await this.userRepo.find({ where: userIds.map((id) => ({ id })), select: ['id', 'email', 'username'] })
      : [];
    const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

    return items.map((f) => ({
      ...this.toResponse(f),
      user: userMap[f.userId] ? { id: userMap[f.userId].id, email: userMap[f.userId].email, username: userMap[f.userId].username || undefined } : undefined,
    }));
  }

  /** Get archived feedback (super admin). */
  async getArchivedFeedback(): Promise<FeedbackResponse[]> {
    const items = await this.feedbackRepo.find({
      where: { status: FeedbackStatus.ARCHIVED },
      order: { updatedAt: 'DESC' },
      take: 500,
    });
    const userIds = [...new Set(items.map((f) => f.userId))];
    const users = userIds.length > 0
      ? await this.userRepo.find({ where: userIds.map((id) => ({ id })), select: ['id', 'email', 'username'] })
      : [];
    const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

    return items.map((f) => ({
      ...this.toResponse(f),
      user: userMap[f.userId] ? { id: userMap[f.userId].id, email: userMap[f.userId].email, username: userMap[f.userId].username || undefined } : undefined,
    }));
  }

  /** Get a single feedback item with replies (thread view). */
  async getFeedbackThread(feedbackId: string): Promise<FeedbackResponse> {
    const feedback = await this.feedbackRepo.findOne({ where: { id: feedbackId } });
    if (!feedback) throw new NotFoundException('Feedback not found');

    const replies = await this.replyRepo.find({
      where: { feedbackId },
      order: { createdAt: 'ASC' },
    });

    // Load user info for feedback author and reply authors
    const userIds = [feedback.userId, ...replies.map((r) => r.fromUserId)];
    const users = await this.userRepo.find({ where: [...new Set(userIds)].map((id) => ({ id })), select: ['id', 'email', 'username'] });
    const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

    return {
      ...this.toResponse(feedback),
      user: userMap[feedback.userId] ? { id: userMap[feedback.userId].id, email: userMap[feedback.userId].email, username: userMap[feedback.userId].username || undefined } : undefined,
      replies: replies.map((r) => ({
        id: r.id,
        feedbackId: r.feedbackId,
        fromUserId: r.fromUserId,
        body: r.body,
        createdAt: r.createdAt,
        fromUser: userMap[r.fromUserId] ? { id: userMap[r.fromUserId].id, email: userMap[r.fromUserId].email, username: userMap[r.fromUserId].username || undefined } : undefined,
      })),
    };
  }

  /** Get all feedback for a specific user (super admin user view). */
  async getFeedbackForUser(userId: string): Promise<FeedbackResponse[]> {
    const items = await this.feedbackRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
    // Also load replies for each
    const result: FeedbackResponse[] = [];
    for (const f of items) {
      const thread = await this.getFeedbackThread(f.id);
      result.push(thread);
    }
    return result;
  }

  /** Reply to feedback (super admin or user). Also sends notification if replier != feedback author. */
  async replyToFeedback(feedbackId: string, fromUserId: string, body: string, sendEmail = false): Promise<FeedbackReplyResponse> {
    const feedback = await this.feedbackRepo.findOne({ where: { id: feedbackId } });
    if (!feedback) throw new NotFoundException('Feedback not found');

    const reply = this.replyRepo.create({ feedbackId, fromUserId, body });
    const saved = await this.replyRepo.save(reply);

    const fromUser = await this.userRepo.findOne({ where: { id: fromUserId }, select: ['id', 'email', 'username'] });

    // Send notification to the other party (admin reply → user, user reply → could notify admin)
    if (fromUserId !== feedback.userId) {
      // Admin replying to user's feedback → notify the feedback author
      try {
        await this.messagesService.createMessage(fromUserId, {
          toUserId: feedback.userId,
          title: `Re: ${feedback.subject} [Feedback]`,
          body,
          sendInApp: true,
          sendEmail,
        }, 'super-admin');
      } catch (err) {
        this.logger.warn(`Failed to send feedback reply notification: ${(err as Error)?.message}`);
      }
    }

    return {
      id: saved.id,
      feedbackId: saved.feedbackId,
      fromUserId: saved.fromUserId,
      body: saved.body,
      createdAt: saved.createdAt,
      fromUser: fromUser ? { id: fromUser.id, email: fromUser.email, username: fromUser.username || undefined } : undefined,
    };
  }

  /** Update feedback status (super admin). */
  async updateStatus(feedbackId: string, status: FeedbackStatus): Promise<FeedbackResponse> {
    const feedback = await this.feedbackRepo.findOne({ where: { id: feedbackId } });
    if (!feedback) throw new NotFoundException('Feedback not found');

    feedback.status = status;
    const saved = await this.feedbackRepo.save(feedback);
    return this.toResponse(saved);
  }

  /** Toggle feedbackEnabled for a user (super admin). */
  async toggleUserFeedback(userId: string, enabled: boolean): Promise<void> {
    await this.userRepo.update(userId, { feedbackEnabled: enabled });
  }

  private toResponse(f: Feedback): FeedbackResponse {
    return {
      id: f.id,
      userId: f.userId,
      subject: f.subject,
      body: f.body,
      status: f.status,
      createdAt: f.createdAt,
      updatedAt: f.updatedAt,
    };
  }
}
