import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpEvent } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../services/auth.service';

/**
 * Functional interceptor that adds auth headers (x-user-id, x-tenant-id, x-user-role)
 * to all API requests. Required for backend JwtAuthGuard in mock/Cognito mode.
 * Uses AuthService when user is authenticated; falls back to environment defaults.
 */
export const authHeadersInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> => {
  // Support both absolute (http://...) and relative (/api) apiUrl
  const isApiRequest = req.url.startsWith(environment.apiUrl) || req.url.includes(environment.apiUrl);
  if (!isApiRequest) {
    return next(req);
  }

  const auth = inject(AuthService);
  let headers = req.headers;
  const tenantId = auth.getTenantId() || environment.tenantId;
  if (tenantId) {
    headers = headers.set('x-tenant-id', tenantId);
  }
  const userId = auth.getUserId() || localStorage.getItem('userId') || environment.defaultUserId;
  if (userId) {
    headers = headers.set('x-user-id', userId);
  }
  const role = auth.getRole() || environment.userRole;
  if (role) {
    headers = headers.set('x-user-role', role);
  }
  const email = auth.getEmail();
  if (email) {
    headers = headers.set('x-user-email', email);
  }
  const token = auth.getToken();
  if (token) {
    headers = headers.set('Authorization', `Bearer ${token}`);
  }

  const cloned = req.clone({ headers });
  return next(cloned);
};
