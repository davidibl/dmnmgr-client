import { RouterModule, Routes } from '@angular/router';
import { ModuleWithProviders } from '@angular/core';
import { DmnModellerComponent } from './components/dmnModeller/dmnModeller';
import { DmnManagerComponent } from './components/dmnManager/dmnManager';

export const routes: Routes = [
    { path: '', pathMatch: 'full', redirectTo: 'start' },
    { path: 'start', component: DmnManagerComponent },
];

export const routing: ModuleWithProviders = RouterModule.forRoot(routes);
