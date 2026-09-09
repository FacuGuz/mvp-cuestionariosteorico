package tpi.mvpteorico.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import tpi.mvpteorico.entity.PreguntaVersion;

import java.util.UUID;

@Repository
public interface PreguntaVersionRepository extends JpaRepository<PreguntaVersion, UUID> {
}
