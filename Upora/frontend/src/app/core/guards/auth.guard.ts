import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { environment } from '../../../environments/environment';

const RETURN_URL_KEY = 'auth_return_url';

/**
 * Auth guard - redirects unauthenticated users to /login with returnUrl.
 * In mock mode (auth disabled), always allows access.
 */
export const authGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
): boolean => {
  const auth = inject(AuthService);
  const router = inject(Router);

  // Mock mode: auth disabled, always allow
  if (!environment.auth?.enabled || environment.auth.userPoolId === 'mock-pool-id') {
    return true;
  }

  if (auth.isAuthenticated()) {
    return true;
  }

  const nav = router.getCurrentNavigation();
  const returnUrl = nav?.extractedUrl?.toString() ||
    (route.url.length > 0 ? '/' + route.url.map(u => u.path).join('/') : '/home');
  sessionStorage.setItem(RETURN_URL_KEY, returnUrl);
  router.navigate(['/onboarding'], { queryParams: { returnUrl } });
  return false;
};

export { RETURN_URL_KEY };
