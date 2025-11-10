// Development environment configuration
export const environment = {
  production: false,
  // Browser makes calls to backend via mapped Docker ports
  apiUrl: 'http://localhost:3000/api',
  wsUrl: 'ws://localhost:3000',
  
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
};

