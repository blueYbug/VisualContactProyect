import { Component, OnInit } from '@angular/core';
import { IonicModule, ToastController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink} from '@angular/router';
import { DatabaseService } from 'src/app/servicios/database'; 
import { GoogleAuth } from '@capacitor/google-auth'; 
import { isPlatform } from '@ionic/angular'; 

const GOOGLE_WEB_CLIENT_ID = 'aqui va la direccion';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, RouterLink],
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss']
})
export class LoginPage implements OnInit { 
  usuario: string = '';
  contrasena: string = '';
  recordarme: boolean = false;
  error: string = '';

  constructor(
    private router: Router, 
    private dbService: DatabaseService, 
    private toastCtrl: ToastController
  ) {}

  ngOnInit() {
    // Inicializa el plugin de Google Auth SOLO en modo web/browser
    if (!isPlatform('capacitor')) {
        GoogleAuth.initialize({
            clientId: GOOGLE_WEB_CLIENT_ID,
            scopes: ['profile', 'email'],
            grantOfflineAccess: true,
        });
    }

    // si ya esta la sesion iniciada manda altiro a la page de home(contactos en mi proyecto)
    const usuarioGuardado = localStorage.getItem('vc_usuario') || sessionStorage.getItem('vc_usuario');
    if (usuarioGuardado) {
      this.router.navigateByUrl('/contactos', { replaceUrl: true }); 
    }
  }

  async iniciarSesion() {
    if (!this.usuario || !this.contrasena) {
      this.error = 'El nombre de usuario y la contraseña son obligatorios.';
      return;
    }

    this.error = '';

    try {
      const user = await this.dbService.getUsuario(this.usuario, this.contrasena);

      if (user) {
        // Aca se guarda la sesion si el usuario se ingreso bien
        const key = 'vc_usuario';
        if (this.recordarme) {
          localStorage.setItem(key, user.name);
        } else {
          sessionStorage.setItem(key, user.name);
        }

        const toast = await this.toastCtrl.create({
          message: `Bienvenido, ${user.name}`,
          duration: 2000,
          color: 'success',
        });
        await toast.present();

        this.router.navigateByUrl('/contactos', { replaceUrl: true });
        
      } else {
        this.error = 'Datos invalidos,verifica tu usuario y contraseña.';
      }
    } catch (dbError) {
      console.error('Error al iniciar sesión:', dbError);
      this.error = 'Ocurrió un error al intentar iniciar sesión con la base de datos.';
    }
  }
  
    async googleLogin() {
        this.error = '';
        try {
            const result = await GoogleAuth.signIn();
            
            if (result && result.authentication && result.email) {
                const user = {
                    name: result.name || 'Usuario Google',
                    email: result.email,
                    googleId: result.id, 
                };

                await this.handleGoogleUser(user);

            } else {
                this.error = 'Inicio de sesión con Google cancelado o fallido.';
            }

        } catch (e: any) {
            console.error('Error en Google Sign-In:', e);
            if (e.code !== 12501) {
                this.error = 'Error al intentar iniciar sesión con Google.';
            }
        }
    }

    private async handleGoogleUser(googleUser: { name: string, email: string, googleId: string }) {
        let localUser = await this.dbService.getUsuarioPorEmail(googleUser.email);

        if (!localUser) {
            try {
                const newUser = {
                    name: googleUser.name,
                    email: googleUser.email,
                    password: googleUser.googleId, 
                };
                await this.dbService.addUser(newUser);
                localUser = { id: 0, name: googleUser.name, email: googleUser.email }; 
            } catch (e: any) {
                 if (e.message && e.message.includes('UNIQUE constraint failed')) {
                    localUser = await this.dbService.getUsuarioPorEmail(googleUser.email);
                } else {
                    throw new Error('Error al registrar usuario de Google en la BD.');
                }
            }
        }
        
        if (localUser) {
            const key = 'vc_usuario';
            sessionStorage.setItem(key, localUser.name); 

            const toast = await this.toastCtrl.create({
                message: `Bienvenido vía Google, ${localUser.name}`,
                duration: 2000,
                color: 'success',
            });
            await toast.present();
            this.router.navigateByUrl('/contactos', { replaceUrl: true });
        } else {
             this.error = 'No se pudo crear o encontrar el usuario en la base de datos.';
        }
    }
}