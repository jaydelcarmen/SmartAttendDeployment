package smartattendLocal.DTO;

import lombok.Data;
import java.util.List;

@Data
public class ImportResult {
    private int totalRows;
    private int successCount;
    private int skippedCount;
    private int failedCount;
    private List<ImportRowError> errors;
}
