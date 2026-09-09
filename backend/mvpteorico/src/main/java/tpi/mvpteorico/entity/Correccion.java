package tpi.mvpteorico.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Entity
@Table(name = "correcciones")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Correccion {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "cuestionario_id", nullable = false)
    private UUID cuestionarioId;

    @Column(name = "alumno_id", nullable = false)
    private UUID alumnoId;

    @Column(name = "intento", nullable = false)
    private Integer intento;

    @Column(name = "nota", nullable = false)
    private Integer nota;

    @Column(name = "aprobado", nullable = false)
    private Boolean aprobado;

    @Column(name = "feedback", columnDefinition = "TEXT")
    private String feedback;
}
