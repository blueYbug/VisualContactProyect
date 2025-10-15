// src/app/pages/teclado/teclado.page.ts
import { Component, OnInit } from '@angular/core';
import { CallNumber } from '@awesome-cordova-plugins/call-number/ngx';
import { DatabaseService } from '../../service/database.service';
import { NavController, ToastController } from '@ionic/angular';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

@Component({
  selector: 'app-teclado',
  templateUrl: './teclado.page.html',
  styleUrls: ['./teclado.page.scss'],
  standalone: false
})
export class TecladoPage implements OnInit {

  phoneNumber: string = '';

  constructor(
    private callNumber: CallNumber,
    private dbService: DatabaseService,
    private navCtrl: NavController,
    private toastCtrl: ToastController
  ) {}

  async ngOnInit() {
    await this.dbService.initDB();
  }

  // ===========================
  // AGREGAR NÚMERO AL DISPLAY
  // ===========================
  addNumber(num: string) {
    this.phoneNumber += num;
    Haptics.impact({ style: ImpactStyle.Light });
  }

  // ===========================
  // BORRAR ÚLTIMO DÍGITO
  // ===========================
  deleteNumber() {
    if (this.phoneNumber.length > 0) {
      this.phoneNumber = this.phoneNumber.slice(0, -1);
      Haptics.impact({ style: ImpactStyle.Medium });
    }
  }

  // ===========================
  // VALIDAR NÚMERO
  // ===========================
  private isValidNumber(number: string): boolean {
    const regex = /^[0-9*#]+$/;
    return regex.test(number);
  }

  // ===========================
  // MOSTRAR TOAST DE ERROR
  // ===========================
  private async showToast(message: string) {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2000,
      position: 'bottom',
      color: 'danger'
    });
    await toast.present();
  }

  // ===========================
  // REALIZAR LLAMADA + GUARDAR LOG
  // ===========================
  async makeCall() {
    Haptics.impact({ style: ImpactStyle.Light }); // Vibración al presionar llamar

    if (!this.phoneNumber || this.phoneNumber.trim() === '') {
      this.showToast('Ingrese un número válido');
      return;
    }

    if (!this.isValidNumber(this.phoneNumber)) {
      this.showToast('El número solo puede contener dígitos, * o #');
      return;
    }

    try {
      await this.callNumber.callNumber(this.phoneNumber, true);
      console.log('Llamada iniciada a', this.phoneNumber);

      await this.dbService.addCallLog(this.phoneNumber, 'call');

      // Limpiar display después de la llamada
      this.phoneNumber = '';
    } catch (err) {
      console.error('Error al realizar la llamada', err);
      this.showToast('No se pudo realizar la llamada');
    }
  }

}
