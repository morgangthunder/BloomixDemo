import { Entity, PrimaryColumn, Column, UpdateDateColumn } from 'typeorm';

export type EmailDeliveryMethod = 'smtp' | 'n8n_webhook';

/**
 * Singleton settings for message delivery (in-app + optional email).
 * Email can be sent via SMTP (e.g. SMTP2GO, Google Workspace) or N8N webhook.
 */
@Entity('message_delivery_settings')
export class MessageDeliverySettings {
  @PrimaryColumn('varchar', { length: 64, default: 'default' })
  id: string;

  /** How to send email when "Also send by email" is checked. */
  @Column({ name: 'email_delivery_method', type: 'varchar', length: 32, default: 'n8n_webhook' })
  emailDeliveryMethod: EmailDeliveryMethod;

  /** N8N webhook URL (used when email_delivery_method = 'n8n_webhook'). Env N8N_MESSAGES_WEBHOOK_URL as fallback. */
  @Column({ name: 'n8n_webhook_url', type: 'varchar', length: 2048, nullable: true })
  n8nWebhookUrl: string | null;

  /** Display name for the sender in emails (e.g. "Upora Team"). */
  @Column({ name: 'email_from_name', type: 'varchar', length: 255, nullable: true })
  emailFromName: string | null;

  /** From email address (e.g. "noreply@yourdomain.com"). */
  @Column({ name: 'email_from_address', type: 'varchar', length: 255, nullable: true })
  emailFromAddress: string | null;

  /** SMTP host (e.g. mail.smtp2go.com). Used when email_delivery_method = 'smtp'. */
  @Column({ name: 'smtp_host', type: 'varchar', length: 255, nullable: true })
  smtpHost: string | null;

  @Column({ name: 'smtp_port', type: 'int', nullable: true })
  smtpPort: number | null;

  @Column({ name: 'smtp_secure', type: 'boolean', default: false })
  smtpSecure: boolean;

  @Column({ name: 'smtp_user', type: 'varchar', length: 255, nullable: true })
  smtpUser: string | null;

  /** SMTP password. Can be overridden by env SMTP_PASSWORD. */
  @Column({ name: 'smtp_password', type: 'varchar', length: 512, nullable: true })
  smtpPassword: string | null;

  /** N8N API key for listing/managing workflows from Super Admin. Create in N8N: Settings → n8n API. */
  @Column({ name: 'n8n_api_key', type: 'varchar', length: 512, nullable: true })
  n8nApiKey: string | null;

  /**
   * Workflow purpose assignments as JSON: { [purposeKey]: { workflowId, webhookUrl, workflowName } }
   * See WORKFLOW_PURPOSES in n8n-api.service.ts for the list of available purpose keys.
   */
  @Column({ name: 'workflow_purposes', type: 'text', nullable: true })
  workflowPurposes: string | null;

  /** When true, new users get feedbackEnabled=true by default. */
  @Column({ name: 'feedback_enabled_by_default', type: 'boolean', default: true })
  feedbackEnabledByDefault: boolean;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
