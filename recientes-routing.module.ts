import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { RecientesPage } from './recientes.page';

const routes: Routes = [
  {
    path: '',
    component: RecientesPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class RecientesPageRoutingModule {}
