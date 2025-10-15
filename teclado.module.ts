import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { TecladoPageRoutingModule } from './teclado-routing.module';

import { TecladoPage } from './teclado.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    TecladoPageRoutingModule
  ],
  declarations: [TecladoPage]
})
export class TecladoPageModule {}
