import { Component } from '@angular/core';
import { NavController, AlertController, ToastController, AnimationController } from '@ionic/angular';
import { BarcodeScanner } from '@capacitor-mlkit/barcode-scanning';

interface Contacto {
  nombre: string;
  numero?: string;
  destacado: boolean;
}

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: false
})
export class HomePage {
  searchTerm: string = '';
  contactos: Contacto[] = [];

  constructor(
    private navCtrl: NavController,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
    private animationCtrl: AnimationController
  ) {}

  // ✅ Se ejecuta al entrar a la vista
  ionViewWillEnter() {
    const stored = localStorage.getItem('contactos');
    if (stored) {
      this.contactos = JSON.parse(stored);
    } else {
      this.contactos = [
        { nombre: 'Juan Pérez', numero: '123456789', destacado: true },
        { nombre: 'Ana Torres', numero: '987654321', destacado: false },
        { nombre: 'Carlos Díaz', numero: '555555555', destacado: false }
      ];
      localStorage.setItem('contactos', JSON.stringify(this.contactos));
    }

    // Actualizar destacados según localStorage
    this.contactos.forEach(c => {
      const fav = localStorage.getItem('favorite_' + c.nombre);
      c.destacado = fav === '1';
    });

    // Ordenar destacados primero
    this.contactos.sort((a, b) => (b.destacado ? 1 : 0) - (a.destacado ? 1 : 0));
  }

  // ✅ Método para abrir la cámara y leer un código QR y guardar contacto
  async abrirCamaraQR() {
    try {
      const { barcodes } = await BarcodeScanner.scan();

      if (barcodes.length > 0) {
        const rawValue = barcodes[0].rawValue;
        // ⚡ Parseamos nombre y número
        const [nombre, numero] = rawValue.split('|');

        if (nombre) {
          // Verificar si ya existe
          const existe = this.contactos.some(c => c.nombre === nombre);
          if (!existe) {
            const nuevoContacto: Contacto = {
              nombre: nombre,
              numero: numero || '',
              destacado: false
            };
            this.contactos.push(nuevoContacto);
            localStorage.setItem('contactos', JSON.stringify(this.contactos));

            const toast = await this.toastCtrl.create({
              message: `Contacto ${nombre} agregado correctamente.`,
              duration: 2000,
              color: 'success',
              position: 'top'
            });
            await toast.present();
          } else {
            const toast = await this.toastCtrl.create({
              message: `El contacto ${nombre} ya existe.`,
              duration: 2000,
              color: 'warning',
              position: 'top'
            });
            await toast.present();
          }
        }
      } else {
        const toast = await this.toastCtrl.create({
          message: 'No se detectó ningún código.',
          duration: 2000,
          color: 'danger',
          position: 'top'
        });
        await toast.present();
      }
    } catch (err) {
      console.error('Error leyendo QR:', err);
    }
  }

  // ✅ Getter para contactos destacados
  get contactosDestacados(): Contacto[] {
    return this.contactos.filter(c => c.destacado);
  }

  // ✅ Filtro de búsqueda
  filtrarContactos(): Contacto[] {
    return this.contactos
      .filter(c => c.nombre.toLowerCase().includes(this.searchTerm.toLowerCase()))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }

  // ✅ Navegar a vista de información
  verInfo(contacto: Contacto) {
    this.navCtrl.navigateForward('/info', {
      queryParams: { nombre: contacto.nombre, numero: contacto.numero }
    });
  }

  // ✅ Modal para agregar nuevo contacto
  async abrirModalNuevoContacto() {
    const alert = await this.alertCtrl.create({
      header: 'Nuevo Contacto',
      inputs: [
        { name: 'nombre', type: 'text', placeholder: 'Nombre' },
        { name: 'numero', type: 'tel', placeholder: 'Número' }
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Guardar',
          handler: async (data) => {
            if (data.numero && !/^\d+$/.test(data.numero)) {
              const toast = await this.toastCtrl.create({
                message: 'Solo números, por favor.',
                duration: 2000,
                color: 'danger',
                position: 'top'
              });
              await toast.present();
              return false;
            }

            if (data.nombre) {
              this.contactos.push({
                nombre: data.nombre,
                numero: data.numero,
                destacado: false
              });
              localStorage.setItem('contactos', JSON.stringify(this.contactos));
              return true;
            }

            return false;
          }
        }
      ],
      enterAnimation: (baseEl) => this.enterAnimation(baseEl),
      leaveAnimation: (baseEl) => this.leaveAnimation(baseEl)
    });

    await alert.present();
  }

  // ✅ Animaciones personalizadas
  enterAnimation(baseEl: any) {
    const backdropAnimation = this.animationCtrl
      .create()
      .addElement(baseEl.querySelector('ion-backdrop'))
      .fromTo('opacity', '0.01', '0.4');

    const wrapperAnimation = this.animationCtrl
      .create()
      .addElement(baseEl.querySelector('.alert-wrapper'))
      .keyframes([
        { offset: 0, opacity: '0', transform: 'scale(0.9)' },
        { offset: 1, opacity: '1', transform: 'scale(1)' }
      ]);

    return this.animationCtrl
      .create()
      .addElement(baseEl)
      .easing('ease-out')
      .duration(250)
      .addAnimation([backdropAnimation, wrapperAnimation]);
  }

  leaveAnimation(baseEl: any) {
    return this.enterAnimation(baseEl).direction('reverse');
  }
}
