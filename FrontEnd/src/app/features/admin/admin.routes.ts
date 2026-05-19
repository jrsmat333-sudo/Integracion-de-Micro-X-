import { Routes } from '@angular/router';

export const ADMIN_ROUTES: Routes = [
  { 
    path: '', 
    loadComponent: () => import('./admin-layout/admin-layout.component').then(m => m.AdminLayoutComponent),
    children: [
      { path: 'dashboard', loadComponent: () => import('./dashboard/dashboard.component').then(m => m.DashboardComponent) },
      { path: 'attractions', loadComponent: () => import('./attractions/attractions.component').then(m => m.AttractionsComponent) },
      { path: 'catalog-setup', loadComponent: () => import('./catalog-setup/catalog-setup.component').then(m => m.CatalogSetupComponent) },
      { path: 'bookings', loadComponent: () => import('./bookings-mgmt/bookings-mgmt.component').then(m => m.BookingsMgmtComponent) },
      { path: 'billing', loadComponent: () => import('./billing-mgmt/billing-mgmt.component').then(m => m.BillingMgmtComponent) },
      { path: 'inventory', loadComponent: () => import('./inventory/inventory.component').then(m => m.InventoryComponent) },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  }
];
