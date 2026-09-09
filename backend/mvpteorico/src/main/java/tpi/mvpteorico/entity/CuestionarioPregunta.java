package tpi.mvpteorico.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Entity
@Table(name = "cuestionario_preguntas")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CuestionarioPregunta {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cuestionario_id", nullable = false)
    @JsonIgnore
    private Cuestionario cuestionario;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "pregunta_version_id", nullable = false)
    private PreguntaVersion preguntaVersion;

    @Column(name = "orden", nullable = false)
    private Integer orden;

    @Column(name = "puntaje", nullable = false)
    private Integer puntaje;
}
