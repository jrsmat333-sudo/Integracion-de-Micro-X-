import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { TokenService } from '../services/token.service';

export const roleGuard: (requiredRoles: string[]) => CanActivateFn = (requiredRoles) => {
  return () => {
    const tokenService = inject(TokenService);
    const router = inject(Router);

    if (!tokenService.isAuthenticated()) {
      router.navigate(['/auth/login']);
      return false;
    }

    const userRoles = tokenService.getUserRoles();
    const hasRole = requiredRoles.some(role => userRoles.includes(role));

    if (!hasRole) {
      router.navigate(['/']);
      return false;
    }

    return true;
  };
};
