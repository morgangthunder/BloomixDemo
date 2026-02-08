/**
 * Sets up Hub listener for OAuth callback. Call BEFORE Amplify.configure in main.ts
 * so we catch the signInWithRedirect event as soon as it fires.
 * Export a promise that resolves when event received or after timeout.
 */
let resolveOAuthComplete: () => void;
let isResolved = false;
export const oauthFlowCompletePromise = new Promise<void>((resolve) => {
  resolveOAuthComplete = () => {
    if (!isResolved) {
      isResolved = true;
      resolve();
    }
  };
});

export function initOAuthCallbackHelper(Hub: { listen: (ch: string, cb: (d: { payload?: { event?: string; data?: any } }) => void) => () => void }): void {
  console.log('[OAuth Helper] Initializing Hub listener for OAuth events');
  
  const stop = Hub.listen('auth', (data) => {
    const ev = data?.payload?.event;
    const payloadData = data?.payload?.data;
    
    console.log('[OAuth Helper] Hub event received:', ev);
    console.log('[OAuth Helper] Event payload:', JSON.stringify(data?.payload, null, 2));
    
    // Amplify v6 events for OAuth:
    // - 'signInWithRedirect' - when OAuth redirect completes
    // - 'signedIn' - when user is signed in
    // - 'tokenRefresh' - when tokens are refreshed
    if (ev === 'signInWithRedirect' || ev === 'signedIn') {
      console.log('[OAuth Helper] ✅ OAuth flow completed via event:', ev);
      stop();
      resolveOAuthComplete();
    } else if (ev === 'signInWithRedirect_failure') {
      const error = payloadData?.error || payloadData?.message || 'Unknown error';
      const errorCode = payloadData?.code || 'NO_CODE';
      console.error('[OAuth Helper] ❌ OAuth flow failed');
      console.error('[OAuth Helper] Error:', error);
      console.error('[OAuth Helper] Error code:', errorCode);
      console.error('[OAuth Helper] Full payload:', payloadData);
      
      // Check if this is the "Auth UserPool not configured" error
      const isConfigError = error?.toString().includes('UserPool not configured') || 
                           error?.toString().includes('userPoolId') ||
                           error?.toString().includes('userPoolClientId');
      
      if (isConfigError) {
        console.error('[OAuth Helper] ⚠️ This appears to be a configuration access error');
        console.error('[OAuth Helper] This often happens when PKCE verifier is missing');
        console.error('[OAuth Helper] Amplify tries to access config but fails because PKCE is missing');
      }
      
      // Log PKCE storage state at failure time
      if (typeof window !== 'undefined') {
        const cid = (window as any).__AMPLIFY_CONFIG__?.Auth?.Cognito?.userPoolClientId || 'unknown';
        const prefix = `CognitoIdentityServiceProvider.${cid}`;
        const inflight = localStorage.getItem(`${prefix}.inflightOAuth`);
        const pkce = localStorage.getItem(`${prefix}.oauthPKCE`);
        const state = localStorage.getItem(`${prefix}.oauthState`);
        console.error('[OAuth Helper] PKCE storage at failure:', {
          clientId: cid,
          prefix,
          inflightOAuth: inflight ? 'present' : 'missing',
          oauthPKCE: pkce ? 'present' : 'missing',
          oauthState: state ? 'present' : 'missing',
        });
        
        // Verify Amplify config is accessible (async check)
        import('@aws-amplify/core').then(({ Amplify }) => {
          try {
            const config = Amplify.getConfig();
            console.error('[OAuth Helper] Amplify config check:', {
              hasConfig: !!config,
              hasAuth: !!config?.Auth,
              hasCognito: !!config?.Auth?.Cognito,
              hasUserPoolId: !!config?.Auth?.Cognito?.userPoolId,
              hasOAuth: !!config?.Auth?.Cognito?.loginWith?.oauth,
            });
          } catch (configError) {
            console.error('[OAuth Helper] ❌ Cannot access Amplify config:', configError);
          }
        }).catch(err => {
          console.error('[OAuth Helper] ❌ Failed to import Amplify:', err);
        });
      }
      
      stop();
      resolveOAuthComplete(); // Resolve anyway so callback can handle error
    }
  });
  
  // Timeout after 15 seconds - if Amplify hasn't completed by then, something is wrong
  // Only log when on OAuth callback page to avoid noise on normal page loads
  const isCallbackPage = typeof window !== 'undefined' && (window.location.search?.includes('code=') || window.location.hash?.includes('id_token='));
  setTimeout(() => {
    if (!isResolved) {
      if (isCallbackPage) {
        console.warn('[OAuth Helper] ⚠️ Timeout waiting for OAuth completion - proceeding anyway');
      }
      stop();
      resolveOAuthComplete();
    }
  }, 15000);
}
