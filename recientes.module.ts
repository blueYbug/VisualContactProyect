import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { RecientesPageRoutingModule } from './recientes-routing.module';

import { RecientesPage } from './recientes.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RecientesPageRoutingModule
  ],
  declarations: [RecientesPage]
})
export class RecientesPageModule {}
