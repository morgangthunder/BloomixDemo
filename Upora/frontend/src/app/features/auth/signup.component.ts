import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { IonContent } from '@ionic/angular/standalone';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, IonContent],
  template: `
    <ion-content>
      <div class="min-h-screen bg-brand-black flex items-center justify-center p-4">
        <div class="w-full max-w-md">
          <h1 class="text-2xl font-bold text-white mb-2">Create account</h1>
          <p class="text-gray-400 mb-6">Sign up to get started with Upora</p>

          <form (ngSubmit)="onSubmit()" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-1">Full name</label>
              <input
                type="text"
                [(ngModel)]="name"
                name="name"
                class="w-full bg-brand-dark border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-brand-red"
                placeholder="Your name"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-1">Email</label>
              <input
                type="email"
                [(ngModel)]="email"
                name="email"
                required
                class="w-full bg-brand-dark border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-brand-red"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-1">Password</label>
              <div class="relative">
                <input
                  [type]="showPassword ? 'text' : 'password'"
                  [(ngModel)]="password"
                  name="password"
                  required
                  minlength="8"
                  class="w-full bg-brand-dark border border-gray-600 rounded px-3 py-2 pr-10 text-white focus:outline-none focus:ring-2 focus:ring-brand-red"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  (click)="showPassword = !showPassword"
                  class="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-white transition"
                  [attr.aria-label]="showPassword ? 'Hide password' : 'Show password'"
                >
                  @if (showPassword) {
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/></svg>
                  } @else {
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                  }
                </button>
              </div>
              <p class="text-xs text-gray-500 mt-1">Minimum 8 characters</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-1">Confirm password</label>
              <div class="relative">
                <input
                  [type]="showConfirmPassword ? 'text' : 'password'"
                  [(ngModel)]="confirmPassword"
                  name="confirmPassword"
                  required
                  class="w-full bg-brand-dark border border-gray-600 rounded px-3 py-2 pr-10 text-white focus:outline-none focus:ring-2 focus:ring-brand-red"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  (click)="showConfirmPassword = !showConfirmPassword"
                  class="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-white transition"
                  [attr.aria-label]="showConfirmPassword ? 'Hide password' : 'Show password'"
                >
                  @if (showConfirmPassword) {
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/></svg>
                  } @else {
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                  }
                </button>
              </div>
            </div>
            <p *ngIf="error" class="text-red-500 text-sm">{{ error }}</p>
            <button
              type="submit"
              [disabled]="loading"
              class="w-full bg-brand-red text-white font-bold py-3 px-4 rounded hover:bg-opacity-90 transition disabled:opacity-50"
            >
              {{ loading ? 'Creating account...' : 'Create account' }}
            </button>
          </form>

          <p class="mt-6 text-center text-gray-400">
            Already have an account?
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
export class SignupComponent {
  email = '';
  password = '';
  confirmPassword = '';
  showPassword = false;
  showConfirmPassword = false;
  name = '';
  error = '';
  loading = false;
  returnUrl = '';

  constructor(
    private auth: AuthService,
    private router: Router,
    private route: ActivatedRoute,
  ) {
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/home';
  }

  async onSubmit() {
    this.error = '';
    if (this.password !== this.confirmPassword) {
      this.error = 'Passwords do not match';
      return;
    }
    if (this.password.length < 8) {
      this.error = 'Password must be at least 8 characters';
      return;
    }
    this.loading = true;
    try {
      const result = await this.auth.signUp(this.email, this.password, this.name);
      if (result.needsVerification) {
        sessionStorage.setItem('upora_pending_verification', JSON.stringify({
          email: this.email,
          password: this.password,
        }));
        this.router.navigate(['/auth/verify'], {
          queryParams: { username: this.email, returnUrl: this.returnUrl },
        });
      } else {
        this.router.navigateByUrl(this.returnUrl);
      }
    } catch (e: any) {
      this.error = e?.message || 'Sign up failed. Please try again.';
    } finally {
      this.loading = false;
    }
  }
}
