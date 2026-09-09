package tpi.mvpteorico.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "cuestionarios")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Cuestionario {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "desafio_id", nullable = false)
    private UUID desafioId;

    @Column(name = "curso_cohorte_id", nullable = false)
    private UUID cursoCohorteId;

    @Column(name = "titulo", nullable = false)
    private String titulo;

    @Column(name = "descripcion", columnDefinition = "TEXT")
    private String descripcion;

    @Column(name = "activo", nullable = false)
    @Builder.Default
    private Boolean activo = true;

    @Column(name = "baja_logica")
    private LocalDateTime bajaLogica;

    @OneToMany(mappedBy = "cuestionario", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("orden ASC")
    @Builder.Default
    private List<CuestionarioPregunta> preguntas = new ArrayList<>();
}
