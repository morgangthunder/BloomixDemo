import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MessageDeliverySettings } from '../../entities/message-delivery-settings.entity';

const DEFAULT_ID = 'default';

export type EmailDeliveryMethod = 'smtp' | 'n8n_webhook';

export interface MessageDeliverySettingsDto {
  emailDeliveryMethod?: EmailDeliveryMethod;
  n8nWebhookUrl?: string | null;
  emailFromName?: string | null;
  emailFromAddress?: string | null;
  smtpHost?: string | null;
  smtpPort?: number | null;
  smtpSecure?: boolean;
  smtpUser?: string | null;
  smtpPassword?: string | null;
  n8nApiKey?: string | null;
}

export type EffectiveEmailConfig =
  | { type: 'smtp'; host: string; port: number; secure: boolean; user: string; password: string; fromName: string | null; fromAddress: string | null }
  | { type: 'n8n'; url: string; fromName: string | null; fromAddress: string | null }
  | null;

@Injectable()
export class MessageDeliverySettingsService {
  constructor(
    @InjectRepository(MessageDeliverySettings)
    private readonly repo: Repository<MessageDeliverySettings>,
  ) {}

  /**
   * Get the singleton settings. Creates default row if missing.
   */
  async getSettings(): Promise<MessageDeliverySettings> {
    let row = await this.repo.findOne({ where: { id: DEFAULT_ID } });
    if (!row) {
      row = this.repo.create({
        id: DEFAULT_ID,
        emailDeliveryMethod: 'n8n_webhook',
        n8nWebhookUrl: null,
        emailFromName: null,
        emailFromAddress: null,
        smtpHost: null,
        smtpPort: null,
        smtpSecure: false,
        smtpUser: null,
        smtpPassword: null,
        n8nApiKey: null,
      });
      await this.repo.save(row);
    }
    return row;
  }

  /**
   * Get webhook URL: from DB first, then env N8N_MESSAGES_WEBHOOK_URL.
   */
  async getWebhookUrl(): Promise<string | null> {
    const s = await this.getSettings();
    if (s.n8nWebhookUrl?.trim()) return s.n8nWebhookUrl.trim();
    const env = process.env.N8N_MESSAGES_WEBHOOK_URL;
    return env?.trim() || null;
  }

  /**
   * Get the effective email config for sending. Prefers SMTP if method is smtp and SMTP is configured.
   */
  async getEffectiveEmailConfig(): Promise<EffectiveEmailConfig> {
    const s = await this.getSettings();
    const method = (s.emailDeliveryMethod || 'n8n_webhook') as EmailDeliveryMethod;

    if (method === 'smtp' && s.smtpHost?.trim() && s.smtpUser?.trim()) {
      const password = process.env.SMTP_PASSWORD?.trim() || s.smtpPassword?.trim() || '';
      if (password) {
        return {
          type: 'smtp',
          host: s.smtpHost.trim(),
          port: s.smtpPort ?? 587,
          secure: !!s.smtpSecure,
          user: s.smtpUser.trim(),
          password,
          fromName: s.emailFromName ?? null,
          fromAddress: s.emailFromAddress ?? null,
        };
      }
    }

    const url = await this.getWebhookUrl();
    if (url) {
      return { type: 'n8n', url, fromName: s.emailFromName ?? null, fromAddress: s.emailFromAddress ?? null };
    }
    return null;
  }

  /**
   * Update settings (partial). Only super-admin should call this.
   */
  async updateSettings(dto: MessageDeliverySettingsDto): Promise<MessageDeliverySettings> {
    const row = await this.getSettings();
    if (dto.emailDeliveryMethod !== undefined) row.emailDeliveryMethod = dto.emailDeliveryMethod as any;
    if (dto.n8nWebhookUrl !== undefined) row.n8nWebhookUrl = dto.n8nWebhookUrl ?? null;
    if (dto.emailFromName !== undefined) row.emailFromName = dto.emailFromName ?? null;
    if (dto.emailFromAddress !== undefined) row.emailFromAddress = dto.emailFromAddress ?? null;
    if (dto.smtpHost !== undefined) row.smtpHost = dto.smtpHost ?? null;
    if (dto.smtpPort !== undefined) row.smtpPort = dto.smtpPort ?? null;
    if (dto.smtpSecure !== undefined) row.smtpSecure = dto.smtpSecure;
    if (dto.smtpUser !== undefined) row.smtpUser = dto.smtpUser ?? null;
    if (dto.smtpPassword !== undefined && dto.smtpPassword !== '********') row.smtpPassword = dto.smtpPassword ?? null;
    if (dto.n8nApiKey !== undefined && dto.n8nApiKey !== '********') row.n8nApiKey = dto.n8nApiKey ?? null;
    return this.repo.save(row);
  }
}
