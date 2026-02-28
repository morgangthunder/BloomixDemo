import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { IonContent } from '@ionic/angular/standalone';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, IonContent],
  template: `
    <ion-content [style.--padding-top]="'100px'" style="--background: #000000;">
      <div class="min-h-screen bg-brand-black flex items-center justify-center p-4">
        <div class="w-full max-w-md">
          <h1 class="text-2xl font-bold text-white mb-2">Reset your password</h1>
          <p class="text-gray-400 mb-6">Enter your email address and we'll send you a verification code to reset your password.</p>

          @if (sent) {
            <div class="bg-green-900/40 border border-green-600 rounded p-4 mb-4">
              <p class="text-green-400 text-sm">A verification code has been sent to <strong>{{ email }}</strong>. Check your email and enter the code on the next page.</p>
            </div>
            <button
              (click)="goToReset()"
              class="w-full bg-brand-red text-white font-bold py-3 px-4 rounded hover:bg-opacity-90 transition"
            >
              Enter verification code
            </button>
          } @else {
            <form (ngSubmit)="onSubmit()" class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-300 mb-1">Email</label>
                <input
                  type="email"
                  [(ngModel)]="email"
                  name="email"
                  required
                  class="w-full bg-brand-dark border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-brand-red"
                  placeholder="you&#64;example.com"
                />
              </div>
              <p *ngIf="error" class="text-red-500 text-sm">{{ error }}</p>
              <button
                type="submit"
                [disabled]="loading"
                class="w-full bg-brand-red text-white font-bold py-3 px-4 rounded hover:bg-opacity-90 transition disabled:opacity-50"
              >
                {{ loading ? 'Sending...' : 'Send reset code' }}
              </button>
            </form>
          }

          <p class="mt-6 text-center">
            <a routerLink="/login" class="text-gray-500 hover:text-gray-300 text-sm">Back to sign in</a>
          </p>
        </div>
      </div>
    </ion-content>
  `,
})
export class ForgotPasswordComponent {
  email = '';
  error = '';
  loading = false;
  sent = false;

  constructor(private auth: AuthService, private router: Router) {}

  async onSubmit() {
    if (!this.email) {
      this.error = 'Please enter your email address.';
      return;
    }
    this.error = '';
    this.loading = true;
    try {
      await this.auth.forgotPassword(this.email);
      this.sent = true;
    } catch (e: any) {
      this.error = e?.message || 'Failed to send reset code. Please try again.';
    } finally {
      this.loading = false;
    }
  }

  goToReset() {
    this.router.navigate(['/auth/reset-password'], { queryParams: { email: this.email } });
  }
}
