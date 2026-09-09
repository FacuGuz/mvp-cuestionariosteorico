package tpi.mvpteorico.dto;

import lombok.*;

import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RespuestaEnvioDTO {
    private UUID preguntaVersionId;
    private Object respuesta;
}
