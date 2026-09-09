package tpi.mvpteorico.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Entity
@Table(name = "pregunta_versiones")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PreguntaVersion {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "pregunta_id", nullable = false)
    @JsonIgnore
    private Pregunta pregunta;

    @Column(name = "version", nullable = false)
    private Integer version;

    @Column(name = "enunciado", columnDefinition = "TEXT", nullable = false)
    private String enunciado;

    @Column(name = "payload", columnDefinition = "TEXT")
    private String payload;

    /**
     * Solución correcta / rúbrica de corrección.
     * ADVERTENCIA: Nunca exponer al alumno.
     */
    @JsonIgnore
    @Column(name = "criterio", columnDefinition = "TEXT")
    private String criterio;
}
