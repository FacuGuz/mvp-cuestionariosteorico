package tpi.mvpteorico.dto;

import lombok.*;

import java.util.List;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ResultadoCorreccionDTO {
    private UUID cuestionarioId;
    private UUID alumnoId;
    private Integer intento;
    private Integer nota;
    private Boolean aprobado;
    private String feedback;
    private List<DetallePreguntaCorreccionDTO> detalle;
}
