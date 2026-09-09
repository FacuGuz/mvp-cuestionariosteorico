import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import {
  CuestionarioResumen,
  CuestionarioDetalle,
  CrearCuestionarioDto,
  EnvioIntento,
  ResultadoCorreccion,
  DetalleCorreccion,
  PreguntaParaResolver,
  ApiCallLog
} from '../models/cuestionario.model';

@Injectable({
  providedIn: 'root'
})
export class CuestionarioService {
  private readonly apiUrl = 'http://localhost:8080/api/cuestionarios';

  // UUIDs mockeados de referencia según la guía
  readonly DEFAULT_PROFESOR_ID = '11111111-1111-1111-1111-111111111111';
  readonly DEFAULT_DESAFIO_ID = '22222222-2222-2222-2222-222222222222';
  readonly DEFAULT_CURSO_ID = '33333333-3333-3333-3333-333333333333';
  readonly DEFAULT_ALUMNO_ID = '44444444-4444-4444-4444-444444444444';

  // Estado de conexión y modo
  readonly backendOnline = signal<boolean>(true);
  readonly forceMockMode = signal<boolean>(false); // Prioriza la conexión con Spring Boot

  // Historial de llamadas API para el inspector/modal
  readonly apiLogs = signal<ApiCallLog[]>([]);
  readonly modalApiLogsAbierto = signal<boolean>(false);

  // Store local para fallback autónomo
  private mockStore: (CuestionarioDetalle & { criterioPreguntas?: Record<string, any> })[] = [];

  constructor(private readonly http: HttpClient) {
    this.inicializarMockStore();
  }

  private inicializarMockStore(): void {
    const guardados = localStorage.getItem('mvp_cuestionarios_store_v2');
    if (guardados) {
      try {
        this.mockStore = JSON.parse(guardados);
        return;
      } catch (e) {
        console.warn('Error al parsear store local, reiniciando mock', e);
      }
    }
    this.mockStore = this.getMockCuestionariosIniciales();
    this.guardarEnStorage();
  }

  private guardarEnStorage(): void {
    localStorage.setItem('mvp_cuestionarios_store_v2', JSON.stringify(this.mockStore));
  }

