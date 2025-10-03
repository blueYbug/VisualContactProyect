import { Component, OnInit } from '@angular/core';
import { AlertController, NavController } from '@ionic/angular';
import { ActivatedRoute } from '@angular/router';

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

  async deleteContact() {
    // eliminar contacto de localStorage
    const contactos = JSON.parse(localStorage.getItem('contactos') || '[]');
    const nuevos = contactos.filter((c: any) => c.nombre !== this.contact.name);
    localStorage.setItem('contactos', JSON.stringify(nuevos));
    // volver a HomePage
    this.navCtrl.navigateBack('/home');
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
        { text: 'Guardar', handler: (data) => { 
            // actualizar contacto en memoria y en localStorage
            const contactos = JSON.parse(localStorage.getItem('contactos') || '[]');
            const index = contactos.findIndex((c: any) => c.nombre === this.contact.name);
            if (index >= 0) {
              contactos[index] = { nombre: data.name, numero: data.phone, destacado: this.isFavorite };
              localStorage.setItem('contactos', JSON.stringify(contactos));
              this.contact.name = data.name;
              this.contact.phone = data.phone;
            }
          } 
        }
      ]
    });
    await alert.present();
  }

  async shareContact() {
    const alert = await this.alertCtrl.create({
      header: 'QR del contacto',
      message: `<div style="text-align:center"><img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${this.contact.name} - ${this.contact.phone}" /></div>`,
      buttons: ['Cerrar']
    });
    await alert.present();
  }

  moreOptions() { this.showMoreOptions = true; }
  blockContact() { alert('Contacto bloqueado'); }
}
