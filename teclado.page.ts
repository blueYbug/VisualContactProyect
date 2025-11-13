// src/app/pages/teclado/teclado.page.ts
import { Component, OnInit } from '@angular/core';
import { CallNumber } from '@awesome-cordova-plugins/call-number/ngx';
import { DatabaseService } from '../../service/database.service';
import { NavController, ToastController } from '@ionic/angular';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { PhoneInfoService } from '../../service/phone-info.service';

@Component({
  selector: 'app-teclado',
  templateUrl: './teclado.page.html',
  styleUrls: ['./teclado.page.scss'],
  standalone: false
})
export class TecladoPage implements OnInit {

  phoneNumber: string = '';
  phoneInfo: any = null;

  constructor(
    private callNumber: CallNumber,
    private dbService: DatabaseService,
    private navCtrl: NavController,
    private toastCtrl: ToastController,
    private phoneInfoService: PhoneInfoService
  ) {}

  async ngOnInit() {
    await this.dbService.initDB();
  }

  // =========================================================
  // Normalizar número → +56XXXXXXXXX
  // =========================================================
  normalizeNumber(num: string): string {
    let clean = num.replace(/\s+/g, '');

    if (clean.startsWith('+56')) return clean;
    if (clean.startsWith('56')) return '+56' + clean.slice(2);
    if (clean.startsWith('0')) return '+56' + clean.slice(1);

    return '+56' + clean;
  }

  // =========================================================
  // Agregar dígito
  // =========================================================
  addNumber(num: string) {
    this.phoneNumber += num;
    Haptics.impact({ style: ImpactStyle.Light });
    this.lookupInfo();
  }

  // =========================================================
  // Borrar último dígito
  // =========================================================
  deleteNumber() {
    if (this.phoneNumber.length > 0) {
      this.phoneNumber = this.phoneNumber.slice(0, -1);
      Haptics.impact({ style: ImpactStyle.Medium });
      this.lookupInfo();
    }
  }

  // =========================================================
  // Consultar API automáticamente
  // =========================================================
  lookupInfo() {
  if (this.phoneNumber.length < 7) {
    this.phoneInfo = null;
    return;
  }

  const normalized = this.normalizeNumber(this.phoneNumber);

  this.phoneInfoService.getPhoneInfo(normalized).subscribe({
    next: (data) => {
      this.phoneInfo = data;
      console.log('INFO DEL NÚMERO:', data);
    },
    error: () => {
      this.phoneInfo = null;
    }
  });
}


  // =========================================================
  // Validación
  // =========================================================
  private isValidNumber(number: string): boolean {
    const regex = /^[0-9*#]+$/;
    return regex.test(number);
  }

  // =========================================================
  // Toast
  // =========================================================
  private async showToast(message: string) {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2000,
      position: 'bottom',
      color: 'danger'
    });
    await toast.present();
  }

  // =========================================================
  // Llamada + guardar log con info
  // =========================================================
  async makeCall() {
    Haptics.impact({ style: ImpactStyle.Light });

    if (!this.phoneNumber.trim()) {
      this.showToast('Ingrese un número válido');
      return;
    }

    if (!this.isValidNumber(this.phoneNumber)) {
      this.showToast('Solo dígitos, * o #');
      return;
    }

    const normalized = this.normalizeNumber(this.phoneNumber);

    try {
      await this.callNumber.callNumber(normalized, true);

      // Guardar log
      const infoString = this.phoneInfo ? JSON.stringify(this.phoneInfo) : null;

      await this.dbService.addCallLog(
        normalized,
        'call',
        infoString
      );

      this.phoneNumber = '';
      this.phoneInfo = null;

    } catch (err) {
      this.showToast('No se pudo realizar la llamada');
    }
  }

}
