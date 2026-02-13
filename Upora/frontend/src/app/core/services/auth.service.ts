import { Injectable, signal, computed } from '@angular/core';
import { Amplify } from '@aws-amplify/core';
import { signIn, signUp, signOut, fetchAuthSession } from '@aws-amplify/auth';
import { cognitoUserPoolsTokenProvider } from '@aws-amplify/auth/cognito';
import { environment } from '../../../environments/environment';
import { oauthFlowCompletePromise } from './oauth-callback-helper';

export interface AuthUser {
  userId: string;
  email: string;
  name?: string;
  tenantId?: string;
  role: string;
  idToken?: string;
  accessToken?: string;
}

/**
 * Auth service - handles authentication state.
 * In mock/dev mode (AUTH_PROVIDER=none): uses environment defaults and localStorage.
 * When Cognito is configured: will use Amplify Auth for login/signup/validation.
 */
@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly AUTH_KEY = 'upora_auth_user';
  private readonly COGNITO_CONFIGURED = !!(
    environment.auth?.enabled &&
    environment.auth?.userPoolId &&
    environment.auth.userPoolId !== 'mock-pool-id'
  );

  private currentUserSig = signal<AuthUser | null>(null);

  readonly currentUser = this.currentUserSig.asReadonly();
  readonly isAuthenticated = computed(() => !!this.currentUserSig());

  constructor() {
    this.loadStoredUser();
  }

  private loadStoredUser(): void {
    try {
      const stored = sessionStorage.getItem(this.AUTH_KEY) || localStorage.getItem(this.AUTH_KEY);
      if (stored) {
        const user = JSON.parse(stored) as AuthUser;
        this.currentUserSig.set(user);
      } else if (!this.COGNITO_CONFIGURED) {
        // Mock mode: use environment defaults
        this.currentUserSig.set({
          userId: environment.defaultUserId,
          email: 'builder@upora.dev',
          tenantId: environment.tenantId,
          role: environment.userRole,
        });
      }
    } catch {
      this.currentUserSig.set(null);
    }
  }

  async login(email: string, password: string): Promise<AuthUser> {
    if (this.COGNITO_CONFIGURED) {
      this.ensureAmplifyConfigured();
      // Diagnostic: verify config before signIn (SRP flow needs Auth.Cognito)
      const preSignInConfig = Amplify.getConfig().Auth?.Cognito;
      if (!preSignInConfig?.userPoolId || !preSignInConfig?.userPoolClientId) {
        console.error('[AuthService] Auth.Cognito missing before signIn:', { preSignInConfig });
        throw new Error('Auth configuration not ready. Please refresh the page and try again.');
      }
      const result = await signIn({ username: email, password });
      if (result.nextStep?.signInStep !== 'DONE') {
        throw new Error('Additional steps required');
      }
      const session = await this.getAmplifySession();
      const tokens = session?.tokens;
      const payload = tokens?.idToken?.payload as Record<string, unknown> | undefined;
      const sub = (payload?.['sub'] as string) ?? (session as { userSub?: string })?.userSub ?? '';
      if (!sub) {
        console.error('[AuthService] No sub/userSub in session after signIn. tokens:', !!tokens, 'payload keys:', payload ? Object.keys(payload) : []);
        throw new Error('Sign-in succeeded but could not retrieve user ID. Please refresh and try again.');
      }
      const user: AuthUser = {
        userId: sub,
        email,
        tenantId: environment.tenantId,
        role: (payload?.['custom:role'] as string) ?? (session as any)?.customRole ?? environment.userRole,
        idToken: tokens?.idToken?.toString(),
        accessToken: tokens?.accessToken?.toString(),
      };
      this.setUser(user);
      return user;
    }
    // Mock: accept any credentials
    const user: AuthUser = {
      userId: environment.defaultUserId,
      email,
      tenantId: environment.tenantId,
      role: environment.userRole,
    };
    this.setUser(user);
    return user;
  }

  async signUp(email: string, password: string, name?: string): Promise<{ userId: string; needsVerification: boolean }> {
    if (this.COGNITO_CONFIGURED) {
      this.ensureAmplifyConfigured();
      const result = await signUp({
        username: email,
        password,
        options: { userAttributes: name ? { name } : {} },
      });
      return {
        userId: result.userId ?? email,
        needsVerification: result.nextStep?.signUpStep === 'CONFIRM_SIGN_UP',
      };
    }
    // Mock: create "user" in localStorage
    const user: AuthUser = {
      userId: `mock-${Date.now()}`,
      email,
      tenantId: environment.tenantId,
      role: 'student',
    };
    this.setUser(user);
    return { userId: user.userId, needsVerification: false };
  }

  async signOut(): Promise<void> {
    if (this.COGNITO_CONFIGURED) {
      try {
        this.ensureAmplifyConfigured();
        await signOut();
      } catch {}
    }
    
    // Clear auth user storage
    sessionStorage.removeItem(this.AUTH_KEY);
    localStorage.removeItem(this.AUTH_KEY);
    this.currentUserSig.set(null);
    
    // CRITICAL: Clear all PKCE/OAuth storage to prevent stale data from interfering with next sign-in
    if (typeof window !== 'undefined') {
      const cid = environment.auth?.userPoolClientId || '';
      const prefix = cid ? `CognitoIdentityServiceProvider.${cid}` : '';
      
      // Clear PKCE data from both storage types
      localStorage.removeItem(`${prefix}.inflightOAuth`);
      localStorage.removeItem(`${prefix}.oauthPKCE`);
      localStorage.removeItem(`${prefix}.oauthState`);
      sessionStorage.removeItem(`${prefix}.inflightOAuth`);
      sessionStorage.removeItem(`${prefix}.oauthPKCE`);
      sessionStorage.removeItem(`${prefix}.oauthState`);
      sessionStorage.removeItem('oauth_expected_redirect');
      sessionStorage.removeItem('upora_manual_oauth');
      
      console.log('[AuthService] ✅ Cleared all PKCE/OAuth storage on sign out');
    }
  }

  getToken(): string | null {
    const user = this.currentUserSig();
    return user?.idToken ?? user?.accessToken ?? null;
  }

  getUserId(): string | null {
    return this.currentUserSig()?.userId ?? null;
  }

  getTenantId(): string | null {
    return this.currentUserSig()?.tenantId ?? environment.tenantId ?? null;
  }

  getRole(): string | null {
    return this.currentUserSig()?.role ?? environment.userRole ?? null;
  }

  getEmail(): string | null {
    return this.currentUserSig()?.email ?? null;
  }

  private setUser(user: AuthUser): void {
    this.currentUserSig.set(user);
    const toStore = { ...user, idToken: undefined, accessToken: undefined };
    sessionStorage.setItem(this.AUTH_KEY, JSON.stringify(toStore));
  }

  private async getAmplifySession(): Promise<any> {
    try {
      return await fetchAuthSession();
    } catch {
      return null;
    }
  }

  /** Ensure Amplify has Cognito config (fixes "Auth UserPool not configured" for email/password sign-in). */
  ensureAmplifyConfigured(): void {
    const ac = environment.auth;
    if (!ac?.enabled || !ac.userPoolId || !ac.userPoolClientId) return;
    const domain = (ac as { domain?: string }).domain;
    const redirectBase = typeof window !== 'undefined' && window.location?.origin ? window.location.origin : 'http://localhost:8100';
    const cognitoConfig: Record<string, unknown> = {
      userPoolId: ac.userPoolId,
      userPoolClientId: ac.userPoolClientId,
    };
    if (domain) {
      cognitoConfig['loginWith'] = {
        oauth: {
          domain,
          scopes: ['openid', 'email', 'profile'],
          redirectSignIn: [`${redirectBase}/auth/callback`],
          redirectSignOut: [redirectBase],
          responseType: 'code',
        },
      };
    }
    const authConfig = { Auth: { Cognito: cognitoConfig } };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Amplify AuthConfig union type is complex; runtime config is correct
    cognitoUserPoolsTokenProvider.setAuthConfig(authConfig.Auth as any);
    Amplify.configure(authConfig as never, {
      Auth: { tokenProvider: cognitoUserPoolsTokenProvider },
    } as never);
  }

  private initCognitoPromise: Promise<void> | null = null;

  /** Called on app init when Cognito is configured. Safe to call multiple times. */
  async initCognito(): Promise<void> {
    if (!this.COGNITO_CONFIGURED) return;
    if (this.initCognitoPromise) return this.initCognitoPromise;
    this.initCognitoPromise = this._doInitCognito();
    return this.initCognitoPromise;
  }

  private async _doInitCognito(): Promise<void> {
    try {
      this.ensureAmplifyConfigured();
      try {
        const currentConfig = Amplify.getConfig();
        const cognito = currentConfig?.Auth?.Cognito;
        if (cognito?.userPoolId && cognito?.userPoolClientId) {
          console.log('[AuthService] ✅ Amplify configured - userPoolId:', cognito.userPoolId, '| Email/password sign-in should work');
        } else {
          console.warn('[AuthService] ⚠️ Amplify Auth.Cognito missing or incomplete:', { hasUserPoolId: !!cognito?.userPoolId, hasUserPoolClientId: !!cognito?.userPoolClientId });
        }
      } catch (e) {
        console.warn('[AuthService] Could not verify Amplify config:', e);
      }
      
      // On OAuth callback, don't try to fetch session immediately here
      // Let the handleOAuthCallback method handle it after waiting for the flow to complete
      if (typeof window !== 'undefined' && window.location?.search?.includes('code=')) {
        console.log('[AuthService] OAuth callback detected in initCognito - will be handled by handleOAuthCallback');
      } else {
        await this.tryRestoreSessionFromAmplify();
      }
    } catch (err) {
      console.warn('[AuthService] Cognito init failed:', err);
    }
  }

  private getRedirectCallbackUrl(): string {
    // CRITICAL: Must match exactly what's configured in main.ts
    // Use the same logic to ensure consistency
    const base = typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : 'http://localhost:8100';
    const url = `${base}/auth/callback`;
    console.log('[AuthService] Calculated redirect callback URL:', url);
    return url;
  }

  private getRedirectSignOutUrl(): string {
    // CRITICAL: Must match exactly what's configured in main.ts
    const base = typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : 'http://localhost:8100';
    console.log('[AuthService] Calculated redirect sign-out URL:', base);
    return base;
  }

  /** Restore session from Amplify storage (e.g. after page refresh) */
  private async tryRestoreSessionFromAmplify(): Promise<void> {
    if (!this.COGNITO_CONFIGURED) return;
    try {
      const session = await fetchAuthSession();
      const tokens = session?.tokens;
      if (!tokens?.idToken || !tokens?.accessToken) return;
      const payload = tokens.idToken.payload as Record<string, unknown>;
      const sub = (payload['sub'] as string) ?? '';
      const email = (payload['email'] as string) ?? (payload['cognito:username'] as string) ?? '';
      const name = (payload['name'] as string) ?? '';
      const user: AuthUser = {
        userId: sub,
        email: String(email),
        name: name || undefined,
        tenantId: environment.tenantId,
        role: (payload['custom:role'] as string) ?? environment.userRole,
        idToken: tokens.idToken.toString(),
        accessToken: tokens.accessToken.toString(),
      };
      this.setUser(user);
    } catch {
      // No session - user not logged in
    }
  }

  /** Redirect to Cognito Hosted UI (Google or email/password). Store returnUrl before calling. */
  async signInWithRedirect(): Promise<void> {
    if (!this.COGNITO_CONFIGURED) {
      console.warn('[AuthService] Cognito not configured');
      return;
    }
    
    // CRITICAL: Verify Amplify is configured with OAuth config before redirecting
    // This ensures PKCE verifier is stored correctly
    try {
      const config = Amplify.getConfig();
      if (!config?.Auth?.Cognito?.userPoolId) {
        console.error('[AuthService] ❌ Amplify not configured - cannot initiate OAuth');
        console.error('[AuthService] This should not happen - Amplify should be configured in main.ts');
        throw new Error('Amplify not configured. Please refresh the page.');
      }
      
      // CRITICAL: Verify OAuth config is present - this is required for PKCE storage
      const oauthConfig = config.Auth?.Cognito?.loginWith?.oauth;
      if (!oauthConfig) {
        console.error('[AuthService] ❌ OAuth config missing from Amplify config!');
        console.error('[AuthService] Config structure:', JSON.stringify(config.Auth?.Cognito, null, 2));
        throw new Error('OAuth configuration missing. Please refresh the page.');
      }
      
      console.log('[AuthService] ✅ Amplify configured with OAuth:', {
        userPoolId: config.Auth.Cognito.userPoolId,
        userPoolClientId: config.Auth.Cognito.userPoolClientId,
        domain: oauthConfig.domain,
        redirectSignIn: oauthConfig.redirectSignIn,
        responseType: oauthConfig.responseType,
      });
      
      // Verify redirect URL matches what's configured
      const redirectUrl = this.getRedirectCallbackUrl();
      const configuredRedirects = Array.isArray(oauthConfig.redirectSignIn) 
        ? oauthConfig.redirectSignIn 
        : [oauthConfig.redirectSignIn];
      
      if (!configuredRedirects.includes(redirectUrl)) {
        console.error('[AuthService] ❌ Redirect URL mismatch!');
        console.error('[AuthService] Configured redirects:', configuredRedirects);
        console.error('[AuthService] Expected redirect:', redirectUrl);
        console.error('[AuthService] This will prevent PKCE verifier from being stored correctly');
        // Don't throw - let it try, but log the issue
      }
    } catch (e) {
      console.error('[AuthService] ❌ Failed to verify Amplify config:', e);
      throw new Error('Amplify configuration error. Please refresh the page.');
    }
    
    // Log redirect URL to help debug mismatches
    const redirectUrl = this.getRedirectCallbackUrl();
    console.log('[AuthService] Initiating OAuth redirect with callback URL:', redirectUrl);
    console.log('[AuthService] Current origin:', typeof window !== 'undefined' ? window.location.origin : 'unknown');
    
    // Store redirect URL for verification on callback
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('oauth_expected_redirect', redirectUrl);
      
      // Log localStorage state BEFORE signInWithRedirect to see what's there
      const cid = environment.auth?.userPoolClientId ?? '';
      const prefix = `CognitoIdentityServiceProvider.${cid}`;
      const beforeInflight = localStorage.getItem(`${prefix}.inflightOAuth`);
      const beforePkce = localStorage.getItem(`${prefix}.oauthPKCE`);
      console.log('[AuthService] localStorage BEFORE signInWithRedirect:', {
        inflightOAuth: beforeInflight ? 'present' : 'missing',
        oauthPKCE: beforePkce ? 'present' : 'missing',
      });
    }
    
    // CRITICAL: Ensure Amplify config is fully loaded before calling signInWithRedirect
    // Amplify v6 needs the OAuth config to be accessible to store PKCE verifier
    // Known issue: PKCE verifier won't be stored if OAuth config isn't available
    let retries = 0;
    const maxRetries = 10;
    while (retries < maxRetries) {
      const verifyConfig = Amplify.getConfig();
      const oauthConfig = verifyConfig?.Auth?.Cognito?.loginWith?.oauth;
      if (oauthConfig?.domain && oauthConfig?.redirectSignIn && Array.isArray(oauthConfig.redirectSignIn) && oauthConfig.redirectSignIn.length > 0) {
        console.log('[AuthService] ✅ OAuth config verified - ready to call signInWithRedirect (attempt', retries + 1, ')');
        console.log('[AuthService] OAuth config details:', {
          domain: oauthConfig.domain,
          redirectSignIn: oauthConfig.redirectSignIn,
          responseType: oauthConfig.responseType,
        });
        break;
      }
      retries++;
      if (retries >= maxRetries) {
        console.error('[AuthService] ❌ OAuth config not available after', maxRetries, 'retries');
        console.error('[AuthService] Current config:', JSON.stringify(verifyConfig?.Auth?.Cognito, null, 2));
        throw new Error('OAuth configuration not ready. Please refresh the page.');
      }
      console.log('[AuthService] Waiting for OAuth config... (attempt', retries, '/', maxRetries, ')');
      await new Promise(r => setTimeout(r, 50));
    }
    
    try {
      // CRITICAL: Double-check config is accessible right before calling signInWithRedirect
      // Amplify v6 needs the config to be accessible to store PKCE verifier
      const finalConfigCheck = Amplify.getConfig();
      const finalOauthConfig = finalConfigCheck?.Auth?.Cognito?.loginWith?.oauth;
      if (!finalOauthConfig?.domain || !finalOauthConfig?.redirectSignIn) {
        console.error('[AuthService] ❌ CRITICAL: OAuth config not accessible right before signInWithRedirect!');
        console.error('[AuthService] This will prevent PKCE verifier from being stored');
        console.error('[AuthService] Config:', JSON.stringify(finalConfigCheck?.Auth?.Cognito, null, 2));
        throw new Error('OAuth configuration not accessible. Please refresh the page.');
      }
      
      console.log('[AuthService] ✅ Final config check passed - calling signInWithRedirect()');
      console.log('[AuthService] About to call signInWithRedirect() - PKCE verifier should be stored now');
      console.log('[AuthService] If PKCE is missing after this, it\'s an Amplify v6 bug');
      
      // Store diagnostic info in sessionStorage (survives redirect)
      if (typeof window !== 'undefined') {
        const cid = environment.auth?.userPoolClientId ?? '';
        const prefix = `CognitoIdentityServiceProvider.${cid}`;
        const beforeInflight = localStorage.getItem(`${prefix}.inflightOAuth`);
        const beforePkce = localStorage.getItem(`${prefix}.oauthPKCE`);
        
        sessionStorage.setItem('oauth_signin_attempt_time', Date.now().toString());
        sessionStorage.setItem('oauth_signin_pkce_before', beforePkce ? 'present' : 'missing');
        sessionStorage.setItem('oauth_signin_inflight_before', beforeInflight ? 'present' : 'missing');
        sessionStorage.setItem('oauth_signin_config_ready', (window as any).__AMPLIFY_CONFIG_READY__ ? 'true' : 'false');
        
        console.log('[AuthService] localStorage BEFORE signInWithRedirect (stored in sessionStorage):', {
          inflightOAuth: beforeInflight ? 'present' : 'missing',
          oauthPKCE: beforePkce ? 'present' : 'missing',
        });
      }
      
      // WORKAROUND: Bypass Amplify's broken signInWithRedirect entirely
      // Build our own OAuth redirect URL with manually generated PKCE parameters
      console.log('[AuthService] 🔧 Bypassing Amplify signInWithRedirect - using manual OAuth flow');
      
      const codeVerifier = this.generateCodeVerifier();
      const codeChallenge = await this.generateCodeChallenge(codeVerifier);
      const state = this.generateRandomState();
      
      // Store PKCE parameters for use on callback
      // Use sessionStorage instead of localStorage to ensure persistence across redirects
      // Also store a flag to disable Amplify's OAuth listener
      if (typeof window !== 'undefined') {
        const cid = environment.auth?.userPoolClientId ?? '';
        const prefix = `CognitoIdentityServiceProvider.${cid}`;
        
        // Store PKCE in sessionStorage (persists across redirects, cleared on tab close)
        sessionStorage.setItem(`${prefix}.oauthPKCE`, JSON.stringify({
          codeVerifier,
          codeChallenge,
          codeChallengeMethod: 'S256',
        }));
        sessionStorage.setItem(`${prefix}.oauthState`, state);
        sessionStorage.setItem(`${prefix}.inflightOAuth`, 'true');
        
        // Flag to disable Amplify's OAuth listener
        sessionStorage.setItem('upora_manual_oauth', 'true');
        
        // Also store in localStorage as backup (Amplify might check there)
        localStorage.setItem(`${prefix}.oauthPKCE`, JSON.stringify({
          codeVerifier,
          codeChallenge,
          codeChallengeMethod: 'S256',
        }));
        localStorage.setItem(`${prefix}.oauthState`, state);
        localStorage.setItem(`${prefix}.inflightOAuth`, 'true');
        
        console.log('[AuthService] ✅ Stored PKCE parameters for manual OAuth flow (sessionStorage + localStorage)');
        console.log('[AuthService] PKCE storage:', {
          verifierLength: codeVerifier.length,
          challengeLength: codeChallenge.length,
          stateLength: state.length,
          storage: 'sessionStorage + localStorage',
        });
      }
      
      // Build OAuth authorization URL manually
      const redirectUri = this.getRedirectCallbackUrl();
      const domain = finalOauthConfig.domain;
      const clientId = environment.auth.userPoolClientId;
      
      const authParams = new URLSearchParams({
        response_type: 'code',
        client_id: clientId,
        redirect_uri: redirectUri,
        scope: 'openid email profile',
        state: state,
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
      });
      
      const authUrl = `https://${domain}/oauth2/authorize?${authParams.toString()}`;
      
      // Verify PKCE pair matches
      const verifyChallenge = await this.generateCodeChallenge(codeVerifier);
      const pkceMatches = verifyChallenge === codeChallenge;
      
      console.log('[AuthService] Redirecting to manual OAuth URL:', {
        domain,
        redirect_uri: redirectUri,
        code_challenge_length: codeChallenge.length,
        code_verifier_length: codeVerifier.length,
        state_length: state.length,
        pkce_pair_valid: pkceMatches ? '✅ MATCH' : '❌ MISMATCH',
        code_challenge_preview: codeChallenge.substring(0, 20) + '...',
        code_verifier_preview: codeVerifier.substring(0, 20) + '...',
      });
      
      if (!pkceMatches) {
        console.error('[AuthService] ❌ CRITICAL: PKCE challenge/verifier mismatch!');
        console.error('[AuthService] Generated challenge:', codeChallenge);
        console.error('[AuthService] Verified challenge:', verifyChallenge);
        throw new Error('PKCE challenge/verifier mismatch - cannot proceed with OAuth');
      }
      
      // Redirect to Cognito hosted UI
      // Note: This redirects immediately, so code after this won't execute
      window.location.href = authUrl;
      
      // This code won't execute due to redirect, but kept for reference
      return;
    } catch (e) {
      console.error('[AuthService] ❌ Manual OAuth redirect failed:', e);
      throw e;
    }
  }

  /**
   * Generate a random state parameter for OAuth
   */
  private generateRandomState(): string {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode(...array))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  /**
   * Handle OAuth callback. Supports both:
   * - Implicit flow: tokens in URL fragment (#id_token=...&access_token=...)
   * - Code flow: Amplify fetchAuthSession (if PKCE exchange succeeded)
   */
  async handleOAuthCallback(): Promise<{ success: boolean; error?: string }> {
    if (!this.COGNITO_CONFIGURED) {
      return { success: false, error: 'Cognito not configured' };
    }
    try {
      // CRITICAL: Ensure Amplify is configured before handling callback
      // This is especially important on callback page where config might not be ready
      this.ensureAmplifyConfigured();
      try {
        const config = Amplify.getConfig();
        if (!config?.Auth?.Cognito?.userPoolId) {
          console.error('[AuthService] ⚠️ Amplify config not accessible in handleOAuthCallback');
          console.error('[AuthService] This may cause "Auth UserPool not configured" error');
          // Try to wait a bit for config to be ready
          await new Promise(r => setTimeout(r, 500));
          const retryConfig = Amplify.getConfig();
          if (!retryConfig?.Auth?.Cognito?.userPoolId) {
            console.error('[AuthService] ❌ Amplify config still not accessible after retry');
            return { 
              success: false, 
              error: 'Amplify configuration not ready. Please refresh the page and try again.' 
            };
          }
        }
      } catch (configError) {
        console.error('[AuthService] ❌ Error accessing Amplify config:', configError);
        return { 
          success: false, 
          error: 'Failed to access Amplify configuration. Please refresh the page and try again.' 
        };
      }
      
      await this.initCognito();
      
      // Check for implicit flow tokens first (deprecated but still supported)
      const implicitTokens = this.parseImplicitTokensFromHash();
      if (implicitTokens) {
        console.log('[AuthService] Implicit flow tokens found in URL hash');
        const user: AuthUser = {
          userId: implicitTokens.sub,
          email: implicitTokens.email,
          name: implicitTokens.name,
          tenantId: environment.tenantId,
          role: implicitTokens.role ?? environment.userRole,
          idToken: implicitTokens.idToken,
          accessToken: implicitTokens.accessToken,
        };
        this.setUser(user);
        return { success: true };
      }
      
      // Authorization code flow
      const isCodeFlow = typeof window !== 'undefined' && window.location.search?.includes('code=');
      if (isCodeFlow) {
        console.log('[AuthService] Authorization code flow detected');
        
        // Verify redirect URL matches what was used to initiate OAuth
        if (typeof window !== 'undefined') {
          const expectedRedirect = sessionStorage.getItem('oauth_expected_redirect');
          const currentUrl = window.location.href.split('?')[0];
          console.log('[AuthService] Redirect URL verification:', {
            expected: expectedRedirect || 'not stored',
            current: currentUrl,
            match: expectedRedirect === currentUrl ? '✅ MATCH' : '❌ MISMATCH',
          });
          
          if (expectedRedirect && expectedRedirect !== currentUrl) {
            console.error('[AuthService] ❌ Redirect URL mismatch detected!');
            console.error('[AuthService] This will cause OAuth failure - Cognito state won\'t match');
            sessionStorage.removeItem('oauth_expected_redirect');
            return {
              success: false,
              error: 'OAuth redirect URL mismatch. Please try signing in again.',
            };
          }
          sessionStorage.removeItem('oauth_expected_redirect');
        }
        
        // Check PKCE storage - prioritize manual flow
        // Check both sessionStorage (primary) and localStorage (backup)
        const cid = environment.auth?.userPoolClientId ?? '';
        const prefix = `CognitoIdentityServiceProvider.${cid}`;
        const inflightSession = sessionStorage.getItem(`${prefix}.inflightOAuth`);
        const pkceSession = sessionStorage.getItem(`${prefix}.oauthPKCE`);
        const stateSession = sessionStorage.getItem(`${prefix}.oauthState`);
        const inflightLocal = localStorage.getItem(`${prefix}.inflightOAuth`);
        const pkceLocal = localStorage.getItem(`${prefix}.oauthPKCE`);
        const stateLocal = localStorage.getItem(`${prefix}.oauthState`);
        
        // Use sessionStorage first, fall back to localStorage
        const inflight = inflightSession || inflightLocal;
        const pkce = pkceSession || pkceLocal;
        const state = stateSession || stateLocal;
        
        console.log('[AuthService] PKCE storage check:', {
          sessionStorage: {
            inflightOAuth: inflightSession ? 'present' : 'missing',
            oauthPKCE: pkceSession ? 'present' : 'missing',
            oauthState: stateSession ? 'present' : 'missing',
          },
          localStorage: {
            inflightOAuth: inflightLocal ? 'present' : 'missing',
            oauthPKCE: pkceLocal ? 'present' : 'missing',
            oauthState: stateLocal ? 'present' : 'missing',
          },
          using: pkceSession ? 'sessionStorage' : pkceLocal ? 'localStorage' : 'none',
        });
        
        // Extract authorization code from URL
        const urlParams = new URLSearchParams(window.location.search);
        const authCode = urlParams.get('code');
        const stateParam = urlParams.get('state');
        
        if (!authCode) {
          console.error('[AuthService] ❌ No authorization code in URL');
          return { 
            success: false, 
            error: 'No authorization code found in callback URL. Please try signing in again.' 
          };
        }
        
          // Check if we have manually stored PKCE (from our manual OAuth flow)
          // Try sessionStorage first, then localStorage
          let codeVerifier: string | null = null;
          const pkceToUse = pkceSession || pkceLocal;
          if (pkceToUse) {
            try {
              const pkceData = JSON.parse(pkceToUse);
              codeVerifier = pkceData.codeVerifier || null;
              if (codeVerifier) {
                console.log('[AuthService] ✅ Found manually stored PKCE verifier - using manual exchange');
                console.log('[AuthService] PKCE source:', pkceSession ? 'sessionStorage' : 'localStorage');
              }
            } catch (e) {
              console.warn('[AuthService] ⚠️ Failed to parse stored PKCE data:', e);
            }
          }
        
        // ALWAYS use manual exchange if we have PKCE verifier (prevents Amplify from consuming code)
        // Only fall back to Amplify if we truly don't have manual PKCE
        if (codeVerifier) {
          console.log('[AuthService] 🔧 Using manual OAuth code exchange immediately (bypassing Amplify to prevent code consumption)');
          try {
            const result = await this.manualOAuthCodeExchange(authCode, stateParam, codeVerifier);
            if (result.success) {
              console.log('[AuthService] ✅ Manual OAuth exchange succeeded');
              // Clear PKCE data after successful exchange (both storage types)
              localStorage.removeItem(`${prefix}.inflightOAuth`);
              localStorage.removeItem(`${prefix}.oauthPKCE`);
              localStorage.removeItem(`${prefix}.oauthState`);
              sessionStorage.removeItem(`${prefix}.inflightOAuth`);
              sessionStorage.removeItem(`${prefix}.oauthPKCE`);
              sessionStorage.removeItem(`${prefix}.oauthState`);
              sessionStorage.removeItem('upora_manual_oauth');
              return result;
            } else {
              console.error('[AuthService] ❌ Manual OAuth exchange failed:', result.error);
              return result;
            }
          } catch (manualError) {
            console.error('[AuthService] ❌ Manual OAuth exchange exception:', manualError);
            return { 
              success: false, 
              error: `Manual OAuth exchange failed: ${manualError instanceof Error ? manualError.message : 'Unknown error'}` 
            };
          }
        }
        
        // If no PKCE verifier found, this is an error
        if (!codeVerifier) {
          console.error('[AuthService] ❌ No PKCE verifier found - cannot complete code exchange');
          console.error('[AuthService] This means either:');
          console.error('[AuthService]   1. Storage was cleared between redirect and callback');
          console.error('[AuthService]   2. Manual PKCE storage failed before redirect');
          console.error('[AuthService]   3. Different origin (localhost vs 127.0.0.1)');
          
          // Clear any stale state (both storage types)
          localStorage.removeItem(`${prefix}.inflightOAuth`);
          localStorage.removeItem(`${prefix}.oauthPKCE`);
          localStorage.removeItem(`${prefix}.oauthState`);
          sessionStorage.removeItem(`${prefix}.inflightOAuth`);
          sessionStorage.removeItem(`${prefix}.oauthPKCE`);
          sessionStorage.removeItem(`${prefix}.oauthState`);
          sessionStorage.removeItem('oauth_expected_redirect');
          sessionStorage.removeItem('upora_manual_oauth');
          
          return { 
            success: false, 
            error: 'OAuth authentication failed: PKCE verifier not found. This may happen if browser storage was cleared. Please try signing in again.' 
          };
        }
        
        // If PKCE is present but not manual (Amplify's), try Amplify flow
        // But this is likely to fail due to the Amplify v6 bug, so we'll fall back to manual
        console.log('[AuthService] PKCE present - attempting Amplify flow (may fall back to manual)');
        try {
          console.log('[AuthService] Waiting for OAuth flow completion...');
          await Promise.race([
            oauthFlowCompletePromise,
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
          ]);
          console.log('[AuthService] OAuth flow complete promise resolved');
        } catch (e) {
          console.warn('[AuthService] OAuth flow complete promise error (likely Amplify bug):', e);
          // Fall back to manual exchange
          console.log('[AuthService] 🔧 Falling back to manual OAuth exchange');
          const storedPkce = localStorage.getItem(`${prefix}.oauthPKCE`);
          let fallbackVerifier: string | null = null;
          if (storedPkce) {
            try {
              const pkceData = JSON.parse(storedPkce);
              fallbackVerifier = pkceData.codeVerifier || null;
            } catch (e) {
              // Ignore parse errors
            }
          }
          if (fallbackVerifier) {
            const result = await this.manualOAuthCodeExchange(authCode, stateParam, fallbackVerifier);
            if (result.success) {
              localStorage.removeItem(`${prefix}.inflightOAuth`);
              localStorage.removeItem(`${prefix}.oauthPKCE`);
              localStorage.removeItem(`${prefix}.oauthState`);
              return result;
            }
          }
        }
        
        // Give Amplify additional time to complete the token exchange
        await new Promise(r => setTimeout(r, 1000));
      }
      
      const maxRetries = isCodeFlow ? 10 : 1; // Increased retries for code flow
      const retryDelayMs = 500;
      let session: Awaited<ReturnType<typeof fetchAuthSession>> | null = null;
      let lastError: Error | null = null;
      
      for (let i = 0; i < maxRetries; i++) {
        try {
          session = await fetchAuthSession();
          if (session?.tokens?.idToken && session?.tokens?.accessToken) {
            console.log('[AuthService] ✅ Tokens found in session (attempt', i + 1, ')');
            break;
          } else {
            console.log('[AuthService] No tokens yet (attempt', i + 1, '/', maxRetries, ')');
          }
        } catch (e) {
          lastError = e instanceof Error ? e : new Error(String(e));
          console.warn('[AuthService] fetchAuthSession error (attempt', i + 1, '):', lastError.message);
        }
        
        if (i < maxRetries - 1) {
          await new Promise(r => setTimeout(r, retryDelayMs));
        }
      }
      
      const tokens = session?.tokens;
      if (!tokens?.idToken || !tokens?.accessToken) {
        const errorMsg = lastError 
          ? `Failed to fetch session: ${lastError.message}` 
          : 'No tokens in session after retries. Check console for PKCE diagnostic messages.';
        console.error('[AuthService] ❌ Token exchange failed:', errorMsg);
        return { success: false, error: errorMsg };
      }
      
      const payload = tokens.idToken.payload as Record<string, unknown>;
      const sub = (payload['sub'] as string) ?? '';
      const email = (payload['email'] as string) ?? (payload['cognito:username'] as string) ?? '';
      const name = (payload['name'] as string) ?? '';
      const user: AuthUser = {
        userId: sub,
        email: String(email),
        name: name || undefined,
        tenantId: environment.tenantId,
        role: (payload['custom:role'] as string) ?? environment.userRole,
        idToken: tokens.idToken.toString(),
        accessToken: tokens.accessToken.toString(),
      };
      this.setUser(user);
      console.log('[AuthService] ✅ User authenticated:', user.email);
      return { success: true };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to complete sign-in';
      console.error('[AuthService] ❌ OAuth callback error:', msg, e);
      return { success: false, error: msg };
    }
  }

  /**
   * Manual OAuth code exchange - bypasses Amplify's broken PKCE storage
   * Uses the stored code verifier to exchange authorization code for tokens directly with Cognito
   */
  private async manualOAuthCodeExchange(authCode: string, stateParam: string | null, codeVerifier: string): Promise<{ success: boolean; error?: string }> {
    if (!environment.auth?.userPoolId || !environment.auth?.userPoolClientId || !environment.auth?.domain) {
      return { success: false, error: 'Cognito configuration incomplete' };
    }

    try {
      console.log('[AuthService] 🔧 Starting manual OAuth code exchange');
      console.log('[AuthService] Using stored PKCE verifier (length:', codeVerifier.length, ')');
      
      // Verify the stored code_challenge matches what we'll generate from verifier
      const cid = environment.auth?.userPoolClientId ?? '';
      const prefix = `CognitoIdentityServiceProvider.${cid}`;
      const storedPkce = sessionStorage.getItem(`${prefix}.oauthPKCE`) || localStorage.getItem(`${prefix}.oauthPKCE`);
      let storedChallenge: string | null = null;
      if (storedPkce) {
        try {
          const pkceData = JSON.parse(storedPkce);
          storedChallenge = pkceData.codeChallenge || null;
        } catch (e) {
          console.warn('[AuthService] ⚠️ Failed to parse stored PKCE:', e);
        }
      }
      
      // Verify PKCE pair
      const verifyChallenge = await this.generateCodeChallenge(codeVerifier);
      const pkceMatches = storedChallenge ? verifyChallenge === storedChallenge : false;
      
      console.log('[AuthService] PKCE verification:', {
        stored_challenge: storedChallenge ? storedChallenge.substring(0, 20) + '...' : 'missing',
        computed_challenge: verifyChallenge.substring(0, 20) + '...',
        verifier_preview: codeVerifier.substring(0, 20) + '...',
        pkce_valid: pkceMatches ? '✅ MATCH' : '❌ MISMATCH',
      });
      
      if (!pkceMatches && storedChallenge) {
        console.error('[AuthService] ❌ PKCE mismatch detected!');
        console.error('[AuthService] Stored challenge:', storedChallenge);
        console.error('[AuthService] Computed challenge:', verifyChallenge);
        console.error('[AuthService] Verifier:', codeVerifier);
        return {
          success: false,
          error: 'PKCE challenge/verifier mismatch. The stored PKCE data may be corrupted. Please clear browser storage and try again.'
        };
      }
      
      // Exchange authorization code for tokens
      const tokenEndpoint = `https://${environment.auth.domain}/oauth2/token`;
      const redirectUri = this.getRedirectCallbackUrl();
      
      const tokenParams = new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: environment.auth.userPoolClientId,
        code: authCode,
        redirect_uri: redirectUri,
        code_verifier: codeVerifier,
      });
      
      console.log('[AuthService] Exchanging code for tokens at:', tokenEndpoint);
      console.log('[AuthService] Token request params:', {
        grant_type: 'authorization_code',
        client_id: environment.auth.userPoolClientId.substring(0, 10) + '...',
        code: authCode.substring(0, 20) + '...',
        redirect_uri: redirectUri,
        code_verifier_length: codeVerifier.length,
        code_verifier_preview: codeVerifier.substring(0, 20) + '...',
      });
      
      const tokenResponse = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: tokenParams.toString(),
      });
      
      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        let errorData: any = {};
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { raw: errorText };
        }
        
        console.error('[AuthService] ❌ Token exchange failed:', {
          status: tokenResponse.status,
          statusText: tokenResponse.statusText,
          error: errorText,
          parsed_error: errorData,
        });
        
        // Log the exact request for debugging
        console.error('[AuthService] Request details:', {
          endpoint: tokenEndpoint,
          redirect_uri: redirectUri,
          code_preview: authCode.substring(0, 30) + '...',
          verifier_preview: codeVerifier.substring(0, 30) + '...',
          verifier_length: codeVerifier.length,
        });
        
        // If it's a 400 error with invalid_grant, the code_verifier doesn't match
        if (tokenResponse.status === 400) {
          const errorMsg = errorData.error || 'unknown_error';
          if (errorMsg === 'invalid_grant') {
            console.error('[AuthService] ❌ invalid_grant error - PKCE mismatch or code already used');
            console.error('[AuthService] This means:');
            console.error('[AuthService]   1. The code_verifier doesn\'t match the code_challenge sent in authorization');
            console.error('[AuthService]   2. OR the authorization code was already consumed (maybe by Amplify?)');
            console.error('[AuthService]   3. OR the authorization code expired');
            return { 
              success: false, 
              error: 'Token exchange failed: Invalid authorization code or PKCE mismatch. The code may have been consumed by Amplify\'s OAuth listener. Please clear browser storage and try signing in again.' 
            };
          }
          return { 
            success: false, 
            error: `Token exchange failed: ${errorMsg}. ${errorData.error_description || errorText}` 
          };
        }
        
        return { 
          success: false, 
          error: `Token exchange failed: ${tokenResponse.status} ${tokenResponse.statusText}. ${errorText}` 
        };
      }
      
      const tokenData = await tokenResponse.json();
      
      if (!tokenData.id_token || !tokenData.access_token) {
        console.error('[AuthService] ❌ Token response missing tokens:', tokenData);
        return { success: false, error: 'Token response missing required tokens' };
      }
      
      console.log('[AuthService] ✅ Tokens received from manual exchange');
      
      // Parse ID token to extract user info
      const idTokenPayload = JSON.parse(atob(tokenData.id_token.split('.')[1])) as Record<string, unknown>;
      const sub = (idTokenPayload['sub'] as string) ?? '';
      const email = (idTokenPayload['email'] as string) ?? (idTokenPayload['cognito:username'] as string) ?? '';
      const name = (idTokenPayload['name'] as string) || undefined;
      
      const user: AuthUser = {
        userId: sub,
        email: String(email),
        name: name,
        tenantId: environment.tenantId,
        role: (idTokenPayload['custom:role'] as string) ?? environment.userRole,
        idToken: tokenData.id_token,
        accessToken: tokenData.access_token,
      };
      
      this.setUser(user);
      console.log('[AuthService] ✅ User authenticated via manual exchange:', user.email);
      
      return { success: true };
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Unknown error';
      console.error('[AuthService] ❌ Manual OAuth exchange exception:', errorMsg, e);
      return { success: false, error: `Manual OAuth exchange failed: ${errorMsg}` };
    }
  }

  /**
   * Generate a random code verifier for PKCE (RFC 7636)
   */
  private generateCodeVerifier(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode(...array))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  /**
   * Generate code challenge from verifier (SHA256 hash, base64url encoded)
   */
  private async generateCodeChallenge(verifier: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const digest = await crypto.subtle.digest('SHA-256', data);
    const array = new Uint8Array(digest);
    return btoa(String.fromCharCode(...array))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  private parseImplicitTokensFromHash(): { idToken: string; accessToken: string; sub: string; email: string; name?: string; role?: string } | null {
    if (typeof window === 'undefined' || !window.location.hash) return null;
    const params = new URLSearchParams(window.location.hash.replace('#', ''));
    const idToken = params.get('id_token');
    const accessToken = params.get('access_token');
    if (!idToken || !accessToken) return null;
    try {
      const payload = JSON.parse(atob(idToken.split('.')[1])) as Record<string, unknown>;
      return {
        idToken,
        accessToken,
        sub: (payload['sub'] as string) ?? '',
        email: String((payload['email'] as string) ?? (payload['cognito:username'] as string) ?? ''),
        name: (payload['name'] as string) || undefined,
        role: payload['custom:role'] as string | undefined,
      };
    } catch {
      return null;
    }
  }
}
