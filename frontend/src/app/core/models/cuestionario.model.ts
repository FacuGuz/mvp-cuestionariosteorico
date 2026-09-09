export type TipoPregunta = 'OPCION_MULTIPLE' | 'VERDADERO_FALSO' | 'ORDENAR' | 'EMPAREJAR';

export interface CuestionarioResumen {
  id: string;
  desafioId: string;
  cursoCohorteId: string;
  titulo: string;
  descripcion: string;
  cantidadPreguntas: number;
  puntajeTotal: number;
  activo: boolean;

  // Metadata visual / UI
  cursoNombre?: string;
  desafioNumero?: string;
  duracionMinutos?: number;
  dificultad?: 'Básica' | 'Intermedia' | 'Avanzada';
  obligatorio?: boolean;
  intentosPermitidos?: number;
  intentosRealizados?: number;
  origen?: 'SPRING_BOOT' | 'MOCK_LOCAL';
}

export interface PreguntaParaResolver {
  preguntaVersionId: string;
  tipo: TipoPregunta;
  enunciado: string;
  orden: number;
  puntaje: number;
  payload: any; // { opciones?: string[] | boolean[] } | { elementos?: string[] } | { columnaA?: string[], columnaB?: string[] }
}

export interface CuestionarioDetalle {
  id: string;
  desafioId: string;
  cursoCohorteId: string;
  titulo: string;
  descripcion: string;
  puntajeTotal: number;
  activo: boolean;
  preguntas: PreguntaParaResolver[];

  // Metadata visual / UI
  cursoNombre?: string;
  desafioNumero?: string;
  duracionMinutos?: number;
  dificultad?: 'Básica' | 'Intermedia' | 'Avanzada';
  obligatorio?: boolean;
  intentosPermitidos?: number;
  intentosRealizados?: number;
}

export interface RespuestaEnvio {
  preguntaVersionId: string;
  respuesta: any; // { opcion_seleccionada: string } | { respuesta: boolean } | { secuencia: string[] } | { pares: Record<string, string> }
}

export interface EnvioIntento {
  alumnoId: string;
  respuestas: RespuestaEnvio[];
}

export interface DetalleCorreccion {
  preguntaVersionId: string;
  tipo: TipoPregunta;
  puntajeMaximo: number;
  puntajeObtenido: number;
  esCorrecta: boolean;
  feedback: string;
}

export interface ResultadoCorreccion {
  cuestionarioId: string;
  alumnoId: string;
  intento: number;
  nota: number;        // Escala 0 a 100
  aprobado: boolean;   // >= 60
  feedback: string;
  detalle: DetalleCorreccion[];

  // Helpers frontend
  intentosPermitidos?: number;
  intentosRestantes?: number;
  monedasGanadas?: number;
}

export interface CrearPreguntaDto {
  tipo: TipoPregunta;
  enunciado: string;
  orden: number;
  puntaje: number;
  payload: any;
  criterio: any;
}

export interface CrearCuestionarioDto {
  desafioId: string;
  cursoCohorteId: string;
  profesorId: string;
  titulo: string;
  descripcion: string;
  preguntas: CrearPreguntaDto[];

  // Extras para UI y compatibilidad
  cursoNombre?: string;
  duracionMinutos?: number;
  dificultad?: 'Básica' | 'Intermedia' | 'Avanzada';
  obligatorio?: boolean;
  intentosPermitidos?: number;
}

export interface ApiCallLog {
  id: string;
  timestamp: string;
  metodo: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  url: string;
  status: number;
  statusText: string;
  origen: 'SPRING_BOOT' | 'MOCK_AUTONOMO';
  duracionMs: number;
  payload?: any;
  response?: any;
}
