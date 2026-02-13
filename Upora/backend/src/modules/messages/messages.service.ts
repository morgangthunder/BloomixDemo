import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationType } from '../../entities/notification.entity';
import { User } from '../../entities/user.entity';
import { Usage } from '../../entities/usage.entity';
import { UserInteractionProgress } from '../../entities/user-interaction-progress.entity';
import { Lesson } from '../../entities/lesson.entity';
import { ChatGateway } from '../../gateway/chat.gateway';
import { MessageDeliverySettingsService } from '../message-delivery-settings/message-delivery-settings.service';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const nodemailer = require('nodemailer') as {
  createTransport: (opts: { host: string; port: number; secure: boolean; auth: { user: string; pass: string } }) => {
    sendMail: (opts: { from: string; to: string; subject: string; text: string }) => Promise<void>;
  };
};

export interface CreateMessageDto {
  toUserId: string;
  title: string;
  body: string;
  /** Default true. When true, save in-app notification and emit real-time. */
  sendInApp?: boolean;
  /** Default false. When true, trigger N8N webhook to send email (if configured). */
  sendEmail?: boolean;
}

export interface MessageResponse {
  id: string;
  fromUserId: string;
  toUserId: string;
  title: string;
  body: string;
  readAt: Date | null;
  createdAt: Date;
  fromUser?: {
    id: string;
    email: string;
    username?: string;
  };
  toUser?: {
    id: string;
    email: string;
    username?: string;
  };
}

@Injectable()
export class MessagesService {
  private readonly logger = new Logger(MessagesService.name);

  constructor(
    @InjectRepository(Notification)
    private notificationRepo: Repository<Notification>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(Usage)
    private usageRepo: Repository<Usage>,
    @InjectRepository(UserInteractionProgress)
    private progressRepo: Repository<UserInteractionProgress>,
    @InjectRepository(Lesson)
    private lessonRepo: Repository<Lesson>,
    private chatGateway: ChatGateway,
    private messageDeliverySettings: MessageDeliverySettingsService,
  ) {}

  /**
   * Check if requestingUser can message targetUserId.
   * Permissions:
   * - super-admin: can message anyone
   * - lesson-creator: can message own engagers
   * - course-creator: can message own engagers (TODO: when courses are implemented)
   * - hub-admin: can message hub members (TODO: when hubs are implemented)
   */
  async assertCanMessage(
    requestingUserId: string,
    targetUserId: string,
    requestingUserRole?: string,
    tenantId?: string,
  ): Promise<void> {
    const isAdmin = requestingUserRole === 'admin' || requestingUserRole === 'super-admin';
    const isMorganThunder = await this.isMorganThunder(requestingUserId);
    const isSuperAdmin = isAdmin || isMorganThunder;

    if (isSuperAdmin) {
      return; // Super-admin can message anyone
    }

    // Check if targetUserId is an engager of any lesson created by requestingUserId
    const engagerLessonIds = await this.getEngagerLessonIds(requestingUserId, targetUserId, tenantId);
    if (engagerLessonIds.length > 0) {
      return; // Creator can message own engagers
    }

    throw new ForbiddenException('You can only message users who have engaged with your lessons');
  }

  /**
   * Get lesson IDs where requestingUserId is creator and targetUserId is an engager.
   */
  private async getEngagerLessonIds(
    creatorUserId: string,
    engagerUserId: string,
    tenantId?: string,
  ): Promise<string[]> {
    // Get lessons created by creatorUserId
    const where: any = { createdBy: creatorUserId };
    if (tenantId) {
      where.tenantId = tenantId;
    }
    const creatorLessons = await this.lessonRepo.find({ where, select: ['id'] });
    const lessonIds = creatorLessons.map((l) => l.id);

    if (lessonIds.length === 0) {
      return [];
    }

    // Check if engagerUserId has usages or progress for any of these lessons
    const usageResult = await this.usageRepo.query(
      `SELECT DISTINCT resource_id as "lessonId"
       FROM usages
       WHERE user_id = $1
         AND resource_type = 'lesson'
         AND resource_id = ANY($2::uuid[])`,
      [engagerUserId, lessonIds],
    );

    const progressResult = await this.progressRepo.query(
      `SELECT DISTINCT lesson_id as "lessonId"
       FROM user_interaction_progress
       WHERE user_id = $1
         AND lesson_id = ANY($2::uuid[])`,
      [engagerUserId, lessonIds],
    );

    const allLessonIds = [
      ...new Set([
        ...usageResult.map((r: any) => r.lessonId),
        ...progressResult.map((r: any) => r.lessonId),
      ]),
    ];

    return allLessonIds.filter(Boolean);
  }

