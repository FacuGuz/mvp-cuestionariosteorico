package tpi.mvpteorico.dto;

import lombok.*;

import java.util.List;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CuestionarioDetalleDTO {
    private UUID id;
    private UUID desafioId;
    private UUID cursoCohorteId;
    private String titulo;
    private String descripcion;
    private Integer puntajeTotal;
    private Boolean activo;
    private List<PreguntaParaResolverDTO> preguntas;
}
