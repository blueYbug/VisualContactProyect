import { Injectable } from '@angular/core';
import { SQLite, SQLiteObject } from '@awesome-cordova-plugins/sqlite/ngx';
import { BehaviorSubject } from 'rxjs';

export interface Contact {
  id: number;
  nombre: string;
  numero: string;
  destacado: boolean;
  photo: string;
}

export interface CallLog {
  id: number;
  contact_name: string;
  type: 'call' | 'message';
  timestamp: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  password: string;
  phone: string;
  photo?: string;
  is_logged_in?: number;
}

@Injectable({
  providedIn: 'root'
})
export class DatabaseService {
  public dbInstance: SQLiteObject | null = null; // <-- ahora público
  private dbReady = false;

  public contactos$ = new BehaviorSubject<Contact[]>([]);
  public currentContact$ = new BehaviorSubject<Contact | null>(null);
  public currentUser$ = new BehaviorSubject<User | null>(null);

  constructor(private sqlite: SQLite) { }

  // --------------------
  // Inicialización de la DB
  // --------------------
  public async initDB() {
    if (this.dbReady) return;
    try {
      this.dbInstance = await this.sqlite.create({
        name: 'contacts.db',
        location: 'default'
      });

      await this.dbInstance.executeSql(`
        CREATE TABLE IF NOT EXISTS contacts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          nombre TEXT UNIQUE,
          numero TEXT,
          destacado INTEGER DEFAULT 0,
          photo TEXT
        )
      `, []);

      await this.dbInstance.executeSql(`
        CREATE TABLE IF NOT EXISTS call_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          contact_name TEXT,
          type TEXT,
          timestamp TEXT
        )
      `, []);

      await this.dbInstance.executeSql(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT,
          email TEXT UNIQUE,
          password TEXT,
          phone TEXT,
          photo TEXT,
          is_logged_in INTEGER DEFAULT 0
        )
      `, []);

      this.dbReady = true;
      await this.emitContactos();

      // Cargar usuario logeado si existe
      const res = await this.dbInstance!.executeSql('SELECT * FROM users WHERE is_logged_in = 1 LIMIT 1', []);
      if (res.rows.length > 0) {
        this.setCurrentUser(res.rows.item(0) as User);
      }

      console.log('DB inicializada');
    } catch (err) {
      console.error('Error inicializando DB:', err);
    }
  }

  private async ensureDBReady() {
    if (!this.dbReady) await this.initDB();
  }

  // --------------------
  // USERS
  // --------------------
  public async registerUser(
    name: string,
    email: string,
    password: string,
    phone: string,
    photo: string = ''
  ): Promise<{ success: boolean; error?: string }> {
    await this.ensureDBReady();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return { success: false, error: 'Correo inválido' };

    const phoneRegex = /^\d{8,15}$/;
    if (!phoneRegex.test(phone)) return { success: false, error: 'Número inválido' };

    try {
      const res = await this.dbInstance!.executeSql('SELECT * FROM users WHERE email = ?', [email]);
      if (res.rows.length > 0) return { success: false, error: 'Correo ya registrado' };

      await this.dbInstance!.executeSql(
        'INSERT INTO users (name, email, password, phone, photo, is_logged_in) VALUES (?, ?, ?, ?, ?, 0)',
        [name, email, password, phone, photo]
      );

      return { success: true };
    } catch (error: any) {
      console.error('Error completo al registrar usuario:', error);
      if (error.message?.includes('UNIQUE constraint failed') || error.message?.includes('users.email')) {
        return { success: false, error: 'Correo ya registrado' };
      }
      return { success: false, error: `Error SQLite: ${error.message ?? error}` };
    }
  }

  public async loginUser(email: string, password: string): Promise<User | null> {
    await this.ensureDBReady();
    try {
      const res = await this.dbInstance!.executeSql(
        'SELECT * FROM users WHERE email = ? AND password = ?',
        [email, password]
      );
      if (res.rows.length > 0) {
        const user = res.rows.item(0) as User;

        await this.dbInstance!.executeSql(
          'UPDATE users SET is_logged_in = 1 WHERE email = ?',
          [email]
        );

        this.setCurrentUser(user);
        return user;
      }
      return null;
    } catch (err) {
      console.error('Error en login:', err);
      return null;
    }
  }

  public setCurrentUser(user: User | null) {
    this.currentUser$.next(user);
  }

  public async logout() {
    const current = this.currentUser$.value;
    if (current) {
      await this.dbInstance!.executeSql(
        'UPDATE users SET is_logged_in = 0 WHERE email = ?',
        [current.email]
      );
    }
    this.setCurrentUser(null);
  }

  public async updateUser(user: User) {
    await this.ensureDBReady();
    await this.dbInstance!.executeSql(
      `UPDATE users 
       SET name = ?, email = ?, phone = ?, password = ?, photo = ?
       WHERE id = ?`,
      [user.name, user.email, user.phone, user.password, user.photo || '', user.id]
    );
    this.setCurrentUser({ ...user });
  }

  // --------------------
  // Google Auth helpers
  // --------------------
  public async getUserByEmail(email: string): Promise<User | null> {
    await this.ensureDBReady();
    const res = await this.dbInstance!.executeSql('SELECT * FROM users WHERE email = ?', [email]);
    return res.rows.length > 0 ? (res.rows.item(0) as User) : null;
  }

  public async createGoogleUser(name: string, email: string, photo: string): Promise<User> {
    await this.ensureDBReady();
    await this.dbInstance!.executeSql(
      'INSERT INTO users (name, email, password, phone, photo, is_logged_in) VALUES (?, ?, ?, ?, ?, 1)',
      [name, email, '', '', photo]
    );
    const lastId = (await this.dbInstance!.executeSql('SELECT last_insert_rowid() as id', [])).rows.item(0).id;
    const user: User = { id: lastId, name, email, password: '', phone: '', photo, is_logged_in: 1 };
    this.setCurrentUser(user);
    return user;
  }

  // --------------------
  // CONTACTOS
  // --------------------
  public async emitContactos() {
    const contactos = await this.getContacts();
    this.contactos$.next(contactos);
  }

  public async getContacts(): Promise<Contact[]> {
    await this.ensureDBReady();
    try {
      const res = await this.dbInstance!.executeSql('SELECT * FROM contacts', []);
      const contactos: Contact[] = [];
      for (let i = 0; i < res.rows.length; i++) {
        const c = res.rows.item(i);
        contactos.push({
          id: c.id,
          nombre: c.nombre,
          numero: c.numero,
          destacado: !!c.destacado,
          photo: c.photo || ''
        });
      }
      return contactos;
    } catch (err) {
      console.error('Error obteniendo contactos:', err);
      return [];
    }
  }

  public async addOrUpdateContact(nombre: string, numero: string, destacado = false, photo = '') {
    await this.ensureDBReady();
    try {
      const existing = (await this.getContacts()).find(c => c.nombre === nombre);
      if (existing) {
        await this.updateContact(nombre, { nombre, numero, destacado, photo });
      } else {
        await this.dbInstance!.executeSql(
          'INSERT INTO contacts (nombre, numero, destacado, photo) VALUES (?, ?, ?, ?)',
          [nombre, numero, destacado ? 1 : 0, photo]
        );
      }
      await this.emitContactos();
    } catch (err) {
      console.error('Error agregando o actualizando contacto:', err);
    }
  }

  public async updateContact(oldName: string, nuevo: { nombre: string; numero: string; destacado?: boolean; photo?: string }) {
    await this.ensureDBReady();
    const current = (await this.getContacts()).find(c => c.nombre === oldName);
    const photo = nuevo.photo ?? current?.photo ?? '';
    const destacado = nuevo.destacado ?? current?.destacado ?? false;

    await this.dbInstance!.executeSql(
      'UPDATE contacts SET nombre = ?, numero = ?, destacado = ?, photo = ? WHERE nombre = ?',
      [nuevo.nombre, nuevo.numero, destacado ? 1 : 0, photo, oldName]
    );
    await this.emitContactos();
  }

  public async deleteContact(nombre: string) {
    await this.ensureDBReady();
    await this.dbInstance!.executeSql('DELETE FROM contacts WHERE nombre = ?', [nombre]);
    await this.emitContactos();
  }

  public async toggleFavorite(nombre: string, destacado: boolean) {
    await this.ensureDBReady();
    await this.dbInstance!.executeSql(
      'UPDATE contacts SET destacado = ? WHERE nombre = ?',
      [destacado ? 1 : 0, nombre]
    );
    await this.emitContactos();
  }

  public async updatePhoto(nombre: string, photo: string) {
    await this.ensureDBReady();
    await this.dbInstance!.executeSql(
      'UPDATE contacts SET photo = ? WHERE nombre = ?',
      [photo, nombre]
    );
    await this.emitContactos();
  }

  public async removePhoto(nombre: string) {
    await this.ensureDBReady();
    await this.dbInstance!.executeSql(
      'UPDATE contacts SET photo = "" WHERE nombre = ?',
      [nombre]
    );
    await this.emitContactos();
  }

  // --------------------
  // CALL LOGS
  // --------------------
  public async addCallLog(contact_name: string, type: 'call' | 'message') {
    await this.ensureDBReady();
    const timestamp = new Date().toISOString();
    await this.dbInstance!.executeSql(
      'INSERT INTO call_logs (contact_name, type, timestamp) VALUES (?, ?, ?)',
      [contact_name, type, timestamp]
    );
  }

  public async getCallLogs(contact_name: string): Promise<CallLog[]> {
    await this.ensureDBReady();
    const res = await this.dbInstance!.executeSql(
      'SELECT * FROM call_logs WHERE contact_name = ? ORDER BY id DESC',
      [contact_name]
    );
    const logs: CallLog[] = [];
    for (let i = 0; i < res.rows.length; i++) logs.push(res.rows.item(i));
    return logs;
  }

  public async getAllCallLogs(): Promise<CallLog[]> {
    await this.ensureDBReady();
    const res = await this.dbInstance!.executeSql(
      'SELECT * FROM call_logs ORDER BY timestamp DESC',
      []
    );
    const logs: CallLog[] = [];
    for (let i = 0; i < res.rows.length; i++) logs.push(res.rows.item(i));
    return logs;
  }

  // --------------------
  // CONTACTO ACTUAL
  // --------------------
  public setCurrentContact(contact: Contact) {
    this.currentContact$.next(contact);
  }

  public async loadContactByName(contactName: string) {
    await this.ensureDBReady();
    const contacts = await this.getContacts();
    const c = contacts.find(ct => ct.nombre === contactName);
    if (c) this.setCurrentContact(c);
    return c ?? null;
  }

  // --------------------
  // Sesiones locales
  // --------------------
  public setActiveUser(email: string) {
    localStorage.setItem('activeUserEmail', email);
    this.loadActiveUser();
  }

  public async loadActiveUser() {
    const email = localStorage.getItem('activeUserEmail');
    if (!email) {
      this.setCurrentUser(null);
      return;
    }

    await this.ensureDBReady();
    const res = await this.dbInstance!.executeSql('SELECT * FROM users WHERE email = ?', [email]);
    if (res.rows.length > 0) {
      this.setCurrentUser(res.rows.item(0) as User);
    } else {
      this.setCurrentUser(null);
    }
  }

  public logoutSession() {
    localStorage.removeItem('activeUserEmail');
    this.setCurrentUser(null);
  }
}
