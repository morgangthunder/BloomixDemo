import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';

const ROLE_HIERARCHY: Record<string, string[]> = {
  'admin': ['admin', 'super-admin'],
  'lesson-builder': ['lesson-builder', 'admin', 'super-admin'],
  'interaction-builder': ['interaction-builder', 'admin', 'super-admin'],
  'student': ['student', 'lesson-builder', 'interaction-builder', 'admin', 'super-admin'],
};

/**
 * Role guard — checks the user's role against route data.roles.
 * Route must specify `data: { roles: ['lesson-builder'] }` (or multiple).
 * A role entry means "this role or higher" using the hierarchy above.
 * Must be placed AFTER authGuard in the canActivate array.
 */
export const roleGuard: CanActivateFn = (route: ActivatedRouteSnapshot): boolean => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const requiredRoles: string[] = route.data?.['roles'] || [];
  if (requiredRoles.length === 0) return true;

  const userRole = auth.getRole() || 'student';

  const hasAccess = requiredRoles.some(required => {
    const allowed = ROLE_HIERARCHY[required];
    return allowed ? allowed.includes(userRole) : userRole === required;
  });

  if (hasAccess) return true;

  router.navigate(['/unauthorized']);
  return false;
};
