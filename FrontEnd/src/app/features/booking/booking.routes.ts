import { Routes } from '@angular/router';

export const BOOKING_ROUTES: Routes = [
  { path: 'checkout', loadComponent: () => import('./checkout/checkout.component').then(m => m.CheckoutComponent) },
  { path: '', redirectTo: 'checkout', pathMatch: 'full' }
];
