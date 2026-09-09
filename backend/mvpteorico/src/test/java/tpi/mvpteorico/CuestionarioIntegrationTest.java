package tpi.mvpteorico;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import tpi.mvpteorico.controller.CuestionarioController;
import tpi.mvpteorico.dto.*;
import tpi.mvpteorico.repository.CuestionarioRepository;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
class CuestionarioIntegrationTest {

    private MockMvc mockMvc;

    @Autowired
    private CuestionarioController cuestionarioController;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private CuestionarioRepository cuestionarioRepository;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(cuestionarioController).build();
    }

    @Test
    void testListarCuestionariosYObtenerDetalleSinCriterio() throws Exception {
        // 1. Verificar listado (DataSeeder debió precargar 2)
        MvcResult listResult = mockMvc.perform(get("/api/cuestionarios"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(greaterThanOrEqualTo(2))))
                .andExpect(jsonPath("$[0].titulo", notNullValue()))
                .andExpect(jsonPath("$[0].cantidadPreguntas", greaterThan(0)))
                .andExpect(jsonPath("$[0].puntajeTotal", greaterThan(0)))
                .andReturn();

        List<CuestionarioResumenDTO> cuestionarios = objectMapper.readValue(
                listResult.getResponse().getContentAsString(),
                objectMapper.getTypeFactory().constructCollectionType(List.class, CuestionarioResumenDTO.class)
        );

        UUID primerCuestionarioId = cuestionarios.get(0).getId();

        // 2. Obtener detalle para resolver y verificar que NO incluya campo "criterio"
        MvcResult detalleResult = mockMvc.perform(get("/api/cuestionarios/" + primerCuestionarioId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id", is(primerCuestionarioId.toString())))
                .andExpect(jsonPath("$.preguntas", hasSize(greaterThan(0))))
                .andReturn();

        String detalleJson = detalleResult.getResponse().getContentAsString();
        // Verificación estricta de seguridad: la palabra "criterio" o "opcion_correcta" no debe filtrarse al alumno
        assertFalse(detalleJson.contains("criterio"), "El JSON devuelto al alumno no debe contener la propiedad criterio");
        assertFalse(detalleJson.contains("opcion_correcta"), "El JSON devuelto al alumno no debe contener solucion/criterio interno");

        CuestionarioDetalleDTO detalle = objectMapper.readValue(detalleJson, CuestionarioDetalleDTO.class);
        assertNotNull(detalle.getPreguntas());
        assertFalse(detalle.getPreguntas().isEmpty());

        // 3. Simular resolución y envío de intento
        UUID alumnoId = UUID.randomUUID();
        PreguntaParaResolverDTO primerPregunta = detalle.getPreguntas().get(0);

        EnvioIntentoDTO envio = EnvioIntentoDTO.builder()
                .alumnoId(alumnoId)
                .respuestas(List.of(
                        RespuestaEnvioDTO.builder()
                                .preguntaVersionId(primerPregunta.getPreguntaVersionId())
                                .respuesta(Map.of("opcion_seleccionada", "PUT"))
                                .build()
                ))
                .build();

        mockMvc.perform(post("/api/cuestionarios/" + primerCuestionarioId + "/intentos")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(envio)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.cuestionarioId", is(primerCuestionarioId.toString())))
                .andExpect(jsonPath("$.alumnoId", is(alumnoId.toString())))
                .andExpect(jsonPath("$.intento", is(1)))
                .andExpect(jsonPath("$.nota", notNullValue()))
                .andExpect(jsonPath("$.aprobado", notNullValue()))
                .andExpect(jsonPath("$.feedback", notNullValue()))
                .andExpect(jsonPath("$.detalle", hasSize(detalle.getPreguntas().size())));
    }

    @Test
    void testDesactivarYActivarCuestionario() throws Exception {
        // Obtener un cuestionario
        MvcResult listResult = mockMvc.perform(get("/api/cuestionarios"))
                .andExpect(status().isOk())
                .andReturn();

        List<CuestionarioResumenDTO> cuestionarios = objectMapper.readValue(
                listResult.getResponse().getContentAsString(),
                objectMapper.getTypeFactory().constructCollectionType(List.class, CuestionarioResumenDTO.class)
        );
        UUID cuestionarioId = cuestionarios.get(0).getId();

        // Desactivar
        mockMvc.perform(patch("/api/cuestionarios/" + cuestionarioId + "/desactivar"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id", is(cuestionarioId.toString())))
                .andExpect(jsonPath("$.activo", is(false)));

        // Verificar que con ?soloActivos=true no aparezca
        MvcResult soloActivosResult = mockMvc.perform(get("/api/cuestionarios?soloActivos=true"))
                .andExpect(status().isOk())
                .andReturn();

        List<CuestionarioResumenDTO> activos = objectMapper.readValue(
                soloActivosResult.getResponse().getContentAsString(),
                objectMapper.getTypeFactory().constructCollectionType(List.class, CuestionarioResumenDTO.class)
        );
        boolean estaPresente = activos.stream().anyMatch(c -> c.getId().equals(cuestionarioId));
        assertFalse(estaPresente, "El cuestionario desactivado no debe aparecer en la lista de solo activos");

        // Reactivar
        mockMvc.perform(patch("/api/cuestionarios/" + cuestionarioId + "/activar"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id", is(cuestionarioId.toString())))
                .andExpect(jsonPath("$.activo", is(true)));
    }

    @Test
    void testEdicionInmutableCuestionario() throws Exception {
        // Obtener un cuestionario
        MvcResult listResult = mockMvc.perform(get("/api/cuestionarios"))
                .andExpect(status().isOk())
                .andReturn();

        List<CuestionarioResumenDTO> cuestionarios = objectMapper.readValue(
                listResult.getResponse().getContentAsString(),
                objectMapper.getTypeFactory().constructCollectionType(List.class, CuestionarioResumenDTO.class)
        );
        CuestionarioResumenDTO original = cuestionarios.get(0);

        // Editar inmutablemente: cambiar título y preguntas
        CrearCuestionarioDTO dtoEdicion = CrearCuestionarioDTO.builder()
                .titulo("Título Modificado en Nueva Versión")
                .descripcion("Descripción actualizada")
                .desafioId(original.getDesafioId())
                .cursoCohorteId(original.getCursoCohorteId())
                .preguntas(List.of(
                        CrearPreguntaDTO.builder()
                                .tipo(tpi.mvpteorico.entity.TipoPregunta.VERDADERO_FALSO)
                                .enunciado("¿Es una nueva pregunta en el cuestionario editado?")
                                .orden(1)
                                .puntaje(50)
                                .payload(Map.of("opciones", List.of(true, false)))
                                .criterio(Map.of("respuesta_correcta", true))
                                .build()
                ))
                .build();

        MvcResult editResult = mockMvc.perform(put("/api/cuestionarios/" + original.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dtoEdicion)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.titulo", is("Título Modificado en Nueva Versión")))
                .andExpect(jsonPath("$.activo", is(true)))
                .andReturn();

        CuestionarioResumenDTO nuevo = objectMapper.readValue(
                editResult.getResponse().getContentAsString(),
                CuestionarioResumenDTO.class
        );

        // Validar inmutabilidad: el ID debe ser diferente
        assertNotEquals(original.getId(), nuevo.getId(), "La edición inmutable debe generar un nuevo ID");

        // El cuestionario original debe estar ahora inactivo en la base de datos
        tpi.mvpteorico.entity.Cuestionario originalDb = cuestionarioRepository.findById(original.getId()).orElseThrow();
        assertFalse(originalDb.getActivo(), "El cuestionario original debe quedar marcado como inactivo");
        assertNotNull(originalDb.getBajaLogica(), "El cuestionario original debe registrar fecha de baja lógica");
    }
}
