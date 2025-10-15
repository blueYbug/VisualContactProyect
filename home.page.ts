import { Component, OnInit } from '@angular/core';
import { NavController, AlertController, ToastController, AnimationController, ActionSheetController } from '@ionic/angular';
import { BarcodeScanner } from '@capacitor-mlkit/barcode-scanning';
import { DatabaseService, Contact } from '../../service/database.service';

interface Contacto {
  nombre: string;
  numero?: string;
  destacado: boolean;
  photo?: string; // <- agregado para avatar
}

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: false
})
export class HomePage implements OnInit {
  searchTerm: string = '';
  contactos: Contacto[] = [];

  // Para controlar cuál botón de la barra está activo
  activeTab: 'teclado' | 'recientes' | 'contactos' = 'contactos';

  constructor(
    private navCtrl: NavController,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
    private animationCtrl: AnimationController,
    private dbService: DatabaseService,
    private actionSheetCtrl: ActionSheetController
  ) {}

  ngOnInit() {
    this.dbService.contactos$.subscribe((data: Contact[]) => {
      this.contactos = data.map(c => ({
        nombre: c.nombre,
        numero: c.numero,
        destacado: c.destacado,
        photo: c.photo || ''
      }));

      this.contactos.sort((a, b) => (b.destacado ? 1 : 0) - (a.destacado ? 1 : 0));
    });

    this.dbService.emitContactos();
  }

  // ==============================
// Funciones de navegación barra inferior
// ==============================
abrirTeclado() {
  console.log('Teclado aún no implementado');
}

irRecientes() {
  this.activeTab = 'recientes';
  this.navCtrl.navigateForward('/recientes');
}

irContactos() {
  this.activeTab = 'contactos';
  this.navCtrl.navigateRoot('/home');
}

  // ==============================
  // Escanear QR y agregar contacto
  // ==============================
  async abrirCamaraQR() {
    try {
      const { barcodes } = await BarcodeScanner.scan();

      if (!barcodes || barcodes.length === 0) {
        const toast = await this.toastCtrl.create({
          message: 'No se detectó ningún código.',
          duration: 2000,
          color: 'danger'
        });
        await toast.present();
        return;
      }

      const rawValue = barcodes[0].rawValue;
      const [nombre, numero] = rawValue.split('|').map(s => s.trim());

      if (!nombre || !numero) return;

      if (!/^[a-zA-Z\s]+$/.test(nombre)) {
        const toast = await this.toastCtrl.create({
          message: 'Nombre inválido. Solo se permiten letras.',
          duration: 2500,
          color: 'warning'
        });
        await toast.present();
        return;
      }

      if (!/^569\d{8}$/.test(numero) && !/^9\d{8}$/.test(numero)) {
        const toast = await this.toastCtrl.create({
          message: 'Número inválido. Debe ser un número chileno válido (569XXXXXXXX o 9XXXXXXXX).',
          duration: 3000,
          color: 'warning'
        });
        await toast.present();
        return;
      }

      let numeroFinal = numero;
      if (/^9\d{8}$/.test(numero)) numeroFinal = '569' + numero;

      const existing = (await this.dbService.getContacts()).find(c => c.nombre === nombre);
      if (existing) {
        const toast = await this.toastCtrl.create({
          message: `El contacto ${nombre} ya existe.`,
          duration: 2000,
          color: 'warning'
        });
        await toast.present();
      } else {
        await this.dbService.addOrUpdateContact(nombre, numeroFinal, false, '');
        const toast = await this.toastCtrl.create({
          message: `Contacto ${nombre} agregado correctamente.`,
          duration: 2000,
          color: 'success'
        });
        await toast.present();
      }

    } catch (err) {
      console.error('Error leyendo QR:', err);
      const toast = await this.toastCtrl.create({
        message: 'Error al leer el QR.',
        duration: 2000,
        color: 'danger'
      });
      await toast.present();
    }
  }

  // ==============================
  // Modal para crear contacto manualmente
  // ==============================
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
            const nombre = data.nombre?.trim();
            let numero = data.numero?.trim();

            if (!nombre || !numero) return false;

