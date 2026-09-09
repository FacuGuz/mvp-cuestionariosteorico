import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CuestionarioService } from '../../../core/services/cuestionario.service';
import { ApiCallLog } from '../../../core/models/cuestionario.model';

@Component({
  selector: 'app-api-logs-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './api-logs-modal.component.html',
  styleUrls: ['./api-logs-modal.component.css']
})
export class ApiLogsModalComponent {
  protected readonly cuestionarioService = inject(CuestionarioService);
  logSeleccionado = signal<ApiCallLog | null>(null);

  seleccionarLog(log: ApiCallLog): void {
    if (this.logSeleccionado()?.id === log.id) {
      this.logSeleccionado.set(null);
    } else {
      this.logSeleccionado.set(log);
    }
  }

  cerrar(): void {
    this.cuestionarioService.cerrarModalLogs();
  }

  limpiar(): void {
    this.cuestionarioService.limpiarHistorialLogs();
    this.logSeleccionado.set(null);
  }

  formatJson(data: any): string {
    if (!data) return '';
    try {
      return JSON.stringify(data, null, 2);
    } catch {
      return String(data);
    }
  }
}
