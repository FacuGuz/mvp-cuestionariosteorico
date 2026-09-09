package tpi.mvpteorico.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import tpi.mvpteorico.entity.Respuesta;

import java.util.List;
import java.util.UUID;

@Repository
public interface RespuestaRepository extends JpaRepository<Respuesta, UUID> {
    List<Respuesta> findByCuestionarioIdAndAlumnoIdAndIntento(UUID cuestionarioId, UUID alumnoId, Integer intento);
}
