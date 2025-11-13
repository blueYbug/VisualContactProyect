import { Component, OnInit } from '@angular/core';
import { DatabaseService, CallLog } from '../../service/database.service';

interface DisplayCallRecord {
  contactName: string;
  phone: string;
  time: Date;
  type: 'incoming' | 'outgoing' | 'missed' | 'message';
  icon: string;
  color: string;

  apiInfo?: {
    location?: string;
    carrier?: string;
    line_type?: string;
    country_name?: string;
  };
}

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

  // =========================================================
  // Cargar registros
  // =========================================================
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

  // =========================================================
  // Convertir registro BD → visual
  // =========================================================
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

    let parsedInfo: any = null;
    if (call.info) {
      try {
        parsedInfo = JSON.parse(call.info);
      } catch {
        parsedInfo = null;
      }
    }

    return {
      contactName: call.contact_name,
      phone: parsedInfo?.international_format || parsedInfo?.number || '',
      time: new Date(call.timestamp),
      type: call.type === 'call' ? 'outgoing' : 'message',
      icon,
      color,
      apiInfo: {
        location: parsedInfo?.location,
        carrier: parsedInfo?.carrier,
        line_type: parsedInfo?.line_type,
        country_name: parsedInfo?.country_name
      }
    };
  }

  // =========================================================
  // Agrupar por días
  // =========================================================
  groupCallsByDay() {
    const grouped: { [key: string]: DisplayCallRecord[] } = {};

    this.allCalls.forEach(call => {
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

  // =========================================================
  // Acciones
  // =========================================================
  callAgain(call: DisplayCallRecord) {
    console.log('Llamar de nuevo →', call.contactName || call.phone);
  }

  viewCallDetails(call: DisplayCallRecord) {
    console.log('Detalles completos:', call);
  }

  loadMore(event: any) {
    setTimeout(() => {
      event.target.complete();
    }, 400);
  }

  onScroll(event: any) {}

  // =========================================================
  // Filtro
  // =========================================================
  filtrarCalls(): DisplayCallRecord[] {
    if (!this.searchTerm) return this.allCalls;

    const term = this.searchTerm.toLowerCase();

    return this.allCalls.filter(c =>
      (c.contactName?.toLowerCase().includes(term)) ||
      (c.phone?.includes(term)) ||
      (c.apiInfo?.carrier?.toLowerCase().includes(term)) ||
      (c.apiInfo?.location?.toLowerCase().includes(term))
    );
  }

}
