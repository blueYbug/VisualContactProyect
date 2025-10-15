import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { TecladoPage } from './teclado.page';

const routes: Routes = [
  {
    path: '',
    component: TecladoPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class TecladoPageRoutingModule {}
