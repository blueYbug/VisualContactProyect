import { Component, OnInit } from '@angular/core';
import { DatabaseService, CallLog } from '../../service/database.service';

// Interfaz para agregar propiedades visuales a cada llamada
interface DisplayCallRecord {
  contactName: string;
  phone: string;
  time: Date;
  type: 'incoming' | 'outgoing' | 'missed' | 'message';
  icon: string;
  color: string;
}

// Para agrupar llamadas por día
interface CallRecordByDay {
  dateLabel: string;
  logs: DisplayCallRecord[];
}

@Component({
  selector: 'app-recientes',
  templateUrl: './recientes.page.html',
  styleUrls: ['./recientes.page.scss'],
  standalone: false
})
export class RecientesPage implements OnInit {

  allCalls: DisplayCallRecord[] = [];
  callLogByDay: CallRecordByDay[] = [];
  isLoading = true;
  searchTerm = '';

  constructor(private dbService: DatabaseService) {}

  async ngOnInit() {
    await this.dbService.initDB();
    this.loadCalls();
  }

  async loadCalls() {
    try {
      const callsFromDB: CallLog[] = await this.dbService.getAllCallLogs();
      this.allCalls = callsFromDB.map(c => this.convertDBCallToDisplayCall(c));
      this.groupCallsByDay();
    } catch (err) {
      console.error('Error cargando llamadas:', err);
    } finally {
      this.isLoading = false;
    }
  }

  private convertDBCallToDisplayCall(call: CallLog): DisplayCallRecord {
    let icon = '';
    let color = '';

    switch (call.type) {
      case 'call':
        icon = 'call-outline';
        color = 'success';
        break;
      case 'message':
        icon = 'mail-outline';
        color = 'primary';
        break;
      default:
        icon = 'call-outline';
        color = 'medium';
    }

    return {
      contactName: call.contact_name,
      phone: '', // Puedes completar desde la tabla contactos si quieres
      time: new Date(call.timestamp),
      type: call.type === 'call' ? 'outgoing' : 'message',
      icon,
      color
    };
  }

  groupCallsByDay() {
    const grouped: { [key: string]: DisplayCallRecord[] } = {};

    this.allCalls.forEach((call: DisplayCallRecord) => {
      const dateStr = call.time.toLocaleDateString();
      if (!grouped[dateStr]) grouped[dateStr] = [];
      grouped[dateStr].push(call);
    });

    this.callLogByDay = Object.keys(grouped)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
      .map(date => ({
        dateLabel: date,
        logs: grouped[date]
      }));
  }

  callAgain(call: DisplayCallRecord) {
    console.log('Llamando de nuevo a', call.contactName || call.phone);
    // Aquí podrías integrar un plugin de llamadas reales
  }

  viewCallDetails(call: DisplayCallRecord) {
    console.log('Detalles de llamada:', call);
    // Aquí podrías abrir un modal con más información
  }

  loadMore(event: any) {
    setTimeout(() => {
      event.target.complete();
    }, 500);
  }

  onScroll(event: any) {
    // Animaciones o efectos al hacer scroll si quieres
  }

  filtrarCalls(): DisplayCallRecord[] {
    if (!this.searchTerm) return this.allCalls;
    const term = this.searchTerm.toLowerCase();
    return this.allCalls.filter(c =>
      (c.contactName && c.contactName.toLowerCase().includes(term)) ||
      (c.phone && c.phone.includes(term))
    );
  }

}
