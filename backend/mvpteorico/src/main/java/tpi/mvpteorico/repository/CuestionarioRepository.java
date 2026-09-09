package tpi.mvpteorico.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import tpi.mvpteorico.entity.Cuestionario;

import java.util.UUID;

@Repository
public interface CuestionarioRepository extends JpaRepository<Cuestionario, UUID> {
}
