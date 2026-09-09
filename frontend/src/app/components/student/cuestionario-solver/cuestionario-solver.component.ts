import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CuestionarioService } from '../../../core/services/cuestionario.service';
import { GamificationService } from '../../../core/services/gamification.service';
import {
  CuestionarioResumen,
  CuestionarioDetalle,
  PreguntaParaResolver,
  ResultadoCorreccion,
  TipoPregunta,
  EnvioIntento,
  RespuestaEnvio
} from '../../../core/models/cuestionario.model';

@Component({
  selector: 'app-cuestionario-solver',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cuestionario-solver.component.html',
  styleUrls: ['./cuestionario-solver.component.css']
})
export class CuestionarioSolverComponent implements OnInit {
  protected readonly cuestionarioService = inject(CuestionarioService);
  protected readonly gamification = inject(GamificationService);

  // Catálogo de cuestionarios disponibles (solo activos para el alumno)
  cuestionarios = signal<CuestionarioResumen[]>([]);
  isLoadingCatalogo = signal<boolean>(false);

  // Modal de Actividad
  modalActividadAbierto = signal<boolean>(false);
  cuestionarioActivo = signal<CuestionarioDetalle | null>(null);
  indicePreguntaActual = signal<number>(0);

  // Respuestas del estudiante: { [preguntaVersionId: string]: any }
  respuestasAlumno = signal<Record<string, any>>({});

  // Estados temporales para interacción
  ordenActual = signal<string[]>([]);
  paresActual = signal<Record<string, string>>({});
  conceptoSeleccionadoParaEmparejar = signal<string | null>(null);
  readonly paresKeys = computed(() => Object.keys(this.paresActual()));
  definicionesMezcladas = signal<{ id: string; texto: string }[]>([]);

  // Modal de Feedback / Resultados
  modalFeedbackAbierto = signal<boolean>(false);
  resultado = signal<ResultadoCorreccion | null>(null);

  // Pregunta actual computada
  preguntaActual = computed<PreguntaParaResolver | null>(() => {
    const c = this.cuestionarioActivo();
    if (!c || !c.preguntas || c.preguntas.length === 0) return null;
    return c.preguntas[this.indicePreguntaActual()] || null;
  });

  // Opciones normalizadas para opción múltiple
  opcionesPreguntaActual = computed<{ id: string; texto: string }[]>(() => {
    const p = this.preguntaActual();
    if (!p || p.tipo !== 'OPCION_MULTIPLE') return [];
    const ops = p.payload?.opciones || [];
    return ops.map((o: any, idx: number) => {
      if (typeof o === 'string') return { id: o, texto: o };
      return { id: o.id || o.texto || `op-${idx}`, texto: o.texto || o.id };
    });
  });

  // Conceptos normalizados para emparejar
  conceptosPreguntaActual = computed<{ id: string; texto: string }[]>(() => {
    const p = this.preguntaActual();
    if (!p || p.tipo !== 'EMPAREJAR') return [];
    const lista = p.payload?.columnaA || p.payload?.conceptos || [];
    return lista.map((item: any, idx: number) => {
      if (typeof item === 'string') return { id: item, texto: item };
      return { id: item.id || item.texto || `c-${idx}`, texto: item.texto || item.id };
    });
  });

  // Valida si la pregunta actual tiene una respuesta ingresada
  preguntaRespondida = computed<boolean>(() => {
    const p = this.preguntaActual();
    if (!p) return false;
    const respObj = this.respuestasAlumno()[p.preguntaVersionId];
    if (!respObj) return false;

    switch (p.tipo) {
      case 'OPCION_MULTIPLE':
        return typeof respObj.opcion_seleccionada === 'string' && respObj.opcion_seleccionada.length > 0;
      case 'VERDADERO_FALSO':
        return typeof respObj.respuesta === 'boolean';
      case 'ORDENAR':
        return Array.isArray(respObj.secuencia) && respObj.secuencia.length > 0;
      case 'EMPAREJAR': {
        if (!respObj.pares || typeof respObj.pares !== 'object') return false;
        const totalConceptos = this.conceptosPreguntaActual().length;
        return Object.keys(respObj.pares).length >= totalConceptos && totalConceptos > 0;
      }
      default:
        return false;
    }
  });

  ngOnInit(): void {
    this.cargarCatalogo();
  }

