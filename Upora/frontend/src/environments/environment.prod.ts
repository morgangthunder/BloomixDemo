// Production environment configuration
export const environment = {
  production: true,
  apiUrl: '/api', // Relative URL for production
  wsUrl: '/ws',
  
  // Multi-tenancy configuration (override with build-time variables)
  tenantId: '', // Set during build or runtime
  defaultUserId: '',
  
  // Feature flags
  enableMockData: false,
  enableWebSockets: true,
  enableApprovalWorkflow: true,
  
  // External services
  grokApiUrl: 'https://api.x.ai/v1',
  
  // Logging
  logLevel: 'error',
};

