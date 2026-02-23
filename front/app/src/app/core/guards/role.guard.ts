import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { UserRole } from '../models';

export const roleGuard: CanActivateFn = (route) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const expectedRoles = (route.data['roles'] ?? []) as UserRole[];
  const current = authService.user();

  if (!current) {
    return router.createUrlTree(['/login']);
  }

  if (expectedRoles.length === 0 || expectedRoles.includes(current.role)) {
    return true;
  }

  return router.createUrlTree(['/']);
};
