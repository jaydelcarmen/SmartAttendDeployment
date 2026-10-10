package smartattendLocal.DTO;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class ImportRowError {
    private int rowNumber;
    private String studentNumber;
    private String email;
    private String reason;
}
