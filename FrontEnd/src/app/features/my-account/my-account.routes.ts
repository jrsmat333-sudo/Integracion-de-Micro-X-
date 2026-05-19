import { Routes } from '@angular/router';

export const MY_ACCOUNT_ROUTES: Routes = [
  { path: '', loadComponent: () => import('./my-account.component').then(m => m.MyAccountComponent) },
];
