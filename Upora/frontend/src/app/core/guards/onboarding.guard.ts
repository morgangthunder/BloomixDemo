import { inject, effect } from '@angular/core';
import { CanActivateFn, ActivatedRouteSnapshot, Router } from '@angular/router';
import { map, switchMap } from 'rxjs/operators';
import { Observable, of } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { OnboardingService } from '../services/onboarding.service';

/**
 * Guard for /onboarding. If user is authenticated and has completed onboarding,
 * redirect to returnUrl immediately without loading the component (no flash).
 *
 * Waits for AuthService.authReady before evaluating, to avoid race conditions
 * after OAuth callback where isAuthenticated() may momentarily be false.
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

  // Wait for auth to be ready before evaluating
  return new Observable<boolean | ReturnType<typeof router.parseUrl>>((subscriber) => {
    // Auth is synchronous from storage, so authReady is normally already true.
    // But check in case of async flows.
    if (auth.authReady()) {
      resolve();
    } else {
      // Poll briefly for authReady (should resolve within a tick or two)
      const interval = setInterval(() => {
        if (auth.authReady()) {
          clearInterval(interval);
          resolve();
        }
      }, 50);
      // Safety timeout: if auth never becomes ready, allow through
      setTimeout(() => {
        clearInterval(interval);
        if (!subscriber.closed) {
          subscriber.next(true);
          subscriber.complete();
        }
      }, 3000);
    }

    function resolve() {
      if (!auth.isAuthenticated()) {
        subscriber.next(true);
        subscriber.complete();
        return;
      }

      onboarding.getMine().pipe(
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
      ).subscribe({
        next: (result) => {
          subscriber.next(result);
          subscriber.complete();
        },
        error: () => {
          subscriber.next(true);
          subscriber.complete();
        },
      });
    }
  });
};
