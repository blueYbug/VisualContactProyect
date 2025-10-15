import { Component, OnInit } from '@angular/core';
import { AlertController, NavController, ActionSheetController, ToastController } from '@ionic/angular';
import { ActivatedRoute } from '@angular/router';
import * as QRCode from 'qrcode';
import { DatabaseService } from '../../service/database.service';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { CallNumber } from '@awesome-cordova-plugins/call-number/ngx';

interface CallLog {
  icon: string;
  color: string;
  text: string;
  type?: 'call' | 'message';
  timestamp?: number;
  time?: string;
  dateLabel?: string;
  duration?: number;
}

interface Contact {
  name: string;
  phone: string;
  photo?: string;
}

@Component({
  selector: 'app-info',
  templateUrl: './info.page.html',
  styleUrls: ['./info.page.scss'],
  standalone: false
})
export class InfoPage implements OnInit {

  contact: Contact = { name: '', phone: '' };
  callLog: CallLog[] = [];
  visibleCallLog: CallLog[] = [];
  batchSize = 5;
  isFavorite = false;
  avatarScale = 1;
  callLogByDay: { dateLabel: string; logs: CallLog[] }[] = [];

  qrData: string = '';
  qrImageUrl: string = '';
  showQR: boolean = false;

  showEdit: boolean = false;
  showMoreOptions: boolean = false;
  buttons = [
    { text: 'Eliminar contacto', icon: 'trash-outline', handler: () => this.deleteContact() },
    { text: 'Bloquear contacto', icon: 'ban-outline', handler: () => this.blockContact() },
    { text: 'Cancelar', icon: 'close-outline', role: 'cancel' }
  ];

  constructor(
    private alertCtrl: AlertController,
    private navCtrl: NavController,
    private route: ActivatedRoute,
    private dbService: DatabaseService,
    private actionSheetCtrl: ActionSheetController,
    private toastCtrl: ToastController,
    private callNumber: CallNumber
  ) {}