  cargarCatalogo(): void {
    this.isLoadingCatalogo.set(true);
    // GET /api/cuestionarios?soloActivos=true para la vista alumno
    this.cuestionarioService.getCuestionarios(true).subscribe({
      next: (list) => {
        this.cuestionarios.set(list);
        this.isLoadingCatalogo.set(false);
      },
      error: (err) => {
        console.error('Error al cargar catálogo', err);
        this.isLoadingCatalogo.set(false);
      }
    });
  }

  iniciarDesafio(cuestionarioId: string): void {
    const summary = this.cuestionarios().find(c => c.id === cuestionarioId);
    if (summary && summary.intentosRealizados !== undefined && summary.intentosPermitidos !== undefined) {
      if (summary.intentosRealizados >= summary.intentosPermitidos) {
        this.gamification.mostrarToast('warning', 'Has completado el límite de intentos permitidos para esta actividad.');
        return;
      }
    }

    this.cuestionarioService.getCuestionario(cuestionarioId).subscribe({
      next: (detalle) => {
        this.cuestionarioActivo.set(detalle);
        this.indicePreguntaActual.set(0);
        this.respuestasAlumno.set({});
        this.modalFeedbackAbierto.set(false);
        this.resultado.set(null);
        if (detalle.preguntas && detalle.preguntas.length > 0) {
          this.inicializarPreguntaActual(detalle.preguntas[0]);
        }
        this.modalActividadAbierto.set(true);
      },
      error: (err) => {
        this.gamification.mostrarToast('error', 'No se pudo abrir el desafío.');
        console.error(err);
      }
    });
  }

  private inicializarPreguntaActual(p?: PreguntaParaResolver): void {
    if (!p) return;

    if (p.tipo === 'ORDENAR') {
      const elementosRaw: any[] = p.payload?.elementos || [];
      const guardado = this.respuestasAlumno()[p.preguntaVersionId];
      if (guardado?.secuencia) {
        this.ordenActual.set([...guardado.secuencia]);
      } else {
        const items = elementosRaw.map(e => typeof e === 'string' ? e : (e.texto || e.id));
        const shuffled = [...items];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        this.ordenActual.set(shuffled);
        this.guardarRespuesta(p.preguntaVersionId, { secuencia: shuffled });
      }
    }

    if (p.tipo === 'EMPAREJAR') {
      const guardado = this.respuestasAlumno()[p.preguntaVersionId];
      this.paresActual.set(guardado?.pares ? { ...guardado.pares } : {});
      this.conceptoSeleccionadoParaEmparejar.set(null);

      const rawDefs: any[] = p.payload?.columnaB || p.payload?.definiciones || [];
      const defs = rawDefs.map((d: any, idx: number) => {
        if (typeof d === 'string') return { id: d, texto: d };
        return { id: d.id || d.texto || `d-${idx}`, texto: d.texto || d.id };
      });

      // Barajar aleatoriamente las definiciones
      const shuffled = [...defs];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      this.definicionesMezcladas.set(shuffled);
    }
  }

  // Selección en Opción Múltiple: {"opcion_seleccionada": "PUT"}
  seleccionarOpcion(opcionTexto: string): void {
    const p = this.preguntaActual();
    if (!p) return;
    this.guardarRespuesta(p.preguntaVersionId, { opcion_seleccionada: opcionTexto });
  }

  estaOpcionSeleccionada(opcionTexto: string): boolean {
    const p = this.preguntaActual();
    if (!p) return false;
    const resp = this.respuestasAlumno()[p.preguntaVersionId];
    return resp?.opcion_seleccionada === opcionTexto;
  }

  // Selección en Verdadero / Falso: {"respuesta": true}
  seleccionarVF(valor: boolean): void {
    const p = this.preguntaActual();
    if (!p) return;
    this.guardarRespuesta(p.preguntaVersionId, { respuesta: valor });
  }

  // Interacción en Ordenar Secuencia: {"secuencia": ["Paso 1", "Paso 2"]}
  moverItem(index: number, direccion: 'UP' | 'DOWN'): void {
    const p = this.preguntaActual();
    if (!p) return;
    const lista = [...this.ordenActual()];
    if (direccion === 'UP' && index > 0) {
      const temp = lista[index];
      lista[index] = lista[index - 1];
      lista[index - 1] = temp;
    } else if (direccion === 'DOWN' && index < lista.length - 1) {
      const temp = lista[index];
      lista[index] = lista[index + 1];
      lista[index + 1] = temp;
    }
    this.ordenActual.set(lista);
    this.guardarRespuesta(p.preguntaVersionId, { secuencia: lista });
  }

