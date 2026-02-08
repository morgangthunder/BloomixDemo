import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';
import { environment } from './environments/environment';
import { Amplify, Hub } from '@aws-amplify/core';
import { cognitoUserPoolsTokenProvider } from '@aws-amplify/auth/cognito';
import { initOAuthCallbackHelper } from './app/core/services/oauth-callback-helper';

// CRITICAL: OAuth listener MUST be imported BEFORE Amplify.configure()
// This enables Amplify to handle the authorization code exchange automatically
// TEMPORARILY DISABLED: This listener interferes with our manual OAuth flow by consuming
// the authorization code before our manual exchange can use it, causing invalid_grant errors.
// We're using a manual OAuth flow to work around Amplify v6's PKCE storage bug.
// import '@aws-amplify/auth/enable-oauth-listener';

// OAuth PKCE diagnostic: log storage state when landing on callback (before Amplify runs)
if (typeof window !== 'undefined' && (window.location.search?.includes('code=') || window.location.hash?.includes('id_token='))) {
  const cid = environment.auth?.userPoolClientId ?? '?';
  const prefix = `CognitoIdentityServiceProvider.${cid}`;
  
  // Check both sessionStorage (primary for manual flow) and localStorage (backup)
  const inflightLocal = localStorage.getItem(`${prefix}.inflightOAuth`);
  const pkceLocal = localStorage.getItem(`${prefix}.oauthPKCE`);
  const stateLocal = localStorage.getItem(`${prefix}.oauthState`);
  const inflightSession = sessionStorage.getItem(`${prefix}.inflightOAuth`);
  const pkceSession = sessionStorage.getItem(`${prefix}.oauthPKCE`);
  const stateSession = sessionStorage.getItem(`${prefix}.oauthState`);
  const manualOAuth = sessionStorage.getItem('upora_manual_oauth');
  
  const inflight = inflightSession || inflightLocal;
  const pkce = pkceSession || pkceLocal;
  const state = stateSession || stateLocal;
  
  const allLocalKeys = Object.keys(localStorage).filter(k => k.includes('CognitoIdentityServiceProvider') || k.includes('amplify'));
  const allSessionKeys = Object.keys(sessionStorage).filter(k => k.includes('CognitoIdentityServiceProvider') || k.includes('upora'));
  
  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('[OAuth Diagnostic] CALLBACK PAGE LOADED');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('[OAuth Diagnostic] Origin:', window.location.origin);
  console.log('[OAuth Diagnostic] Full URL:', window.location.href);
  console.log('[OAuth Diagnostic] Expected prefix:', prefix);
  console.log('[OAuth Diagnostic] Client ID:', cid);
  console.log('[OAuth Diagnostic] Manual OAuth flag:', manualOAuth ? '✅ SET' : '❌ NOT SET');
  console.log('');
  console.log('[OAuth Diagnostic] PKCE Storage Check (sessionStorage):');
  console.log('  inflightOAuth:', inflightSession ? `✅ present` : '❌ MISSING');
  console.log('  oauthPKCE:', pkceSession ? `✅ present (${pkceSession.substring(0, 30)}...)` : '❌ MISSING');
  console.log('  oauthState:', stateSession ? '✅ present' : '❌ MISSING');
  console.log('');
  console.log('[OAuth Diagnostic] PKCE Storage Check (localStorage):');
  console.log('  inflightOAuth:', inflightLocal ? `✅ present` : '❌ MISSING');
  console.log('  oauthPKCE:', pkceLocal ? `✅ present (${pkceLocal.substring(0, 30)}...)` : '❌ MISSING');
  console.log('  oauthState:', stateLocal ? '✅ present' : '❌ MISSING');
  console.log('');
  console.log('[OAuth Diagnostic] Using:', pkceSession ? 'sessionStorage' : pkceLocal ? 'localStorage' : 'NONE');
  console.log('[OAuth Diagnostic] All Cognito/Amplify keys in localStorage:', allLocalKeys);
  console.log('[OAuth Diagnostic] All Cognito/Amplify keys in sessionStorage:', allSessionKeys);
  console.log('');
  
  // Check URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get('code');
  const stateParam = urlParams.get('state');
  console.log('[OAuth Diagnostic] URL Parameters:');
  console.log('  code:', code ? `✅ present (${code.substring(0, 30)}...)` : '❌ MISSING');
  console.log('  state:', stateParam || '❌ MISSING');
  console.log('');
  
  if (!inflight || !pkce) {
    console.error('[OAuth Diagnostic] ❌ CRITICAL: PKCE data missing - token exchange will FAIL');
    console.error('[OAuth Diagnostic] Possible causes:');
    console.error('  1. Storage cleared between redirect (check version mismatch logic)');
    console.error('  2. Different origin (localhost vs 127.0.0.1 vs IP address)');
    console.error('  3. Incognito/private mode blocking localStorage');
    console.error('  4. Client ID mismatch between redirect and callback');
    console.error('  5. Browser extension blocking storage');
    console.error('');
    console.error('[OAuth Diagnostic] ACTION REQUIRED:');
    console.error('  - Check DevTools > Application > Local Storage >', window.location.origin);
    console.error('  - Verify you used the same origin for login and callback');
    console.error('  - Try clearing all storage and signing in again');
  } else {
    console.log('[OAuth Diagnostic] ✅ PKCE data found - Amplify should be able to exchange code');
  }
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');
}

