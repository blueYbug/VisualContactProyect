import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { CallRecord } from '../Model/call-log.model'; // ahora la interfaz se llama CallRecord

@Injectable({
  providedIn: 'root'
})
export class CallService {

  private callLogs: CallRecord[] = [];
  private callLogsSubject: BehaviorSubject<CallRecord[]> = new BehaviorSubject<CallRecord[]>([]);

  constructor() {
    // Datos de ejemplo
    this.callLogs = [
      {
        contactName: 'Juan Pérez',
        phone: '+56912345678',
        type: 'incoming',
        time: new Date(),
        duration: 120
      },
      {
        contactName: 'María López',
        phone: '+56987654321',
        type: 'missed',
        time: new Date(),
        duration: 0
      }
    ];
    this.callLogsSubject.next(this.callLogs);
  }

  // Devuelve todos los registros como observable
  getAllCalls(): Observable<CallRecord[]> {
    return this.callLogsSubject.asObservable();
  }

  // Agrega un nuevo registro
  addCall(call: CallRecord) {
    this.callLogs.unshift(call); // agrega al inicio
    this.callLogsSubject.next(this.callLogs);
  }

  // Limpia todos los registros
  clearAll() {
    this.callLogs = [];
    this.callLogsSubject.next(this.callLogs);
  }

  // Filtra por tipo
  getCallsByType(type: 'incoming' | 'outgoing' | 'missed'): CallRecord[] {
    return this.callLogs.filter(c => c.type === type);
  }
}
