package tpi.mvpteorico.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "preguntas")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Pregunta {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "profesor_id", nullable = false)
    private UUID profesorId;

    @Enumerated(EnumType.STRING)
    @Column(name = "tipo", nullable = false)
    private TipoPregunta tipo;

    @Column(name = "version_actual", nullable = false)
    @Builder.Default
    private Integer versionActual = 1;

    @Column(name = "baja_logica")
    private LocalDateTime bajaLogica;

    @JsonIgnore
    @OneToMany(mappedBy = "pregunta", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<PreguntaVersion> versiones = new ArrayList<>();
}
