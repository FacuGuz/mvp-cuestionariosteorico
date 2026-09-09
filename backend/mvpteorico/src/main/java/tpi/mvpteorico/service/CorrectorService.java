package tpi.mvpteorico.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import tpi.mvpteorico.dto.DetallePreguntaCorreccionDTO;
import tpi.mvpteorico.entity.PreguntaVersion;
import tpi.mvpteorico.entity.TipoPregunta;

import java.util.Iterator;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class CorrectorService {

    private final ObjectMapper objectMapper;

    /**
     * Evalúa una respuesta individual para una pregunta de acuerdo a su tipo y criterio.
     */
    public DetallePreguntaCorreccionDTO evaluarPregunta(PreguntaVersion preguntaVersion, Integer puntajeMaximo, Object respuestaAlumnoObj) {
        TipoPregunta tipo = preguntaVersion.getPregunta().getTipo();
        String criterioJson = preguntaVersion.getCriterio();
        String respuestaJson = normalizarAJson(respuestaAlumnoObj);

        DetallePreguntaCorreccionDTO detalle;

        try {
            switch (tipo) {
                case OPCION_MULTIPLE:
                    detalle = evaluarOpcionMultiple(criterioJson, respuestaJson, puntajeMaximo);
                    break;
                case VERDADERO_FALSO:
                    detalle = evaluarVerdaderoFalso(criterioJson, respuestaJson, puntajeMaximo);
                    break;
                case ORDENAR:
                    detalle = evaluarOrdenar(criterioJson, respuestaJson, puntajeMaximo);
                    break;
                case EMPAREJAR:
                    detalle = evaluarEmparejar(criterioJson, respuestaJson, puntajeMaximo);
                    break;
                default:
                    detalle = DetallePreguntaCorreccionDTO.builder()
                            .puntajeMaximo(puntajeMaximo)
                            .puntajeObtenido(0)
                            .esCorrecta(false)
                            .feedback("Tipo de pregunta no soportado")
                            .build();
            }
        } catch (Exception e) {
            log.error("Error evaluando respuesta para versión de pregunta {}: {}", preguntaVersion.getId(), e.getMessage());
            detalle = DetallePreguntaCorreccionDTO.builder()
                    .puntajeMaximo(puntajeMaximo)
                    .puntajeObtenido(0)
                    .esCorrecta(false)
                    .feedback("Error al procesar la respuesta: formato inválido")
                    .build();
        }

        detalle.setPreguntaVersionId(preguntaVersion.getId());
        detalle.setTipo(tipo);
        return detalle;
    }

    /**
     * Algoritmo Opción Múltiple: Compara opcion_seleccionada == opcion_correcta.
     */
    public DetallePreguntaCorreccionDTO evaluarOpcionMultiple(String criterioJson, String respuestaJson, Integer puntajeMaximo) {
        if (respuestaJson == null || respuestaJson.trim().isEmpty()) {
            return DetallePreguntaCorreccionDTO.builder()
                    .puntajeMaximo(puntajeMaximo)
                    .puntajeObtenido(0)
                    .esCorrecta(false)
                    .feedback("No se respondió la pregunta.")
                    .build();
        }

        try {
            JsonNode criterioNode = objectMapper.readTree(criterioJson);
            JsonNode respuestaNode = objectMapper.readTree(respuestaJson);

            String correcta = extraerTexto(criterioNode, "opcion_correcta", "correcta", "solucion");
            String seleccionada = extraerTexto(respuestaNode, "opcion_seleccionada", "seleccionada", "respuesta");

            boolean esCorrecta = correcta != null && correcta.equalsIgnoreCase(seleccionada);
            int puntaje = esCorrecta ? puntajeMaximo : 0;

            return DetallePreguntaCorreccionDTO.builder()
                    .puntajeMaximo(puntajeMaximo)
                    .puntajeObtenido(puntaje)
                    .esCorrecta(esCorrecta)
                    .feedback(esCorrecta ? "¡Opción correcta!" : "Opción incorrecta.")
                    .build();
        } catch (Exception e) {
            return DetallePreguntaCorreccionDTO.builder()
                    .puntajeMaximo(puntajeMaximo)
                    .puntajeObtenido(0)
                    .esCorrecta(false)
                    .feedback("Error analizando opción múltiple: " + e.getMessage())
                    .build();
        }
    }

    /**
     * Algoritmo Verdadero/Falso: Compara booleanos.
     */
    public DetallePreguntaCorreccionDTO evaluarVerdaderoFalso(String criterioJson, String respuestaJson, Integer puntajeMaximo) {
        if (respuestaJson == null || respuestaJson.trim().isEmpty()) {
            return DetallePreguntaCorreccionDTO.builder()
                    .puntajeMaximo(puntajeMaximo)
                    .puntajeObtenido(0)
                    .esCorrecta(false)
                    .feedback("No se respondió la pregunta.")
                    .build();
        }

        try {
            JsonNode criterioNode = objectMapper.readTree(criterioJson);
            JsonNode respuestaNode = objectMapper.readTree(respuestaJson);

            Boolean valorCorrecto = extraerBooleano(criterioNode, "respuesta_correcta", "correcta", "valor");
            Boolean valorAlumno = extraerBooleano(respuestaNode, "respuesta", "valor", "seleccionada");

            boolean esCorrecta = valorCorrecto != null && valorCorrecto.equals(valorAlumno);
            int puntaje = esCorrecta ? puntajeMaximo : 0;

            return DetallePreguntaCorreccionDTO.builder()
                    .puntajeMaximo(puntajeMaximo)
                    .puntajeObtenido(puntaje)
                    .esCorrecta(esCorrecta)
                    .feedback(esCorrecta ? "¡Respuesta correcta!" : "Respuesta incorrecta.")
                    .build();
        } catch (Exception e) {
            return DetallePreguntaCorreccionDTO.builder()
                    .puntajeMaximo(puntajeMaximo)
                    .puntajeObtenido(0)
                    .esCorrecta(false)
                    .feedback("Error analizando verdadero/falso: " + e.getMessage())
                    .build();
        }
    }

    /**
     * Algoritmo Ordenar: Compara arrays de secuencias. Asigna puntaje proporcional o total.
     */
    public DetallePreguntaCorreccionDTO evaluarOrdenar(String criterioJson, String respuestaJson, Integer puntajeMaximo) {
        if (respuestaJson == null || respuestaJson.trim().isEmpty()) {
            return DetallePreguntaCorreccionDTO.builder()
                    .puntajeMaximo(puntajeMaximo)
                    .puntajeObtenido(0)
                    .esCorrecta(false)
                    .feedback("No se respondió la pregunta.")
                    .build();
        }

        try {
            JsonNode criterioNode = objectMapper.readTree(criterioJson);
            JsonNode respuestaNode = objectMapper.readTree(respuestaJson);

            JsonNode seqCorrecta = extraerArray(criterioNode, "secuencia_correcta", "secuencia", "orden");
            JsonNode seqAlumno = extraerArray(respuestaNode, "secuencia", "orden", "elementos");

            if (seqCorrecta == null || !seqCorrecta.isArray() || seqAlumno == null || !seqAlumno.isArray()) {
                return DetallePreguntaCorreccionDTO.builder()
                        .puntajeMaximo(puntajeMaximo)
                        .puntajeObtenido(0)
                        .esCorrecta(false)
                        .feedback("Formato de secuencia inválido.")
                        .build();
            }

            int totalElementos = seqCorrecta.size();
            if (totalElementos == 0) {
                return DetallePreguntaCorreccionDTO.builder()
                        .puntajeMaximo(puntajeMaximo)
                        .puntajeObtenido(puntajeMaximo)
                        .esCorrecta(true)
                        .feedback("Secuencia vacía correcta.")
                        .build();
            }

            int aciertos = 0;
            int minLength = Math.min(totalElementos, seqAlumno.size());
            for (int i = 0; i < minLength; i++) {
                String elemCorrecto = seqCorrecta.get(i).asText().trim();
                String elemAlumno = seqAlumno.get(i).asText().trim();
                if (elemCorrecto.equalsIgnoreCase(elemAlumno)) {
                    aciertos++;
                }
            }

            boolean esTotalmenteCorrecta = (aciertos == totalElementos) && (seqAlumno.size() == totalElementos);
            int puntaje = esTotalmenteCorrecta ? puntajeMaximo : (int) Math.round(((double) aciertos / totalElementos) * puntajeMaximo);

            String feedback = esTotalmenteCorrecta
                    ? "¡Secuencia completamente ordenada!"
                    : String.format("Secuencia parcialmente ordenada: %d de %d elementos en posición correcta.", aciertos, totalElementos);

            return DetallePreguntaCorreccionDTO.builder()
                    .puntajeMaximo(puntajeMaximo)
                    .puntajeObtenido(puntaje)
                    .esCorrecta(esTotalmenteCorrecta)
                    .feedback(feedback)
                    .build();
        } catch (Exception e) {
            return DetallePreguntaCorreccionDTO.builder()
                    .puntajeMaximo(puntajeMaximo)
                    .puntajeObtenido(0)
                    .esCorrecta(false)
                    .feedback("Error analizando ordenamiento: " + e.getMessage())
                    .build();
        }
    }

    /**
     * Algoritmo Emparejar: Compara mapas de pares clave-valor. Asigna puntaje según pares acertados.
     */
    public DetallePreguntaCorreccionDTO evaluarEmparejar(String criterioJson, String respuestaJson, Integer puntajeMaximo) {
        if (respuestaJson == null || respuestaJson.trim().isEmpty()) {
            return DetallePreguntaCorreccionDTO.builder()
                    .puntajeMaximo(puntajeMaximo)
                    .puntajeObtenido(0)
                    .esCorrecta(false)
                    .feedback("No se respondió la pregunta.")
                    .build();
        }

        try {
            JsonNode criterioNode = objectMapper.readTree(criterioJson);
            JsonNode respuestaNode = objectMapper.readTree(respuestaJson);

            JsonNode paresCorrectos = extraerObjeto(criterioNode, "pares_correctos", "pares", "emparejamientos");
            JsonNode paresAlumno = extraerObjeto(respuestaNode, "pares", "emparejamientos", "respuestas");

            if (paresCorrectos == null || !paresCorrectos.isObject() || paresAlumno == null || !paresAlumno.isObject()) {
                return DetallePreguntaCorreccionDTO.builder()
                        .puntajeMaximo(puntajeMaximo)
                        .puntajeObtenido(0)
                        .esCorrecta(false)
                        .feedback("Formato de pares inválido.")
                        .build();
            }

            int totalPares = paresCorrectos.size();
            if (totalPares == 0) {
                return DetallePreguntaCorreccionDTO.builder()
                        .puntajeMaximo(puntajeMaximo)
                        .puntajeObtenido(puntajeMaximo)
                        .esCorrecta(true)
                        .feedback("Sin pares para emparejar.")
                        .build();
            }

            int aciertos = 0;
            Iterator<Map.Entry<String, JsonNode>> fields = paresCorrectos.fields();
            while (fields.hasNext()) {
                Map.Entry<String, JsonNode> entry = fields.next();
                String clave = entry.getKey();
                String valorEsperado = entry.getValue().asText().trim();

                if (paresAlumno.has(clave)) {
                    String valorAlumno = paresAlumno.get(clave).asText().trim();
                    if (valorEsperado.equalsIgnoreCase(valorAlumno)) {
                        aciertos++;
                    }
                }
            }

            boolean esTotalmenteCorrecta = (aciertos == totalPares);
            int puntaje = esTotalmenteCorrecta ? puntajeMaximo : (int) Math.round(((double) aciertos / totalPares) * puntajeMaximo);

            String feedback = esTotalmenteCorrecta
                    ? "¡Todos los pares fueron emparejados correctamente!"
                    : String.format("Emparejamiento parcial: %d de %d pares correctos.", aciertos, totalPares);

            return DetallePreguntaCorreccionDTO.builder()
                    .puntajeMaximo(puntajeMaximo)
                    .puntajeObtenido(puntaje)
                    .esCorrecta(esTotalmenteCorrecta)
                    .feedback(feedback)
                    .build();
        } catch (Exception e) {
            return DetallePreguntaCorreccionDTO.builder()
                    .puntajeMaximo(puntajeMaximo)
                    .puntajeObtenido(0)
                    .esCorrecta(false)
                    .feedback("Error analizando emparejamiento: " + e.getMessage())
                    .build();
        }
    }

    /**
     * Calcula la nota normalizada a escala 100 y el estado de aprobación.
     */
    public int calcularNotaGlobal(int puntosObtenidos, int puntosTotales) {
        if (puntosTotales <= 0) {
            return 0;
        }
        return (int) Math.round(((double) puntosObtenidos / puntosTotales) * 100);
    }

    public boolean determinarAprobado(int nota) {
        return nota >= 60;
    }

    // --- Métodos utilitarios de extracción ---

    private String normalizarAJson(Object obj) {
        if (obj == null) return "{}";
        if (obj instanceof String) {
            String str = (String) obj;
            if (str.trim().startsWith("{") || str.trim().startsWith("[")) {
                return str;
            }
            // Si es un texto plano, lo convertimos a objeto JSON básico
            return "{\"opcion_seleccionada\":\"" + str + "\"}";
        }
        try {
            return objectMapper.writeValueAsString(obj);
        } catch (Exception e) {
            return "{}";
        }
    }

    private String extraerTexto(JsonNode node, String... keys) {
        if (node == null) return null;
        if (node.isValueNode()) return node.asText().trim();
        for (String key : keys) {
            if (node.has(key)) {
                return node.get(key).asText().trim();
            }
        }
        return null;
    }

    private Boolean extraerBooleano(JsonNode node, String... keys) {
        if (node == null) return null;
        if (node.isBoolean()) return node.asBoolean();
        if (node.isTextual()) return Boolean.parseBoolean(node.asText());
        for (String key : keys) {
            if (node.has(key)) {
                JsonNode child = node.get(key);
                if (child.isBoolean()) return child.asBoolean();
                return Boolean.parseBoolean(child.asText());
            }
        }
        return null;
    }

    private JsonNode extraerArray(JsonNode node, String... keys) {
        if (node == null) return null;
        if (node.isArray()) return node;
        for (String key : keys) {
            if (node.has(key) && node.get(key).isArray()) {
                return node.get(key);
            }
        }
        return null;
    }

    private JsonNode extraerObjeto(JsonNode node, String... keys) {
        if (node == null) return null;
        if (node.isObject() && !tieneAlgunaClave(node, keys)) {
            return node;
        }
        for (String key : keys) {
            if (node.has(key) && node.get(key).isObject()) {
                return node.get(key);
            }
        }
        return node.isObject() ? node : null;
    }

    private boolean tieneAlgunaClave(JsonNode node, String... keys) {
        for (String key : keys) {
            if (node.has(key)) return true;
        }
        return false;
    }
}
