package tpi.mvpteorico.dto;

import lombok.*;

import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CuestionarioResumenDTO {
    private UUID id;
    private UUID desafioId;
    private UUID cursoCohorteId;
    private String titulo;
    private String descripcion;
    private Integer cantidadPreguntas;
    private Integer puntajeTotal;
    private Boolean activo;
}
