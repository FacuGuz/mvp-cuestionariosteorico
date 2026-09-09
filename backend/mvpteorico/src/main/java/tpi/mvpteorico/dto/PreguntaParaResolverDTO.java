package tpi.mvpteorico.dto;

import lombok.*;
import tpi.mvpteorico.entity.TipoPregunta;

import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PreguntaParaResolverDTO {
    private UUID preguntaVersionId;
    private TipoPregunta tipo;
    private String enunciado;
    private Integer orden;
    private Integer puntaje;
    private Object payload;
}
