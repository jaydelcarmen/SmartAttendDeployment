package smartattendLocal.Controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import java.time.LocalDateTime;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import smartattendLocal.DTO.ImportResult;
import smartattendLocal.Entity.Card;
import smartattendLocal.QRCodeGenerator;
import smartattendLocal.Entity.Student;
import smartattendLocal.Entity.Teacher;
import smartattendLocal.Repository.CardsRepository;
import smartattendLocal.Repository.StudentRepository;
import smartattendLocal.Repository.TeacherRepository;
import smartattendLocal.Service.StudentImportService;


@RestController
@RequestMapping("/students")
public class StudentController {

    private static final Logger logger = LoggerFactory.getLogger(StudentController.class);

    private static final String BREVO_EMAIL_API_URL = "https://api.brevo.com/v3/smtp/email";
    private static final String DEFAULT_SENDER_EMAIL = "smart.attend22526@gmail.com";
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();
    private static final HttpClient HTTP_CLIENT = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    @Autowired
    private StudentRepository studentRepository;

    @Autowired
    private TeacherRepository teacherRepository;

    @Autowired
    private CardsRepository cardsRepository;

    @Autowired
    private StudentImportService studentImportService;

    // ── Bulk import endpoints ─────────────────────────────────────────────────

    @PostMapping("/import")
    public ResponseEntity<?> importStudents(
            @RequestParam("file") MultipartFile file,
            @RequestParam("cardId") int cardId,
            Authentication authentication) {

        Teacher teacher = teacherRepository.findByEmail(authentication.getName());
        if (teacher == null) return ResponseEntity.badRequest().body("Teacher not found");

        try {
            ImportResult result = studentImportService.importStudents(file, cardId, teacher);
            return ResponseEntity.ok(result);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            logger.error("Import failed", e);
            return ResponseEntity.internalServerError().body("Import failed: " + e.getMessage());
        }
    }