// EARLY DIAGNOSTIC: Log immediately when main.ts loads
console.log('[Amplify Config] ===========================================');
console.log('[Amplify Config] main.ts loaded at:', new Date().toISOString());
console.log('[Amplify Config] Current URL:', typeof window !== 'undefined' ? window.location.href : 'N/A');
console.log('[Amplify Config] Is OAuth callback?', typeof window !== 'undefined' && window.location.search?.includes('code=') ? 'YES' : 'NO');
console.log('[Amplify Config] ===========================================');

const authConfig = environment.auth;
if (authConfig?.enabled && authConfig?.userPoolId && authConfig?.userPoolClientId && (authConfig as { domain?: string }).domain) {
  // CRITICAL: Ensure consistent redirect URL calculation
  // Must match exactly what was used when signInWithRedirect() was called
  // Calculate this outside the if block so it's available for verification
  const redirectBase = typeof window !== 'undefined' && window.location?.origin 
    ? window.location.origin 
    : 'http://localhost:8100';
  const redirectSignInUrl = `${redirectBase}/auth/callback`;
  
  // CRITICAL: Always configure Amplify in main.ts BEFORE Angular bootstraps
  // This ensures the OAuth listener has the config when it runs
  // The check in auth.service.ts will skip reconfiguration if already done
  const domain = (authConfig as { domain?: string }).domain!;
  
  console.log('[Amplify Config] Configuring OAuth in main.ts:', {
    domain,
    redirectSignIn: redirectSignInUrl,
    redirectSignOut: redirectBase,
    responseType: 'code',
    userPoolClientId: authConfig.userPoolClientId,
    userPoolId: authConfig.userPoolId,
  });
  
  // Check if we're using manual OAuth flow - if so, delay listener initialization
  // to prevent Amplify from trying to consume the authorization code before our manual exchange
  const isManualOAuth = typeof window !== 'undefined' && 
    (window.location.search?.includes('code=') || window.location.hash?.includes('id_token=')) &&
    sessionStorage.getItem('upora_manual_oauth') === 'true';
  
  if (!isManualOAuth) {
    // Initialize Hub listener BEFORE configuring Amplify (only if not manual OAuth)
    initOAuthCallbackHelper(Hub);
  } else {
    console.log('[Amplify Config] ⚠️ Manual OAuth detected - skipping Amplify OAuth listener initialization');
    console.log('[Amplify Config] Manual exchange will handle the callback');
  }
  
  const amplifyConfig = {
    Auth: {
      Cognito: {
        userPoolId: authConfig.userPoolId,
        userPoolClientId: authConfig.userPoolClientId,
        loginWith: {
          oauth: {
            domain,
            scopes: ['openid', 'email', 'profile'],
            redirectSignIn: [redirectSignInUrl], // Must be array for Amplify v6
            redirectSignOut: [redirectBase], // Must be array for Amplify v6
            responseType: 'code' as const, // Must be literal type 'code' not string
          },
        },
      },
    },
  };
  
  // Store config globally for diagnostics
  if (typeof window !== 'undefined') {
    (window as any).__AMPLIFY_CONFIG__ = amplifyConfig;
    (window as any).__OAUTH_REDIRECT_URL__ = redirectSignInUrl;
  }
  
  // CRITICAL: On OAuth callback, check PKCE storage BEFORE configuring Amplify
  // This helps diagnose if PKCE was stored when signInWithRedirect() was called
  const isCallback = typeof window !== 'undefined' && window.location.search?.includes('code=');
  if (isCallback) {
    const cid = authConfig.userPoolClientId;
    const prefix = `CognitoIdentityServiceProvider.${cid}`;
    const inflightBefore = localStorage.getItem(`${prefix}.inflightOAuth`);
    const pkceBefore = localStorage.getItem(`${prefix}.oauthPKCE`);
    
    // Check sessionStorage for diagnostic info from signInWithRedirect()
    const signinTime = sessionStorage.getItem('oauth_signin_attempt_time');
    const pkceBeforeSignin = sessionStorage.getItem('oauth_signin_pkce_before');
    const inflightBeforeSignin = sessionStorage.getItem('oauth_signin_inflight_before');
    const configReady = sessionStorage.getItem('oauth_signin_config_ready');
    
    console.log('[Amplify Config] 🔍 PKCE storage check BEFORE configure() on callback:');
    console.log('[Amplify Config]   Current localStorage:', {
      inflightOAuth: inflightBefore ? 'present' : 'missing',
      oauthPKCE: pkceBefore ? 'present' : 'missing',
    });
    if (signinTime) {
      console.log('[Amplify Config]   Diagnostic info from signInWithRedirect():', {
        signinTime: new Date(parseInt(signinTime)).toISOString(),
        pkceBeforeSignin: pkceBeforeSignin || 'not stored',
        inflightBeforeSignin: inflightBeforeSignin || 'not stored',
        configReady: configReady || 'not stored',
      });
    } else {
      console.warn('[Amplify Config] ⚠️ No diagnostic info in sessionStorage - signInWithRedirect() logs not captured');
      console.warn('[Amplify Config] This means the logs from clicking "Sign in with Google" were not captured');
    }
    
    if (!inflightBefore || !pkceBefore) {
      console.error('[Amplify Config] ⚠️ PKCE data missing BEFORE configure() - OAuth listener will fail');
      console.error('[Amplify Config] This means signInWithRedirect() did not store the PKCE verifier');
      console.error('[Amplify Config] This is likely an Amplify v6 bug');
      if (pkceBeforeSignin === 'missing') {
        console.error('[Amplify Config] ⚠️ PKCE was already missing BEFORE signInWithRedirect() was called!');
        console.error('[Amplify Config] This confirms Amplify v6 is not storing the PKCE verifier');
      }
    }
  }
  
  // CRITICAL: Verify config structure before calling configure()
  // This ensures the config is in the format Amplify expects
  console.log('[Amplify Config] Verifying config structure before configure():');
  console.log('[Amplify Config] Config keys:', Object.keys(amplifyConfig));
  console.log('[Amplify Config] Auth.Cognito keys:', Object.keys(amplifyConfig.Auth?.Cognito || {}));
  console.log('[Amplify Config] Auth.Cognito.loginWith.oauth keys:', Object.keys(amplifyConfig.Auth?.Cognito?.loginWith?.oauth || {}));
  
  // CRITICAL: Set up Cognito token provider BEFORE configure() - required for email/password (SRP) sign-in
  // When using @aws-amplify/core directly (not aws-amplify), the token provider is not auto-configured.
  // Without this, signIn() fails with "Auth UserPool not configured".
  cognitoUserPoolsTokenProvider.setAuthConfig(amplifyConfig.Auth);
  
  // Configure Amplify - this triggers the OAuth listener to check for callbacks
  // IMPORTANT: This MUST happen before Angular bootstraps to ensure config is ready
  // The OAuth listener runs synchronously during configure(), so config must be fully ready
  console.log('[Amplify Config] Calling Amplify.configure()...');
  console.log('[Amplify Config] Config being passed:', JSON.stringify(amplifyConfig, null, 2));
  
  try {
    // CRITICAL: On OAuth callback, ensure config is fully ready before configure()
    // The OAuth listener runs synchronously during configure(), so config must be accessible
    if (isCallback) {
      // Double-check config structure is correct
      if (!amplifyConfig.Auth?.Cognito?.userPoolId || !amplifyConfig.Auth?.Cognito?.userPoolClientId) {
        console.error('[Amplify Config] ❌ CRITICAL: Config missing required fields before configure()');
        throw new Error('Amplify configuration incomplete - missing userPoolId or userPoolClientId');
      }
      
      // Verify OAuth config is present
      if (!amplifyConfig.Auth?.Cognito?.loginWith?.oauth?.domain) {
        console.error('[Amplify Config] ❌ CRITICAL: OAuth config missing before configure()');
        throw new Error('Amplify OAuth configuration incomplete');
      }
      
      console.log('[Amplify Config] ✅ Config verified before configure() on callback');
    }
    
    Amplify.configure(amplifyConfig, {
      Auth: {
        tokenProvider: cognitoUserPoolsTokenProvider,
      },
    });
    console.log('[Amplify Config] ✅ Amplify.configure() completed without throwing');
  } catch (configureError: any) {
    console.error('[Amplify Config] ❌ Amplify.configure() threw error:', configureError);
    console.error('[Amplify Config] Error name:', configureError?.name);
    console.error('[Amplify Config] Error message:', configureError?.message);
    console.error('[Amplify Config] Error stack:', configureError?.stack);
    
    // If this is an OAuth callback and configure() failed, log diagnostic info
    if (isCallback) {
      console.error('[Amplify Config] ⚠️ CRITICAL: configure() failed on callback page');
      console.error('[Amplify Config] OAuth listener cannot process the authorization code');
      console.error('[Amplify Config] This is likely because:');
      console.error('[Amplify Config]   1. Config is not accessible when listener runs');
      console.error('[Amplify Config]   2. PKCE verifier is missing (Amplify v6 bug)');
      console.error('[Amplify Config]   3. Config structure is incorrect');
      
      // Don't throw - let the app start so the callback component can show an error
      // The callback component will handle the error gracefully
      console.error('[Amplify Config] ⚠️ Continuing despite configure() error - callback component will handle');
    } else {
      // Re-throw for non-callback cases to prevent app from starting with broken config
      throw configureError;
    }
  }
  
  // Immediately verify config is accessible after configure()
  try {
    const verifyAfter = Amplify.getConfig();
    console.log('[Amplify Config] ✅ Config accessible immediately after configure():', {
      hasAuth: !!verifyAfter?.Auth,
      hasCognito: !!verifyAfter?.Auth?.Cognito,
      hasUserPoolId: !!verifyAfter?.Auth?.Cognito?.userPoolId,
      hasOAuth: !!verifyAfter?.Auth?.Cognito?.loginWith?.oauth,
    });
  } catch (verifyError) {
    console.error('[Amplify Config] ❌ Config NOT accessible after configure():', verifyError);
    console.error('[Amplify Config] This will cause OAuth listener to fail');
  }
  
  // CRITICAL: Verify configuration IMMEDIATELY after configure() is called
  // The OAuth listener runs synchronously when configure() is called, so we need
  // to ensure the config is accessible at that exact moment
  let configVerified = false;
  try {
    // Check config synchronously - no async delays
    const verifyConfig = Amplify.getConfig();
    if (!verifyConfig?.Auth?.Cognito?.userPoolId) {
      console.error('[Amplify Config] ❌ Configuration verification failed - Auth.Cognito.userPoolId not set');
      console.error('[Amplify Config] This will cause "Auth UserPool not configured" error');
    } else if (!verifyConfig?.Auth?.Cognito?.loginWith?.oauth) {
      console.error('[Amplify Config] ❌ Configuration verification failed - Auth.Cognito.loginWith.oauth not set');
      console.error('[Amplify Config] Config structure:', JSON.stringify(verifyConfig.Auth?.Cognito, null, 2));
      console.error('[Amplify Config] This will cause "Auth UserPool not configured" error');
    } else {
      const oauth = verifyConfig.Auth.Cognito.loginWith.oauth;
      console.log('[Amplify Config] ✅ Configuration verified IMMEDIATELY after configure():', {
        userPoolId: verifyConfig.Auth.Cognito.userPoolId,
        userPoolClientId: verifyConfig.Auth.Cognito.userPoolClientId,
        oauthDomain: oauth.domain,
        oauthRedirectSignIn: oauth.redirectSignIn,
        oauthResponseType: oauth.responseType,
      });
      configVerified = true;
      
      // Store a flag that config is ready for signInWithRedirect to check
      if (typeof window !== 'undefined') {
        (window as any).__AMPLIFY_CONFIG_READY__ = true;
      }
    }
  } catch (e) {
    console.error('[Amplify Config] ❌ Failed to verify configuration:', e);
    console.error('[Amplify Config] This will cause "Auth UserPool not configured" error');
  }
  
  // On OAuth callback, log if config was verified
  if (isCallback) {
    if (!configVerified) {
      console.error('[Amplify Config] ⚠️ CRITICAL: Config not verified on callback page!');
      console.error('[Amplify Config] OAuth listener will fail with "Auth UserPool not configured"');
      console.error('[Amplify Config] This is why PKCE verifier cannot be used to exchange code');
      console.error('[Amplify Config] Root cause: Amplify config not accessible when OAuth listener runs');
    } else {
      console.log('[Amplify Config] ✅ Config verified on callback - OAuth listener should work');
      console.log('[Amplify Config] However, if PKCE is missing, token exchange will still fail');
    }
  }
  
  // Log after configuration to verify it was set correctly (on OAuth callback)
  if (typeof window !== 'undefined' && window.location.search?.includes('code=')) {
    console.log('[Amplify Config] ✅ Configuration complete - OAuth listener should handle code exchange');
    
    // Verify the configured redirect URL matches current URL
    const currentUrl = window.location.href.split('?')[0]; // URL without query params
    console.log('[Amplify Config] Redirect URL verification:', {
      configured: redirectSignInUrl,
      current: currentUrl,
      match: currentUrl === redirectSignInUrl ? '✅ MATCH' : '❌ MISMATCH',
    });
    
    if (currentUrl !== redirectSignInUrl) {
      console.error('[Amplify Config] ❌ CRITICAL: Redirect URL mismatch!');
      console.error('[Amplify Config] Configured:', redirectSignInUrl);
      console.error('[Amplify Config] Current:', currentUrl);
      console.error('[Amplify Config] This will cause OAuth failure - Cognito state won\'t match');
    }
    
    // Double-check PKCE storage after configuration
    const prefix = `CognitoIdentityServiceProvider.${authConfig.userPoolClientId}`;
    const inflight = localStorage.getItem(`${prefix}.inflightOAuth`);
    const pkce = localStorage.getItem(`${prefix}.oauthPKCE`);
    const state = localStorage.getItem(`${prefix}.oauthState`);
    const codeVerifier = localStorage.getItem(`${prefix}.codeVerifier`);
    
    console.log('[Amplify Config] PKCE storage check after configure:', {
      inflightOAuth: inflight ? 'present' : 'missing',
      oauthPKCE: pkce ? 'present' : 'missing',
      oauthState: state ? 'present' : 'missing',
      codeVerifier: codeVerifier ? 'present' : 'missing',
    });
    
    // Check URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const stateParam = urlParams.get('state');
    console.log('[Amplify Config] URL parameters:', {
      code: code ? `${code.substring(0, 20)}...` : 'missing',
      state: stateParam || 'missing',
    });
    
    // If PKCE data is missing, log a detailed error
    if (!inflight || !pkce) {
      console.error('[Amplify Config] ❌ CRITICAL: PKCE data missing when Amplify tries to complete OAuth');
      console.error('[Amplify Config] This will cause signInWithRedirect_failure');
      console.error('[Amplify Config] Possible causes:');
      console.error('[Amplify Config]   1. Storage cleared between redirect and callback');
      console.error('[Amplify Config]   2. Origin mismatch (localhost vs 127.0.0.1)');
      console.error('[Amplify Config]   3. Redirect URL mismatch');
      console.error('[Amplify Config]   4. Client ID mismatch');
    } else {
      console.log('[Amplify Config] ✅ PKCE data present - Amplify should be able to complete OAuth');
    }
  }
} else if (authConfig?.enabled && authConfig?.userPoolId && authConfig?.userPoolClientId) {
  // Cognito configured but no OAuth domain - configure for email/password only
  // Ensures "Auth UserPool not configured" doesn't occur for SRP sign-in
  console.log('[Amplify Config] Configuring Cognito for email/password (no OAuth domain)');
  const emailOnlyConfig = {
    Auth: {
      Cognito: {
        userPoolId: authConfig.userPoolId,
        userPoolClientId: authConfig.userPoolClientId,
      },
    },
  };
  cognitoUserPoolsTokenProvider.setAuthConfig(emailOnlyConfig.Auth);
  Amplify.configure(emailOnlyConfig, {
    Auth: {
      tokenProvider: cognitoUserPoolsTokenProvider,
    },
  });
}

