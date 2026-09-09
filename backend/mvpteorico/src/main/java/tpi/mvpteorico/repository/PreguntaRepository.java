package tpi.mvpteorico.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import tpi.mvpteorico.entity.Pregunta;

import java.util.UUID;

@Repository
public interface PreguntaRepository extends JpaRepository<Pregunta, UUID> {
}
