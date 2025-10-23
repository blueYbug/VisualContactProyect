import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { DatabaseService } from 'src/app/service/database.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
  standalone: false
})
export class RegisterPage {
  name: string = '';
  email: string = '';
  phone: string = '';
  password: string = '';

  constructor(
    private dbService: DatabaseService,
    private toastController: ToastController,
    private router: Router
  ) {}

  async onRegister() {
    if (!this.name || !this.email || !this.phone || !this.password) {
      this.showToast('Por favor complete todos los campos');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.email)) {
      this.showToast('Correo inválido');
      return;
    }

    if (!/^9\d{8}$/.test(this.phone) && !/^569\d{8}$/.test(this.phone)) {
      this.showToast('Número inválido. Debe ser 911111111 o 56911111111');
      return;
    }

    let phoneFormatted = this.phone;
    if (/^9\d{8}$/.test(this.phone)) phoneFormatted = '569' + this.phone;

    try {
      const result = await this.dbService.registerUser(
        this.name.trim(),
        this.email.trim(),
        this.password,
        phoneFormatted
      );

      if (result.success) {
        this.showToast('Registro exitoso. Ahora puedes iniciar sesión.');
        this.router.navigate(['/login']); // Redirige al login
      } else {
        this.showToast(result.error || 'Error al registrar usuario');
      }
    } catch (err: any) {
      this.showToast('Ocurrió un error desconocido.');
    }
  }

  async showToast(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 2500,
      position: 'top'
    });
    await toast.present();
  }
}