// ========================================
// 🔥 FRONTEND VERSION 🔥
// ========================================
// Version is read from package.json at build time
// This will be replaced by the build process or read dynamically
const FRONTEND_VERSION = '0.3.43'; // Onboarding: separate tv_movies/hobbies steps, options seed, getOptions catchError
const CACHE_BUST_ID = `v${FRONTEND_VERSION}-${Math.random().toString(36).substr(2, 9)}`;
console.log('');
console.log('═══════════════════════════════════════════════════════════');
console.log(`🔥🔥🔥 FRONTEND VERSION ${FRONTEND_VERSION} LOADED 🔥🔥🔥`);
console.log(`✅ Phase 4: SDK media control methods complete`);
console.log(`✅ Fixed compilation errors for uploaded-media interactions`);
console.log(`✅ Added playMedia, pauseMedia, seekMedia, setMediaVolume methods`);
console.log(`✅ Added getMediaCurrentTime, getMediaDuration, isMediaPlaying methods`);
console.log(`✅ Bridge service handles media control messages from iframes`);
console.log(`✅ Lesson timer syncs with media playback time`);
console.log(`📅 Timestamp: ${new Date().toISOString()}`);
console.log(`🆔 Cache Bust ID: ${CACHE_BUST_ID}`);
console.log('═══════════════════════════════════════════════════════════');
console.log('');