    @GetMapping("/import/template")
    public ResponseEntity<byte[]> downloadTemplate() {
        try {
            byte[] bytes = studentImportService.buildTemplate();
            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"student_import_template.xlsx\"")
                    .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                    .body(bytes);
        } catch (Exception e) {
            logger.error("Template generation failed", e);
            return ResponseEntity.internalServerError().build();
        }
    }

    @PostMapping("/{cardId}/add")
    public ResponseEntity<?> addStudent(@PathVariable int cardId, @RequestBody Student student, Authentication authentication) {
        
        Teacher teacher = teacherRepository.findByEmail(authentication.getName());
        student.setTeacher(teacher);

        Card card = cardsRepository.findById(cardId)
                .orElseThrow(() -> new RuntimeException("Card not found"));
        student.setCard(card);


        if (studentRepository.existsByEmailAndCardId(student.getEmail(), cardId)) {
            return ResponseEntity
                    .badRequest()
                    .body("Email Already Exists");
        }

        if (studentRepository.existsByStudentNumberAndTeacherEmail(student.getStudentNumber(), teacher.getEmail())) {
            return ResponseEntity
                    .badRequest()
                    .body("Student Number Already Exists");
        }

        Student savedStudent = studentRepository.save(student);

        return ResponseEntity.ok(savedStudent);
    }

    @PostMapping("/{id}/send-qr")
    public ResponseEntity<?> sendQRCode(@PathVariable int id) {

        Student student = studentRepository.findById(id).orElse(null);
        if (student == null) {
            return ResponseEntity.badRequest().body("Student not found");
        }

        String qrCode = "CID:" + student.getCard().getId() + "|SID:" + student.getId() + "|R:" + UUID.randomUUID().toString().substring(0,5);
        student.setQrCode(qrCode);
        student.setQrExpiry(LocalDateTime.now().plusMinutes(10));
        studentRepository.save(student);


        try {

            byte[] qrImage = QRCodeGenerator.generateQRCodeImage(
                    student.getQrCode(),
                    200,
                    200
            );
            sendEmail(student.getEmail(), qrImage);
        } catch (Exception e) {
           logger.error("failed to send QR code", e);
           return ResponseEntity.badRequest().body("Failed to send QR code: " + e.getMessage());
        }

        return ResponseEntity.ok("QR sent successfully");

    }

    @PostMapping("/{cardId}/send-qrForAll")
    public ResponseEntity<?> sendQRCodeByWhole(@PathVariable int cardId) {
        List<Student> students = studentRepository.findByCardId(cardId);

        if (students.isEmpty()) {
            return ResponseEntity.badRequest().body("No students found for this card");
        }

        for (Student student : students) {
                String qrCode = "CID:" + student.getCard().getName() + "|SID:" + student.getId() + "|R:" + UUID.randomUUID().toString().substring(0,5);
                student.setQrCode(qrCode);
                student.setQrExpiry(LocalDateTime.now().plusMinutes(10));
                studentRepository.save(student);

            try {

                byte[] qrImage = QRCodeGenerator.generateQRCodeImage(
                        student.getQrCode(),
                        200,
                        200
                );
                if (student.getEmail() != null) {
                    sendEmail(student.getEmail(), qrImage);
                    Thread.sleep(200);
                }
            } catch (Exception e) {
                logger.error("failed to send QR code" + student.getEmail(), e);
            }
        }

        return ResponseEntity.ok("QR sent successfully");

    }

    /**
     * Sends the QR code email through Brevo's transactional email HTTPS API
     * (SMTP is blocked on Railway's Hobby plan). Throws on any failure so callers
     * can log "failed to send QR code" and report the error.
     */
    private void sendEmail(String studentEmail, byte[] qrImage) throws Exception {

        String apiKey = System.getenv("BREVO_API_KEY");
        if (apiKey == null || apiKey.isBlank()) {
            throw new IllegalStateException("BREVO_API_KEY environment variable is not set");
        }

        String senderEmail = System.getenv("BREVO_EMAIL");
        if (senderEmail == null || senderEmail.isBlank()) {
            senderEmail = DEFAULT_SENDER_EMAIL;
        }

        // The QR image is sent as an attachment (Brevo's API has no cid: inline support).
        String htmlContent = """
            <h2>SmartAttend QR Code</h2>
            <p>Hello,</p>
            <p>Please use this QR code for your attendance. It is attached to this email as qr.png.</p>
            <br>
            <p>Keep this QR safe.</p>
            <br>
            <p>It will expire in 10 minutes.</p>
        """;

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("sender", Map.of("name", "SmartAttend", "email", senderEmail));
        payload.put("to", List.of(Map.of("email", studentEmail)));
        payload.put("subject", "Your SmartAttend QR Code");
        payload.put("htmlContent", htmlContent);
        payload.put("attachment", List.of(Map.of(
                "name", "qr.png",
                "content", Base64.getEncoder().encodeToString(qrImage))));

        String body = OBJECT_MAPPER.writeValueAsString(payload);

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(BREVO_EMAIL_API_URL))
                .timeout(Duration.ofSeconds(30))
                .header("api-key", apiKey)
                .header("Content-Type", "application/json")
                .header("Accept", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(body))
                .build();

        HttpResponse<String> response = HTTP_CLIENT.send(request, HttpResponse.BodyHandlers.ofString());
        int status = response.statusCode();

        if (status < 200 || status >= 300) {
            throw new IllegalStateException(
                    "Brevo API returned status " + status + ": " + response.body());
        }

        logger.info("Email sent successfully to {}", studentEmail);
    }

    @GetMapping("/{cardId}/students")
    public  ResponseEntity<?> getStudentsByCard(@PathVariable int cardId, Authentication authentication){
        List<Student> students = studentRepository.findByCardId(cardId);
        String teacherEmail = authentication.getName();

        if (teacherEmail == null || teacherEmail.isEmpty()) {
            throw new RuntimeException("Teacher not found");
        }

        return ResponseEntity.ok(students);
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateStudent(@PathVariable int id, @RequestBody Student student, Authentication authentication) {
        String teacherEmail = authentication.getName();
        Teacher teacher = teacherRepository.findByEmail(teacherEmail);
        if (teacher == null) {
            return ResponseEntity
                    .badRequest()
                    .body("Teacher not found");
        }

        Student existing = studentRepository.findById(id).orElse(null);

        if (existing == null) {
            return ResponseEntity
                    .badRequest()
                    .body("Student not found");
        }

        if (student.getName() != null) {
            existing.setName(student.getName());
        }

        if (student.getStudentNumber() != null) {
            if (!student.getStudentNumber().equals(existing.getStudentNumber()) &&
                    studentRepository.existsByStudentNumberAndTeacherEmail(student.getStudentNumber(), teacherEmail)) {
                return ResponseEntity.badRequest().body("Student Number Already Exists");
            }
            existing.setStudentNumber(student.getStudentNumber());
        }

        if (student.getEmail() != null) {
            existing.setEmail(student.getEmail());
        }

        if (student.getSex() != null) {
            existing.setSex(student.getSex());
        }

        studentRepository.save(existing);
        return ResponseEntity.ok(student);
    }

    // DELETE NG STUDENT
    @DeleteMapping("/delete/{id}")
    public ResponseEntity<?> deleteStudent(@PathVariable int id, Authentication authentication) {
        String teacherEmail = authentication.getName();
        Teacher teacher = teacherRepository.findByEmail(teacherEmail);
        if (teacher == null) {
            return  ResponseEntity
                    .badRequest()
                    .body("Teacher not found");
        }
        studentRepository.deleteById(id);
        return ResponseEntity.ok("Student with id " + id + " has been deleted");
    }
}
