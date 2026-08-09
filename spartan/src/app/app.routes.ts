import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/home/home').then((m) => m.Home),
  },
  {
    path: 'properties',
    loadComponent: () => import('./features/properties/properties').then((m) => m.Properties),
  },
  {
    path: 'tenants',
    loadComponent: () => import('./features/tenants/tenants').then((m) => m.Tenants),
  },
  { path: '**', redirectTo: '' },
];
