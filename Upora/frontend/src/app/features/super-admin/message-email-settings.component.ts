import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent } from '@ionic/angular/standalone';
import { MessageDeliverySettingsService, MessageDeliverySettings } from '../../core/services/message-delivery-settings.service';

@Component({
  selector: 'app-message-email-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent],
  template: `
    <ion-content [style.--padding-top]="'80px'">
      <div class="page">
        <div class="page-header">
          <button class="back-btn" (click)="goBack()">← Back to Dashboard</button>
          <div class="header-content">
            <h1>✉️ Messages & Email</h1>
            <p class="subtitle">Configure delivery for “Also send by email” when sending messages</p>
          </div>
        </div>

        <div *ngIf="loading" class="loading-state">
          <div class="spinner"></div>
          <p>Loading settings...</p>
        </div>

        <div *ngIf="error" class="error-state">
          <p>{{ error }}</p>
          <button class="retry-btn" (click)="load()">Retry</button>
        </div>

        <div *ngIf="!loading && !error" class="content">
          <form (ngSubmit)="save()" class="settings-form">
            <section class="section">
              <h2 class="section-title">How to send email</h2>
              <p class="section-desc">Choose how “Also send by email” delivers messages: directly via SMTP (e.g. SMTP2GO, Google Workspace) or via an N8N webhook.</p>
              <div class="form-group delivery-method">
                <label class="radio-row">
                  <input type="radio" [(ngModel)]="form.emailDeliveryMethod" name="emailDeliveryMethod" value="smtp">
                  <span>SMTP</span> <span class="radio-desc">(SMTP2GO, Google Workspace, or any SMTP server)</span>
                </label>
                <label class="radio-row">
                  <input type="radio" [(ngModel)]="form.emailDeliveryMethod" name="emailDeliveryMethod" value="n8n_webhook">
                  <span>N8N webhook</span> <span class="radio-desc">(your workflow sends the email)</span>
                </label>
              </div>
            </section>

            <section class="section" *ngIf="form.emailDeliveryMethod === 'smtp'">
              <h2 class="section-title">SMTP credentials</h2>
              <p class="section-desc">Used when delivery method is SMTP. You can use SMTP2GO (free tier) or later switch to Google Workspace SMTP.</p>
              <div class="form-group">
                <label for="smtpHost">SMTP host</label>
                <input id="smtpHost" type="text" [(ngModel)]="form.smtpHost" name="smtpHost" class="form-input" placeholder="e.g. mail.smtp2go.com">
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label for="smtpPort">Port</label>
                  <input id="smtpPort" type="number" [(ngModel)]="form.smtpPort" name="smtpPort" class="form-input" placeholder="2525 or 587" min="1" max="65535">
                </div>
                <label class="checkbox-inline">
                  <input type="checkbox" [(ngModel)]="form.smtpSecure" name="smtpSecure"> Use SSL/TLS (port 465)
                </label>
              </div>
              <div class="form-group">
                <label for="smtpUser">Username</label>
                <input id="smtpUser" type="text" [(ngModel)]="form.smtpUser" name="smtpUser" class="form-input" placeholder="SMTP username">
              </div>
              <div class="form-group">
                <label for="smtpPassword">Password</label>
                <input id="smtpPassword" type="password" [(ngModel)]="form.smtpPassword" name="smtpPassword" class="form-input" placeholder="SMTP password">
                <p class="hint">Optional: set <code>SMTP_PASSWORD</code> in backend env instead of storing here.</p>
              </div>
            </section>

            <section class="section" *ngIf="form.emailDeliveryMethod === 'n8n_webhook'">
              <h2 class="section-title">N8N Webhook</h2>
              <p class="section-desc">When a user checks “Also send by email”, the backend POSTs to this URL. Your N8N workflow then sends the email.</p>
              <div class="form-group">
                <label for="webhook">N8N Webhook URL</label>
                <input id="webhook" type="url" [(ngModel)]="form.n8nWebhookUrl" name="n8nWebhookUrl" class="form-input" placeholder="https://your-n8n.example.com/webhook/xxxx">
                <p class="hint">Leave empty to use backend env <code>N8N_MESSAGES_WEBHOOK_URL</code>.</p>
              </div>
            </section>

            <section class="section">
              <h2 class="section-title">Email “From” (optional)</h2>
              <p class="section-desc">Sender name and address shown in delivered emails.</p>
              <div class="form-group">
                <label for="fromName">From name</label>
                <input id="fromName" type="text" [(ngModel)]="form.emailFromName" name="emailFromName" class="form-input" placeholder="e.g. Upora Team">
              </div>
              <div class="form-group">
                <label for="fromAddress">From email address</label>
                <input id="fromAddress" type="email" [(ngModel)]="form.emailFromAddress" name="emailFromAddress" class="form-input" placeholder="e.g. noreply@yourdomain.com">
              </div>
            </section>

            <div class="form-actions">
              <button type="button" class="btn-secondary" (click)="goBack()">Cancel</button>
              <button type="submit" class="btn-primary" [disabled]="saving">
                {{ saving ? 'Saving...' : 'Save settings' }}
              </button>
            </div>
            <p *ngIf="saveMessage" class="save-message" [class.error]="saveError">{{ saveMessage }}</p>
          </form>

          <section class="section help-section">
            <h2 class="section-title">SMTP2GO setup (recommended)</h2>
            <div class="help-content">
              <ul>
                <li>Sign up at <a href="https://www.smtp2go.com" target="_blank" rel="noopener">SMTP2GO</a> (free tier: 1,000 emails/month).</li>
                <li>In SMTP2GO: <strong>Settings → SMTP Users</strong> → Add SMTP User. Set username and password (use a strong password; you’ll enter it above).</li>
                <li>Use <strong>Host</strong>: <code>mail.smtp2go.com</code> (or <code>mail-us.smtp2go.com</code> / <code>mail-eu.smtp2go.com</code> for region). <strong>Port</strong>: <code>2525</code> (or 587). Leave “Use SSL/TLS” off for 2525/587, or use port 465 with SSL on.</li>
                <li>Verify a sender: <strong>Sending → Sender Domains</strong> or single sender so SMTP2GO can send from your address. Then set that address as <strong>From email address</strong> above.</li>
              </ul>
              <h3>Later: Google Workspace</h3>
              <p>To use your company email (Google hosted): set delivery method to SMTP, host <code>smtp.gmail.com</code>, port <code>587</code>, your Google email as username, and an <a href="https://support.google.com/accounts/answer/185833" target="_blank" rel="noopener">App Password</a> as password (if 2FA is on).</p>
              <h3>N8N webhook option</h3>
              <p>If you prefer to send via an N8N workflow, choose <strong>N8N webhook</strong> and set the webhook URL. Use <code>n8n/workflows/upora-message-email.json</code> and configure the Send Email (or SMTP) node in n8n.</p>
            </div>
          </section>
        </div>
      </div>
    </ion-content>
  `,
  styles: [`
    .page { min-height: 100vh; background: linear-gradient(135deg, #0f0f23 0%, #1a1a2e 100%); padding: 2rem; padding-top: 1rem; }
    .page-header { margin-bottom: 2rem; }
    .back-btn { background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: #00d4ff; padding: 0.5rem 1rem; border-radius: 8px; cursor: pointer; margin-bottom: 1rem; }
    .back-btn:hover { background: rgba(255,255,255,0.15); }
    .header-content h1 { font-size: 2rem; color: #fff; margin: 0 0 0.5rem 0; }
    .subtitle { color: rgba(255,255,255,0.7); margin: 0; font-size: 1rem; }
    .loading-state, .error-state { text-align: center; color: #fff; padding: 2rem; }
    .spinner { width: 40px; height: 40px; border: 3px solid rgba(255,255,255,0.2); border-top-color: #00d4ff; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 1rem; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .retry-btn { background: #00d4ff; color: #0f0f23; border: none; padding: 0.5rem 1rem; border-radius: 8px; cursor: pointer; margin-top: 1rem; }
    .content { max-width: 720px; margin: 0 auto; }
    .section { margin-bottom: 2rem; }
    .section-title { font-size: 1.25rem; color: #00d4ff; margin: 0 0 0.5rem 0; }
    .section-desc { color: rgba(255,255,255,0.7); margin: 0 0 1rem 0; font-size: 0.95rem; }
    .form-group { margin-bottom: 1rem; }
    .form-group label { display: block; color: rgba(255,255,255,0.9); margin-bottom: 0.35rem; font-size: 0.95rem; }
    .form-input { width: 100%; padding: 0.6rem 0.75rem; border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; background: rgba(255,255,255,0.05); color: #fff; font-size: 1rem; box-sizing: border-box; }
    .form-input::placeholder { color: rgba(255,255,255,0.4); }
    .hint { color: rgba(255,255,255,0.5); font-size: 0.85rem; margin: 0.35rem 0 0 0; }
    .hint code { background: rgba(0,0,0,0.3); padding: 0.1rem 0.3rem; border-radius: 4px; }
    .form-actions { display: flex; gap: 1rem; margin-top: 1.5rem; }
    .btn-primary { background: #00d4ff; color: #0f0f23; border: none; padding: 0.6rem 1.2rem; border-radius: 8px; font-weight: 600; cursor: pointer; }
    .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
    .btn-secondary { background: rgba(255,255,255,0.1); color: #fff; border: 1px solid rgba(255,255,255,0.2); padding: 0.6rem 1.2rem; border-radius: 8px; cursor: pointer; }
    .save-message { margin-top: 1rem; color: #4ade80; }
    .save-message.error { color: #f87171; }
    .help-section { border-top: 1px solid rgba(255,255,255,0.1); padding-top: 2rem; }
    .help-content { color: rgba(255,255,255,0.85); font-size: 0.95rem; }
    .help-content h3 { font-size: 1rem; color: #00d4ff; margin: 1rem 0 0.5rem 0; }
    .help-content ul { margin: 0 0 0.5rem 0; padding-left: 1.5rem; }
    .help-content li { margin-bottom: 0.25rem; }
    .help-content a { color: #00d4ff; }
    .help-content code { background: rgba(0,0,0,0.3); padding: 0.1rem 0.3rem; border-radius: 4px; }
    .help-note { margin-top: 1rem; color: rgba(255,255,255,0.6); font-size: 0.9rem; }
    .delivery-method { display: flex; flex-direction: column; gap: 0.75rem; }
    .radio-row { display: flex; align-items: center; gap: 0.5rem; cursor: pointer; color: #e8e8e8; font-weight: normal; }
    .radio-row input { width: auto; margin: 0; }
    .radio-desc { color: rgba(255,255,255,0.6); font-size: 0.9rem; font-weight: normal; }
    .form-row { display: flex; align-items: center; gap: 1rem; flex-wrap: wrap; margin-bottom: 1rem; }
    .form-row .form-group { margin-bottom: 0; flex: 0 0 auto; max-width: 120px; }
    .checkbox-inline { display: flex; align-items: center; gap: 0.5rem; color: rgba(255,255,255,0.9); cursor: pointer; font-size: 0.95rem; }
    .checkbox-inline input { width: auto; margin: 0; }
  `],
})
export class MessageEmailSettingsComponent implements OnInit {
  loading = true;
  error = '';
  saving = false;
  saveMessage = '';
  saveError = false;
  form: {
    emailDeliveryMethod: 'smtp' | 'n8n_webhook';
    n8nWebhookUrl: string;
    emailFromName: string;
    emailFromAddress: string;
    smtpHost: string;
    smtpPort: number | null;
    smtpSecure: boolean;
    smtpUser: string;
    smtpPassword: string;
  } = {
    emailDeliveryMethod: 'n8n_webhook',
    n8nWebhookUrl: '',
    emailFromName: '',
    emailFromAddress: '',
    smtpHost: '',
    smtpPort: 2525,
    smtpSecure: false,
    smtpUser: '',
    smtpPassword: '',
  };

