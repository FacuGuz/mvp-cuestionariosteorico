package tpi.mvpteorico.dto;

import lombok.*;

import java.util.List;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CrearCuestionarioDTO {
    private UUID desafioId;
    private UUID cursoCohorteId;
    private UUID profesorId;
    private String titulo;
    private String descripcion;
    private List<CrearPreguntaDTO> preguntas;
}
