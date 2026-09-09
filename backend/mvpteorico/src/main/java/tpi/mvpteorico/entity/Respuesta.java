package tpi.mvpteorico.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Entity
@Table(name = "respuestas")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Respuesta {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "cuestionario_id", nullable = false)
    private UUID cuestionarioId;

    @Column(name = "pregunta_version_id", nullable = false)
    private UUID preguntaVersionId;

    @Column(name = "alumno_id", nullable = false)
    private UUID alumnoId;

    @Column(name = "intento", nullable = false)
    private Integer intento;

    @Column(name = "contenido_json", columnDefinition = "TEXT", nullable = false)
    private String contenidoJson;
}
