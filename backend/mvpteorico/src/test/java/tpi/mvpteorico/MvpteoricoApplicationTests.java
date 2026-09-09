package tpi.mvpteorico;

import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;
import tpi.mvpteorico.entity.*;

import java.time.LocalDateTime;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
class MvpteoricoApplicationTests {

	@Autowired
	private EntityManager entityManager;

	@Test
	void contextLoads() {
	}

	@Test
	@Transactional
	void testEntityPersistence() {
		// 1. Crear Pregunta y PreguntaVersion
		Pregunta pregunta = Pregunta.builder()
				.profesorId(UUID.randomUUID())
				.tipo(TipoPregunta.OPCION_MULTIPLE)
				.versionActual(1)
				.bajaLogica(null)
				.build();
		entityManager.persist(pregunta);

		PreguntaVersion version = PreguntaVersion.builder()
				.pregunta(pregunta)
				.version(1)
				.enunciado("¿Cuál es un principio SOLID?")
				.payload("{\"opciones\":[\"S\",\"T\",\"U\"]}")
				.criterio("{\"correcta\":\"S\"}")
				.build();
		entityManager.persist(version);

		// 2. Crear Cuestionario y asociar PreguntaVersion
		Cuestionario cuestionario = Cuestionario.builder()
				.desafioId(UUID.randomUUID())
				.cursoCohorteId(UUID.randomUUID())
				.titulo("Cuestionario Inicial")
				.descripcion("Evaluación diagnóstica")
				.build();
		entityManager.persist(cuestionario);

		CuestionarioPregunta cp = CuestionarioPregunta.builder()
				.cuestionario(cuestionario)
				.preguntaVersion(version)
				.orden(1)
				.puntaje(10)
				.build();
		entityManager.persist(cp);

		// 3. Crear Respuesta de alumno
		UUID alumnoId = UUID.randomUUID();
		Respuesta respuesta = Respuesta.builder()
				.cuestionarioId(cuestionario.getId())
				.preguntaVersionId(version.getId())
				.alumnoId(alumnoId)
				.intento(1)
				.contenidoJson("{\"seleccion\":\"S\"}")
				.build();
		entityManager.persist(respuesta);

		// 4. Crear Corrección
		Correccion correccion = Correccion.builder()
				.cuestionarioId(cuestionario.getId())
				.alumnoId(alumnoId)
				.intento(1)
				.nota(10)
				.aprobado(true)
				.feedback("Excelente trabajo")
				.build();
		entityManager.persist(correccion);

		entityManager.flush();
		entityManager.clear();

		// Verificaciones
		Pregunta foundPregunta = entityManager.find(Pregunta.class, pregunta.getId());
		assertNotNull(foundPregunta);
		assertEquals(TipoPregunta.OPCION_MULTIPLE, foundPregunta.getTipo());

		PreguntaVersion foundVersion = entityManager.find(PreguntaVersion.class, version.getId());
		assertNotNull(foundVersion);
		assertEquals("¿Cuál es un principio SOLID?", foundVersion.getEnunciado());

		Cuestionario foundCuestionario = entityManager.find(Cuestionario.class, cuestionario.getId());
		assertNotNull(foundCuestionario);
		assertEquals("Cuestionario Inicial", foundCuestionario.getTitulo());

		Respuesta foundRespuesta = entityManager.find(Respuesta.class, respuesta.getId());
		assertNotNull(foundRespuesta);
		assertEquals(1, foundRespuesta.getIntento());

		Correccion foundCorreccion = entityManager.find(Correccion.class, correccion.getId());
		assertNotNull(foundCorreccion);
		assertTrue(foundCorreccion.getAprobado());
		assertEquals(10, foundCorreccion.getNota());
	}

}
