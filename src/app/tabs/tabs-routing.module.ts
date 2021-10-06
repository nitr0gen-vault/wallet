import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TabsPage } from './tabs.page';

const routes: Routes = [
  {
    path: 'tabs',
    component: TabsPage,
    children: [
      {
        path: 'tab1',
        loadChildren: () =>
          import('../home/home.module').then((m) => m.HomePageModule),
      },
      {
        path: 'tab2',
        loadChildren: () =>
          import('../wallet/wallet.module').then((m) => m.WalletPageModule),
      },
      {
        path: 'tab3',
        loadChildren: () =>
          import('../settings/settings.module').then((m) => m.SettingsPageModule),
      },
      {
        path: 'status/:id',
        loadChildren: () =>
          import('../status/status.module').then((m) => m.StatusComponentModule),
      },
      {
        path: 'token/:id',
        loadChildren: () =>
          import('../add-token/add-token.module').then((m) => m.AddTokenComponentModule),
      },
      {
        path: 'send/:id/:token',
        loadChildren: () =>
          import('../send/send.module').then((m) => m.SendComponentModule),
      },
      {
        path: 'wc',
        loadChildren: () =>
          import('../wallet-connect/wallet-connect.module').then((m) => m.WalletConnectComponentModule),
      },
      {
        path: '',
        redirectTo: '/tabs/tab1',
        pathMatch: 'full',
      },
    ],
  },
  {
    path: '',
    redirectTo: '/tabs/tab1',
    pathMatch: 'full',
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
})
export class TabsPageRoutingModule {}
