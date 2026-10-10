package smartattendLocal.Repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import smartattendLocal.Entity.ImportLog;

@Repository
public interface ImportLogRepository extends JpaRepository<ImportLog, Integer> {
}
