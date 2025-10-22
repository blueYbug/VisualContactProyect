import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, NavController, ToastController } from '@ionic/angular';
import { RouterModule } from '@angular/router'; 
import { DatabaseService } from 'src/app/servicios/database';
import { Router } from '@angular/router';

@Component({
  selector: 'app-registro',
  templateUrl: './registro.page.html',
  styleUrls: ['./registro.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonicModule, 
    RouterModule,
  ],
})
export class RegistroPage {
    user = {
    name: '',
    email: '', 
    password: '',
  };

  constructor(
    private dbService: DatabaseService,
    private toastCtrl: ToastController,
    private navCtrl: NavController,
    private router: Router
  ) {}

  async registerUser() {
    // Validacion para que no dejen los campos vacios los chistosos
    if (!this.user.name || !this.user.email || !this.user.password) {
      const toast = await this.toastCtrl.create({
        message: 'Por favor completa todos los campos (Nombre, Email y Contraseña)',
        duration: 2000,
        color: 'warning',
      });
      toast.present();
      return;
    }
    
    try {
      await this.dbService.addUser({ 
        name: this.user.name, 
        email: this.user.email,
        password: this.user.password 
      });

      const toast = await this.toastCtrl.create({
        message: 'Usuario registrado correctamente',
        duration: 2000,
        color: 'success',
      });
      toast.present();
      
      // Vuelve al home
      this.navCtrl.navigateBack('/contactos'); 
      
    } catch (error: any) {
      let errorMessage = 'Error al registrar usuario. Intenta de nuevo.';
      
      // Aca ve si ya existe el usuario que quiera registrarse
      if (error.message && error.message.includes('UNIQUE constraint failed')) {
          errorMessage = 'El email o el nombre de usuario ya están registrados.';
      }
      
      const toast = await this.toastCtrl.create({
        message: errorMessage,
        duration: 2000,
        color: 'danger',
      });
      toast.present();
      console.error("Error al intentar registrarse:", error);
    }
  }
}
