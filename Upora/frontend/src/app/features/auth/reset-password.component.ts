import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { IonContent } from '@ionic/angular/standalone';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, IonContent],
  template: `
    <ion-content [style.--padding-top]="'100px'" style="--background: #000000;">
      <div class="min-h-screen bg-brand-black flex items-center justify-center p-4">
        <div class="w-full max-w-md">
          @if (success) {
            <div class="text-center">
              <div class="text-4xl mb-4">&#10003;</div>
              <h1 class="text-2xl font-bold text-white mb-2">Password reset successful</h1>
              <p class="text-gray-400 mb-6">Your password has been updated. You can now sign in with your new password.</p>
              <a
                routerLink="/login"
                class="inline-block bg-brand-red text-white font-bold py-3 px-8 rounded hover:bg-opacity-90 transition"
              >
                Sign in
              </a>
            </div>
          } @else {
            <h1 class="text-2xl font-bold text-white mb-2">Enter new password</h1>
            <p class="text-gray-400 mb-6">Enter the verification code sent to <strong class="text-white">{{ email }}</strong> and your new password.</p>

            <form (ngSubmit)="onSubmit()" class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-300 mb-1">Verification code</label>
                <input
                  type="text"
                  [(ngModel)]="code"
                  name="code"
                  required
                  maxlength="6"
                  class="w-full bg-brand-dark border border-gray-600 rounded px-3 py-2 text-white text-center text-xl tracking-widest focus:outline-none focus:ring-2 focus:ring-brand-red"
                  placeholder="000000"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-300 mb-1">New password</label>
                <input
                  [type]="showPassword ? 'text' : 'password'"
                  [(ngModel)]="newPassword"
                  name="newPassword"
                  required
                  class="w-full bg-brand-dark border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-brand-red"
                  placeholder="New password"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-300 mb-1">Confirm password</label>
                <input
                  [type]="showPassword ? 'text' : 'password'"
                  [(ngModel)]="confirmPassword"
                  name="confirmPassword"
                  required
                  class="w-full bg-brand-dark border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-brand-red"
                  placeholder="Confirm new password"
                />
              </div>
              <label class="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
                <input type="checkbox" [(ngModel)]="showPassword" name="showPw" class="accent-brand-red" />
                Show passwords
              </label>
              <p *ngIf="error" class="text-red-500 text-sm">{{ error }}</p>
              <button
                type="submit"
                [disabled]="loading"
                class="w-full bg-brand-red text-white font-bold py-3 px-4 rounded hover:bg-opacity-90 transition disabled:opacity-50"
              >
                {{ loading ? 'Resetting...' : 'Reset password' }}
              </button>
            </form>

            <p class="mt-4 text-center">
              <a routerLink="/auth/forgot-password" class="text-gray-500 hover:text-gray-300 text-sm">Didn't receive a code? Send again</a>
            </p>
          }

          <p class="mt-6 text-center">
            <a routerLink="/login" class="text-gray-500 hover:text-gray-300 text-sm">Back to sign in</a>
          </p>
        </div>
      </div>
    </ion-content>
  `,
})
export class ResetPasswordComponent implements OnInit {
  email = '';
  code = '';
  newPassword = '';
  confirmPassword = '';
  showPassword = false;
  error = '';
  loading = false;
  success = false;

  constructor(
    private auth: AuthService,
    private router: Router,
    private route: ActivatedRoute,
  ) {}

  ngOnInit() {
    this.email = this.route.snapshot.queryParams['email'] || '';
  }

  async onSubmit() {
    if (!this.code || this.code.length < 6) {
      this.error = 'Please enter the 6-digit verification code.';
      return;
    }
    if (!this.newPassword) {
      this.error = 'Please enter a new password.';
      return;
    }
    if (this.newPassword !== this.confirmPassword) {
      this.error = 'Passwords do not match.';
      return;
    }
    if (this.newPassword.length < 8) {
      this.error = 'Password must be at least 8 characters.';
      return;
    }

    this.error = '';
    this.loading = true;
    try {
      await this.auth.confirmForgotPassword(this.email, this.code, this.newPassword);
      this.success = true;
    } catch (e: any) {
      this.error = e?.message || 'Failed to reset password. Please try again.';
    } finally {
      this.loading = false;
    }
  }
}
