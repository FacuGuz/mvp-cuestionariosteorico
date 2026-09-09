import { Injectable, signal, computed } from '@angular/core';
import { GamificationState, UserRole, ToastNotification } from '../models/gamification.model';

@Injectable({
  providedIn: 'root'
})
export class GamificationService {
  private readonly state = signal<GamificationState>({
    monedasActuales: 5,
    monedasTotales: 11,
    desafiosCompletados: 5,
    desafiosTotales: 12,
    rol: 'ALUMNO', // Inicia en Alumno para ver la actividad
  });

  private readonly toasts = signal<ToastNotification[]>([]);

  // Computed signals expuestos
  readonly currentState = computed(() => this.state());
  readonly rolActual = computed(() => this.state().rol);
  readonly monedas = computed(() => this.state().monedasActuales);
  readonly monedasTotales = computed(() => this.state().monedasTotales);
  readonly desafios = computed(() => this.state().desafiosCompletados);
  readonly desafiosTotales = computed(() => this.state().desafiosTotales);
  readonly activeToasts = computed(() => this.toasts());

  // Porcentaje de progreso de desafíos
  readonly porcentajeDesafios = computed(() => {
    const s = this.state();
    return Math.min(100, Math.round((s.desafiosCompletados / s.desafiosTotales) * 100));
  });

  // Alternar rol
  setRol(nuevoRol: UserRole): void {
    this.state.update(s => ({ ...s, rol: nuevoRol }));
    this.mostrarToast('info', `Modo cambiado a: ${nuevoRol === 'DOCENTE' ? '👨‍🏫 Modo Docente' : '🎓 Modo Alumno'}`);
  }

  toggleRol(): void {
    const nuevo = this.state().rol === 'DOCENTE' ? 'ALUMNO' : 'DOCENTE';
    this.setRol(nuevo);
  }

  // Recompensar al aprobar cuestionario
  recompensarExito(monedasGanadas: number = 1): void {
    this.state.update(s => ({
      ...s,
      monedasActuales: Math.min(s.monedasTotales, s.monedasActuales + monedasGanadas),
      desafiosCompletados: Math.min(s.desafiosTotales, s.desafiosCompletados + 1)
    }));
    this.mostrarToast('success', `🎉 ¡Cuestionario aprobado con éxito! +${monedasGanadas} 🪙`);
  }

  // Notificación de intento fallido
  notificarIntentoFallido(intentosRestantes: number): void {
    if (intentosRestantes > 0) {
      this.mostrarToast('warning', `⚠️ Intento no superado. Te quedan ${intentosRestantes} ${intentosRestantes === 1 ? 'intento' : 'intentos'} disponibles.`);
    } else {
      this.mostrarToast('error', '⛔ Has agotado todos los intentos permitidos para este cuestionario.');
    }
  }

  // Sistema de Notificaciones Toast
  mostrarToast(tipo: ToastNotification['tipo'], mensaje: string, duracionMs: number = 3500): void {
    const id = Math.random().toString(36).substring(2, 9);
    const nuevoToast: ToastNotification = { id, tipo, mensaje, duracionMs };
    this.toasts.update(current => [...current, nuevoToast]);

    setTimeout(() => {
      this.removerToast(id);
    }, duracionMs);
  }

  removerToast(id: string): void {
    this.toasts.update(current => current.filter(t => t.id !== id));
  }
}
