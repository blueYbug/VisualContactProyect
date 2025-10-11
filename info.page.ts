import { Component, OnInit } from '@angular/core';
import { AlertController, NavController } from '@ionic/angular';
import { ActivatedRoute } from '@angular/router';
import * as QRCode from 'qrcode'; // <-- Importamos la librería qrcode

interface CallLog {
  icon: string;
  color: string;
  text: string;
}

@Component({
  selector: 'app-info',
  templateUrl: './info.page.html',
  styleUrls: ['./info.page.scss'],
  standalone: false
})
export class InfoPage implements OnInit {

  contact = { name: '', phone: '' };
  callLog: CallLog[] = [];
  visibleCallLog: CallLog[] = [];
  batchSize = 5;
  isFavorite = false;
  avatarScale = 1;
  showMoreOptions = false;

  // 🔹 QR data y URL generada
  qrData: string = '';
  qrImageUrl: string = '';

  // 🔹 Control modal QR
  showQR: boolean = false;

  constructor(
    private alertCtrl: AlertController,
    private navCtrl: NavController,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    // Capturar parámetros de la URL
    this.route.queryParams.subscribe(params => {
      if (params['nombre']) this.contact.name = params['nombre'];
      if (params['numero']) this.contact.phone = params['numero'];
      // Generar QR con nombre y número
      this.qrData = `${this.contact.name}|${this.contact.phone}`;
      this.generateQR();
    });

    const fav = localStorage.getItem('favorite_' + this.contact.name);
    this.isFavorite = fav === '1';

    // Crear log de llamadas simuladas
    for (let i = 1; i <= 50; i++) {
      this.callLog.push({
        icon: i % 2 === 0 ? 'call-outline' : 'chatbubbles-outline',
        color: i % 2 === 0 ? 'success' : 'tertiary',
        text: i % 2 === 0 ? `Llamada simulada ${i}` : `Mensaje simulado ${i}`
      });
    }

    this.visibleCallLog = this.callLog.slice(0, this.batchSize);
  }

  onScroll(event: any) {
    const scrollTop = event.detail.scrollTop;
    this.avatarScale = Math.max(0.7, 1 - scrollTop / 300);
  }

  loadMore(event: any) {
    const nextBatch = this.callLog.slice(this.visibleCallLog.length, this.visibleCallLog.length + this.batchSize);
    setTimeout(() => {
      this.visibleCallLog = [...this.visibleCallLog, ...nextBatch];
      event.target.complete();
      if (this.visibleCallLog.length >= this.callLog.length) {
        event.target.disabled = true;
      }
    }, 500);
  }

  goToLlamada() {
    this.navCtrl.navigateForward('/llamada', {
      queryParams: { nombre: this.contact.name }
    });
  }

  goToChat() {
    this.navCtrl.navigateForward('/chat', {
      queryParams: { nombre: this.contact.name }
    });
  }

  makeCall() {
    const now = new Date();
    this.addCallLog('call-outline', 'success', `Llamada - ${now.toLocaleString()}`);
  }

  sendMessage() {
    const now = new Date();
    this.addCallLog('chatbubbles-outline', 'tertiary', `Mensaje - ${now.toLocaleString()}`);
  }

  addCallLog(icon: string, color: string, text: string) {
    const newEntry: CallLog = { icon, color, text };
    this.callLog.unshift(newEntry);
    this.visibleCallLog.unshift(newEntry);
  }

  toggleFavorite() {
    this.isFavorite = !this.isFavorite;
    localStorage.setItem('favorite_' + this.contact.name, this.isFavorite ? '1' : '0');
  }

  // 🔹 Eliminar contacto con confirmación y limpieza de localStorage
  async deleteContact() {
    const alert = await this.alertCtrl.create({
      header: 'Eliminar contacto',
      message: `¿Seguro que deseas eliminar a <strong>${this.contact.name}</strong>?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar',
          handler: () => {
            const contactos = JSON.parse(localStorage.getItem('contactos') || '[]');
            const nuevos = contactos.filter((c: any) => c.nombre !== this.contact.name);
            localStorage.setItem('contactos', JSON.stringify(nuevos));

            // Eliminar favorito si existía
            localStorage.removeItem('favorite_' + this.contact.name);

            // Volver al Home
            this.navCtrl.navigateBack('/home');
          }
        }
      ]
    });

    await alert.present();
  }

  async editContact() {
    const alert = await this.alertCtrl.create({
      header: 'Editar contacto',
      inputs: [
        { name: 'name', type: 'text', value: this.contact.name, placeholder: 'Nombre' },
        { name: 'phone', type: 'text', value: this.contact.phone, placeholder: 'Número' }
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Guardar',
          handler: (data) => {
            const contactos = JSON.parse(localStorage.getItem('contactos') || '[]');
            const index = contactos.findIndex((c: any) => c.nombre === this.contact.name);
            if (index >= 0) {
              contactos[index] = { nombre: data.name, numero: data.phone, destacado: this.isFavorite };
              localStorage.setItem('contactos', JSON.stringify(contactos));
              this.contact.name = data.name;
              this.contact.phone = data.phone;
              this.qrData = `${data.name}|${data.phone}`; // actualizar QR
              this.generateQR();
            }
          }
        }
      ]
    });
    await alert.present();
  }

  moreOptions() { this.showMoreOptions = true; }
  blockContact() { alert('Contacto bloqueado'); }

  shareContact() {
    this.showQR = true;
  }

  // 🔹 Método para generar QR con la librería 'qrcode'
  async generateQR() {
    try {
      this.qrImageUrl = await QRCode.toDataURL(this.qrData, { errorCorrectionLevel: 'M', width: 250 });
    } catch (err) {
      console.error('Error generando QR:', err);
    }
  }
  buttons = [
  {
    text: 'Eliminar contacto',
    icon: 'trash-outline',
    handler: () => this.deleteContact()
  },
  {
    text: 'Bloquear contacto',
    icon: 'ban-outline',
    handler: () => this.blockContact()
  },
  {
    text: 'Cancelar',
    icon: 'close-outline',
    role: 'cancel'
  }
];

}
