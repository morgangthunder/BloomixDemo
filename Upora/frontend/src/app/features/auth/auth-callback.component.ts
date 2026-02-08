import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { IonContent } from '@ionic/angular/standalone';
import { AuthService } from '../../core/services/auth.service';

const RETURN_URL_KEY = 'auth_return_url';

/**
 * Handles Cognito Hosted UI OAuth callback: /auth/callback?code=... (or ?error=...)
 * Exchanges the auth code for tokens, stores the session, and redirects to returnUrl.
 */
@Component({
  selector: 'app-auth-callback',
  standalone: true,
  imports: [CommonModule, IonContent, RouterModule],
  template: `
    <ion-content>
      <div class="min-h-screen bg-brand-black flex items-center justify-center p-4">
        <div class="w-full max-w-md text-center">
          <p *ngIf="loading" class="text-gray-400">Completing sign-in...</p>
          <p *ngIf="error" class="text-red-500 mb-6">{{ error }}</p>
          <p *ngIf="success" class="text-green-500 mb-6">Signed in successfully. Redirecting...</p>
          <p *ngIf="error" class="mt-4">
            <a [routerLink]="['/login']" class="text-brand-red hover:underline">Back to sign in</a>
          </p>
        </div>
      </div>
    </ion-content>
  `,
})
export class AuthCallbackComponent implements OnInit {
  loading = true;
  error = '';
  success = false;

  constructor(
    private auth: AuthService,
    private router: Router,
    private route: ActivatedRoute,
  ) {}

  async ngOnInit() {
    const params = this.route.snapshot.queryParams;
    const hashParams = typeof window !== 'undefined' && window.location.hash
      ? new URLSearchParams(window.location.hash.replace('#', ''))
      : null;
    
    // Check for OAuth errors
    if (params['error'] || hashParams?.get('error')) {
      this.loading = false;
      this.error = params['error_description'] || params['error'] || hashParams?.get('error_description') || hashParams?.get('error') || 'Sign-in failed.';
      console.error('[AuthCallback] OAuth error:', this.error);
      return;
    }

    // Check if we have a code (authorization code flow)
    const hasCode = params['code'] || hashParams?.get('code');
    const hasImplicitTokens = hashParams?.get('id_token') && hashParams?.get('access_token');
    
    if (!hasCode && !hasImplicitTokens) {
      this.loading = false;
      this.error = 'No authorization code or tokens found in callback URL.';
      console.error('[AuthCallback] Missing code/tokens in URL:', window.location.href);
      return;
    }

    console.log('[AuthCallback] Processing OAuth callback...', {
      hasCode: !!hasCode,
      hasImplicitTokens: !!hasImplicitTokens,
      url: window.location.href?.slice(0, 100) + '...',
    });

    try {
      // For manual OAuth flow, run exchange immediately to prevent Amplify from consuming the code
      const isManualOAuth = sessionStorage.getItem('upora_manual_oauth') === 'true';
      
      if (isManualOAuth) {
        console.log('[AuthCallback] Manual OAuth detected - running exchange immediately');
        // Run immediately without delay to prevent Amplify from consuming the code
        const result = await this.auth.handleOAuthCallback();
        this.loading = false;
        
        if (result.success) {
          this.success = true;
          const returnUrl = sessionStorage.getItem(RETURN_URL_KEY) || params['state'] || '/home';
          sessionStorage.removeItem(RETURN_URL_KEY);
          const cleanUrl = returnUrl.startsWith('/') ? returnUrl : `/${returnUrl}`;
          console.log('[AuthCallback] ✅ Sign-in successful, redirecting to:', cleanUrl);
          setTimeout(() => this.router.navigateByUrl(cleanUrl, { replaceUrl: true }), 500);
        } else {
          this.error = result.error || 'Failed to complete sign-in.';
          console.error('[AuthCallback] ❌ Sign-in failed:', this.error);
        }
        return;
      }
      
      // For Amplify OAuth flow, give listener time to initialize
      await new Promise(r => setTimeout(r, 500));
      
      const result = await this.auth.handleOAuthCallback();
      this.loading = false;
      
      if (result.success) {
        this.success = true;
        const returnUrl = sessionStorage.getItem(RETURN_URL_KEY) || params['state'] || '/home';
        sessionStorage.removeItem(RETURN_URL_KEY);
        const cleanUrl = returnUrl.startsWith('/') ? returnUrl : `/${returnUrl}`;
        console.log('[AuthCallback] ✅ Sign-in successful, redirecting to:', cleanUrl);
        setTimeout(() => this.router.navigateByUrl(cleanUrl, { replaceUrl: true }), 500);
      } else {
        this.error = result.error || 'Failed to complete sign-in.';
        console.error('[AuthCallback] ❌ Sign-in failed:', this.error);
      }
    } catch (e: unknown) {
      this.loading = false;
      this.error = e instanceof Error ? e.message : 'An error occurred during sign-in.';
      console.error('[AuthCallback] ❌ Exception during sign-in:', e);
    }
  }
}
