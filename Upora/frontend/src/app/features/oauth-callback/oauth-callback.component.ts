// CACHE BUST v3.0.0 - NUCLEAR OPTION - COMPLETE CACHE DESTRUCTION
// VERSION CHECK: This component should show "VERSION 3.0.0" in console logs
// TIMESTAMP: 2024-01-XX - NUCLEAR CACHE CLEAR - UNIQUE ID: ${Math.random().toString(36).substr(2, 9)}
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { YouTubeOAuthService } from '../../core/services/youtube-oauth.service';

// VERSION CHECK: This constant should appear in console logs to verify new code is loaded
const COMPONENT_VERSION = '3.0.0';
const UNIQUE_ID = Math.random().toString(36).substr(2, 9);
const VERSION_CHECK_MESSAGE = `🚀 OAUTH CALLBACK COMPONENT VERSION ${COMPONENT_VERSION} LOADED - ${new Date().toISOString()} - NUCLEAR CACHE CLEAR - ID: ${UNIQUE_ID}`;

@Component({
  selector: 'app-oauth-callback-v3-0-0',
  standalone: true,
  template: `
    <!-- CACHE BUST v2.3.0 - OAuth Callback Component - FORCE CACHE CLEAR -->
    <div class="oauth-callback">
      <div class="loading-container">
        <div class="spinner"></div>
        <h2>Authenticating with YouTube...</h2>
        <p>Please wait while we complete the authentication process.</p>
        <!-- CACHE BUST TIMESTAMP: 2024-01-26T13:01:02.195Z -->
      </div>
    </div>
  `,
  styles: [`
    /* CACHE BUST v2.3.0 - OAuth Callback Component Styles - FORCE CACHE CLEAR */
    .oauth-callback {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background: #0a0a0a;
      color: white;
    }
    
    .loading-container {
      text-align: center;
      padding: 2rem;
    }
    
    .spinner {
      width: 40px;
      height: 40px;
      border: 4px solid #333;
      border-top: 4px solid #cc0000;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 1rem;
    }
    
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    
    h2 {
      margin: 0 0 0.5rem;
      font-size: 1.5rem;
    }
    
    p {
      margin: 0;
      color: #999;
    }
  `]
})
export class OAuthCallbackComponent_v3_0_0 implements OnInit {
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private oauthService: YouTubeOAuthService
  ) {
    // VERSION CHECK: This log should always appear when new code is loaded
    console.log(VERSION_CHECK_MESSAGE);
    console.log('[OAuthCallback] 🚀 Constructor called - VERSION ' + COMPONENT_VERSION + ' - ' + new Date().toISOString());
  }

  ngOnInit() {
    // VERSION CHECK: This log should always appear when new code is loaded
    console.log(VERSION_CHECK_MESSAGE);
    console.log('[OAuthCallback] 🚀 Component initialized - VERSION ' + COMPONENT_VERSION + ' - ' + new Date().toISOString());
    
    // Get the authorization code from the URL
    this.route.queryParams.subscribe(params => {
      const code = params['code'];
      const error = params['error'];

      if (error) {
        console.error('OAuth error:', error);
        this.redirectToLessonEditor_v3_0_0('Authentication failed. Please try again.');
        return;
      }

      if (code) {
        console.log('Received authorization code:', code);
        this.handleAuthorizationCode_v2_1_0(code);
      } else {
        console.error('No authorization code received');
        this.redirectToLessonEditor_v3_0_0('No authorization code received. Please try again.');
      }
    });
  }

  private handleAuthorizationCode_v2_1_0(code: string) {
    this.oauthService.handleOAuthCallback(code).subscribe({
      next: (token) => {
        console.log('OAuth authentication successful:', token);
        this.redirectToLessonEditor_v3_0_0('Authentication successful! You can now process YouTube videos.');
      },
      error: (error) => {
        console.error('OAuth token exchange failed:', error);
        this.redirectToLessonEditor_v3_0_0('Authentication failed. Please try again.');
      }
    });
  }

  private redirectToLessonEditor_v3_0_0(message: string) {
    // VERSION CHECK: This log should always appear when new code is loaded
    console.log(VERSION_CHECK_MESSAGE);
    console.log('[OAuthCallback] 🚀 redirectToLessonEditor called - VERSION ' + COMPONENT_VERSION + ' - ' + new Date().toISOString());
    
    // Get stored state to restore the original location
    const storedState = this.oauthService.getStoredState();
    console.log('[OAuthCallback] 🔍 Retrieved stored state:', storedState);
    
    // Try to get lesson ID from referrer or fallback to lesson-builder
    let redirectPath = '/lesson-builder';
    let queryParams: any = { oauth_message: message };
    
    // If no state, try to extract lesson ID from document.referrer
    if (!storedState) {
      console.warn('[OAuthCallback] ⚠️ No stored state found, trying to extract from referrer');
      const referrer = document.referrer;
      console.log('[OAuthCallback] 🔍 Document referrer:', referrer);
      
      // Try to extract lesson ID from referrer URL
      const lessonMatch = referrer.match(/\/lesson-editor\/([^/?]+)/);
      if (lessonMatch && lessonMatch[1]) {
        const lessonId = lessonMatch[1];
        console.log('[OAuthCallback] 🎯 Extracted lesson ID from referrer:', lessonId);
        redirectPath = `/lesson-editor/${lessonId}`;
        queryParams.tab = 'content-processing';
      } else {
        console.warn('[OAuthCallback] ⚠️ Could not extract lesson ID from referrer, redirecting to lesson-builder');
      }
    }
    
    if (storedState) {
      try {
        const state = JSON.parse(storedState);
        console.log('[OAuthCallback] 🔍 Parsed state:', state);
        
                if (state.lessonId) {
                  // Check if lessonId is a numeric ID (old format) - if so, redirect to lesson builder
                  if (typeof state.lessonId === 'string' && state.lessonId.match(/^\d+$/)) {
                    console.warn('[OAuthCallback] ⚠️ Detected old numeric lesson ID, clearing OAuth state and redirecting to lesson builder - VERSION ' + COMPONENT_VERSION + ' - ' + new Date().toISOString());
                    console.log('[OAuthCallback] 🔍 OLD NUMERIC ID DETECTED:', state.lessonId, '- This confirms new code is running!');
                    this.oauthService.clearStoredState(); // Clear the old state
                    redirectPath = '/lesson-builder';
                  } else {
                    redirectPath = `/lesson-editor/${state.lessonId}`;
                    console.log('[OAuthCallback] 🔍 Setting redirect path:', redirectPath);
                  }
                }
                if (state.tab) {
          queryParams.tab = state.tab;
          console.log('[OAuthCallback] 🔍 Setting tab query param:', state.tab);
        }
        if (state.videoId) {
          queryParams.videoId = state.videoId;
          queryParams.resumeProcessing = 'true'; // Flag to resume processing
          console.log('[OAuthCallback] 🔍 Setting videoId query param:', state.videoId);
          console.log('[OAuthCallback] 🔍 Setting resumeProcessing flag');
        }
      } catch (e) {
        console.warn('[OAuthCallback] ❌ Failed to parse stored state:', e);
      }
    }
    
    console.log('[OAuthCallback] 🔍 Final redirect path:', redirectPath);
    console.log('[OAuthCallback] 🔍 Final query params:', queryParams);
    
    // Redirect back to the original location with a message
    setTimeout(() => {
      this.router.navigate([redirectPath], { 
        queryParams: queryParams
      });
    }, 500);
  }
}
