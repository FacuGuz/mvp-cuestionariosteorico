package tpi.mvpteorico;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import tpi.mvpteorico.dto.DetallePreguntaCorreccionDTO;
import tpi.mvpteorico.service.CorrectorService;

import static org.junit.jupiter.api.Assertions.*;

class CorrectorServiceTest {

    private CorrectorService correctorService;

    @BeforeEach
    void setUp() {
        correctorService = new CorrectorService(new ObjectMapper());
    }

    @Test
    void testEvaluarOpcionMultipleCorrecta() {
        String criterio = "{\"opcion_correcta\":\"PUT\"}";
        String respuesta = "{\"opcion_seleccionada\":\"PUT\"}";

        DetallePreguntaCorreccionDTO res = correctorService.evaluarOpcionMultiple(criterio, respuesta, 25);

        assertTrue(res.getEsCorrecta());
        assertEquals(25, res.getPuntajeObtenido());
    }

    @Test
    void testEvaluarOpcionMultipleIncorrecta() {
        String criterio = "{\"opcion_correcta\":\"PUT\"}";
        String respuesta = "{\"opcion_seleccionada\":\"POST\"}";

        DetallePreguntaCorreccionDTO res = correctorService.evaluarOpcionMultiple(criterio, respuesta, 25);

        assertFalse(res.getEsCorrecta());
        assertEquals(0, res.getPuntajeObtenido());
    }

    @Test
    void testEvaluarVerdaderoFalsoCorrecto() {
        String criterio = "{\"respuesta_correcta\":true}";
        String respuesta = "{\"respuesta\":true}";

        DetallePreguntaCorreccionDTO res = correctorService.evaluarVerdaderoFalso(criterio, respuesta, 25);

        assertTrue(res.getEsCorrecta());
        assertEquals(25, res.getPuntajeObtenido());
    }

    @Test
    void testEvaluarVerdaderoFalsoIncorrecto() {
        String criterio = "{\"respuesta_correcta\":false}";
        String respuesta = "{\"respuesta\":true}";

        DetallePreguntaCorreccionDTO res = correctorService.evaluarVerdaderoFalso(criterio, respuesta, 25);

        assertFalse(res.getEsCorrecta());
        assertEquals(0, res.getPuntajeObtenido());
    }

    @Test
    void testEvaluarOrdenarTotalmenteCorrecto() {
        String criterio = "{\"secuencia_correcta\":[\"Paso 1\",\"Paso 2\",\"Paso 3\",\"Paso 4\"]}";
        String respuesta = "{\"secuencia\":[\"Paso 1\",\"Paso 2\",\"Paso 3\",\"Paso 4\"]}";

        DetallePreguntaCorreccionDTO res = correctorService.evaluarOrdenar(criterio, respuesta, 20);

        assertTrue(res.getEsCorrecta());
        assertEquals(20, res.getPuntajeObtenido());
    }

    @Test
    void testEvaluarOrdenarParcialmenteCorrecto() {
        String criterio = "{\"secuencia_correcta\":[\"Paso 1\",\"Paso 2\",\"Paso 3\",\"Paso 4\"]}";
        // 2 elementos en la posición correcta (Paso 1 y Paso 4)
        String respuesta = "{\"secuencia\":[\"Paso 1\",\"Paso 3\",\"Paso 2\",\"Paso 4\"]}";

        DetallePreguntaCorreccionDTO res = correctorService.evaluarOrdenar(criterio, respuesta, 20);

        assertFalse(res.getEsCorrecta());
        assertEquals(10, res.getPuntajeObtenido()); // 2/4 * 20 = 10
    }

    @Test
    void testEvaluarEmparejarTotalmenteCorrecto() {
        String criterio = "{\"pares_correctos\":{\"A\":\"1\",\"B\":\"2\"}}";
        String respuesta = "{\"pares\":{\"A\":\"1\",\"B\":\"2\"}}";

        DetallePreguntaCorreccionDTO res = correctorService.evaluarEmparejar(criterio, respuesta, 30);

        assertTrue(res.getEsCorrecta());
        assertEquals(30, res.getPuntajeObtenido());
    }

    @Test
    void testEvaluarEmparejarParcialmenteCorrecto() {
        String criterio = "{\"pares_correctos\":{\"A\":\"1\",\"B\":\"2\"}}";
        String respuesta = "{\"pares\":{\"A\":\"1\",\"B\":\"incorrecto\"}}";

        DetallePreguntaCorreccionDTO res = correctorService.evaluarEmparejar(criterio, respuesta, 30);

        assertFalse(res.getEsCorrecta());
        assertEquals(15, res.getPuntajeObtenido()); // 1/2 * 30 = 15
    }

    @Test
    void testCalculoNotaGlobalYAprobado() {
        assertEquals(75, correctorService.calcularNotaGlobal(75, 100));
        assertTrue(correctorService.determinarAprobado(60));
        assertFalse(correctorService.determinarAprobado(59));
    }
}
