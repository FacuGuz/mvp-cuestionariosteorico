package tpi.mvpteorico.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import tpi.mvpteorico.entity.Correccion;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CorreccionRepository extends JpaRepository<Correccion, UUID> {
    Optional<Correccion> findTopByCuestionarioIdAndAlumnoIdOrderByIntentoDesc(UUID cuestionarioId, UUID alumnoId);
    List<Correccion> findByCuestionarioIdAndAlumnoId(UUID cuestionarioId, UUID alumnoId);
}
