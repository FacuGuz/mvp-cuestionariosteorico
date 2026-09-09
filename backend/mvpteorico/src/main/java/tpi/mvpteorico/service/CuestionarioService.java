package tpi.mvpteorico.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tpi.mvpteorico.dto.*;
import tpi.mvpteorico.entity.*;
import tpi.mvpteorico.repository.*;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class CuestionarioService {

    private final CuestionarioRepository cuestionarioRepository;
    private final CuestionarioPreguntaRepository cuestionarioPreguntaRepository;
    private final PreguntaRepository preguntaRepository;
    private final PreguntaVersionRepository preguntaVersionRepository;
    private final RespuestaRepository respuestaRepository;
    private final CorreccionRepository correccionRepository;
    private final CorrectorService correctorService;
    private final ObjectMapper objectMapper;

    /**
     * Creación atómica de Cuestionario + Preguntas + Versiones iniciales.
     */
    @Transactional
    public CuestionarioResumenDTO crearCuestionario(CrearCuestionarioDTO dto) {
        log.info("Creando nuevo cuestionario: {}", dto.getTitulo());

        Cuestionario cuestionario = Cuestionario.builder()
                .desafioId(dto.getDesafioId())
                .cursoCohorteId(dto.getCursoCohorteId())
                .titulo(dto.getTitulo())
                .descripcion(dto.getDescripcion())
                .build();

        cuestionario = cuestionarioRepository.save(cuestionario);

        int ordenAuto = 1;
        int puntajeTotal = 0;

        if (dto.getPreguntas() != null) {
            for (CrearPreguntaDTO pregDto : dto.getPreguntas()) {
                // 1. Crear entidad Pregunta
                Pregunta pregunta = Pregunta.builder()
                        .profesorId(dto.getProfesorId() != null ? dto.getProfesorId() : UUID.randomUUID())
                        .tipo(pregDto.getTipo())
                        .versionActual(1)
                        .bajaLogica(null)
                        .build();
                pregunta = preguntaRepository.save(pregunta);

                // 2. Crear entidad PreguntaVersion (versión inicial 1)
                String payloadJson = convertirAJsonString(pregDto.getPayload());
                String criterioJson = convertirAJsonString(pregDto.getCriterio());

                PreguntaVersion version = PreguntaVersion.builder()
                        .pregunta(pregunta)
                        .version(1)
                        .enunciado(pregDto.getEnunciado())
                        .payload(payloadJson)
                        .criterio(criterioJson)
                        .build();
                version = preguntaVersionRepository.save(version);

                // 3. Crear relación CuestionarioPregunta
                int puntaje = pregDto.getPuntaje() != null ? pregDto.getPuntaje() : 10;
                int orden = pregDto.getOrden() != null ? pregDto.getOrden() : ordenAuto++;

                CuestionarioPregunta cp = CuestionarioPregunta.builder()
                        .cuestionario(cuestionario)
                        .preguntaVersion(version)
                        .orden(orden)
                        .puntaje(puntaje)
                        .build();
                cuestionarioPreguntaRepository.save(cp);

                puntajeTotal += puntaje;
            }
        }

        return CuestionarioResumenDTO.builder()
                .id(cuestionario.getId())
                .desafioId(cuestionario.getDesafioId())
                .cursoCohorteId(cuestionario.getCursoCohorteId())
                .titulo(cuestionario.getTitulo())
                .descripcion(cuestionario.getDescripcion())
                .cantidadPreguntas(dto.getPreguntas() != null ? dto.getPreguntas().size() : 0)
                .puntajeTotal(puntajeTotal)
                .activo(cuestionario.getActivo())
                .build();
    }

    /**
     * Lista todos los cuestionarios con su cantidad de preguntas y puntaje total acumulado.
     * Permite filtrar opcionalmente solo los que se encuentran activos.
     */
    @Transactional(readOnly = true)
    public List<CuestionarioResumenDTO> listarCuestionarios(Boolean soloActivos) {
        return cuestionarioRepository.findAll().stream()
                .filter(c -> soloActivos == null || !soloActivos || Boolean.TRUE.equals(c.getActivo()))
                .map(c -> {
                    List<CuestionarioPregunta> preguntas = cuestionarioPreguntaRepository.findByCuestionarioIdOrderByOrdenAsc(c.getId());
                    int puntajeTotal = preguntas.stream().mapToInt(CuestionarioPregunta::getPuntaje).sum();

                    return CuestionarioResumenDTO.builder()
                            .id(c.getId())
                            .desafioId(c.getDesafioId())
                            .cursoCohorteId(c.getCursoCohorteId())
                            .titulo(c.getTitulo())
                            .descripcion(c.getDescripcion())
                            .cantidadPreguntas(preguntas.size())
                            .puntajeTotal(puntajeTotal)
                            .activo(c.getActivo())
                            .build();
                }).collect(Collectors.toList());
    }

    /**
     * Consulta de cuestionario para el alumno: Mapea a DTO omitiendo el campo criterio.
     */
    @Transactional(readOnly = true)
    public Optional<CuestionarioDetalleDTO> obtenerCuestionarioParaResolver(UUID id) {
        return cuestionarioRepository.findById(id).map(c -> {
            List<CuestionarioPregunta> cpList = cuestionarioPreguntaRepository.findByCuestionarioIdOrderByOrdenAsc(c.getId());
            int puntajeTotal = cpList.stream().mapToInt(CuestionarioPregunta::getPuntaje).sum();

            List<PreguntaParaResolverDTO> preguntasDTO = cpList.stream().map(cp -> {
                PreguntaVersion pv = cp.getPreguntaVersion();
                Object payloadParsed = parsearJson(pv.getPayload());

                return PreguntaParaResolverDTO.builder()
                        .preguntaVersionId(pv.getId())
                        .tipo(pv.getPregunta().getTipo())
                        .enunciado(pv.getEnunciado())
                        .orden(cp.getOrden())
                        .puntaje(cp.getPuntaje())
                        .payload(payloadParsed)
                        // ¡CRITERIO OMITIDO ESTRICTAMENTE POR SEGURIDAD!
                        .build();
            }).collect(Collectors.toList());

            return CuestionarioDetalleDTO.builder()
                    .id(c.getId())
                    .desafioId(c.getDesafioId())
                    .cursoCohorteId(c.getCursoCohorteId())
                    .titulo(c.getTitulo())
                    .descripcion(c.getDescripcion())
                    .puntajeTotal(puntajeTotal)
                    .activo(c.getActivo())
                    .preguntas(preguntasDTO)
                    .build();
        });
    }

    /**
     * Desactiva un cuestionario (baja lógica).
     */
    @Transactional
    public CuestionarioResumenDTO desactivarCuestionario(UUID id) {
        log.info("Desactivando cuestionario con ID: {}", id);
        Cuestionario cuestionario = cuestionarioRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Cuestionario no encontrado con ID: " + id));

        cuestionario.setActivo(false);
        cuestionario.setBajaLogica(LocalDateTime.now());
        cuestionarioRepository.save(cuestionario);

        List<CuestionarioPregunta> preguntas = cuestionarioPreguntaRepository.findByCuestionarioIdOrderByOrdenAsc(id);
        int puntajeTotal = preguntas.stream().mapToInt(CuestionarioPregunta::getPuntaje).sum();

        return CuestionarioResumenDTO.builder()
                .id(cuestionario.getId())
                .desafioId(cuestionario.getDesafioId())
                .cursoCohorteId(cuestionario.getCursoCohorteId())
                .titulo(cuestionario.getTitulo())
                .descripcion(cuestionario.getDescripcion())
                .cantidadPreguntas(preguntas.size())
                .puntajeTotal(puntajeTotal)
                .activo(false)
                .build();
    }

    /**
     * Reactiva un cuestionario previamente desactivado.
     */
    @Transactional
    public CuestionarioResumenDTO activarCuestionario(UUID id) {
        log.info("Activando cuestionario con ID: {}", id);
        Cuestionario cuestionario = cuestionarioRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Cuestionario no encontrado con ID: " + id));

        cuestionario.setActivo(true);
        cuestionario.setBajaLogica(null);
        cuestionarioRepository.save(cuestionario);

        List<CuestionarioPregunta> preguntas = cuestionarioPreguntaRepository.findByCuestionarioIdOrderByOrdenAsc(id);
        int puntajeTotal = preguntas.stream().mapToInt(CuestionarioPregunta::getPuntaje).sum();

        return CuestionarioResumenDTO.builder()
                .id(cuestionario.getId())
                .desafioId(cuestionario.getDesafioId())
                .cursoCohorteId(cuestionario.getCursoCohorteId())
                .titulo(cuestionario.getTitulo())
                .descripcion(cuestionario.getDescripcion())
                .cantidadPreguntas(preguntas.size())
                .puntajeTotal(puntajeTotal)
                .activo(true)
                .build();
    }

    /**
     * Edición inmutable de Cuestionario: El cuestionario original no se altera destructivamente,
     * sino que se desactiva y se crea uno nuevo con los cambios solicitados.
     */
    @Transactional
    public CuestionarioResumenDTO editarCuestionario(UUID idOriginal, CrearCuestionarioDTO dto) {
        log.info("Edición inmutable: desactivando cuestionario original {} y creando nueva versión", idOriginal);
        Cuestionario original = cuestionarioRepository.findById(idOriginal)
                .orElseThrow(() -> new IllegalArgumentException("Cuestionario original no encontrado con ID: " + idOriginal));

        // 1. Desactivar cuestionario original
        original.setActivo(false);
        original.setBajaLogica(LocalDateTime.now());
        cuestionarioRepository.save(original);

        // 2. Preservar campos originales si no se proporcionaron en el DTO
        if (dto.getDesafioId() == null) {
            dto.setDesafioId(original.getDesafioId());
        }
        if (dto.getCursoCohorteId() == null) {
            dto.setCursoCohorteId(original.getCursoCohorteId());
        }
        if (dto.getTitulo() == null || dto.getTitulo().isBlank()) {
            dto.setTitulo(original.getTitulo());
        }
        if (dto.getDescripcion() == null) {
            dto.setDescripcion(original.getDescripcion());
        }

        // 3. Crear el nuevo cuestionario con los cambios
        return crearCuestionario(dto);
    }

    /**
     * Recibe las respuestas del alumno, calcula la corrección automática, guarda el intento y persiste el resultado.
     */
    @Transactional
    public ResultadoCorreccionDTO registrarIntento(UUID cuestionarioId, EnvioIntentoDTO envio) {
        Cuestionario cuestionario = cuestionarioRepository.findById(cuestionarioId)
                .orElseThrow(() -> new IllegalArgumentException("Cuestionario no encontrado con ID: " + cuestionarioId));

        UUID alumnoId = envio.getAlumnoId() != null ? envio.getAlumnoId() : UUID.randomUUID();

        // Determinar número de intento
        int nuevoIntento = correccionRepository.findTopByCuestionarioIdAndAlumnoIdOrderByIntentoDesc(cuestionarioId, alumnoId)
                .map(c -> c.getIntento() + 1)
                .orElse(1);

        List<CuestionarioPregunta> preguntas = cuestionarioPreguntaRepository.findByCuestionarioIdOrderByOrdenAsc(cuestionarioId);

        // Mapear respuestas enviadas por preguntaVersionId
        Map<UUID, Object> respuestasPorVersionId = new HashMap<>();
        if (envio.getRespuestas() != null) {
            for (RespuestaEnvioDTO r : envio.getRespuestas()) {
                if (r.getPreguntaVersionId() != null) {
                    respuestasPorVersionId.put(r.getPreguntaVersionId(), r.getRespuesta());
                }
            }
        }

        List<DetallePreguntaCorreccionDTO> detalles = new ArrayList<>();
        int puntosObtenidosTotal = 0;
        int puntosPosiblesTotal = 0;
        int preguntasAcertadas = 0;

        for (CuestionarioPregunta cp : preguntas) {
            PreguntaVersion pv = cp.getPreguntaVersion();
            int puntajeMax = cp.getPuntaje();
            puntosPosiblesTotal += puntajeMax;

            Object respuestaAlumno = respuestasPorVersionId.get(pv.getId());
            String respuestaJsonString = convertirAJsonString(respuestaAlumno);

            // Persistir Respuesta del alumno
            Respuesta respuestaEntity = Respuesta.builder()
                    .cuestionarioId(cuestionarioId)
                    .preguntaVersionId(pv.getId())
                    .alumnoId(alumnoId)
                    .intento(nuevoIntento)
                    .contenidoJson(respuestaJsonString)
                    .build();
            respuestaRepository.save(respuestaEntity);

            // Evaluar con CorrectorService
            DetallePreguntaCorreccionDTO detalle = correctorService.evaluarPregunta(pv, puntajeMax, respuestaAlumno);
            detalles.add(detalle);

            puntosObtenidosTotal += detalle.getPuntajeObtenido();
            if (Boolean.TRUE.equals(detalle.getEsCorrecta())) {
                preguntasAcertadas++;
            }
        }

        // Cálculo de nota sobre 100 y aprobación (>= 60)
        int nota = correctorService.calcularNotaGlobal(puntosObtenidosTotal, puntosPosiblesTotal);
        boolean aprobado = correctorService.determinarAprobado(nota);

        String feedback = String.format(
                "%s. Obtuviste %d de 100 puntos (%d/%d puntos directos). Preguntas completamente acertadas: %d de %d.",
                aprobado ? "¡Felicitaciones! Has aprobado el cuestionario" : "No alcanzaste la nota mínima de aprobación (60 puntos)",
                nota,
                puntosObtenidosTotal,
                puntosPosiblesTotal,
                preguntasAcertadas,
                preguntas.size()
        );

        // Persistir Corrección
        Correccion correccion = Correccion.builder()
                .cuestionarioId(cuestionarioId)
                .alumnoId(alumnoId)
                .intento(nuevoIntento)
                .nota(nota)
                .aprobado(aprobado)
                .feedback(feedback)
                .build();
        correccionRepository.save(correccion);

        return ResultadoCorreccionDTO.builder()
                .cuestionarioId(cuestionarioId)
                .alumnoId(alumnoId)
                .intento(nuevoIntento)
                .nota(nota)
                .aprobado(aprobado)
                .feedback(feedback)
                .detalle(detalles)
                .build();
    }

    private String convertirAJsonString(Object obj) {
        if (obj == null) return "{}";
        if (obj instanceof String) {
            String s = ((String) obj).trim();
            if ((s.startsWith("{") && s.endsWith("}")) || (s.startsWith("[") && s.endsWith("]"))) {
                return s;
            }
            return "\"" + s + "\"";
        }
        try {
            return objectMapper.writeValueAsString(obj);
        } catch (Exception e) {
            return "{}";
        }
    }

    private Object parsearJson(String json) {
        if (json == null || json.trim().isEmpty()) return null;
        try {
            return objectMapper.readValue(json, Object.class);
        } catch (Exception e) {
            return json;
        }
    }
}
