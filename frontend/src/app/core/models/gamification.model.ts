export type UserRole = 'DOCENTE' | 'ALUMNO';

export interface GamificationState {
  monedasActuales: number; // e.g. 5
  monedasTotales: number;  // 11
  desafiosCompletados: number; // e.g. 5
  desafiosTotales: number;     // 12
  rol: UserRole;
}

export interface ToastNotification {
  id: string;
  tipo: 'success' | 'warning' | 'error' | 'info';
  mensaje: string;
  duracionMs?: number;
}
