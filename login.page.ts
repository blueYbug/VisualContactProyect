import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { DatabaseService, User } from 'src/app/service/database.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: false
})
export class LoginPage implements OnInit {
  email: string = '';
  password: string = '';

  constructor(
    private dbService: DatabaseService,
    private toastController: ToastController,
    private router: Router
  ) {}

  async ngOnInit() {
    // Verificar si existe una sesión activa en localStorage
    await this.dbService.loadActiveUser();
    const currentUser: User | null = this.dbService.currentUser$.value;

    // Si el usuario está logueado, redirigir a la página principal
    if (currentUser) {
      this.router.navigate(['/home']);
    }
  }

  async onLogin() {
    if (!this.email || !this.password) {
      this.showToast('Por favor complete todos los campos');
      return;
    }

    try {
      const user = await this.dbService.loginUser(this.email, this.password);
      if (user) {
        // Guardar el estado del usuario en localStorage
        this.dbService.setActiveUser(user.email);
        this.showToast('Inicio de sesión exitoso');
        this.router.navigate(['/home']);
      } else {
        this.showToast('Correo o contraseña incorrectos');
      }
    } catch (err: any) {
      this.showToast('Error al iniciar sesión');
    }
  }

  async showToast(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      position: 'top'
    });
    toast.present();
  }
}
