package smartattendLocal.Entity;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;

@Entity
@Data
@Table(name = "STUDENT")
public class Student {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "ID")
    private int id;

    @Column(name = "student_number")
    private String studentNumber;

    @Column(name = "SEX")
    private String sex;

    @Column(name = "NAME")
    private String name;

    @Column(name = "EMAIL")
    private String email;

    @Column(name = "QR_CODE")
    private String qrCode;

    @Column(name = "QR_EXPIRY")
    private LocalDateTime qrExpiry;

    @ManyToOne
    @JoinColumn(name = "TEACHER_ID",referencedColumnName = "ID", nullable = false)
    private Teacher teacher;

    @ManyToOne
    @JoinColumn(name = "CARD_ID",referencedColumnName = "ID", nullable = false)
    private Card card;
}
