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
    path: 'rentals',
    loadComponent: () => import('./features/rentals/rentals').then((m) => m.Rentals),
  },
  { path: '**', redirectTo: '' },
];
