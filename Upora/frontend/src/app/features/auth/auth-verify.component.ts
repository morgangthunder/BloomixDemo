import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { IonContent } from '@ionic/angular/standalone';
import { AuthService } from '../../core/services/auth.service';
import { environment } from '../../../environments/environment';

/**
 * Handles Cognito email verification link: /auth/verify?code=...&username=...&returnUrl=...
 * If code and username are in query params, confirms signup and redirects.
 * Otherwise shows form to enter verification code.
 */
@Component({
  selector: 'app-auth-verify',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, IonContent],
  template: `
    <ion-content>
      <div class="min-h-screen bg-brand-black flex items-center justify-center p-4">
        <div class="w-full max-w-md">
          <h1 class="text-2xl font-bold text-white mb-2">Verify your email</h1>
          <p *ngIf="showForm && !error && !success" class="text-gray-400 mb-6">
            We sent a 6-digit code to your email. Enter it below to complete your account.
          </p>
          <p *ngIf="!showForm && !error && !success" class="text-gray-400 mb-6">Confirming your account...</p>
          <p *ngIf="success" class="text-green-500 mb-6">Account verified! Redirecting...</p>
          <p *ngIf="error" class="text-red-500 mb-6">{{ error }}</p>

          <form *ngIf="showForm && !success" (ngSubmit)="onSubmit()" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-1">Email</label>
              <input
                type="email"
                [(ngModel)]="username"
                name="username"
                required
                class="w-full bg-brand-dark border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-brand-red"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-1">Verification code</label>
              <input
                type="text"
                [(ngModel)]="code"
                name="code"
                required
                maxlength="6"
                inputmode="numeric"
                pattern="[0-9]*"
                autocomplete="one-time-code"
                class="w-full bg-brand-dark border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-brand-red font-mono text-lg tracking-widest"
                placeholder="123456"
              />
              <p class="text-xs text-gray-500 mt-1">Enter the 6-digit code from your email</p>
              <p class="text-xs text-gray-400 mt-2">
                Didn't receive it?
                <button type="button" (click)="resendCode()" [disabled]="resendLoading || resendCooldown > 0" class="text-brand-red hover:underline disabled:opacity-50">
                  {{ resendCooldown > 0 ? ('Resend in ' + resendCooldown + 's') : (resendLoading ? 'Sending...' : 'Resend code') }}
                </button>
              </p>
            </div>
            <button
              type="submit"
              [disabled]="loading"
              class="w-full bg-brand-red text-white font-bold py-3 px-4 rounded hover:bg-opacity-90 transition disabled:opacity-50"
            >
              {{ loading ? 'Verifying...' : 'Verify' }}
            </button>
          </form>

          <p *ngIf="error" class="mt-4 text-center">
            <a routerLink="/login" [queryParams]="returnUrl ? { returnUrl } : {}" class="text-brand-red hover:underline">Sign in</a>
          </p>
          <p class="mt-4 text-center">
            <a routerLink="/home" class="text-gray-500 hover:text-gray-300 text-sm">Back to home</a>
          </p>
        </div>
      </div>
    </ion-content>
  `,
})
export class AuthVerifyComponent implements OnInit {
  code = '';
  username = '';
  returnUrl = '/home';
  error = '';
  success = false;
  loading = false;
  showForm = false;
  resendLoading = false;
  resendCooldown = 0;

  constructor(
    private auth: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
  ) {}

  async ngOnInit() {
    const params = this.route.snapshot.queryParams;
    this.code = params['code'] || params['token'] || '';
    this.username = params['username'] || params['email'] || '';
    this.returnUrl = params['returnUrl'] || '/home';

    this.auth.ensureAmplifyConfigured();

    const cognitoConfigured = !!(
      environment.auth?.enabled &&
      environment.auth?.userPoolId &&
      environment.auth.userPoolId !== 'mock-pool-id'
    );
    if (!cognitoConfigured) {
      this.router.navigateByUrl(this.returnUrl);
      return;
    }

    if (this.code && this.username) {
      this.confirmFromParams();
    } else {
      this.showForm = true;
    }
  }

  private async confirmFromParams() {
    this.loading = true;
    try {
      await this.confirmSignUp(this.username, this.code);
      this.success = true;
      await this.redirectAfterVerification();
    } catch (e: any) {
      this.error = e?.message || 'Verification failed. Please try again.';
      this.showForm = true;
    } finally {
      this.loading = false;
    }
  }

  async onSubmit() {
    this.error = '';
    this.loading = true;
    try {
      await this.confirmSignUp(this.username, this.code);
      this.success = true;
      await this.redirectAfterVerification();
    } catch (e: any) {
      this.error = e?.message || 'Verification failed. Please try again.';
    } finally {
      this.loading = false;
    }
  }

  private async confirmSignUp(username: string, code: string): Promise<void> {
    const { confirmSignUp } = await import('@aws-amplify/auth');
    await confirmSignUp({ username, confirmationCode: code });
  }

  /** After verification: try auto sign-in if password was stored, else redirect to login. */
  private async redirectAfterVerification(): Promise<void> {
    const pending = sessionStorage.getItem('upora_pending_verification');
    sessionStorage.removeItem('upora_pending_verification');
    if (pending) {
      try {
        const { email, password } = JSON.parse(pending) as { email: string; password: string };
        if (email === this.username && password) {
          await this.auth.login(email, password);
          setTimeout(() => this.router.navigateByUrl(this.returnUrl), 800);
          return;
        }
      } catch {
        // Fall through to login redirect
      }
    }
    const loginUrl = `/login?verified=1&returnUrl=${encodeURIComponent(this.returnUrl)}`;
    setTimeout(() => this.router.navigateByUrl(loginUrl), 800);
  }

  async resendCode() {
    if (!this.username) {
      this.error = 'Enter your email first';
      return;
    }
    this.error = '';
    this.resendLoading = true;
    try {
      const { resendSignUpCode } = await import('@aws-amplify/auth');
      await resendSignUpCode({ username: this.username });
      this.resendCooldown = 60;
      const interval = setInterval(() => {
        this.resendCooldown--;
        this.cdr.markForCheck();
        if (this.resendCooldown <= 0) clearInterval(interval);
      }, 1000);
    } catch (e: any) {
      this.error = e?.message || 'Failed to resend code. Try again.';
    } finally {
      this.resendLoading = false;
    }
  }
}
