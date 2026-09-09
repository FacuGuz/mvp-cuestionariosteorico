package tpi.mvpteorico.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import tpi.mvpteorico.dto.*;
import tpi.mvpteorico.service.CuestionarioService;

import java.util.List;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/cuestionarios")
@RequiredArgsConstructor
public class CuestionarioController {

    private final CuestionarioService cuestionarioService;

    /**
     * GET /api/cuestionarios
     * Lista todos los cuestionarios (con cantidad de preguntas, puntaje total y estado activo).
     * Opcional: ?soloActivos=true para excluir los dados de baja.
     */
    @GetMapping
    public ResponseEntity<List<CuestionarioResumenDTO>> listarCuestionarios(
            @RequestParam(required = false) Boolean soloActivos) {
        return ResponseEntity.ok(cuestionarioService.listarCuestionarios(soloActivos));
    }

    /**
     * POST /api/cuestionarios
     * Alta de cuestionario con su set de preguntas heterogéneas.
     */
    @PostMapping
    public ResponseEntity<CuestionarioResumenDTO> crearCuestionario(@RequestBody CrearCuestionarioDTO dto) {
        CuestionarioResumenDTO creado = cuestionarioService.crearCuestionario(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(creado);
    }

    /**
     * PUT /api/cuestionarios/{id}
     * Edición inmutable de cuestionario: No modifica el registro existente, sino que desactiva
     * el cuestionario original y crea uno nuevo con los cambios especificados.
     */
    @PutMapping("/{id}")
    public ResponseEntity<CuestionarioResumenDTO> editarCuestionario(
            @PathVariable UUID id,
            @RequestBody CrearCuestionarioDTO dto) {
        try {
            CuestionarioResumenDTO nuevo = cuestionarioService.editarCuestionario(id, dto);
            return ResponseEntity.status(HttpStatus.CREATED).body(nuevo);
        } catch (IllegalArgumentException e) {
            log.warn("Cuestionario no encontrado para edición: {}", e.getMessage());
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * PATCH /api/cuestionarios/{id}/desactivar
     * Desactiva un cuestionario (baja lógica).
     */
    @PatchMapping("/{id}/desactivar")
    public ResponseEntity<CuestionarioResumenDTO> desactivarCuestionario(@PathVariable UUID id) {
        try {
            CuestionarioResumenDTO actualizado = cuestionarioService.desactivarCuestionario(id);
            return ResponseEntity.ok(actualizado);
        } catch (IllegalArgumentException e) {
            log.warn("Cuestionario no encontrado para desactivar: {}", e.getMessage());
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * DELETE /api/cuestionarios/{id}
     * Desactiva un cuestionario (baja lógica vía DELETE estándar).
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<CuestionarioResumenDTO> eliminarCuestionario(@PathVariable UUID id) {
        return desactivarCuestionario(id);
    }

    /**
     * PATCH /api/cuestionarios/{id}/activar
     * Reactiva un cuestionario previamente desactivado.
     */
    @PatchMapping("/{id}/activar")
    public ResponseEntity<CuestionarioResumenDTO> activarCuestionario(@PathVariable UUID id) {
        try {
            CuestionarioResumenDTO actualizado = cuestionarioService.activarCuestionario(id);
            return ResponseEntity.ok(actualizado);
        } catch (IllegalArgumentException e) {
            log.warn("Cuestionario no encontrado para activar: {}", e.getMessage());
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * GET /api/cuestionarios/{id}
     * Detalle del cuestionario para resolver (sin soluciones).
     */
    @GetMapping("/{id}")
    public ResponseEntity<CuestionarioDetalleDTO> obtenerCuestionario(@PathVariable UUID id) {
        return cuestionarioService.obtenerCuestionarioParaResolver(id)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    /**
     * POST /api/cuestionarios/{id}/intentos
     * Recibe las respuestas del alumno, ejecuta la corrección y devuelve { nota, aprobado, feedback, detalle }.
     */
    @PostMapping("/{id}/intentos")
    public ResponseEntity<ResultadoCorreccionDTO> registrarIntento(
            @PathVariable UUID id,
            @RequestBody EnvioIntentoDTO envio) {
        try {
            ResultadoCorreccionDTO resultado = cuestionarioService.registrarIntento(id, envio);
            return ResponseEntity.ok(resultado);
        } catch (IllegalArgumentException e) {
            log.warn("Cuestionario no encontrado: {}", e.getMessage());
            return ResponseEntity.notFound().build();
        }
    }
}
