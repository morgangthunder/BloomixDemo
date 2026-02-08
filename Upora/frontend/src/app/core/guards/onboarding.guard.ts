import { inject } from '@angular/core';
import { CanActivateFn, ActivatedRouteSnapshot, Router } from '@angular/router';
import { map } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { OnboardingService } from '../services/onboarding.service';

/**
 * Guard for /onboarding. If user is authenticated and has completed onboarding,
 * redirect to returnUrl immediately without loading the component (no flash).
 */
export const onboardingGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
) => {
  const auth = inject(AuthService);
  const onboarding = inject(OnboardingService);
  const router = inject(Router);

  const returnUrl =
    route.queryParams['returnUrl'] ||
    onboarding.getReturnUrl() ||
    '/home';
  onboarding.setReturnUrl(returnUrl);

  if (!auth.isAuthenticated()) {
    return true;
  }

  return onboarding.getMine().pipe(
    map((prefs) => {
      if (onboarding.hasCompletedOnboarding(prefs)) {
        const target = returnUrl.replace(/^\//, '') || 'home';
        if (target === 'profile') {
          return true;
        }
        const path = returnUrl.startsWith('/') ? returnUrl : `/${returnUrl}`;
        return router.parseUrl(path);
      }
      return true;
    }),
  );
};
