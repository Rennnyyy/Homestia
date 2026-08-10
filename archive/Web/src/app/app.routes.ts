import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/dashboard',
    pathMatch: 'full',
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
  },
  {
    path: 'properties',
    loadComponent: () =>
      import('./features/properties/properties.component').then(m => m.PropertiesComponent),
  },
  {
    path: 'tenants',
    loadComponent: () =>
      import('./features/tenants/tenants.component').then(m => m.TenantsComponent),
  },
  {
    path: 'leases',
    loadComponent: () =>
      import('./features/leases/leases.component').then(m => m.LeasesComponent),
  },
  {
    path: 'inventory',
    loadComponent: () =>
      import('./features/inventory/inventory.component').then(m => m.InventoryComponent),
  },
  {
    path: 'maintenance',
    loadComponent: () =>
      import('./features/maintenance/maintenance.component').then(m => m.MaintenanceComponent),
  },
  {
    path: '**',
    redirectTo: '/dashboard',
  },
];