// Fetch and display backend version (optional - fails silently if backend unavailable)
fetch(`${environment.apiUrl}/version`)
  .then(res => {
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  })
  .then(data => {
    if (data?.version) {
      console.log(`🔥🔥🔥 BACKEND VERSION ${data.version} 🔥🔥🔥`);
    }
  })
  .catch(() => { /* Backend unavailable - expected when running frontend-only */ });

// Force clear all caches
if ('caches' in window) {
  caches.keys().then(names => {
    names.forEach(name => {
      caches.delete(name);
      console.log(`🗑️ Deleted cache: ${name}`);
    });
  });
}

// Force reload if version mismatch detected - BUT skip when on OAuth callback
// so we don't wipe Amplify's PKCE verifier and inflight flag before token exchange
const STORED_VERSION_KEY = 'upora_frontend_version';
const isOAuthCallback = typeof window !== 'undefined' &&
  (window.location.search?.includes('code=') || window.location.hash?.includes('id_token='));
const storedVersion = localStorage.getItem(STORED_VERSION_KEY);
if (storedVersion && storedVersion !== FRONTEND_VERSION && !isOAuthCallback) {
  console.log(`🔄 Version mismatch detected: stored=${storedVersion}, current=${FRONTEND_VERSION}`);
  console.log(`🔄 Clearing localStorage and reloading...`);
  localStorage.clear();
  sessionStorage.clear();
  location.reload();
} else {
  localStorage.setItem(STORED_VERSION_KEY, FRONTEND_VERSION);
}

// Add unique timestamp to prevent any caching
const timestamp = Date.now();
console.log(`⏰ Application bootstrap timestamp: ${timestamp}`);

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));
