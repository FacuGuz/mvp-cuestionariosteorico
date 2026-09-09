import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CuestionarioService } from '../../../core/services/cuestionario.service';
import { GamificationService } from '../../../core/services/gamification.service';
import {
  TipoPregunta,
  CrearPreguntaDto,
  CrearCuestionarioDto,
  CuestionarioResumen,
  CuestionarioDetalle
} from '../../../core/models/cuestionario.model';

interface DraftOpcion {
  id: string;
  texto: string;
  esCorrecta: boolean;
  porcentaje?: number;
}

interface DraftItemOrden {
  id: string;
  texto: string;
}

interface DraftPareja {
  id: string;
  concepto: string;
  definicion: string;
}

@Component({
  selector: 'app-cuestionario-creator',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cuestionario-creator.component.html',
  styleUrls: ['./cuestionario-creator.component.css']
})
export class CuestionarioCreatorComponent implements OnInit {
  protected readonly cuestionarioService = inject(CuestionarioService);
  protected readonly gamification = inject(GamificationService);

  tabActiva = signal<'CREADOR' | 'LISTA'>('CREADOR');
  cuestionariosBackend = signal<CuestionarioResumen[]>([]);
  isLoadingList = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);

  cuestionarioEditandoId = signal<string | null>(null);

  terminoBusqueda = signal<string>('');
  filtroCurso = signal<string>('TODOS');

  titulo = 'Evaluación de JavaScript Moderno y Web';
  descripcion = 'Cuestionario sobre ES6+, promesas, llamadas REST y flujo de procesamiento en la arquitectura.';
  cursoNombre = 'Arquitectura de Software y Spring Boot (Cohorte 2026)';
  cursosDisponibles = [
    'Arquitectura de Software y Spring Boot (Cohorte 2026)',
    'Introducción a la Programación (Comisión 101)',
    'Algoritmos y Estructuras de Datos (Comisión 204)',
    'Diseño de Bases de Datos (Comisión 105)'
  ];

  duracionMinutos = 15;
  dificultad: 'Básica' | 'Intermedia' | 'Avanzada' = 'Intermedia';
  intentosPermitidos: number = 3;
  obligatorio = true;

  preguntas = signal<CrearPreguntaDto[]>([
    {
      tipo: 'OPCION_MULTIPLE',
      enunciado: '¿Qué método HTTP se recomienda utilizar para una operación idempotente que actualiza completamente un recurso en una API REST?',
      orden: 1,
      puntaje: 25,
      payload: { opciones: ['POST', 'PUT', 'PATCH', 'DELETE'] },
      criterio: { opcion_correcta: 'PUT' }
    },
    {
      tipo: 'VERDADERO_FALSO',
      enunciado: 'En Spring Boot, el componente DispatcherServlet es el Front Controller central que intercepta todas las peticiones HTTP.',
      orden: 2,
      puntaje: 25,
      payload: { opciones: [true, false] },
      criterio: { respuesta_correcta: true }
    }
  ]);

  tipoSeleccionado: TipoPregunta = 'OPCION_MULTIPLE';
  enunciadoPregunta = '';
  puntajePregunta: number = 25;

  opcionesMultiples: DraftOpcion[] = [
    { id: '1', texto: 'POST', esCorrecta: false, porcentaje: 0 },
    { id: '2', texto: 'PUT', esCorrecta: true, porcentaje: 100 },
    { id: '3', texto: 'PATCH', esCorrecta: false, porcentaje: 0 },
    { id: '4', texto: 'DELETE', esCorrecta: false, porcentaje: 0 }
  ];
  opcionCorrectaIndex: number = 1;
  opcionCorrectaUnica: string = '2';
  esMultipleRespuesta: boolean = false;

  solucionVF: boolean = true;

  itemsOrdenar: DraftItemOrden[] = [
    { id: 'step-1', texto: 'Filtro de Seguridad / Servlet Filter' },
    { id: 'step-2', texto: 'DispatcherServlet' },
    { id: 'step-3', texto: 'HandlerInterceptor' },
    { id: 'step-4', texto: 'RestController' }
  ];

  parejasEmparejar: DraftPareja[] = [
    { id: 'p1', concepto: '@RestController', definicion: 'Expone endpoints HTTP y serializa respuestas' },
    { id: 'p2', concepto: '@Service', definicion: 'Define la lógica de negocio' },
    { id: 'p3', concepto: '@Repository', definicion: 'Acceso y persistencia a la base de datos' },
    { id: 'p4', concepto: '@Configuration', definicion: 'Declara beans y configuraciones de Spring' }
  ];

  puntajeTotalAcumulado = computed(() =>
    this.preguntas().reduce((acc, curr) => acc + (Number(curr.puntaje) || 0), 0)
  );

  get puntajeAcumulado(): number {
    return this.puntajeTotalAcumulado();
  }

  get porcentajePreguntaEnCuestionario(): number {
    const total = this.puntajeTotalAcumulado() + (Number(this.puntajePregunta) || 0);
    if (total === 0) return 0;
    return Math.round(((Number(this.puntajePregunta) || 0) / total) * 100);
  }

  get sumaPorcentajesOpciones(): number {
    return this.opcionesMultiples.reduce((acc, curr) => acc + (curr.esCorrecta ? (Number(curr.porcentaje) || 0) : 0), 0);
  }

  cursosUnicos = computed(() => {
    const list = this.cuestionariosBackend();
    const set = new Set<string>();
    list.forEach(c => { if (c.cursoNombre) set.add(c.cursoNombre); });
    return Array.from(set);
  });

  cuestionariosFiltrados = computed(() => {
    const term = this.terminoBusqueda().toLowerCase().trim();
    const curso = this.filtroCurso();
    return this.cuestionariosBackend().filter(c => {
      const matchTerm = !term ||
        c.titulo.toLowerCase().includes(term) ||
        c.descripcion.toLowerCase().includes(term) ||
        (c.cursoNombre && c.cursoNombre.toLowerCase().includes(term));
      const matchCurso = curso === 'TODOS' || c.cursoNombre === curso;
      return matchTerm && matchCurso;
    });
  });

  totalPuntajeEnBackend = computed(() =>
    this.cuestionariosBackend().reduce((acc, c) => acc + (c.puntajeTotal || 0), 0)
  );

  totalPreguntasEnBackend = computed(() =>
    this.cuestionariosBackend().reduce((acc, c) => acc + (c.cantidadPreguntas || 0), 0)
  );

  ngOnInit(): void {
    this.cargarCuestionariosBackend();
  }

  cargarCuestionariosBackend(): void {
    this.isLoadingList.set(true);
    this.cuestionarioService.getCuestionarios(false).subscribe({
      next: (list) => {
        this.cuestionariosBackend.set(list);
        this.isLoadingList.set(false);
      },
      error: (err) => {
        console.error('Error al cargar cuestionarios del backend', err);
        this.isLoadingList.set(false);
      }
    });
  }

  toggleActivarDesactivar(c: CuestionarioResumen): void {
    if (c.activo) {
      this.cuestionarioService.desactivarCuestionario(c.id).subscribe({
        next: () => {
          this.gamification.mostrarToast('warning', `Cuestionario "${c.titulo}" desactivado (baja lógica).`);
          this.cargarCuestionariosBackend();
        },
        error: (err) => {
          this.gamification.mostrarToast('error', 'Error al desactivar cuestionario.');
          console.error(err);
        }
      });
    } else {
      this.cuestionarioService.activarCuestionario(c.id).subscribe({
        next: () => {
          this.gamification.mostrarToast('success', `Cuestionario "${c.titulo}" reactivado con éxito.`);
          this.cargarCuestionariosBackend();
        },
        error: (err) => {
          this.gamification.mostrarToast('error', 'Error al reactivar cuestionario.');
          console.error(err);
        }
      });
    }
  }

  cargarEnDisenador(id: string): void {
    this.cuestionarioService.getCuestionario(id).subscribe({
      next: (c: CuestionarioDetalle) => {
        this.cuestionarioEditandoId.set(c.id);
        this.titulo = c.titulo;
        this.descripcion = c.descripcion;
        this.cursoNombre = c.cursoNombre || this.cursoNombre;
        this.duracionMinutos = c.duracionMinutos || 15;
        this.dificultad = c.dificultad || 'Intermedia';
        this.intentosPermitidos = c.intentosPermitidos || 3;
        this.obligatorio = c.obligatorio ?? true;

        if (c.preguntas && c.preguntas.length > 0) {
          this.preguntas.set(c.preguntas.map((p, idx) => ({
            tipo: p.tipo,
            enunciado: p.enunciado,
            orden: p.orden || idx + 1,
            puntaje: p.puntaje,
            payload: p.payload,
            criterio: {}
          })));
        }

        this.tabActiva.set('CREADOR');
        this.gamification.mostrarToast('info', `Modo edición activado: "${c.titulo}". Al guardar se creará una versión inmutable con nuevo ID.`);
      },
      error: (err) => {
        this.gamification.mostrarToast('error', 'No se pudo cargar el cuestionario para editar.');
        console.error(err);
      }
    });
  }

  cancelarEdicion(): void {
    this.cuestionarioEditandoId.set(null);
    this.titulo = 'Nuevo Desafío Teórico';
    this.descripcion = '';
    this.preguntas.set([]);
    this.gamification.mostrarToast('info', 'Modo edición cancelado.');
  }

  distribuirEquitativamente(): void {
    const correctas = this.opcionesMultiples.filter(o => o.esCorrecta);
    if (correctas.length === 0) {
      if (this.opcionesMultiples.length > 0) {
        this.opcionesMultiples[0].esCorrecta = true;
      }
    }
    const actCorrectas = this.opcionesMultiples.filter(o => o.esCorrecta);
    if (actCorrectas.length === 0) return;
    const pct = Math.floor(100 / actCorrectas.length);
    const resto = 100 - (pct * actCorrectas.length);
    actCorrectas.forEach((op, idx) => {
      op.porcentaje = pct + (idx === 0 ? resto : 0);
    });
  }

  ajustarRestante(): void {
    const correctas = this.opcionesMultiples.filter(o => o.esCorrecta);
    if (correctas.length === 0) return;
    const totalPrevio = correctas.slice(0, -1).reduce((acc, curr) => acc + (Number(curr.porcentaje) || 0), 0);
    correctas[correctas.length - 1].porcentaje = Math.max(0, 100 - totalPrevio);
  }

  seleccionarUnicaCorrecta(id: string): void {
    this.opcionCorrectaUnica = id;
    this.opcionesMultiples.forEach((op, idx) => {
      op.esCorrecta = (op.id === id);
      if (op.esCorrecta) {
        this.opcionCorrectaIndex = idx;
        op.porcentaje = 100;
      } else {
        op.porcentaje = 0;
      }
    });
  }

  toggleOpcionMultipleCorrecta(op: DraftOpcion): void {
    op.esCorrecta = !op.esCorrecta;
    if (!op.esCorrecta) {
      op.porcentaje = 0;
    } else {
      this.distribuirEquitativamente();
    }
  }

  agregarOpcion(): void {
    const num = this.opcionesMultiples.length + 1;
    this.opcionesMultiples.push({
      id: `${num}`,
      texto: `Opción ${num}`,
      esCorrecta: false,
      porcentaje: 0
    });
  }

  eliminarOpcion(index: number): void {
    if (this.opcionesMultiples.length > 2) {
      const eliminada = this.opcionesMultiples.splice(index, 1)[0];
      if (this.opcionCorrectaUnica === eliminada.id && this.opcionesMultiples.length > 0) {
        this.opcionCorrectaUnica = this.opcionesMultiples[0].id;
        this.opcionesMultiples[0].esCorrecta = true;
      }
      if (this.esMultipleRespuesta) {
        this.distribuirEquitativamente();
      }
    }
  }

  agregarOpcionMultiple(): void {
    this.agregarOpcion();
  }

  eliminarOpcionMultiple(index: number): void {
    this.eliminarOpcion(index);
  }

  marcarOpcionCorrecta(index: number): void {
    this.opcionCorrectaIndex = index;
    if (this.opcionesMultiples[index]) {
      this.seleccionarUnicaCorrecta(this.opcionesMultiples[index].id);
    }
  }

  agregarItemOrdenar(): void {
    const num = this.itemsOrdenar.length + 1;
    this.itemsOrdenar.push({
      id: `step-${num}`,
      texto: `Paso ${num}`
    });
  }

  eliminarItemOrdenar(index: number): void {
    if (this.itemsOrdenar.length > 2) {
      this.itemsOrdenar.splice(index, 1);
    }
  }

  moverItemOrdenar(index: number, direccion: 'UP' | 'DOWN'): void {
    if (direccion === 'UP' && index > 0) {
      const temp = this.itemsOrdenar[index];
      this.itemsOrdenar[index] = this.itemsOrdenar[index - 1];
      this.itemsOrdenar[index - 1] = temp;
    } else if (direccion === 'DOWN' && index < this.itemsOrdenar.length - 1) {
      const temp = this.itemsOrdenar[index];
      this.itemsOrdenar[index] = this.itemsOrdenar[index + 1];
      this.itemsOrdenar[index + 1] = temp;
    }
  }

  agregarPareja(): void {
    const num = this.parejasEmparejar.length + 1;
    this.parejasEmparejar.push({
      id: `p${num}`,
      concepto: `Concepto ${num}`,
      definicion: `Definición ${num}`
    });
  }

  eliminarPareja(index: number): void {
    if (this.parejasEmparejar.length > 2) {
      this.parejasEmparejar.splice(index, 1);
    }
  }

  agregarPregunta(): void {
    if (!this.enunciadoPregunta.trim()) {
      this.gamification.mostrarToast('warning', 'Ingresa el enunciado');
      return;
    }

    let payload: any = {};
    let criterio: any = {};

    switch (this.tipoSeleccionado) {
      case 'OPCION_MULTIPLE': {
        const opcionesTexto = this.opcionesMultiples.map(o => o.texto.trim());
        let correctaTexto = '';
        if (!this.esMultipleRespuesta) {
          const op = this.opcionesMultiples.find(o => o.id === this.opcionCorrectaUnica);
          correctaTexto = op ? op.texto.trim() : (this.opcionesMultiples[0]?.texto?.trim() || opcionesTexto[0]);
        } else {
          const correctas = this.opcionesMultiples.filter(o => o.esCorrecta);
          const ordenadas = [...correctas].sort((a, b) => (b.porcentaje || 0) - (a.porcentaje || 0));
          correctaTexto = ordenadas[0]?.texto?.trim() || opcionesTexto[0];
        }
        payload = { opciones: opcionesTexto };
        criterio = { opcion_correcta: correctaTexto };
        break;
      }

      case 'VERDADERO_FALSO': {
        payload = { opciones: [true, false] };
        criterio = { respuesta_correcta: this.solucionVF };
        break;
      }

      case 'ORDENAR': {
        const elementos = this.itemsOrdenar.map(i => i.texto.trim());
        payload = { elementos };
        criterio = { secuencia_correcta: elementos };
        break;
      }

      case 'EMPAREJAR': {
        const columnaA = this.parejasEmparejar.map(p => p.concepto.trim());
        const columnaB = this.parejasEmparejar.map(p => p.definicion.trim());
        const pares: Record<string, string> = {};
        this.parejasEmparejar.forEach(p => {
          pares[p.concepto.trim()] = p.definicion.trim();
        });
        payload = { columnaA, columnaB };
        criterio = { pares_correctos: pares };
        break;
      }
    }

    const nuevaPreg: CrearPreguntaDto = {
      tipo: this.tipoSeleccionado,
      enunciado: this.enunciadoPregunta.trim(),
      puntaje: Number(this.puntajePregunta),
      orden: this.preguntas().length + 1,
      payload,
      criterio
    };

    this.preguntas.update(prev => [...prev, nuevaPreg]);
    this.gamification.mostrarToast('success', `✓ Pregunta añadida (${this.puntajePregunta} pts)`);

    this.enunciadoPregunta = '';
  }

  eliminarPreguntaConfigurada(index: number): void {
    this.preguntas.update(prev => prev.filter((_, i) => i !== index));
    this.gamification.mostrarToast('info', 'Pregunta eliminada');
  }

  moverPregunta(index: number, direccion: 'UP' | 'DOWN'): void {
    this.preguntas.update(prev => {
      const arr = [...prev];
      if (direccion === 'UP' && index > 0) {
        const temp = arr[index];
        arr[index] = arr[index - 1];
        arr[index - 1] = temp;
      } else if (direccion === 'DOWN' && index < arr.length - 1) {
        const temp = arr[index];
        arr[index] = arr[index + 1];
        arr[index + 1] = temp;
      }
      return arr.map((p, i) => ({ ...p, orden: i + 1 }));
    });
  }

  mezclarPreguntas(): void {
    if (this.preguntas().length <= 1) {
      this.gamification.mostrarToast('info', 'Agrega al menos 2 preguntas para mezclar.');
      return;
    }
    const arr = [...this.preguntas()];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    const reordenadas = arr.map((p, idx) => ({ ...p, orden: idx + 1 }));
    this.preguntas.set(reordenadas);
    this.gamification.mostrarToast('info', '🔀 Preguntas reorganizadas en orden aleatorio');
  }

  publicarCuestionario(): void {
    if (!this.titulo.trim()) {
      this.gamification.mostrarToast('error', 'El cuestionario debe tener un título.');
      return;
    }

    if (this.preguntas().length === 0) {
      this.gamification.mostrarToast('error', 'Debes añadir al menos una pregunta al cuestionario.');
      return;
    }

    this.isSubmitting.set(true);

    const dto: CrearCuestionarioDto = {
      desafioId: this.cuestionarioService.DEFAULT_DESAFIO_ID,
      cursoCohorteId: this.cuestionarioService.DEFAULT_CURSO_ID,
      profesorId: this.cuestionarioService.DEFAULT_PROFESOR_ID,
      titulo: this.titulo.trim(),
      descripcion: this.descripcion.trim(),
      cursoNombre: this.cursoNombre,
      duracionMinutos: this.duracionMinutos,
      dificultad: this.dificultad,
      intentosPermitidos: this.intentosPermitidos,
      obligatorio: this.obligatorio,
      preguntas: this.preguntas().map((p, idx) => ({
        tipo: p.tipo,
        enunciado: p.enunciado,
        orden: p.orden || idx + 1,
        puntaje: Number(p.puntaje) || 25,
        payload: p.payload,
        criterio: p.criterio
      }))
    };

    const editandoId = this.cuestionarioEditandoId();
    const request$ = editandoId
      ? this.cuestionarioService.editarCuestionario(editandoId, dto)
      : this.cuestionarioService.crearCuestionario(dto);

    request$.subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        this.cuestionarioEditandoId.set(null);
        this.gamification.mostrarToast(
          'success',
          editandoId
            ? `✓ Cuestionario editado inmutablemente (Nuevo ID: ${res.id.substring(0, 8)}...)`
            : `🎯 ¡Cuestionario publicado exitosamente en el backend!`
        );
        this.cargarCuestionariosBackend();
        this.tabActiva.set('LISTA');
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.gamification.mostrarToast('error', 'Error al guardar cuestionario en el servidor.');
        console.error(err);
      }
    });
  }

  probarComoAlumno(id: string): void {
    this.gamification.setRol('ALUMNO');
  }

  getTipoNombre(tipo: TipoPregunta): string {
    switch (tipo) {
      case 'OPCION_MULTIPLE': return 'Opción Múltiple';
      case 'VERDADERO_FALSO': return 'Verdadero / Falso';
      case 'ORDENAR': return 'Ordenar Secuencia';
      case 'EMPAREJAR': return 'Emparejar Conceptos';
    }
  }
}
