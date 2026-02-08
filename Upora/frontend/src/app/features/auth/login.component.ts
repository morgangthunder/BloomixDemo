import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { IonContent } from '@ionic/angular/standalone';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { OnboardingService } from '../../core/services/onboarding.service';
import { environment } from '../../../environments/environment';
import { RETURN_URL_KEY } from '../../core/guards/auth.guard';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, IonContent],
  template: `
    <ion-content>
      <div class="min-h-screen bg-brand-black flex items-center justify-center p-4">
        <div class="w-full max-w-md">
          <h1 class="text-2xl font-bold text-white mb-2">Sign in</h1>
          <p *ngIf="!verifiedParam" class="text-gray-400 mb-6">Sign in to continue to Upora</p>
          <p *ngIf="verifiedParam" class="text-green-500 mb-6">Account verified! Sign in with your email and password to continue.</p>

          @if (showHostedUI) {
            <div class="mb-6">
              <button
                type="button"
                (click)="onSignInWithGoogle()"
                [disabled]="loading"
                class="w-full flex items-center justify-center gap-2 bg-white text-gray-900 font-medium py-3 px-4 rounded hover:bg-gray-100 transition disabled:opacity-50"
              >
                <svg class="w-5 h-5" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                Sign in with Google
              </button>
              <div class="flex items-center gap-3 my-4">
                <div class="flex-1 h-px bg-gray-600"></div>
                <span class="text-gray-500 text-sm">or</span>
                <div class="flex-1 h-px bg-gray-600"></div>
              </div>
            </div>
          }

          <form (ngSubmit)="onSubmit()" class="space-y-4">
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
            </div>
            <p *ngIf="error" class="text-red-500 text-sm">{{ error }}</p>
            <button
              type="submit"
              [disabled]="loading"
              class="w-full bg-brand-red text-white font-bold py-3 px-4 rounded hover:bg-opacity-90 transition disabled:opacity-50"
            >
              {{ loading ? 'Signing in...' : 'Sign in' }}
            </button>
          </form>

          <p class="mt-6 text-center text-gray-400">
            Don't have an account?
            <a routerLink="/signup" [queryParams]="returnUrl ? { returnUrl } : {}" class="text-brand-red hover:underline">Create account</a>
          </p>

          <p class="mt-4 text-center">
            <a routerLink="/home" class="text-gray-500 hover:text-gray-300 text-sm">Back to home</a>
          </p>
        </div>
      </div>
    </ion-content>
  `,
})
export class LoginComponent implements OnInit {
  email = '';
  password = '';
  showPassword = false;
  error = '';
  loading = false;
  returnUrl = '';
  verifiedParam = false;

  constructor(
    private auth: AuthService,
    private onboarding: OnboardingService,
    private router: Router,
    private route: ActivatedRoute,
  ) {}

  async ngOnInit() {
    const params = this.route.snapshot.queryParams;
    this.returnUrl = params['returnUrl'] || sessionStorage.getItem(RETURN_URL_KEY) || '/home';
    this.verifiedParam = params['verified'] === '1';
    // If already signed in, redirect immediately (avoids "There is already a signed in User")
    if (this.auth.isAuthenticated()) {
      const target = await this.resolvePostAuthRedirect(this.returnUrl || '/home');
      this.router.navigateByUrl(target, { replaceUrl: true });
    }
  }

  get showHostedUI(): boolean {
    const a = environment.auth;
    return !!(a?.enabled && a.userPoolId && a.userPoolClientId !== 'YOUR_COGNITO_APP_CLIENT_ID' && (a as { domain?: string }).domain);
  }

  async onSignInWithGoogle() {
    this.error = '';
    this.loading = true;
    
    // Log Amplify config state BEFORE calling signInWithRedirect
    // This helps diagnose if config is accessible when PKCE verifier should be stored
    try {
      const { Amplify } = await import('@aws-amplify/core');
      const config = Amplify.getConfig();
      const oauthConfig = config?.Auth?.Cognito?.loginWith?.oauth;
      console.log('[Login Component] Amplify config check BEFORE signInWithRedirect:', {
        userPoolId: config?.Auth?.Cognito?.userPoolId ? 'present' : 'missing',
        userPoolClientId: config?.Auth?.Cognito?.userPoolClientId ? 'present' : 'missing',
        oauthDomain: oauthConfig?.domain || 'missing',
        oauthRedirectSignIn: oauthConfig?.redirectSignIn || 'missing',
        oauthResponseType: oauthConfig?.responseType || 'missing',
      });
      
      if (!oauthConfig?.domain) {
        console.error('[Login Component] ❌ OAuth config missing - PKCE verifier will NOT be stored!');
        this.error = 'OAuth configuration error. Please refresh the page.';
        this.loading = false;
        return;
      }
    } catch (e) {
      console.error('[Login Component] Failed to check Amplify config:', e);
      this.error = 'Configuration error. Please refresh the page.';
      this.loading = false;
      return;
    }
    
    try {
      sessionStorage.setItem(RETURN_URL_KEY, this.returnUrl);
      console.log('[Login Component] Calling auth.signInWithRedirect()...');
      await this.auth.signInWithRedirect();
      // Note: signInWithRedirect() redirects immediately, so code after this won't execute
      console.log('[Login Component] signInWithRedirect() completed (should not see this - redirect should happen)');
    } catch (e: unknown) {
      console.error('[Login Component] signInWithRedirect() error:', e);
      this.error = e instanceof Error ? e.message : 'Redirect failed. Please try again.';
      this.loading = false;
    }
  }

  async onSubmit() {
    this.error = '';
    this.loading = true;
    try {
      await this.auth.login(this.email, this.password);
      const target = await this.resolvePostAuthRedirect(this.returnUrl);
      this.router.navigateByUrl(target);
    } catch (e: any) {
      this.error = e?.message || 'Sign in failed. Please try again.';
    } finally {
      this.loading = false;
    }
  }

  /** If user has not completed onboarding, redirect to /onboarding with returnUrl. */
  private async resolvePostAuthRedirect(returnUrl: string): Promise<string> {
    try {
      const prefs = await firstValueFrom(this.onboarding.getMine());
      if (!this.onboarding.hasCompletedOnboarding(prefs)) {
        this.onboarding.setReturnUrl(returnUrl);
        return `/onboarding?returnUrl=${encodeURIComponent(returnUrl)}`;
      }
    } catch {
      // If check fails, proceed to returnUrl
    }
    return returnUrl;
  }
}