            if (!/^[a-zA-Z\s]+$/.test(nombre)) {
              const toast = await this.toastCtrl.create({
                message: 'Nombre inválido. Solo se permiten letras.',
                duration: 2500,
                color: 'warning'
              });
              await toast.present();
              return false;
            }

            if (!/^569\d{8}$/.test(numero) && !/^9\d{8}$/.test(numero)) {
              const toast = await this.toastCtrl.create({
                message: 'Número inválido. Debe ser un número chileno válido (569XXXXXXXX o 9XXXXXXXX).',
                duration: 3000,
                color: 'warning'
              });
              await toast.present();
              return false;
            }

            if (/^9\d{8}$/.test(numero)) numero = '569' + numero;

            const existing = (await this.dbService.getContacts()).find(c => c.nombre === nombre);
            if (existing) {
              const toast = await this.toastCtrl.create({
                message: `El contacto ${nombre} ya existe.`,
                duration: 2000,
                color: 'warning'
              });
              await toast.present();
              return false;
            }

            await this.dbService.addOrUpdateContact(nombre, numero, false, '');
            const toast = await this.toastCtrl.create({
              message: `Contacto ${nombre} agregado correctamente.`,
              duration: 2000,
              color: 'success'
            });
            await toast.present();
            return true;
          }
        }
      ],
      enterAnimation: (baseEl) => this.enterAnimation(baseEl),
      leaveAnimation: (baseEl) => this.leaveAnimation(baseEl)
    });

    await alert.present();
  }

  // ==============================
  // Navegar a InfoPage
  // ==============================
  verInfo(contacto: Contacto) {
    this.navCtrl.navigateForward('/info', {
      queryParams: { nombre: contacto.nombre, numero: contacto.numero }
    });
  }

  // ==============================
  // Filtro de búsqueda
  // ==============================
  filtrarContactos(): Contacto[] {
    return this.contactos
      .filter(c => c.nombre.toLowerCase().includes(this.searchTerm.toLowerCase()))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }

  // ==============================
  // Contactos destacados
  // ==============================
  get contactosDestacados(): Contacto[] {
    return this.contactos.filter(c => c.destacado);
  }

  // ==============================
  // Animaciones de modal
  // ==============================
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

  // ==============================
  // Llamar directamente a un contacto
  // ==============================
  llamarContacto(contacto: Contacto) {
    if (!contacto.numero) {
      this.toastCtrl.create({
        message: `El contacto ${contacto.nombre} no tiene número.`,
        duration: 2000,
        color: 'danger'
      }).then(toast => toast.present());
      return;
    }

    let numero = contacto.numero;
    if (!numero.startsWith('+56')) {
      if (numero.startsWith('0')) numero = '+56' + numero.slice(1);
      else numero = '+56' + numero;
    }

    window.open(`tel:${numero}`, '_system');
  }

  // ==============================
  // Mostrar opciones al mantener presionado un contacto
  // ==============================
  async mostrarOpciones(contacto: Contacto) {
    const actionSheet = await this.actionSheetCtrl.create({
      header: contacto.nombre,
      buttons: [
        {
          text: contacto.destacado ? 'Quitar de destacados' : 'Destacar',
          icon: 'star',
          handler: async () => {
            await this.dbService.addOrUpdateContact(
              contacto.nombre,
              contacto.numero || '',
              !contacto.destacado,
              contacto.photo || ''
            );
            const toast = await this.toastCtrl.create({
              message: contacto.destacado
                ? `${contacto.nombre} ya no está destacado.`
                : `${contacto.nombre} destacado.`,
              duration: 2000,
              color: 'success'
            });
            await toast.present();
          }
        },
        {
          text: 'Eliminar',
          icon: 'trash',
          role: 'destructive',
          handler: async () => {
            await this.dbService.deleteContact(contacto.nombre);
            const toast = await this.toastCtrl.create({
              message: `Contacto ${contacto.nombre} eliminado.`,
              duration: 2000,
              color: 'danger'
            });
            await toast.present();
          }
        },
        {
          text: 'Cancelar',
          icon: 'close',
          role: 'cancel'
        }
      ]
    });

    await actionSheet.present();
  }


}
