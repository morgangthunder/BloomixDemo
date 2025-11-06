import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface YouTubeOAuthConfig {
  clientId: string;
  redirectUri: string;
  scopes: string[];
}

export interface OAuthToken {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
}

// VERSION CHECK: This service should show "VERSION 2.2.0" in console logs
const OAUTH_SERVICE_VERSION = '2.2.0';
const OAUTH_VERSION_CHECK_MESSAGE = `🚀 YOUTUBE OAUTH SERVICE VERSION ${OAUTH_SERVICE_VERSION} LOADED - ${new Date().toISOString()}`;

@Injectable({
  providedIn: 'root'
})
export class YouTubeOAuthService {
  private readonly OAUTH_CONFIG: YouTubeOAuthConfig = {
    clientId: environment.youtubeClientId || 'YOUR_CLIENT_ID_HERE',
    redirectUri: `${window.location.origin}/oauth/callback`,
    scopes: [
      'https://www.googleapis.com/auth/youtube.readonly'
    ]
  };

  private tokenSubject = new BehaviorSubject<OAuthToken | null>(null);
  public token$ = this.tokenSubject.asObservable();

  constructor(private http: HttpClient) {
    // VERSION CHECK: This log should always appear when new code is loaded
    console.log(OAUTH_VERSION_CHECK_MESSAGE);
    // Check for stored token on service initialization
    this.loadStoredToken();
  }

  /**
   * Initiate OAuth flow
   */
  initiateOAuthFlow(state?: string): void {
    console.log('[YouTubeOAuth] 🔍 initiateOAuthFlow called with state:', state);
    
    // Store current state if provided - use sessionStorage which survives page reloads
    if (state) {
      console.log('[YouTubeOAuth] 💾 Storing OAuth state in sessionStorage:', state);
      sessionStorage.setItem('youtube_oauth_state', state);
      console.log('[YouTubeOAuth] ✅ OAuth state stored successfully');
      console.log('[YouTubeOAuth] 🔍 Verifying storage - reading back:', sessionStorage.getItem('youtube_oauth_state'));
    } else {
      console.log('[YouTubeOAuth] ⚠️ No state provided to store');
    }
    
    const authUrl = this.buildAuthUrl(state);
    console.log('[YouTubeOAuth] 🔍 OAuth URL:', authUrl);
    console.log('[YouTubeOAuth] 🔍 OAuth config:', this.OAUTH_CONFIG);
    
    // Open OAuth flow in popup or redirect
    window.location.href = authUrl;
  }

