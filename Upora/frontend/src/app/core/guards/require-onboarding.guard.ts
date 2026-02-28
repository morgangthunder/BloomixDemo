import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';
import { map } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { OnboardingService } from '../services/onboarding.service';
import { environment } from '../../../environments/environment';

/**
 * Redirects authenticated users who have not completed onboarding to /onboarding.
 * Use on routes where authenticated users may land (home, lesson-view, etc.).
 * Unauthenticated users are allowed through (e.g. public lesson browsing).
 *
 * Waits for AuthService.authReady before evaluating to avoid race conditions.
 */
export const requireOnboardingGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
) => {
  const auth = inject(AuthService);
  const onboarding = inject(OnboardingService);
  const router = inject(Router);

  // Auth disabled (mock mode) - allow
  if (!environment.auth?.enabled || environment.auth.userPoolId === 'mock-pool-id') {
    return true;
  }

  return new Observable<boolean | ReturnType<typeof router.parseUrl>>((subscriber) => {
    if (auth.authReady()) {
      resolve();
    } else {
      const interval = setInterval(() => {
        if (auth.authReady()) {
          clearInterval(interval);
          resolve();
        }
      }, 50);
      setTimeout(() => {
        clearInterval(interval);
        if (!subscriber.closed) {
          subscriber.next(true);
          subscriber.complete();
        }
      }, 3000);
    }

    function resolve() {
      // Not authenticated - allow (user may be browsing publicly)
      if (!auth.isAuthenticated()) {
        subscriber.next(true);
        subscriber.complete();
        return;
      }

      const nav = router.getCurrentNavigation();
      const returnUrl = (nav?.extractedUrl?.toString()?.split('?')[0]) ||
        (route.url.length ? '/' + route.url.map((u) => u.path).join('/') : '/home');

      onboarding.getMine().pipe(
        map((prefs) => {
          if (onboarding.hasCompletedOnboarding(prefs)) {
            return true;
          }
          onboarding.setReturnUrl(returnUrl);
          return router.parseUrl(`/onboarding?returnUrl=${encodeURIComponent(returnUrl)}`);
        }),
      ).subscribe({
        next: (result) => {
          subscriber.next(result);
          subscriber.complete();
        },
        error: () => {
          // On error, allow through rather than block
          subscriber.next(true);
          subscriber.complete();
        },
      });
    }
  });
};
