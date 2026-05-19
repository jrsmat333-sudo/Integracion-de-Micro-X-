import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  // Public
  {
    path: '',
    loadComponent: () => import('./features/home/home.component').then(m => m.HomeComponent),
  },
  {
    path: 'auth',
    loadChildren: () => import('./features/auth/auth.routes').then(m => m.AUTH_ROUTES),
  },
  {
    path: 'catalog',
    loadChildren: () => import('./features/catalog/catalog.routes').then(m => m.CATALOG_ROUTES),
  },

  // Protected — Client
  {
    path: 'booking',
    canActivate: [authGuard],
    loadChildren: () => import('./features/booking/booking.routes').then(m => m.BOOKING_ROUTES),
  },
  {
    path: 'my-account',
    canActivate: [authGuard],
    loadChildren: () => import('./features/my-account/my-account.routes').then(m => m.MY_ACCOUNT_ROUTES),
  },

  // Protected — Admin
  {
    path: 'admin',
    canActivate: [roleGuard(['Admin', 'Partner'])],
    loadChildren: () => import('./features/admin/admin.routes').then(m => m.ADMIN_ROUTES),
  },

  // Fallback
  { path: '**', redirectTo: '' }
];
