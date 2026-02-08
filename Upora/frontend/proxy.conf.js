/**
 * Proxy API requests to avoid CORS preflight (OPTIONS) failures.
 * - In Docker: target http://backend:3000 (set API_PROXY_TARGET)
 * - On host: target http://127.0.0.1:3000
 */
const target = process.env.API_PROXY_TARGET || 'http://127.0.0.1:3000';

module.exports = {
  '/api': {
    target,
    secure: false,
    changeOrigin: true,
    logLevel: 'debug',
  },
};
