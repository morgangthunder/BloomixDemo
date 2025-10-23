// Development environment configuration
export const environment = {
  production: false,
  // Browser makes calls to backend via mapped Docker ports
  apiUrl: 'http://localhost:3000/api',
  wsUrl: 'ws://localhost:3000',
  
  // Multi-tenancy configuration
  tenantId: '00000000-0000-0000-0000-000000000001', // Default dev tenant
  defaultUserId: '00000000-0000-0000-0000-000000000011', // Default user (Sarah - lesson builder)
  userRole: 'lesson-builder', // student | lesson-builder | interaction-builder | admin
  
  // Feature flags
  enableMockData: false, // Using real API - connected to backend
  enableWebSockets: true,
  enableApprovalWorkflow: true,
  
  // External services
  grokApiUrl: 'https://api.x.ai/v1',
  
  // Logging
  logLevel: 'debug',
};

