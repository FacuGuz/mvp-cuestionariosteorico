package tpi.mvpteorico.dto;

import lombok.*;
import tpi.mvpteorico.entity.TipoPregunta;

import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DetallePreguntaCorreccionDTO {
    private UUID preguntaVersionId;
    private TipoPregunta tipo;
    private Integer puntajeMaximo;
    private Integer puntajeObtenido;
    private Boolean esCorrecta;
    private String feedback;
}
