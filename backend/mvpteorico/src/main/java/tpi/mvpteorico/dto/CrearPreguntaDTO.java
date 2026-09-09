package tpi.mvpteorico.dto;

import lombok.*;
import tpi.mvpteorico.entity.TipoPregunta;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CrearPreguntaDTO {
    private TipoPregunta tipo;
    private String enunciado;
    private Integer orden;
    private Integer puntaje;
    private Object payload;
    private Object criterio;
}