  private registrarLlamadaLog(log: Omit<ApiCallLog, 'id' | 'timestamp'>): void {
    const nuevoLog: ApiCallLog = {
      ...log,
      id: 'log-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      timestamp: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    };
    this.apiLogs.update(prev => [nuevoLog, ...prev]);
  }

  limpiarHistorialLogs(): void {
    this.apiLogs.set([]);
  }

  abrirModalLogs(): void {
    this.modalApiLogsAbierto.set(true);
  }

  cerrarModalLogs(): void {
    this.modalApiLogsAbierto.set(false);
  }

  toggleForceMockMode(): void {
    this.forceMockMode.update(v => !v);
  }

  /**
   * Helper para enriquecer cuestionarios con metadatos visuales si no vienen del back
   */
  private enriquecerResumen(r: CuestionarioResumen, idx: number = 0): CuestionarioResumen {
    return {
      ...r,
      cursoNombre: r.cursoNombre || (r.cursoCohorteId === this.DEFAULT_CURSO_ID
        ? 'Arquitectura de Software y Spring Boot (Cohorte 2026)'
        : 'Programación Avanzada - Comisión 101'),
      desafioNumero: r.desafioNumero || `DESAFÍO 0${idx + 1}`,
      duracionMinutos: r.duracionMinutos || 15,
      dificultad: r.dificultad || (idx % 2 === 0 ? 'Intermedia' : 'Avanzada'),
      obligatorio: r.obligatorio ?? true,
      intentosPermitidos: r.intentosPermitidos || 3,
      intentosRealizados: r.intentosRealizados || 0
    };
  }

  private convertirDetalleAResumen(d: CuestionarioDetalle, idx: number = 0): CuestionarioResumen {
    const resumen: CuestionarioResumen = {
      id: d.id,
      desafioId: d.desafioId,
      cursoCohorteId: d.cursoCohorteId,
      titulo: d.titulo,
      descripcion: d.descripcion,
      cantidadPreguntas: d.preguntas ? d.preguntas.length : 0,
      puntajeTotal: d.puntajeTotal || (d.preguntas ? d.preguntas.reduce((acc, p) => acc + (Number(p.puntaje) || 0), 0) : 0),
      activo: d.activo,
      cursoNombre: d.cursoNombre,
      desafioNumero: d.desafioNumero,
      duracionMinutos: d.duracionMinutos,
      dificultad: d.dificultad,
      obligatorio: d.obligatorio,
      intentosPermitidos: d.intentosPermitidos,
      intentosRealizados: d.intentosRealizados
    };
    return this.enriquecerResumen(resumen, idx);
  }

  private enriquecerDetalle(d: CuestionarioDetalle): CuestionarioDetalle {
    return {
      ...d,
      cursoNombre: d.cursoNombre || (d.cursoCohorteId === this.DEFAULT_CURSO_ID
        ? 'Arquitectura de Software y Spring Boot (Cohorte 2026)'
        : 'Programación Avanzada - Comisión 101'),
      desafioNumero: d.desafioNumero || 'DESAFÍO 01',
      duracionMinutos: d.duracionMinutos || 15,
      dificultad: d.dificultad || 'Intermedia',
      obligatorio: d.obligatorio ?? true,
      intentosPermitidos: d.intentosPermitidos || 3,
      intentosRealizados: d.intentosRealizados || 0
    };
  }

  // =========================================================================
  // 3.1. LISTAR CUESTIONARIOS: GET /api/cuestionarios (?soloActivos=true)
  // =========================================================================
  getCuestionarios(soloActivos: boolean = false): Observable<CuestionarioResumen[]> {
    const t0 = performance.now();
    const endpoint = soloActivos ? `${this.apiUrl}?soloActivos=true` : this.apiUrl;
    const urlLog = soloActivos ? '/api/cuestionarios?soloActivos=true' : '/api/cuestionarios';

    if (this.forceMockMode()) {
      const list = this.mockStore
        .filter(c => !soloActivos || c.activo)
        .map((c, i) => this.convertirDetalleAResumen(c, i));

      this.registrarLlamadaLog({
        metodo: 'GET',
        url: urlLog,
        status: 200,
        statusText: 'OK (Mock Store)',
        origen: 'MOCK_AUTONOMO',
        duracionMs: Math.round(performance.now() - t0),
        response: list
      });
      return of(list);
    }

    return this.http.get<CuestionarioResumen[]>(endpoint).pipe(
      map(list => list.map((c, i) => this.enriquecerResumen(c, i))),
      tap(res => {
        this.backendOnline.set(true);
        this.registrarLlamadaLog({
          metodo: 'GET',
          url: urlLog,
          status: 200,
          statusText: 'OK',
          origen: 'SPRING_BOOT',
          duracionMs: Math.round(performance.now() - t0),
          response: res
        });
      }),
      catchError(err => {
        this.backendOnline.set(false);
        const list = this.mockStore
          .filter(c => !soloActivos || c.activo)
          .map((c, i) => this.convertirDetalleAResumen(c, i));

        this.registrarLlamadaLog({
          metodo: 'GET',
          url: urlLog,
          status: err.status || 0,
          statusText: 'Fallback Local (' + (err.statusText || 'Offline') + ')',
          origen: 'MOCK_AUTONOMO',
          duracionMs: Math.round(performance.now() - t0),
          response: list
        });
        return of(list);
      })
    );
  }

  // =========================================================================
  // 3.2. OBTENER DETALLE: GET /api/cuestionarios/{id}
  // =========================================================================
  getCuestionario(id: string): Observable<CuestionarioDetalle> {
    const t0 = performance.now();
    const local = this.mockStore.find(c => c.id === id);

    if (this.forceMockMode()) {
      if (local) {
        const enriched = this.enriquecerDetalle(local);
        this.registrarLlamadaLog({
          metodo: 'GET',
          url: `/api/cuestionarios/${id}`,
          status: 200,
          statusText: 'OK (Mock Store)',
          origen: 'MOCK_AUTONOMO',
          duracionMs: Math.round(performance.now() - t0),
          response: enriched
        });
        return of(enriched);
      }
      return throwError(() => new Error('Cuestionario no encontrado en Mock'));
    }

    return this.http.get<CuestionarioDetalle>(`${this.apiUrl}/${id}`).pipe(
      map(detalle => this.enriquecerDetalle(detalle)),
      tap(res => {
        this.backendOnline.set(true);
        this.registrarLlamadaLog({
          metodo: 'GET',
          url: `/api/cuestionarios/${id}`,
          status: 200,
          statusText: 'OK',
          origen: 'SPRING_BOOT',
          duracionMs: Math.round(performance.now() - t0),
          response: res
        });
      }),
      catchError(err => {
        this.backendOnline.set(false);
        if (local) {
          const enriched = this.enriquecerDetalle(local);
          this.registrarLlamadaLog({
            metodo: 'GET',
            url: `/api/cuestionarios/${id}`,
            status: err.status || 0,
            statusText: 'Fallback Local (' + (err.statusText || 'Offline') + ')',
            origen: 'MOCK_AUTONOMO',
            duracionMs: Math.round(performance.now() - t0),
            response: enriched
          });
          return of(enriched);
        }
        return throwError(() => new Error('Cuestionario no encontrado'));
      })
    );
  }

  // =========================================================================
  // 3.3. ENVIAR INTENTO DE RESOLUCIÓN: POST /api/cuestionarios/{id}/intentos
  // =========================================================================
  enviarIntento(cuestionarioId: string, envio: EnvioIntento): Observable<ResultadoCorreccion> {
    const t0 = performance.now();

    if (this.forceMockMode()) {
      const res = this.evaluarIntentoMock(cuestionarioId, envio);
      this.registrarLlamadaLog({
        metodo: 'POST',
        url: `/api/cuestionarios/${cuestionarioId}/intentos`,
        status: 200,
        statusText: 'OK Evaluado (Mock)',
        origen: 'MOCK_AUTONOMO',
        duracionMs: Math.round(performance.now() - t0),
        payload: envio,
        response: res
      });
      return of(res);
    }

    return this.http.post<ResultadoCorreccion>(`${this.apiUrl}/${cuestionarioId}/intentos`, envio).pipe(
      map(res => {
        // Asignar helpers frontend si no vienen del back
        const totalPermitidos = 3;
        const restantes = Math.max(0, totalPermitidos - res.intento);
        return {
          ...res,
          intentosPermitidos: totalPermitidos,
          intentosRestantes: restantes,
          monedasGanadas: res.aprobado ? 1 : 0
        };
      }),
      tap(res => {
        this.backendOnline.set(true);
        this.registrarLlamadaLog({
          metodo: 'POST',
          url: `/api/cuestionarios/${cuestionarioId}/intentos`,
          status: 200,
          statusText: 'OK Evaluado',
          origen: 'SPRING_BOOT',
          duracionMs: Math.round(performance.now() - t0),
          payload: envio,
          response: res
        });
      }),
      catchError(err => {
        this.backendOnline.set(false);
        const res = this.evaluarIntentoMock(cuestionarioId, envio);
        this.registrarLlamadaLog({
          metodo: 'POST',
          url: `/api/cuestionarios/${cuestionarioId}/intentos`,
          status: err.status || 0,
          statusText: 'Evaluado Localmente (' + (err.statusText || 'Offline') + ')',
          origen: 'MOCK_AUTONOMO',
          duracionMs: Math.round(performance.now() - t0),
          payload: envio,
          response: res
        });
        return of(res);
      })
    );
  }

  // =========================================================================
  // 3.4. CREAR CUESTIONARIO NUEVO: POST /api/cuestionarios
  // =========================================================================
  crearCuestionario(dto: CrearCuestionarioDto): Observable<CuestionarioResumen> {
    const t0 = performance.now();
    const payloadBackend = {
      desafioId: dto.desafioId || this.DEFAULT_DESAFIO_ID,
      cursoCohorteId: dto.cursoCohorteId || this.DEFAULT_CURSO_ID,
      profesorId: dto.profesorId || this.DEFAULT_PROFESOR_ID,
      titulo: dto.titulo,
      descripcion: dto.descripcion,
      preguntas: dto.preguntas.map(p => ({
        tipo: p.tipo,
        enunciado: p.enunciado,
        orden: p.orden,
        puntaje: p.puntaje,
        payload: p.payload,
        criterio: p.criterio
      }))
    };

    if (this.forceMockMode()) {
      const resumen = this.crearCuestionarioEnMock(payloadBackend, dto);
      this.registrarLlamadaLog({
        metodo: 'POST',
        url: '/api/cuestionarios',
        status: 201,
        statusText: 'Created (Mock Store)',
        origen: 'MOCK_AUTONOMO',
        duracionMs: Math.round(performance.now() - t0),
        payload: payloadBackend,
        response: resumen
      });
      return of(resumen);
    }

    return this.http.post<CuestionarioResumen>(this.apiUrl, payloadBackend).pipe(
      map((res, i) => this.enriquecerResumen(res, i)),
      tap(res => {
        this.backendOnline.set(true);
        this.registrarLlamadaLog({
          metodo: 'POST',
          url: '/api/cuestionarios',
          status: 201,
          statusText: 'Created',
          origen: 'SPRING_BOOT',
          duracionMs: Math.round(performance.now() - t0),
          payload: payloadBackend,
          response: res
        });
      }),
      catchError(err => {
        this.backendOnline.set(false);
        const resumen = this.crearCuestionarioEnMock(payloadBackend, dto);
        this.registrarLlamadaLog({
          metodo: 'POST',
          url: '/api/cuestionarios',
          status: err.status || 0,
          statusText: 'Guardado Local (' + (err.statusText || 'Offline') + ')',
          origen: 'MOCK_AUTONOMO',
          duracionMs: Math.round(performance.now() - t0),
          payload: payloadBackend,
          response: resumen
        });
        return of(resumen);
      })
    );
  }

  // =========================================================================
  // 3.5. EDITAR CUESTIONARIO (INMUTABLE): PUT /api/cuestionarios/{id}
  // =========================================================================
  editarCuestionario(id: string, dto: CrearCuestionarioDto): Observable<CuestionarioResumen> {
    const t0 = performance.now();
    const payloadBackend = {
      desafioId: dto.desafioId || this.DEFAULT_DESAFIO_ID,
      cursoCohorteId: dto.cursoCohorteId || this.DEFAULT_CURSO_ID,
      profesorId: dto.profesorId || this.DEFAULT_PROFESOR_ID,
      titulo: dto.titulo,
      descripcion: dto.descripcion,
      preguntas: dto.preguntas.map(p => ({
        tipo: p.tipo,
        enunciado: p.enunciado,
        orden: p.orden,
        puntaje: p.puntaje,
        payload: p.payload,
        criterio: p.criterio
      }))
    };

    if (this.forceMockMode()) {
      // Inactivar original y crear nuevo
      const original = this.mockStore.find(c => c.id === id);
      if (original) original.activo = false;
      const nuevo = this.crearCuestionarioEnMock(payloadBackend, dto);
      this.guardarEnStorage();

      this.registrarLlamadaLog({
        metodo: 'PUT',
        url: `/api/cuestionarios/${id}`,
        status: 201,
        statusText: 'Created (Edición Inmutable Mock)',
        origen: 'MOCK_AUTONOMO',
        duracionMs: Math.round(performance.now() - t0),
        payload: payloadBackend,
        response: nuevo
      });
      return of(nuevo);
    }

    return this.http.put<CuestionarioResumen>(`${this.apiUrl}/${id}`, payloadBackend).pipe(
      map((res, i) => this.enriquecerResumen(res, i)),
      tap(res => {
        this.backendOnline.set(true);
        this.registrarLlamadaLog({
          metodo: 'PUT',
          url: `/api/cuestionarios/${id}`,
          status: 201,
          statusText: 'Created (Edición Inmutable)',
          origen: 'SPRING_BOOT',
          duracionMs: Math.round(performance.now() - t0),
          payload: payloadBackend,
          response: res
        });
      }),
      catchError(err => {
        this.backendOnline.set(false);
        const original = this.mockStore.find(c => c.id === id);
        if (original) original.activo = false;
        const nuevo = this.crearCuestionarioEnMock(payloadBackend, dto);
        this.guardarEnStorage();

        this.registrarLlamadaLog({
          metodo: 'PUT',
          url: `/api/cuestionarios/${id}`,
          status: err.status || 0,
          statusText: 'Edición Local Inmutable (' + (err.statusText || 'Offline') + ')',
          origen: 'MOCK_AUTONOMO',
          duracionMs: Math.round(performance.now() - t0),
          payload: payloadBackend,
          response: nuevo
        });
        return of(nuevo);
      })
    );
  }

  // =========================================================================
  // 3.6. DESACTIVAR: PATCH /api/cuestionarios/{id}/desactivar
  // =========================================================================
  desactivarCuestionario(id: string): Observable<CuestionarioResumen> {
    const t0 = performance.now();

    if (this.forceMockMode()) {
      const item = this.mockStore.find(c => c.id === id);
      if (item) item.activo = false;
      this.guardarEnStorage();
      const res = item ? this.convertirDetalleAResumen(item) : { id, titulo: '', descripcion: '', activo: false, cantidadPreguntas: 0, puntajeTotal: 0, desafioId: '', cursoCohorteId: '' };

      this.registrarLlamadaLog({
        metodo: 'PATCH',
        url: `/api/cuestionarios/${id}/desactivar`,
        status: 200,
        statusText: 'OK (Desactivado en Mock)',
        origen: 'MOCK_AUTONOMO',
        duracionMs: Math.round(performance.now() - t0),
        response: res
      });
      return of(res);
    }

    return this.http.patch<CuestionarioResumen>(`${this.apiUrl}/${id}/desactivar`, {}).pipe(
      map(res => this.enriquecerResumen(res)),
      tap(res => {
        this.backendOnline.set(true);
        this.registrarLlamadaLog({
          metodo: 'PATCH',
          url: `/api/cuestionarios/${id}/desactivar`,
          status: 200,
          statusText: 'OK (Desactivado)',
          origen: 'SPRING_BOOT',
          duracionMs: Math.round(performance.now() - t0),
          response: res
        });
      }),
      catchError(err => {
        this.backendOnline.set(false);
        const item = this.mockStore.find(c => c.id === id);
        if (item) item.activo = false;
        this.guardarEnStorage();
        const res = item ? this.convertirDetalleAResumen(item) : { id, titulo: '', descripcion: '', activo: false, cantidadPreguntas: 0, puntajeTotal: 0, desafioId: '', cursoCohorteId: '' };

        this.registrarLlamadaLog({
          metodo: 'PATCH',
          url: `/api/cuestionarios/${id}/desactivar`,
          status: err.status || 0,
          statusText: 'Fallback Desactivar (' + (err.statusText || 'Offline') + ')',
          origen: 'MOCK_AUTONOMO',
          duracionMs: Math.round(performance.now() - t0),
          response: res
        });
        return of(res);
      })
    );
  }

  // =========================================================================
  // 3.7. REACTIVAR: PATCH /api/cuestionarios/{id}/activar
  // =========================================================================
  activarCuestionario(id: string): Observable<CuestionarioResumen> {
    const t0 = performance.now();

    if (this.forceMockMode()) {
      const item = this.mockStore.find(c => c.id === id);
      if (item) item.activo = true;
      this.guardarEnStorage();
      const res = item ? this.convertirDetalleAResumen(item) : { id, titulo: '', descripcion: '', activo: true, cantidadPreguntas: 0, puntajeTotal: 0, desafioId: '', cursoCohorteId: '' };

      this.registrarLlamadaLog({
        metodo: 'PATCH',
        url: `/api/cuestionarios/${id}/activar`,
        status: 200,
        statusText: 'OK (Activado en Mock)',
        origen: 'MOCK_AUTONOMO',
        duracionMs: Math.round(performance.now() - t0),
        response: res
      });
      return of(res);
    }

    return this.http.patch<CuestionarioResumen>(`${this.apiUrl}/${id}/activar`, {}).pipe(
      map(res => this.enriquecerResumen(res)),
      tap(res => {
        this.backendOnline.set(true);
        this.registrarLlamadaLog({
          metodo: 'PATCH',
          url: `/api/cuestionarios/${id}/activar`,
          status: 200,
          statusText: 'OK (Activado)',
          origen: 'SPRING_BOOT',
          duracionMs: Math.round(performance.now() - t0),
          response: res
        });
      }),
      catchError(err => {
        this.backendOnline.set(false);
        const item = this.mockStore.find(c => c.id === id);
        if (item) item.activo = true;
        this.guardarEnStorage();
        const res = item ? this.convertirDetalleAResumen(item) : { id, titulo: '', descripcion: '', activo: true, cantidadPreguntas: 0, puntajeTotal: 0, desafioId: '', cursoCohorteId: '' };

        this.registrarLlamadaLog({
          metodo: 'PATCH',
          url: `/api/cuestionarios/${id}/activar`,
          status: err.status || 0,
          statusText: 'Fallback Activar (' + (err.statusText || 'Offline') + ')',
          origen: 'MOCK_AUTONOMO',
          duracionMs: Math.round(performance.now() - t0),
          response: res
        });
        return of(res);
      })
    );
  }

  // =========================================================================
  // MOTOR DE CORRECCIÓN LOCAL (FALLBACK EXACTO A SPRING BOOT)
  // =========================================================================
  private evaluarIntentoMock(cuestionarioId: string, envio: EnvioIntento): ResultadoCorreccion {
    const c = this.mockStore.find(item => item.id === cuestionarioId) || this.mockStore[0];
    c.intentosRealizados = (c.intentosRealizados || 0) + 1;
    this.guardarEnStorage();

    const detalles: DetalleCorreccion[] = [];
    let puntajeAcumulado = 0;
    let puntajeMaximoTotal = 0;

    for (const preg of c.preguntas) {
      const respEnvio = envio.respuestas.find(r => r.preguntaVersionId === preg.preguntaVersionId);
      const resp = respEnvio?.respuesta;
      const maxPts = Number(preg.puntaje) || 25;
      puntajeMaximoTotal += maxPts;

      const criterio = c.criterioPreguntas?.[preg.preguntaVersionId] || {};
      let esCorrecta = false;
      let puntosGanados = 0;
      let feedback = '';

      switch (preg.tipo) {
        case 'OPCION_MULTIPLE': {
          const opcion = resp?.opcion_seleccionada;
          const esperada = criterio.opcion_correcta;
          if (opcion && opcion === esperada) {
            esCorrecta = true;
            puntosGanados = maxPts;
            feedback = '¡Opción correcta!';
          } else {
            feedback = `Opción incorrecta. Seleccionaste "${opcion || 'ninguna'}".`;
          }
          break;
        }
        case 'VERDADERO_FALSO': {
          const valor = resp?.respuesta;
          const esperada = criterio.respuesta_correcta;
          if (valor !== undefined && valor === esperada) {
            esCorrecta = true;
            puntosGanados = maxPts;
            feedback = '¡Respuesta correcta!';
          } else {
            feedback = 'Respuesta incorrecta.';
          }
          break;
        }
        case 'ORDENAR': {
          const seq: string[] = resp?.secuencia || [];
          const esperada: string[] = criterio.secuencia_correcta || [];
          let aciertos = 0;
          for (let i = 0; i < esperada.length; i++) {
            if (seq[i] === esperada[i]) aciertos++;
          }
          if (esperada.length > 0) {
            puntosGanados = Math.round((aciertos / esperada.length) * maxPts);
            esCorrecta = aciertos === esperada.length;
            feedback = esCorrecta
              ? '¡Secuencia completamente ordenada!'
              : `Orden parcial: ${aciertos} de ${esperada.length} en su posición correcta.`;
          }
          break;
        }
        case 'EMPAREJAR': {
          const pares: Record<string, string> = resp?.pares || {};
          const esperados: Record<string, string> = criterio.pares_correctos || {};
          const keys = Object.keys(esperados);
          let aciertos = 0;
          for (const k of keys) {
            if (pares[k] === esperados[k]) aciertos++;
          }
          if (keys.length > 0) {
            puntosGanados = Math.round((aciertos / keys.length) * maxPts);
            esCorrecta = aciertos === keys.length;
            feedback = esCorrecta
              ? '¡Todos los pares fueron emparejados correctamente!'
              : `Emparejamiento parcial: ${aciertos} de ${keys.length} pares correctos.`;
          }
          break;
        }
      }

      puntajeAcumulado += puntosGanados;
      detalles.push({
        preguntaVersionId: preg.preguntaVersionId,
        tipo: preg.tipo,
        puntajeMaximo: maxPts,
        puntajeObtenido: puntosGanados,
        esCorrecta,
        feedback
      });
    }

    const nota = puntajeMaximoTotal > 0 ? Math.round((puntajeAcumulado / puntajeMaximoTotal) * 100) : 0;
    const aprobado = nota >= 60;
    const totalPermitidos = 3;
    const intentoNum = c.intentosRealizados || 1;
    const restantes = Math.max(0, totalPermitidos - intentoNum);

    const feedbackGeneral = aprobado
      ? `¡Felicitaciones! Has aprobado el cuestionario. Obtuviste ${nota} de 100 puntos (${puntajeAcumulado}/${puntajeMaximoTotal} puntos directos). Preguntas completamente acertadas: ${detalles.filter(d => d.esCorrecta).length} de ${detalles.length}.`
      : `No alcanzaste la nota mínima de aprobación (60 puntos). Obtuviste ${nota} de 100 puntos (${puntajeAcumulado}/${puntajeMaximoTotal} puntos directos). Te quedan ${restantes} reintentos.`;

    return {
      cuestionarioId: c.id,
      alumnoId: envio.alumnoId,
      intento: intentoNum,
      nota,
      aprobado,
      feedback: feedbackGeneral,
      detalle: detalles,
      intentosPermitidos: totalPermitidos,
      intentosRestantes: restantes,
      monedasGanadas: aprobado ? 1 : 0
    };
  }

  private crearCuestionarioEnMock(payload: any, dto: CrearCuestionarioDto): CuestionarioResumen {
    const nuevoId = 'mock-' + Date.now();
    const preguntas: PreguntaParaResolver[] = [];
    const criterioPreguntas: Record<string, any> = {};
    let puntajeTotal = 0;

    payload.preguntas.forEach((p: any, idx: number) => {
      const vId = 'pv-' + (idx + 1) + '-' + Date.now();
      preguntas.push({
        preguntaVersionId: vId,
        tipo: p.tipo,
        enunciado: p.enunciado,
        orden: p.orden,
        puntaje: p.puntaje,
        payload: p.payload
      });
      criterioPreguntas[vId] = p.criterio;
      puntajeTotal += p.puntaje;
    });

    const detalle: CuestionarioDetalle & { criterioPreguntas?: Record<string, any> } = {
      id: nuevoId,
      desafioId: payload.desafioId,
      cursoCohorteId: payload.cursoCohorteId,
      titulo: payload.titulo,
      descripcion: payload.descripcion,
      puntajeTotal,
      activo: true,
      preguntas,
      criterioPreguntas,
      cursoNombre: dto.cursoNombre || 'Arquitectura de Software y Spring Boot (Cohorte 2026)',
      duracionMinutos: dto.duracionMinutos || 15,
      dificultad: dto.dificultad || 'Intermedia',
      obligatorio: dto.obligatorio ?? true,
      intentosPermitidos: dto.intentosPermitidos || 3,
      intentosRealizados: 0
    };

    this.mockStore.unshift(detalle);
    this.guardarEnStorage();

    return this.enriquecerResumen({
      id: nuevoId,
      desafioId: payload.desafioId,
      cursoCohorteId: payload.cursoCohorteId,
      titulo: payload.titulo,
      descripcion: payload.descripcion,
      cantidadPreguntas: preguntas.length,
      puntajeTotal,
      activo: true
    });
  }

  private getMockCuestionariosIniciales(): (CuestionarioDetalle & { criterioPreguntas?: Record<string, any> })[] {
    return [
      {
        id: '1d8b67b6-9bb2-463e-bb36-928ecf8eb171',
        desafioId: '22222222-2222-2222-2222-222222222222',
        cursoCohorteId: '33333333-3333-3333-3333-333333333333',
        titulo: 'Fundamentos de Arquitectura Web y Spring Boot',
        descripcion: 'Evaluación sobre principios REST, flujo de peticiones en Spring Boot y anotaciones del framework.',
        puntajeTotal: 100,
        activo: true,
        cursoNombre: 'Arquitectura de Software y Spring Boot (Cohorte 2026)',
        desafioNumero: 'DESAFÍO 01',
        duracionMinutos: 15,
        dificultad: 'Intermedia',
        obligatorio: true,
        intentosPermitidos: 3,
        intentosRealizados: 0,
        preguntas: [
          {
            preguntaVersionId: 'a1111111-1111-1111-1111-111111111111',
            tipo: 'OPCION_MULTIPLE',
            enunciado: '¿Qué método HTTP se recomienda utilizar para una operación idempotente que actualiza completamente un recurso en una API REST?',
            orden: 1,
            puntaje: 25,
            payload: { opciones: ['POST', 'PUT', 'PATCH', 'DELETE'] }
          },
          {
            preguntaVersionId: 'b2222222-2222-2222-2222-222222222222',
            tipo: 'VERDADERO_FALSO',
            enunciado: 'En Spring Boot, el componente DispatcherServlet es el Front Controller central que intercepta todas las peticiones HTTP y las despacha a los controladores correspondientes.',
            orden: 2,
            puntaje: 25,
            payload: { opciones: [true, false] }
          },
          {
            preguntaVersionId: 'c3333333-3333-3333-3333-333333333333',
            tipo: 'ORDENAR',
            enunciado: 'Ordene cronológicamente el flujo estándar de procesamiento de una petición HTTP entrante en una aplicación Spring Boot.',
            orden: 3,
            puntaje: 25,
            payload: {
              elementos: [
                'HandlerInterceptor',
                'Filtro de Seguridad / Servlet Filter',
                'RestController',
                'DispatcherServlet'
              ]
            }
          },
          {
            preguntaVersionId: 'd4444444-4444-4444-4444-444444444444',
            tipo: 'EMPAREJAR',
            enunciado: 'Empareje cada anotación central de Spring con su responsabilidad en la arquitectura.',
            orden: 4,
            puntaje: 25,
            payload: {
              columnaA: ['@RestController', '@Service', '@Repository', '@Configuration'],
              columnaB: [
                'Define la lógica de negocio',
                'Expone endpoints HTTP y serializa respuestas',
                'Acceso y persistencia a la base de datos',
                'Declara beans y configuraciones de Spring'
              ]
            }
          }
        ],
        criterioPreguntas: {
          'a1111111-1111-1111-1111-111111111111': { opcion_correcta: 'PUT' },
          'b2222222-2222-2222-2222-222222222222': { respuesta_correcta: true },
          'c3333333-3333-3333-3333-333333333333': {
            secuencia_correcta: [
              'Filtro de Seguridad / Servlet Filter',
              'DispatcherServlet',
              'HandlerInterceptor',
              'RestController'
            ]
          },
          'd4444444-4444-4444-4444-444444444444': {
            pares_correctos: {
              '@RestController': 'Expone endpoints HTTP y serializa respuestas',
              '@Service': 'Define la lógica de negocio',
              '@Repository': 'Acceso y persistencia a la base de datos',
              '@Configuration': 'Declara beans y configuraciones de Spring'
            }
          }
        }
      },
      {
        id: 'e817a3a9-196d-491b-944d-57077a7df4ef',
        desafioId: '22222222-2222-2222-2222-222222222222',
        cursoCohorteId: '33333333-3333-3333-3333-333333333333',
        titulo: 'Principios SOLID y Calidad de Software',
        descripcion: 'Cuestionario de autoevaluación sobre diseño orientado a objetos y TDD.',
        puntajeTotal: 100,
        activo: true,
        cursoNombre: 'Arquitectura de Software y Spring Boot (Cohorte 2026)',
        desafioNumero: 'DESAFÍO 02',
        duracionMinutos: 15,
        dificultad: 'Avanzada',
        obligatorio: false,
        intentosPermitidos: 2,
        intentosRealizados: 0,
        preguntas: [
          {
            preguntaVersionId: 's1111111-1111-1111-1111-111111111111',
            tipo: 'OPCION_MULTIPLE',
            enunciado: '¿Qué principio SOLID establece que una clase debe tener una única razón para cambiar?',
            orden: 1,
            puntaje: 50,
            payload: {
              opciones: ['Single Responsibility', 'Open/Closed', 'Liskov Substitution', 'Interface Segregation']
            }
          },
          {
            preguntaVersionId: 's2222222-2222-2222-2222-222222222222',
            tipo: 'VERDADERO_FALSO',
            enunciado: 'const impide reasignar una variable, pero no mutar el contenido de un objeto referenciado.',
            orden: 2,
            puntaje: 50,
            payload: { opciones: [true, false] }
          }
        ],
        criterioPreguntas: {
          's1111111-1111-1111-1111-111111111111': { opcion_correcta: 'Single Responsibility' },
          's2222222-2222-2222-2222-222222222222': { respuesta_correcta: true }
        }
      }
    ];
  }
}
