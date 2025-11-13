// src/app/pages/startup/startup.page.ts
import { Component, OnInit } from '@angular/core';
import { NavController } from '@ionic/angular';
import { DatabaseService } from '../../../app/service/database.service';

@Component({
  selector: 'app-startup',
  templateUrl: './startup.page.html',
  styleUrls: ['./startup.page.scss'],
  standalone: false
})
export class StartupPage implements OnInit {

  constructor(
    private navCtrl: NavController,
    private db: DatabaseService
  ) {}

  async ngOnInit() {
    try {
      // Pequeña pausa visual (opcional)
      await new Promise(resolve => setTimeout(resolve, 1200));

      // Inicializa base de datos y carga usuario activo
      await this.db.initDB();
      await this.db.loadActiveUser();

      // Obtenemos el valor actual del usuario
      const user = this.db.currentUser$.value;

      // Redirige según el estado de sesión
      if (user) {
        this.navCtrl.navigateRoot('/home', { animated: false });
      } else {
        this.navCtrl.navigateRoot('/login', { animated: false });
      }

    } catch (error) {
      console.error('Startup: Error al iniciar la aplicación', error);
      this.navCtrl.navigateRoot('/login', { animated: false });
    }
  }
}
