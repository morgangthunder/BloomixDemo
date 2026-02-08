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
              <input
                type="password"
                [(ngModel)]="password"
                name="password"
                required
                minlength="8"
                class="w-full bg-brand-dark border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-brand-red"
                placeholder="••••••••"
              />
              <p class="text-xs text-gray-500 mt-1">Minimum 8 characters</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-1">Confirm password</label>
              <input
                type="password"
                [(ngModel)]="confirmPassword"
                name="confirmPassword"
                required
                class="w-full bg-brand-dark border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-brand-red"
                placeholder="••••••••"
              />
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
