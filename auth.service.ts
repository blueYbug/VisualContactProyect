import { Injectable } from '@angular/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { DatabaseService, User } from './database.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private user: User | null = null;

  constructor(private dbService: DatabaseService) {}

  // ===============================
  // Login con Google
  // ===============================
  async loginGoogle(): Promise<User> {
    try {
      const googleUser: { email: string; name?: string; picture?: string } = await GoogleAuth.signIn();

      if (!googleUser || !googleUser.email) {
        throw new Error('No se pudo obtener el usuario de Google');
      }

      await this.dbService.initDB();

      // Buscar usuario en la DB
      let res = await this.dbService.dbInstance!.executeSql(
        'SELECT * FROM users WHERE email = ?',
        [googleUser.email]
      );

      let user: User;
      if (res.rows.length > 0) {
        // Usuario existe
        user = res.rows.item(0) as User;

        // Marcar como logeado
        await this.dbService.dbInstance!.executeSql(
          'UPDATE users SET is_logged_in = 1 WHERE email = ?',
          [user.email]
        );
      } else {
        // Registrar usuario automáticamente
        const newUser: Partial<User> = {
          name: googleUser.name || '',
          email: googleUser.email,
          password: '', // sin contraseña
          phone: '',
          photo: googleUser.picture || '',
          is_logged_in: 1
        };

        await this.dbService.dbInstance!.executeSql(
          'INSERT INTO users (name, email, password, phone, photo, is_logged_in) VALUES (?, ?, ?, ?, ?, 1)',
          [newUser.name, newUser.email, newUser.password, newUser.phone, newUser.photo]
        );

        const lastId = (await this.dbService.dbInstance!.executeSql(
          'SELECT last_insert_rowid() as id',
          []
        )).rows.item(0).id;

        user = { id: lastId, ...newUser } as User;
      }

      // Guardar sesión activa
      this.dbService.setCurrentUser(user);
      this.dbService.setActiveUser(user.email);
      this.user = user;

      return user;
    } catch (err) {
      console.error('Error login Google:', err);
      throw err;
    }
  }

  // ===============================
  // Logout de Google y sesión local
  // ===============================
  async logout(): Promise<void> {
    try {
      await GoogleAuth.signOut(); // logout Google
    } catch (err) {
      console.warn('No se pudo cerrar sesión de Google:', err);
    }

    if (this.user) {
      await this.dbService.logout(); // logout DB
      this.dbService.logoutSession();
      this.user = null;
    }
  }

  // ===============================
  // Login normal
  // ===============================
  async loginNormal(email: string, password: string): Promise<User> {
    const user = await this.dbService.loginUser(email, password);
    if (user) {
      this.user = user;
      this.dbService.setActiveUser(user.email);
      return user;
    } else {
      throw new Error('Correo o contraseña incorrectos');
    }
  }

  // ===============================
  // Registro normal
  // ===============================
  async registerNormal(
    name: string,
    email: string,
    password: string,
    phone = '',
    photo = ''
  ): Promise<User> {
    const res = await this.dbService.registerUser(name, email, password, phone, photo);
    if (res.success) {
      const user = await this.dbService.loginUser(email, password);
      if (user) {
        this.user = user;
        this.dbService.setActiveUser(user.email);
        return user;
      }
    }
    throw new Error(res.error || 'Error al registrar usuario');
  }

  // ===============================
  // Obtener usuario actual
  // ===============================
  getCurrentUser(): User | null {
    return this.user;
  }
}
