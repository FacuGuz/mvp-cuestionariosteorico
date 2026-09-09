package tpi.mvpteorico.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import tpi.mvpteorico.dto.CrearCuestionarioDTO;
import tpi.mvpteorico.dto.CrearPreguntaDTO;
import tpi.mvpteorico.entity.TipoPregunta;
import tpi.mvpteorico.repository.CuestionarioRepository;
import tpi.mvpteorico.service.CuestionarioService;

import java.util.*;

@Slf4j
@Component
@RequiredArgsConstructor
public class DataSeeder implements CommandLineRunner {

    private final CuestionarioRepository cuestionarioRepository;
    private final CuestionarioService cuestionarioService;

    @Override
    public void run(String... args) {
        if (cuestionarioRepository.count() > 0) {
            log.info("Base de datos ya contiene cuestionarios. Omitiendo DataSeeder.");
            return;
        }

        log.info("Precargando cuestionarios de ejemplo para el frontend...");

        UUID profesorId = UUID.fromString("11111111-1111-1111-1111-111111111111");
        UUID desafioId = UUID.fromString("22222222-2222-2222-2222-222222222222");
        UUID cohorteId = UUID.fromString("33333333-3333-3333-3333-333333333333");

        // --- Cuestionario 1 ---
        List<CrearPreguntaDTO> preguntas1 = new ArrayList<>();

        // 1. Opción Múltiple
        Map<String, Object> payloadOm = new LinkedHashMap<>();
        payloadOm.put("opciones", List.of("POST", "PUT", "PATCH", "DELETE"));
        Map<String, Object> criterioOm = Map.of("opcion_correcta", "PUT");
        preguntas1.add(CrearPreguntaDTO.builder()
                .tipo(TipoPregunta.OPCION_MULTIPLE)
                .enunciado("¿Qué método HTTP se recomienda utilizar para una operación idempotente que actualiza completamente un recurso en una API REST?")
                .orden(1)
                .puntaje(25)
                .payload(payloadOm)
                .criterio(criterioOm)
                .build());

        // 2. Verdadero / Falso
        Map<String, Object> payloadVf = Map.of("opciones", List.of(true, false));
        Map<String, Object> criterioVf = Map.of("respuesta_correcta", true);
        preguntas1.add(CrearPreguntaDTO.builder()
                .tipo(TipoPregunta.VERDADERO_FALSO)
                .enunciado("En Spring Boot, el componente DispatcherServlet es el Front Controller central que intercepta todas las peticiones HTTP y las despacha a los controladores correspondientes.")
                .orden(2)
                .puntaje(25)
                .payload(payloadVf)
                .criterio(criterioVf)
                .build());

        // 3. Ordenar
        Map<String, Object> payloadOrd = Map.of("elementos", List.of(
                "HandlerInterceptor",
                "Filtro de Seguridad / Servlet Filter",
                "RestController",
                "DispatcherServlet"
        ));
        Map<String, Object> criterioOrd = Map.of("secuencia_correcta", List.of(
                "Filtro de Seguridad / Servlet Filter",
                "DispatcherServlet",
                "HandlerInterceptor",
                "RestController"
        ));
        preguntas1.add(CrearPreguntaDTO.builder()
                .tipo(TipoPregunta.ORDENAR)
                .enunciado("Ordene cronológicamente el flujo estándar de procesamiento de una petición HTTP entrante en una aplicación Spring Boot.")
                .orden(3)
                .puntaje(25)
                .payload(payloadOrd)
                .criterio(criterioOrd)
                .build());

        // 4. Emparejar
        Map<String, Object> payloadEmp = new LinkedHashMap<>();
        payloadEmp.put("columnaA", List.of("@RestController", "@Service", "@Repository", "@Configuration"));
        payloadEmp.put("columnaB", List.of(
                "Define la lógica de negocio",
                "Expone endpoints HTTP y serializa respuestas",
                "Acceso y persistencia a la base de datos",
                "Declara beans y configuraciones de Spring"
        ));
        Map<String, Object> criterioEmp = Map.of("pares_correctos", Map.of(
                "@RestController", "Expone endpoints HTTP y serializa respuestas",
                "@Service", "Define la lógica de negocio",
                "@Repository", "Acceso y persistencia a la base de datos",
                "@Configuration", "Declara beans y configuraciones de Spring"
        ));
        preguntas1.add(CrearPreguntaDTO.builder()
                .tipo(TipoPregunta.EMPAREJAR)
                .enunciado("Empareje cada anotación central de Spring con su responsabilidad en la arquitectura.")
                .orden(4)
                .puntaje(25)
                .payload(payloadEmp)
                .criterio(criterioEmp)
                .build());

        cuestionarioService.crearCuestionario(CrearCuestionarioDTO.builder()
                .desafioId(desafioId)
                .cursoCohorteId(cohorteId)
                .profesorId(profesorId)
                .titulo("Fundamentos de Arquitectura Web y Spring Boot")
                .descripcion("Evaluación sobre principios REST, flujo de peticiones en Spring Boot y anotaciones del framework.")
                .preguntas(preguntas1)
                .build());

        // --- Cuestionario 2 ---
        List<CrearPreguntaDTO> preguntas2 = new ArrayList<>();

        // 1. Opción Múltiple
        Map<String, Object> payloadOm2 = Map.of("opciones", List.of(
                "Single Responsibility Principle",
                "Open/Closed Principle",
                "Liskov Substitution Principle",
                "Dependency Inversion Principle"
        ));
        Map<String, Object> criterioOm2 = Map.of("opcion_correcta", "Dependency Inversion Principle");
        preguntas2.add(CrearPreguntaDTO.builder()
                .tipo(TipoPregunta.OPCION_MULTIPLE)
                .enunciado("¿Cuál de los principios SOLID establece que los módulos de alto nivel no deben depender de módulos de bajo nivel, sino de abstracciones?")
                .orden(1)
                .puntaje(25)
                .payload(payloadOm2)
                .criterio(criterioOm2)
                .build());

        // 2. Verdadero / Falso
        Map<String, Object> payloadVf2 = Map.of("opciones", List.of(true, false));
        Map<String, Object> criterioVf2 = Map.of("respuesta_correcta", false);
        preguntas2.add(CrearPreguntaDTO.builder()
                .tipo(TipoPregunta.VERDADERO_FALSO)
                .enunciado("El principio Open/Closed establece que las entidades de software deben estar abiertas a la modificación de código existente para incorporar nuevos requisitos.")
                .orden(2)
                .puntaje(25)
                .payload(payloadVf2)
                .criterio(criterioVf2)
                .build());

        // 3. Ordenar
        Map<String, Object> payloadOrd2 = Map.of("elementos", List.of(
                "Refactor: optimizar código sin alterar comportamiento",
                "Red: escribir un test unitario que falle",
                "Green: implementar el código mínimo para hacer pasar el test"
        ));
        Map<String, Object> criterioOrd2 = Map.of("secuencia_correcta", List.of(
                "Red: escribir un test unitario que falle",
                "Green: implementar el código mínimo para hacer pasar el test",
                "Refactor: optimizar código sin alterar comportamiento"
        ));
        preguntas2.add(CrearPreguntaDTO.builder()
                .tipo(TipoPregunta.ORDENAR)
                .enunciado("Ordene las fases del ciclo Red-Green-Refactor en TDD (Test Driven Development).")
                .orden(3)
                .puntaje(25)
                .payload(payloadOrd2)
                .criterio(criterioOrd2)
                .build());

        // 4. Emparejar
        Map<String, Object> payloadEmp2 = new LinkedHashMap<>();
        payloadEmp2.put("columnaA", List.of("Singleton", "Adapter", "Strategy"));
        payloadEmp2.put("columnaB", List.of("Creacional", "Estructural", "Comportamiento"));
        Map<String, Object> criterioEmp2 = Map.of("pares_correctos", Map.of(
                "Singleton", "Creacional",
                "Adapter", "Estructural",
                "Strategy", "Comportamiento"
        ));
        preguntas2.add(CrearPreguntaDTO.builder()
                .tipo(TipoPregunta.EMPAREJAR)
                .enunciado("Empareje cada patrón de diseño con su categoría Gang of Four (GoF).")
                .orden(4)
                .puntaje(25)
                .payload(payloadEmp2)
                .criterio(criterioEmp2)
                .build());

        cuestionarioService.crearCuestionario(CrearCuestionarioDTO.builder()
                .desafioId(desafioId)
                .cursoCohorteId(cohorteId)
                .profesorId(profesorId)
                .titulo("Principios SOLID y Calidad de Software")
                .descripcion("Cuestionario de autoevaluación sobre diseño orientado a objetos y TDD.")
                .preguntas(preguntas2)
                .build());

        log.info("Cuestionarios de ejemplo precargados exitosamente.");
    }
}
