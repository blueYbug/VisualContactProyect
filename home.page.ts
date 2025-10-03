import { Component } from '@angular/core';
import { NavController, AlertController, ToastController, AnimationController } from '@ionic/angular';

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

    // actualizar destacados según localStorage
    this.contactos.forEach(c => {
      const fav = localStorage.getItem('favorite_' + c.nombre);
      c.destacado = fav === '1';
    });

    // ordenar destacados primero
    this.contactos.sort((a, b) => (b.destacado ? 1 : 0) - (a.destacado ? 1 : 0));
  }

  get contactosDestacados(): Contacto[] {
    return this.contactos.filter(c => c.destacado);
  }

  filtrarContactos(): Contacto[] {
    return this.contactos
      .filter(c => c.nombre.toLowerCase().includes(this.searchTerm.toLowerCase()))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }

  verInfo(contacto: Contacto) {
    this.navCtrl.navigateForward('/info', {
      queryParams: { nombre: contacto.nombre, numero: contacto.numero }
    });
  }

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
