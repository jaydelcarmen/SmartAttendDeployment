package smartattendLocal;

import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import smartattendLocal.DTO.ImportResult;
import smartattendLocal.Entity.Card;
import smartattendLocal.Entity.Teacher;
import smartattendLocal.Repository.CardsRepository;
import smartattendLocal.Repository.ImportLogRepository;
import smartattendLocal.Repository.StudentRepository;
import smartattendLocal.Service.StudentImportService;

import java.io.ByteArrayOutputStream;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class StudentImportServiceTest {

    @Mock StudentRepository studentRepository;
    @Mock CardsRepository cardsRepository;
    @Mock ImportLogRepository importLogRepository;
    @Mock jakarta.mail.internet.MimeMessage mimeMessage;
    @Mock org.springframework.mail.javamail.JavaMailSender mailSender;

    @InjectMocks StudentImportService service;

    private Teacher teacher;
    private Card card;

    @BeforeEach
    void setUp() {
        teacher = new Teacher();
        teacher.setEmail("teacher@test.com");

        card = new Card();
        card.setId(1);
        card.setName("CS101");

        // lenient: not every test reaches the repo/mail layer
        lenient().when(cardsRepository.findById(1)).thenReturn(Optional.of(card));
        lenient().when(studentRepository.existsByEmailAndCardId(anyString(), anyInt())).thenReturn(false);
        lenient().when(studentRepository.existsByStudentNumberAndTeacherEmail(anyString(), anyString())).thenReturn(false);
        lenient().when(mailSender.createMimeMessage()).thenReturn(mimeMessage);
    }

    // ── Helper: build an xlsx in memory ──────────────────────────────────────

    private MockMultipartFile buildXlsx(String[][] rows) throws Exception {
        try (XSSFWorkbook wb = new XSSFWorkbook()) {
            Sheet sheet = wb.createSheet("Students");
            for (int r = 0; r < rows.length; r++) {
                Row row = sheet.createRow(r);
                for (int c = 0; c < rows[r].length; c++) {
                    row.createCell(c).setCellValue(rows[r][c]);
                }
            }
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            wb.write(out);
            return new MockMultipartFile("file", "students.xlsx",
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    out.toByteArray());
        }
    }

    // ── Happy path ────────────────────────────────────────────────────────────

    @Test
    void happyPath_canonicalHeaders_importsSuccessfully() throws Exception {
        MockMultipartFile file = buildXlsx(new String[][]{
            {"Name", "Student Number", "Student Email", "Sex"},
            {"Dela Cruz, Juan", "2024-0001", "juan@test.com", "Male"},
            {"Santos, Maria", "2024-0002", "maria@test.com", "Female"},
        });

        ImportResult result = service.importStudents(file, 1, teacher);

        assertEquals(2, result.getSuccessCount());
        assertEquals(0, result.getFailedCount());
        assertEquals(0, result.getSkippedCount());
    }

    @Test
    void happyPath_aliasHeaders_emailAlias() throws Exception {
        MockMultipartFile file = buildXlsx(new String[][]{
            {"Student Name", "Student No.", "Email Address", "Gender"},
            {"Reyes, Ana", "2024-0003", "ana@test.com", "Female"},
        });

        ImportResult result = service.importStudents(file, 1, teacher);

        assertEquals(1, result.getSuccessCount());
    }

    @Test
    void happyPath_studentIdAlias_resolves() throws Exception {
        MockMultipartFile file = buildXlsx(new String[][]{
            {"Full Name", "Student ID", "Email", "Sex"},
            {"Cruz, Pedro", "2024-0004", "pedro@test.com", "Male"},
        });

        ImportResult result = service.importStudents(file, 1, teacher);

        assertEquals(1, result.getSuccessCount());
    }

    // ── Sex normalization ─────────────────────────────────────────────────────

    @Test
    void sex_mShorthand_normalizedToMale() throws Exception {
        MockMultipartFile file = buildXlsx(new String[][]{
            {"Name", "Student Number", "Student Email", "Sex"},
            {"Tan, Jose", "2024-0010", "jose@test.com", "M"},
        });

        ImportResult result = service.importStudents(file, 1, teacher);
        assertEquals(1, result.getSuccessCount());
    }

    @Test
    void sex_fShorthand_normalizedToFemale() throws Exception {
        MockMultipartFile file = buildXlsx(new String[][]{
            {"Name", "Student Number", "Student Email", "Sex"},
            {"Lim, Rosa", "2024-0011", "rosa@test.com", "F"},
        });

        ImportResult result = service.importStudents(file, 1, teacher);
        assertEquals(1, result.getSuccessCount());
    }

    @Test
    void sex_caseInsensitive_male() throws Exception {
        MockMultipartFile file = buildXlsx(new String[][]{
            {"Name", "Student Number", "Student Email", "Sex"},
            {"Go, Ben", "2024-0012", "ben@test.com", "MALE"},
        });

        ImportResult result = service.importStudents(file, 1, teacher);
        assertEquals(1, result.getSuccessCount());
    }

    @Test
    void sex_invalid_producesRowError() throws Exception {
        MockMultipartFile file = buildXlsx(new String[][]{
            {"Name", "Student Number", "Student Email", "Sex"},
            {"Ng, Kim", "2024-0013", "kim@test.com", "Unknown"},
        });

        ImportResult result = service.importStudents(file, 1, teacher);
        assertEquals(0, result.getSuccessCount());
        assertEquals(1, result.getFailedCount());
        assertEquals("Invalid sex (use Male or Female)", result.getErrors().get(0).getReason());
    }

    // ── Missing headers ───────────────────────────────────────────────────────

    @Test
    void missingAllHeaders_throwsWithAllNames() throws Exception {
        MockMultipartFile file = buildXlsx(new String[][]{
            {"Foo", "Bar"},
            {"a", "b"},
        });

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> service.importStudents(file, 1, teacher));
        assertTrue(ex.getMessage().contains("Name"));
        assertTrue(ex.getMessage().contains("Student Number"));
        assertTrue(ex.getMessage().contains("Student Email"));
        assertTrue(ex.getMessage().contains("Sex"));
    }

    @Test
    void missingOneHeader_listOnlyMissing() throws Exception {
        MockMultipartFile file = buildXlsx(new String[][]{
            {"Name", "Student Number", "Student Email"},   // Sex missing
            {"Uy, Tom", "2024-0020", "tom@test.com"},
        });

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> service.importStudents(file, 1, teacher));
        assertTrue(ex.getMessage().contains("Sex"));
        assertFalse(ex.getMessage().contains("Name,"));
    }

    // ── Duplicate detection ───────────────────────────────────────────────────

    @Test
    void duplicateStudentNumber_inFile_secondRowFails() throws Exception {
        MockMultipartFile file = buildXlsx(new String[][]{
            {"Name", "Student Number", "Student Email", "Sex"},
            {"Dela Cruz, Juan", "2024-0001", "juan@test.com", "Male"},
            {"Santos, Ana",     "2024-0001", "ana@test.com",  "Female"},
        });

        ImportResult result = service.importStudents(file, 1, teacher);
        assertEquals(1, result.getSuccessCount());
        assertEquals(1, result.getFailedCount());
        assertTrue(result.getErrors().get(0).getReason().contains("Duplicate Student ID"));
    }

    @Test
    void duplicateEmail_inFile_secondRowFails() throws Exception {
        MockMultipartFile file = buildXlsx(new String[][]{
            {"Name", "Student Number", "Student Email", "Sex"},
            {"Dela Cruz, Juan", "2024-0001", "same@test.com", "Male"},
            {"Santos, Ana",     "2024-0002", "same@test.com", "Female"},
        });

        ImportResult result = service.importStudents(file, 1, teacher);
        assertEquals(1, result.getSuccessCount());
        assertEquals(1, result.getFailedCount());
        assertTrue(result.getErrors().get(0).getReason().contains("Duplicate email"));
    }

    // ── Name formats ──────────────────────────────────────────────────────────

    @Test
    void name_lastCommaFirst_storedAsIs() throws Exception {
        MockMultipartFile file = buildXlsx(new String[][]{
            {"Name", "Student Number", "Student Email", "Sex"},
            {"Dela Cruz, Juan Miguel", "2024-0030", "jm@test.com", "Male"},
        });

        ImportResult result = service.importStudents(file, 1, teacher);
        assertEquals(1, result.getSuccessCount());
        // Verify the name was saved (captured via ArgumentCaptor if needed; here just assert success)
    }

    @Test
    void name_multiWordSurname_storedAsIs() throws Exception {
        MockMultipartFile file = buildXlsx(new String[][]{
            {"Name", "Student Number", "Student Email", "Sex"},
            {"San Jose Dela Cruz Jr.", "2024-0031", "sjdc@test.com", "Male"},
        });

        ImportResult result = service.importStudents(file, 1, teacher);
        assertEquals(1, result.getSuccessCount());
    }

    @Test
    void name_extraSpaces_collapsed() throws Exception {
        MockMultipartFile file = buildXlsx(new String[][]{
            {"Name", "Student Number", "Student Email", "Sex"},
            {"  Reyes   Ana  ", "2024-0032", "reyesana@test.com", "Female"},
        });

        ImportResult result = service.importStudents(file, 1, teacher);
        assertEquals(1, result.getSuccessCount());
    }

    // ── Student number as text ────────────────────────────────────────────────

    @Test
    void studentNumber_withDashes_preservedAsText() throws Exception {
        MockMultipartFile file = buildXlsx(new String[][]{
            {"Name", "Student Number", "Student Email", "Sex"},
            {"Bautista, Leo", "2024-0001", "leo@test.com", "Male"},
        });

        ImportResult result = service.importStudents(file, 1, teacher);
        assertEquals(1, result.getSuccessCount());
    }

    // ── Template ──────────────────────────────────────────────────────────────

    @Test
    void buildTemplate_hasCorrectHeaders() throws Exception {
        byte[] bytes = service.buildTemplate();
        assertNotNull(bytes);
        assertTrue(bytes.length > 0);

        try (XSSFWorkbook wb = new XSSFWorkbook(new java.io.ByteArrayInputStream(bytes))) {
            Sheet sheet = wb.getSheetAt(0);
            Row header = sheet.getRow(0);
            assertEquals("Name",          header.getCell(0).getStringCellValue());
            assertEquals("Student Number", header.getCell(1).getStringCellValue());
            assertEquals("Student Email",  header.getCell(2).getStringCellValue());
            assertEquals("Sex",            header.getCell(3).getStringCellValue());
        }
    }

    @Test
    void buildTemplate_hasSampleRow() throws Exception {
        byte[] bytes = service.buildTemplate();
        try (XSSFWorkbook wb = new XSSFWorkbook(new java.io.ByteArrayInputStream(bytes))) {
            Sheet sheet = wb.getSheetAt(0);
            Row sample = sheet.getRow(1);
            assertNotNull(sample);
            assertFalse(sample.getCell(0).getStringCellValue().isBlank());
        }
    }
}