  private async sendEmailViaSmtp(
    config: {
      host: string;
      port: number;
      secure: boolean;
      user: string;
      password: string;
      fromName: string | null;
      fromAddress: string | null;
    },
    toEmail: string,
    subject: string,
    text: string,
  ): Promise<void> {
    const fromAddress = config.fromAddress?.trim() || config.user;
    const fromName = config.fromName?.trim() || fromAddress;
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: { user: config.user, pass: config.password },
    });
    await transporter.sendMail({
      from: `"${fromName.replace(/"/g, '\\"')}" <${fromAddress}>`,
      to: toEmail,
      subject,
      text,
    });
  }

  private async triggerN8NMessageWebhook(
    url: string,
    payload: {
      messageId?: string;
      toUserId: string;
      toUserEmail: string;
      fromUserId: string;
      fromUserEmail?: string;
      fromName?: string;
      fromAddress?: string;
      title: string;
      body: string;
      createdAt: string;
    },
  ): Promise<void> {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      throw new Error(`N8N webhook returned ${res.status}`);
    }
  }

  private async isMorganThunder(userId: string): Promise<boolean> {
    try {
      const user = await this.userRepo.findOne({ where: { id: userId } });
      if (!user) return false;
      const email = user.email?.toLowerCase() || '';
      return email === 'morganthunder@gmail.com' || email === 'morganthunder@yahoo.com';
    } catch {
      return false;
    }
  }

  /**
   * Create a direct message (notification with type='direct_message').
   */
  async createMessage(
    fromUserId: string,
    dto: CreateMessageDto,
    requestingUserRole?: string,
    tenantId?: string,
  ): Promise<MessageResponse> {
    await this.assertCanMessage(fromUserId, dto.toUserId, requestingUserRole, tenantId);

    const toUser = await this.userRepo.findOne({ where: { id: dto.toUserId } });
    if (!toUser) {
      throw new NotFoundException(`User ${dto.toUserId} not found`);
    }

    const sendInApp = dto.sendInApp !== false;
    const sendEmail = dto.sendEmail === true;

    const fromUser = await this.userRepo.findOne({ where: { id: fromUserId }, select: ['id', 'email', 'username'] });

    let saved: Notification | null = null;
    if (sendInApp) {
      const notification = this.notificationRepo.create({
        userId: dto.toUserId,
        type: NotificationType.DIRECT_MESSAGE,
        title: dto.title,
        body: dto.body,
        fromUserId,
        toUserId: dto.toUserId,
      });
      saved = await this.notificationRepo.save(notification);

      this.chatGateway.emitToUser(dto.toUserId, 'new_message', {
        id: saved.id,
        fromUserId: saved.fromUserId,
        toUserId: saved.toUserId,
        title: saved.title,
        body: saved.body,
        createdAt: saved.createdAt,
        fromUser: fromUser ? { id: fromUser.id, email: fromUser.email, username: fromUser.username } : undefined,
      });
    }

    if (sendEmail && toUser.email) {
      const config = await this.messageDeliverySettings.getEffectiveEmailConfig();
      if (config?.type === 'smtp') {
        this.sendEmailViaSmtp(config, toUser.email, dto.title, dto.body || '').catch((err) =>
          this.logger.warn('SMTP send failed:', err?.message),
        );
      } else if (config?.type === 'n8n') {
        this.triggerN8NMessageWebhook(config.url, {
          messageId: saved?.id ?? undefined,
          toUserId: dto.toUserId,
          toUserEmail: toUser.email,
          fromUserId: fromUserId,
          fromUserEmail: fromUser?.email,
          fromName: config.fromName ?? undefined,
          fromAddress: config.fromAddress ?? undefined,
          title: dto.title,
          body: dto.body || '',
          createdAt: saved?.createdAt?.toISOString() ?? new Date().toISOString(),
        }).catch((err) => this.logger.warn('N8N message webhook failed:', err?.message));
      }
    }

    if (saved) {
      return {
        id: saved.id,
        fromUserId: saved.fromUserId!,
        toUserId: saved.toUserId!,
        title: saved.title,
        body: saved.body || '',
        readAt: saved.readAt,
        createdAt: saved.createdAt,
        fromUser: fromUser
          ? {
              id: fromUser.id,
              email: fromUser.email,
              username: fromUser.username || undefined,
            }
          : undefined,
        toUser: {
          id: toUser.id,
          email: toUser.email,
          username: toUser.username || undefined,
        },
      };
    }

    // Email-only: no in-app notification created
    return {
      id: '',
      fromUserId,
      toUserId: dto.toUserId,
      title: dto.title,
      body: dto.body || '',
      readAt: null,
      createdAt: new Date(),
      fromUser: fromUser
        ? {
            id: fromUser.id,
            email: fromUser.email,
            username: fromUser.username || undefined,
          }
        : undefined,
      toUser: {
        id: toUser.id,
        email: toUser.email,
        username: toUser.username || undefined,
      },
    };
  }

  /**
   * Get messages for a user (sent and received).
   */
  async getMessages(
    userId: string,
    requestingUserRole?: string,
    tenantId?: string,
  ): Promise<{ sent: MessageResponse[]; received: MessageResponse[] }> {
    const [sentNotifications, receivedNotifications] = await Promise.all([
      this.notificationRepo.find({
        where: {
          type: NotificationType.DIRECT_MESSAGE,
          fromUserId: userId,
        },
        order: { createdAt: 'DESC' },
        take: 100,
      }),
      this.notificationRepo.find({
        where: {
          type: NotificationType.DIRECT_MESSAGE,
          toUserId: userId,
        },
        order: { createdAt: 'DESC' },
        take: 100,
      }),
    ]);

    // Load user details for all unique user IDs
    const userIds = new Set<string>();
    sentNotifications.forEach((n) => {
      if (n.fromUserId) userIds.add(n.fromUserId);
      if (n.toUserId) userIds.add(n.toUserId);
    });
    receivedNotifications.forEach((n) => {
      if (n.fromUserId) userIds.add(n.fromUserId);
      if (n.toUserId) userIds.add(n.toUserId);
    });

    const users = await this.userRepo.find({
      where: Array.from(userIds).map((id) => ({ id })),
      select: ['id', 'email', 'username'],
    });
    const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

    const mapToResponse = (n: Notification): MessageResponse => ({
      id: n.id,
      fromUserId: n.fromUserId!,
      toUserId: n.toUserId!,
      title: n.title,
      body: n.body || '',
      readAt: n.readAt,
      createdAt: n.createdAt,
      fromUser: n.fromUserId && userMap[n.fromUserId]
        ? {
            id: userMap[n.fromUserId].id,
            email: userMap[n.fromUserId].email,
            username: userMap[n.fromUserId].username || undefined,
          }
        : undefined,
      toUser: n.toUserId && userMap[n.toUserId]
        ? {
            id: userMap[n.toUserId].id,
            email: userMap[n.toUserId].email,
            username: userMap[n.toUserId].username || undefined,
          }
        : undefined,
    });

    return {
      sent: sentNotifications.map(mapToResponse),
      received: receivedNotifications.map(mapToResponse),
    };
  }

  /**
   * Get unread message count for the current user.
   */
  async getUnreadCount(userId: string): Promise<{ count: number }> {
    const result = await this.notificationRepo
      .createQueryBuilder('n')
      .where('n.type = :type', { type: NotificationType.DIRECT_MESSAGE })
      .andWhere('n.toUserId = :userId', { userId })
      .andWhere('n.read_at IS NULL')
      .getCount();
    return { count: result };
  }

  /**
   * Mark a message as read.
   */
  async markAsRead(
    messageId: string,
    userId: string,
    requestingUserRole?: string,
  ): Promise<MessageResponse> {
    const notification = await this.notificationRepo.findOne({ where: { id: messageId } });
    if (!notification) {
      throw new NotFoundException(`Message ${messageId} not found`);
    }

    if (notification.toUserId !== userId) {
      throw new ForbiddenException('You can only mark your own received messages as read');
    }

    if (!notification.readAt) {
      notification.readAt = new Date();
      await this.notificationRepo.save(notification);
    }

    const fromUser = notification.fromUserId
      ? await this.userRepo.findOne({ where: { id: notification.fromUserId }, select: ['id', 'email', 'username'] })
      : null;
    const toUser = await this.userRepo.findOne({ where: { id: notification.toUserId! }, select: ['id', 'email', 'username'] });

    return {
      id: notification.id,
      fromUserId: notification.fromUserId!,
      toUserId: notification.toUserId!,
      title: notification.title,
      body: notification.body || '',
      readAt: notification.readAt,
      createdAt: notification.createdAt,
      fromUser: fromUser
        ? {
            id: fromUser.id,
            email: fromUser.email,
            username: fromUser.username || undefined,
          }
        : undefined,
      toUser: toUser
        ? {
            id: toUser.id,
            email: toUser.email,
            username: toUser.username || undefined,
          }
        : undefined,
    };
  }
}