  async ngOnInit() {
    await this.dbService.initDB();

    this.route.queryParams.subscribe(async params => {
      if (!params['nombre']) return;
      const nombre = params['nombre'];
      const contacts = await this.dbService.getContacts();
      const c = contacts.find((x: any) => x.nombre === nombre);

      if (c) {
        this.contact.name = c.nombre;
        this.contact.phone = c.numero;
        this.contact.photo = c.photo || undefined;
        this.isFavorite = c.destacado;

        this.qrData = `${c.nombre}|${c.numero}`;
        await this.generateQR();
        await this.loadCallLogs();
      }
    });
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
      if (this.visibleCallLog.length >= this.callLog.length) event.target.disabled = true;
    }, 500);
  }

  async callContact() {
    const timestamp = Date.now();

    const newLog: CallLog = {
      type: 'call',
      icon: 'call-outline',
      color: 'success',
      text: 'Llamada',
      timestamp,
      time: new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      dateLabel: (() => {
        const date = new Date(timestamp);
        const today = new Date();
        const yesterday = new Date();
        yesterday.setDate(today.getDate() - 1);
        if (date.toDateString() === today.toDateString()) return 'Hoy';
        if (date.toDateString() === yesterday.toDateString()) return 'Ayer';
        return date.toLocaleDateString();
      })()
    };

    this.callLog.unshift(newLog);
    this.visibleCallLog.unshift(newLog);
    await this.dbService.addCallLog(this.contact.name, 'call');

    let numero = this.contact.phone;
    if (!numero.startsWith('+56')) {
      if (numero.startsWith('0')) numero = '+56' + numero.slice(1);
      else numero = '+56' + numero;
    }

    this.callNumber.callNumber(numero, true)
      .then(res => console.log('Llamada iniciada', res))
      .catch(err => console.error('Error al llamar', err));
  }

  async addCallLog(icon: string, color: string, text: string, type: 'call' | 'message') {
    const newEntry: CallLog = { icon, color, text };
    this.callLog.unshift(newEntry);
    this.visibleCallLog.unshift(newEntry);
    await this.dbService.addCallLog(this.contact.name, type);
  }

  async toggleFavorite() {
    this.isFavorite = !this.isFavorite;
    await this.dbService.toggleFavorite(this.contact.name, this.isFavorite);
    await this.dbService.emitContactos();
  }

  async deleteContact() {
    const alert = await this.alertCtrl.create({
      header: 'Eliminar contacto',
      message: `¿Seguro que deseas eliminar a <strong>${this.contact.name}</strong>?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar',
          handler: async () => {
            await this.dbService.deleteContact(this.contact.name);
            await this.dbService.emitContactos();
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
        { name: 'name', type: 'text', value: this.contact.name, placeholder: 'Nombre (máx. 40 caracteres)', attributes: { maxlength: 40 } },
        { name: 'phone', type: 'tel', value: this.contact.phone, placeholder: 'Número' }
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Guardar',
          handler: async (data) => {
            const nombre = data.name?.trim();
            let numero = data.phone?.trim();

            if (!nombre || !numero) return false;

            if (nombre.length > 40) {
              const toast = await this.toastCtrl.create({ message: 'El nombre no puede superar los 40 caracteres.', duration: 2500, color: 'warning' });
              await toast.present();
              return false;
            }

            if (!/^569\d{8}$/.test(numero) && !/^9\d{8}$/.test(numero)) {
              const toast = await this.toastCtrl.create({ message: 'Número inválido. Debe ser un número chileno válido (569XXXXXXXX o 9XXXXXXXX).', duration: 3000, color: 'warning' });
              await toast.present();
              const input = document.querySelector('ion-alert input[name="phone"]') as HTMLInputElement;
              if (input) { input.style.border = '2px solid red'; setTimeout(() => (input.style.border = ''), 2000); }
              return false;
            }

            if (/^9\d{8}$/.test(numero)) numero = '569' + numero;

            const existing = (await this.dbService.getContacts()).find(c => c.nombre === nombre && c.nombre !== this.contact.name);
            if (existing) {
              const toast = await this.toastCtrl.create({ message: `Ya existe un contacto con el nombre ${nombre}.`, duration: 2000, color: 'warning' });
              await toast.present();
              return false;
            }

            await this.dbService.updateContact(this.contact.name, { nombre, numero, destacado: this.isFavorite, photo: this.contact.photo });

            this.contact.name = nombre;
            this.contact.phone = numero;
            this.qrData = `${nombre}|${numero}`;
            await this.generateQR();
            await this.loadCallLogs();
            await this.dbService.emitContactos();

            const toast = await this.toastCtrl.create({ message: `Contacto ${nombre} actualizado correctamente.`, duration: 2000, color: 'success' });
            await toast.present();

            return true;
          }
        }
      ]
    });

    await alert.present();
  }

  async changeAvatar() {
    const actionSheet = await this.actionSheetCtrl.create({
      header: 'Foto de contacto',
      buttons: [
        { text: 'Subir foto', icon: 'image-outline', handler: () => this.takePhoto(CameraSource.Photos) },
        { text: 'Sacar foto', icon: 'camera-outline', handler: () => this.takePhoto(CameraSource.Camera) },
        { text: 'Eliminar foto', icon: 'trash-outline', handler: async () => { this.contact.photo = undefined; await this.dbService.removePhoto(this.contact.name); await this.dbService.emitContactos(); } },
        { text: 'Cancelar', icon: 'close-outline', role: 'cancel' }
      ]
    });
    await actionSheet.present();
  }

  private async takePhoto(source: CameraSource) {
    try {
      const photo = await Camera.getPhoto({ resultType: CameraResultType.DataUrl, source, quality: 90 });
      if (photo.dataUrl) {
        this.contact.photo = photo.dataUrl;
        await this.dbService.updatePhoto(this.contact.name, this.contact.photo);
        await this.dbService.emitContactos();
      }
    } catch (err) { console.error('Error al tomar/subir foto:', err); }
  }

  async generateQR() {
    try {
      this.qrImageUrl = await QRCode.toDataURL(this.qrData, { errorCorrectionLevel: 'M', width: 250 });
    } catch (err) { console.error('Error generando QR:', err); }
  }

  // ==========================
  // loadCallLogs actualizada con callLogByDay
  // ==========================
  async loadCallLogs() {
    const logs = await this.dbService.getCallLogs(this.contact.name);

    this.callLog = logs.map((l: any) => ({
      type: l.type,
      icon: l.type === 'call' ? 'call-outline' : 'chatbubbles-outline',
      color: l.type === 'call' ? 'success' : 'tertiary',
      text: l.type === 'call' ? 'Llamada' : 'Mensaje',
      timestamp: l.timestamp,
      time: new Date(l.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      dateLabel: new Date(l.timestamp).toDateString()
    }));

    const grouped: { [key: string]: CallLog[] } = {};
    this.callLog.forEach(log => {
      const day = log.dateLabel!;
      if (!grouped[day]) grouped[day] = [];
      grouped[day].push(log);
    });

    this.callLogByDay = Object.keys(grouped).map(key => ({
      dateLabel: (() => {
        const date = new Date(key);
        const today = new Date();
        const yesterday = new Date();
        yesterday.setDate(today.getDate() - 1);
        if (date.toDateString() === today.toDateString()) return 'Hoy';
        if (date.toDateString() === yesterday.toDateString()) return 'Ayer';
        return date.toLocaleDateString();
      })(),
      logs: grouped[key]
    }));

    this.visibleCallLog = this.callLog.slice(0, this.batchSize);
  }

  moreOptions() {
    this.showMoreOptions = true;
  }

  blockContact() {
    alert('Contacto bloqueado');
  }

  // ==========================
  // Vista previa del avatar
  // ==========================
  showAvatarPreview = false;
  avatarPreviewUrl: string = '';
  private avatarPressTimer: any;

  onAvatarPressStart() {
    this.avatarPressTimer = setTimeout(() => {
      if (this.contact.photo) {
        this.avatarPreviewUrl = this.contact.photo;
        this.showAvatarPreview = true;
      }
    }, 500);
  }

  onAvatarPressEnd() {
    clearTimeout(this.avatarPressTimer);
  }

  closeAvatarPreview() {
    this.showAvatarPreview = false;
  }

}
