package smartattendLocal.Repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;
import smartattendLocal.Entity.Student;
import java.util.List;

@Repository
public interface StudentRepository extends JpaRepository<Student, Integer> {
    boolean existsByEmailAndCardId(String email, int cardId);
    boolean existsByStudentNumberAndTeacherEmail(String studentNumber, String teacherEmail);
    List<Student> findByTeacherEmail(String teacherEmail);
    List<Student> findByCardId(int cardId);
    @Transactional
    void deleteByCardId(int cardId);
}