  /**
   * Handle OAuth callback with authorization code
   */
  handleOAuthCallback(code: string): Observable<OAuthToken> {
    console.log('Handling OAuth callback with code:', code);
    
    const tokenUrl = 'https://oauth2.googleapis.com/token';
    const params = new URLSearchParams({
      client_id: this.OAUTH_CONFIG.clientId,
      client_secret: environment.youtubeClientSecret || 'YOUR_CLIENT_SECRET_HERE',
      code: code,
      grant_type: 'authorization_code',
      redirect_uri: this.OAUTH_CONFIG.redirectUri
    });

    return this.http.post<OAuthToken>(tokenUrl, params.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    }).pipe(
      tap(token => {
        console.log('OAuth token received:', token);
        this.storeToken(token);
        this.tokenSubject.next(token);
      })
    );
  }

  /**
   * Get current access token
   */
  getCurrentToken(): OAuthToken | null {
    return this.tokenSubject.value;
  }

  /**
   * Get stored OAuth state and clear it
   */
  getStoredState(): string | null {
    const state = sessionStorage.getItem('youtube_oauth_state');
    if (state) {
      sessionStorage.removeItem('youtube_oauth_state');
    }
    return state;
  }

  /**
   * Clear stored OAuth state
   */
  clearStoredState(): void {
    sessionStorage.removeItem('youtube_oauth_state');
    console.log('[YouTubeOAuth] 🗑️ Cleared stored OAuth state');
  }

  /**
   * Force clear all OAuth-related data
   */
  forceClearOAuthData(): void {
    sessionStorage.removeItem('youtube_oauth_state');
    localStorage.removeItem('youtube_oauth_token');
    localStorage.removeItem('youtube_oauth_refresh_token');
    console.log('[YouTubeOAuth] 🗑️ Force cleared all OAuth data');
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    const token = this.getCurrentToken();
    const localStorageToken = localStorage.getItem('youtube_oauth_token');
    const isAuth = token !== null && !this.isTokenExpired(token);
    console.log('[YouTubeOAuth] 🔍 Authentication check:', { 
      hasToken: token !== null,
      hasLocalStorageToken: !!localStorageToken,
      isExpired: token ? this.isTokenExpired(token) : 'N/A',
      isAuthenticated: isAuth,
      tokenSubjectValue: this.tokenSubject.value
    });
    
    // If tokenSubject is null but we have a token in localStorage, load it
    if (!token && localStorageToken) {
      console.log('[YouTubeOAuth] 🔄 Token in localStorage but not in subject, loading...');
      this.loadStoredToken();
      const reloadedToken = this.getCurrentToken();
      console.log('[YouTubeOAuth] 🔍 After reload:', { hasToken: reloadedToken !== null });
      return reloadedToken !== null && !this.isTokenExpired(reloadedToken);
    }
    
    return isAuth;
  }

  /**
   * Refresh access token if needed
   */
  refreshTokenIfNeeded(): Observable<OAuthToken | null> {
    const token = this.getCurrentToken();
    
    if (!token || !this.isTokenExpired(token)) {
      return of(token);
    }

    if (!token.refresh_token) {
      console.warn('No refresh token available, re-authentication required');
      return of(null);
    }

    return this.refreshAccessToken(token.refresh_token);
  }

  /**
   * Logout and clear stored token
   */
  logout(): void {
    this.clearStoredToken();
    this.tokenSubject.next(null);
  }

  private buildAuthUrl(state?: string): string {
    const params = new URLSearchParams({
      client_id: this.OAUTH_CONFIG.clientId,
      redirect_uri: this.OAUTH_CONFIG.redirectUri,
      response_type: 'code',
      scope: this.OAUTH_CONFIG.scopes.join(' '),
      access_type: 'online',
      prompt: 'select_account'
    });

    // Add state parameter if provided
    if (state) {
      params.set('state', state);
    }

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  private refreshAccessToken(refreshToken: string): Observable<OAuthToken> {
    const tokenUrl = 'https://oauth2.googleapis.com/token';
    const params = new URLSearchParams({
      client_id: this.OAUTH_CONFIG.clientId,
      client_secret: environment.youtubeClientSecret || 'YOUR_CLIENT_SECRET_HERE',
      refresh_token: refreshToken,
      grant_type: 'refresh_token'
    });

    return this.http.post<OAuthToken>(tokenUrl, params.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    }).pipe(
      tap(newToken => {
        console.log('Token refreshed:', newToken);
        // Merge with existing token to preserve refresh_token
        const mergedToken = { ...newToken, refresh_token: refreshToken };
        this.storeToken(mergedToken);
        this.tokenSubject.next(mergedToken);
      })
    );
  }

  private isTokenExpired(token: OAuthToken): boolean {
    if (!token.expires_in) return true;
    
    // Check if token expires within the next 5 minutes
    const expirationTime = token.expires_in * 1000;
    const now = Date.now();
    return now >= expirationTime - (5 * 60 * 1000);
  }

  private storeToken(token: OAuthToken): void {
    localStorage.setItem('youtube_oauth_token', JSON.stringify({
      ...token,
      expires_at: Date.now() + (token.expires_in * 1000)
    }));
  }

  private loadStoredToken(): void {
    const stored = localStorage.getItem('youtube_oauth_token');
    if (stored) {
      try {
        const token = JSON.parse(stored);
        if (token.expires_at && Date.now() < token.expires_at) {
          this.tokenSubject.next(token);
        } else {
          this.clearStoredToken();
        }
      } catch (error) {
        console.warn('Failed to parse stored token:', error);
        this.clearStoredToken();
      }
    }
  }

  private clearStoredToken(): void {
    localStorage.removeItem('youtube_oauth_token');
  }
}

// Import tap and of
import { tap } from 'rxjs/operators';
import { of } from 'rxjs';
