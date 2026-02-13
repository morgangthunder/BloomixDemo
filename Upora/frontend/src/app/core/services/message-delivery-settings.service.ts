import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

export type EmailDeliveryMethod = 'smtp' | 'n8n_webhook';

export interface MessageDeliverySettings {
  id: string;
  emailDeliveryMethod: EmailDeliveryMethod;
  n8nWebhookUrl: string | null;
  emailFromName: string | null;
  emailFromAddress: string | null;
  smtpHost: string | null;
  smtpPort: number | null;
  smtpSecure: boolean;
  smtpUser: string | null;
  smtpPassword: string | null;
  updatedAt: string;
}

export interface UpdateMessageDeliverySettingsDto {
  emailDeliveryMethod?: EmailDeliveryMethod;
  n8nWebhookUrl?: string | null;
  emailFromName?: string | null;
  emailFromAddress?: string | null;
  smtpHost?: string | null;
  smtpPort?: number | null;
  smtpSecure?: boolean;
  smtpUser?: string | null;
  smtpPassword?: string | null;
}

@Injectable({ providedIn: 'root' })
export class MessageDeliverySettingsService {
  constructor(private api: ApiService) {}

  getSettings(): Observable<MessageDeliverySettings> {
    return this.api.get<MessageDeliverySettings>('/super-admin/message-delivery-settings');
  }

  updateSettings(dto: UpdateMessageDeliverySettingsDto): Observable<MessageDeliverySettings> {
    return this.api.patch<MessageDeliverySettings>('/super-admin/message-delivery-settings', dto);
  }
}