  constructor(
    private router: Router,
    private messageDeliverySettings: MessageDeliverySettingsService,
  ) {}

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading = true;
    this.error = '';
    this.messageDeliverySettings.getSettings().subscribe({
      next: (s: MessageDeliverySettings) => {
        this.form.emailDeliveryMethod = (s.emailDeliveryMethod || 'n8n_webhook') as 'smtp' | 'n8n_webhook';
        this.form.n8nWebhookUrl = s.n8nWebhookUrl ?? '';
        this.form.emailFromName = s.emailFromName ?? '';
        this.form.emailFromAddress = s.emailFromAddress ?? '';
        this.form.smtpHost = s.smtpHost ?? '';
        this.form.smtpPort = s.smtpPort ?? 2525;
        this.form.smtpSecure = s.smtpSecure ?? false;
        this.form.smtpUser = s.smtpUser ?? '';
        this.form.smtpPassword = ''; // Never show real password; use placeholder if masked
        this.loading = false;
      },
      error: (err) => {
        this.error = err?.error?.message || err?.message || 'Failed to load settings';
        this.loading = false;
      },
    });
  }

  save() {
    this.saving = true;
    this.saveMessage = '';
    this.saveError = false;
    this.messageDeliverySettings.updateSettings({
      emailDeliveryMethod: this.form.emailDeliveryMethod,
      n8nWebhookUrl: this.form.n8nWebhookUrl.trim() || null,
      emailFromName: this.form.emailFromName.trim() || null,
      emailFromAddress: this.form.emailFromAddress.trim() || null,
      smtpHost: this.form.smtpHost.trim() || null,
      smtpPort: this.form.smtpPort ?? null,
      smtpSecure: this.form.smtpSecure,
      smtpUser: this.form.smtpUser.trim() || null,
      smtpPassword: this.form.smtpPassword ? this.form.smtpPassword : undefined,
    }).subscribe({
      next: () => {
        this.saveMessage = 'Settings saved.';
        this.saving = false;
      },
      error: (err) => {
        this.saveMessage = err?.error?.message || err?.message || 'Failed to save';
        this.saveError = true;
        this.saving = false;
      },
    });
  }

  goBack() {
    this.router.navigate(['/super-admin']);
  }
}
