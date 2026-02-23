import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';
import { LoginPageComponent } from './features/auth/login-page.component';
import { ShellComponent } from './features/layout/shell.component';
import { HomePageComponent } from './features/home/home-page.component';
import { UsersPageComponent } from './features/users/users-page.component';
import { ClientsPageComponent } from './features/clients/clients-page.component';
import { ProductsPageComponent } from './features/products/products-page.component';
import { OrdersPageComponent } from './features/orders/orders-page.component';

export const routes: Routes = [
  {
    path: 'login',
    component: LoginPageComponent,
  },
  {
    path: '',
    component: ShellComponent,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        component: HomePageComponent,
      },
      {
        path: 'users',
        component: UsersPageComponent,
        canActivate: [roleGuard],
        data: { roles: ['ADMIN'] },
      },
      {
        path: 'clients',
        component: ClientsPageComponent,
        canActivate: [roleGuard],
        data: { roles: ['ADMIN'] },
      },
      {
        path: 'products',
        component: ProductsPageComponent,
        canActivate: [roleGuard],
        data: { roles: ['ADMIN', 'USER'] },
      },
      {
        path: 'orders',
        component: OrdersPageComponent,
        canActivate: [roleGuard],
        data: { roles: ['ADMIN', 'USER'] },
      },
    ],
  },
  {
    path: '**',
    redirectTo: '',
  },
];
