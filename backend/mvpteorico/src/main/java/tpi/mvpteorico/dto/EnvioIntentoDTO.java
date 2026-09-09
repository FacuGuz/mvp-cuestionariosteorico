package tpi.mvpteorico.dto;

import lombok.*;

import java.util.List;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EnvioIntentoDTO {
    private UUID alumnoId;
    private List<RespuestaEnvioDTO> respuestas;
}
