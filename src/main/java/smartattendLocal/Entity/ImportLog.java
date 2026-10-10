package smartattendLocal.Entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Data
@Table(name = "import_log")
public class ImportLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private int id;

    @Column(name = "teacher_email")
    private String teacherEmail;

    @Column(name = "filename")
    private String filename;

    @Column(name = "imported_at")
    private LocalDateTime importedAt;

    @Column(name = "total_rows")
    private int totalRows;

    @Column(name = "success_count")
    private int successCount;

    @Column(name = "skipped_count")
    private int skippedCount;

    @Column(name = "failed_count")
    private int failedCount;

    @PrePersist
    public void onCreate() {
        this.importedAt = LocalDateTime.now();
    }
}
