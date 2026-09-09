package tpi.mvpteorico.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import tpi.mvpteorico.entity.CuestionarioPregunta;

import java.util.List;
import java.util.UUID;

@Repository
public interface CuestionarioPreguntaRepository extends JpaRepository<CuestionarioPregunta, UUID> {
    List<CuestionarioPregunta> findByCuestionarioIdOrderByOrdenAsc(UUID cuestionarioId);
}