  // Interacción en Emparejar Conceptos: {"pares": {"HTML": "Estructura"}}
  seleccionarConcepto(conceptoId: string): void {
    this.conceptoSeleccionadoParaEmparejar.set(
      this.conceptoSeleccionadoParaEmparejar() === conceptoId ? null : conceptoId
    );
  }

  vincularDefinicion(definicionId: string): void {
    const concId = this.conceptoSeleccionadoParaEmparejar();
    const p = this.preguntaActual();
    if (!concId || !p) return;

    const nuevosPares = { ...this.paresActual(), [concId]: definicionId };
    this.paresActual.set(nuevosPares);
    this.guardarRespuesta(p.preguntaVersionId, { pares: nuevosPares });
    this.conceptoSeleccionadoParaEmparejar.set(null);
  }

  desvincularPar(conceptoId: string): void {
    const p = this.preguntaActual();
    if (!p) return;
    const nuevosPares = { ...this.paresActual() };
    delete nuevosPares[conceptoId];
    this.paresActual.set(nuevosPares);
    this.guardarRespuesta(p.preguntaVersionId, { pares: nuevosPares });
  }

  private guardarRespuesta(preguntaVersionId: string, valor: any): void {
    this.respuestasAlumno.update(prev => ({
      ...prev,
      [preguntaVersionId]: valor
    }));
  }

  avanzarPregunta(): void {
    const c = this.cuestionarioActivo();
    if (!c || !c.preguntas) return;

    const siguienteIndex = this.indicePreguntaActual() + 1;
    if (siguienteIndex < c.preguntas.length) {
      this.indicePreguntaActual.set(siguienteIndex);
      this.inicializarPreguntaActual(c.preguntas[siguienteIndex]);
    } else {
      this.entregarCuestionario();
    }
  }

  retrocederPregunta(): void {
    const c = this.cuestionarioActivo();
    if (!c || !c.preguntas) return;
    const anteriorIndex = this.indicePreguntaActual() - 1;
    if (anteriorIndex >= 0) {
      this.indicePreguntaActual.set(anteriorIndex);
      this.inicializarPreguntaActual(c.preguntas[anteriorIndex]);
    }
  }

  // Entregar intento: POST /api/cuestionarios/{id}/intentos
  entregarCuestionario(): void {
    const c = this.cuestionarioActivo();
    if (!c || !c.preguntas) return;

    const respuestas: RespuestaEnvio[] = c.preguntas.map(p => ({
      preguntaVersionId: p.preguntaVersionId,
      respuesta: this.respuestasAlumno()[p.preguntaVersionId] || {}
    }));

    const envio: EnvioIntento = {
      alumnoId: this.cuestionarioService.DEFAULT_ALUMNO_ID,
      respuestas
    };

    this.cuestionarioService.enviarIntento(c.id, envio).subscribe({
      next: (res) => {
        this.resultado.set(res);
        this.modalActividadAbierto.set(false);
        this.modalFeedbackAbierto.set(true);

        if (res.aprobado) {
          this.gamification.recompensarExito(res.monedasGanadas ?? 1);
        } else {
          this.gamification.notificarIntentoFallido(res.intentosRestantes ?? 0);
        }

        this.cargarCatalogo();
      },
      error: (err) => {
        this.gamification.mostrarToast('error', 'Error al entregar las respuestas al servidor.');
        console.error(err);
      }
    });
  }

  cerrarModalActividad(): void {
    this.modalActividadAbierto.set(false);
  }

  cerrarModalFeedback(): void {
    this.modalFeedbackAbierto.set(false);
    this.cuestionarioActivo.set(null);
  }

  reintentarDesafio(): void {
    const res = this.resultado();
    const c = this.cuestionarioActivo();
    if (!c) return;
    if (res && res.intentosRestantes !== undefined && res.intentosRestantes <= 0) {
      this.gamification.mostrarToast('warning', 'No te quedan más intentos disponibles para este cuestionario.');
      return;
    }
    this.cerrarModalFeedback();
    this.iniciarDesafio(c.id);
  }

  getTextoElementoOrden(item: any): string {
    return typeof item === 'string' ? item : (item.texto || item.id);
  }

  getTextoDefinicion(defId: string): string {
    const match = this.definicionesMezcladas().find(d => d.id === defId);
    return match ? match.texto : defId;
  }

  getNombreConcepto(conceptoId: string): string {
    const match = this.conceptosPreguntaActual().find(c => c.id === conceptoId);
    return match ? match.texto : conceptoId;
  }

  estaDefinicionAsignada(defId: string): boolean {
    const pares = this.paresActual();
    return Object.values(pares).includes(defId);
  }
}
