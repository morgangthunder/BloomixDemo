// Development environment configuration
export const environment = {
  production: false,
  // Use relative /api so dev server proxy forwards to backend (avoids CORS preflight ERR_EMPTY_RESPONSE)
  apiUrl: '/api',
  wsUrl: 'ws://127.0.0.1:3000',
  
  // Multi-tenancy configuration
  tenantId: '00000000-0000-0000-0000-000000000001', // Default dev tenant
  defaultUserId: '00000000-0000-0000-0000-000000000011', // Default user (Sarah - lesson builder)
  userRole: 'super-admin', // student | lesson-builder | interaction-builder | admin | super-admin
  
  // Feature flags
  enableMockData: false, // Using real API - connected to backend
  enableWebSockets: true,
  enableApprovalWorkflow: true,
  
  // External services
  grokApiUrl: 'https://api.x.ai/v1',
  
  // YouTube API Key is now stored in backend environment variables (docker-compose.yml)
  // Frontend no longer needs YouTube credentials - backend handles all YouTube API calls
  
  // Logging
  logLevel: 'debug',

  // Auth (Cognito) - optional for dev mock mode
  auth: {
    enabled: true,
    userPoolId: 'eu-west-1_s8wGDQEac',
    userPoolClientId: '6id0li18gnlh5il09g4erdcp22',
    region: 'eu-west-1',
    domain: 'eu-west-1s8wgdqeac.auth.eu-west-1.amazoncognito.com',
  } as {
    enabled: boolean;
    userPoolId: string;
    userPoolClientId: string;
    region: string;
    domain?: string;
    identityPoolId?: string;
  },
};

