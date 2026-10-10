package smartattendLocal.Service;

import jakarta.mail.internet.MimeMessage;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.apache.poi.hssf.usermodel.HSSFWorkbook;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import smartattendLocal.DTO.ImportResult;
import smartattendLocal.DTO.ImportRowError;
import smartattendLocal.Entity.Card;
import smartattendLocal.Entity.ImportLog;
import smartattendLocal.Entity.Student;
import smartattendLocal.Entity.Teacher;
import smartattendLocal.Repository.CardsRepository;
import smartattendLocal.Repository.ImportLogRepository;
import smartattendLocal.Repository.StudentRepository;

import java.io.InputStream;
import java.util.*;
import java.util.regex.Pattern;

@Service
public class StudentImportService {

    private static final Logger log = LoggerFactory.getLogger(StudentImportService.class);
    private static final Pattern EMAIL_PATTERN = Pattern.compile("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");
    private static final int MAX_ROWS = 1000;
    private static final long MAX_BYTES = 5L * 1024 * 1024; // 5 MB

    // Canonical display names for error messages
    private static final List<String> REQUIRED_DISPLAY = List.of("Name", "Student Number", "Student Email", "Sex");

    // Aliases per column (all lowercase, trimmed)
    private static final List<List<String>> HEADER_ALIASES = List.of(
        List.of("name", "full name", "student name"),                                    // Name
        List.of("student number", "student no", "student no.", "student id", "student_number"), // Student Number
        List.of("student email", "email", "email address"),                              // Student Email
        List.of("sex", "gender")                                                         // Sex
    );

    @Autowired private StudentRepository studentRepository;
    @Autowired private CardsRepository cardsRepository;
    @Autowired private ImportLogRepository importLogRepository;
    @Autowired private JavaMailSender mailSender;

    // ── Public entry point ────────────────────────────────────────────────────

    public ImportResult importStudents(MultipartFile file, int cardId, Teacher teacher) throws Exception {

        // --- file-level guards ---
        if (file.getSize() > MAX_BYTES)
            throw new IllegalArgumentException("File exceeds the 5 MB limit.");

        String originalName = file.getOriginalFilename() == null ? "" : file.getOriginalFilename().toLowerCase();
        boolean isXlsx = originalName.endsWith(".xlsx");
        boolean isXls  = originalName.endsWith(".xls");
        if (!isXlsx && !isXls)
            throw new IllegalArgumentException("Only .xlsx or .xls files are accepted.");

        Card card = cardsRepository.findById(cardId)
                .orElseThrow(() -> new IllegalArgumentException("Class/card not found: " + cardId));

        // --- parse workbook ---
        Workbook workbook;
        try (InputStream is = file.getInputStream()) {
            workbook = isXlsx ? new XSSFWorkbook(is) : new HSSFWorkbook(is);
        } catch (Exception e) {
            throw new IllegalArgumentException("Could not read the Excel file. It may be corrupted or password-protected.");
        }

        Sheet sheet = workbook.getSheetAt(0);
        if (sheet == null) throw new IllegalArgumentException("The workbook contains no sheets.");

        // --- read & validate headers ---
        Row headerRow = sheet.getRow(0);
        if (headerRow == null) throw new IllegalArgumentException("The file appears to be empty.");

        Map<String, Integer> colIndex = buildColumnIndex(headerRow);
        // Resolve each required column via aliases
        Integer[] resolved = resolveColumns(colIndex);
        List<String> missing = new ArrayList<>();
        for (int ci = 0; ci < resolved.length; ci++) {
            if (resolved[ci] == null) missing.add(REQUIRED_DISPLAY.get(ci));
        }
        if (!missing.isEmpty())
            throw new IllegalArgumentException("Missing required columns: " + String.join(", ", missing));

        int colName   = resolved[0];
        int colStudNo = resolved[1];
        int colEmail  = resolved[2];
        int colSex    = resolved[3];

        // --- process rows ---
        ImportResult result = new ImportResult();
        List<ImportRowError> errors = new ArrayList<>();
        int successCount = 0, skippedCount = 0, failedCount = 0;

        // track emails seen in this file to catch intra-file duplicates
        Set<String> seenEmails   = new HashSet<>();
        Set<String> seenStudNums = new HashSet<>();

        int lastRowNum = sheet.getLastRowNum();
        int dataRows   = Math.min(lastRowNum, MAX_ROWS); // cap at 1000

        int[] requiredCols = {colName, colStudNo, colEmail, colSex};
        for (int i = 1; i <= dataRows; i++) {
            Row row = sheet.getRow(i);
            if (isBlankRow(row, requiredCols)) continue;

            int rowNum = i + 1; // 1-based for user display

            // --- extract fields ---
            String fullName      = sanitize(collapseSpaces(readCell(row, colName)));
            String studentNumber = sanitize(readCell(row, colStudNo));
            String email         = sanitize(readCell(row, colEmail)).toLowerCase();
            String rawSex        = sanitize(readCell(row, colSex));
            String sex           = normalizeSex(rawSex);

            // --- per-row validation ---
            if (fullName.isEmpty()) {
                errors.add(new ImportRowError(rowNum, studentNumber, email, "Missing Name"));
                failedCount++; continue;
            }
            if (studentNumber.isEmpty()) {
                errors.add(new ImportRowError(rowNum, studentNumber, email, "Missing Student Number"));
                failedCount++; continue;
            }
            if (email.isEmpty() || !EMAIL_PATTERN.matcher(email).matches()) {
                errors.add(new ImportRowError(rowNum, studentNumber, email, "Invalid email format"));
                failedCount++; continue;
            }
            if (sex == null) {
                errors.add(new ImportRowError(rowNum, studentNumber, email, "Invalid sex (use Male or Female)"));
                failedCount++; continue;
            }

            // intra-file duplicate email
            if (seenEmails.contains(email)) {
                errors.add(new ImportRowError(rowNum, studentNumber, email, "Duplicate email in file"));
                failedCount++; continue;
            }
            // intra-file duplicate student number
            if (seenStudNums.contains(studentNumber)) {
                errors.add(new ImportRowError(rowNum, studentNumber, email, "Duplicate Student ID in file"));
                failedCount++; continue;
            }

            // database duplicate email in this card
            if (studentRepository.existsByEmailAndCardId(email, cardId)) {
                errors.add(new ImportRowError(rowNum, studentNumber, email, "Already exists in this class"));
                skippedCount++; continue;
            }
            // database duplicate student number for this teacher
            if (studentRepository.existsByStudentNumberAndTeacherEmail(studentNumber, teacher.getEmail())) {
                errors.add(new ImportRowError(rowNum, studentNumber, email, "Student ID already exists for this teacher"));
                skippedCount++; continue;
            }

            seenEmails.add(email);
            seenStudNums.add(studentNumber);

            // --- save student ---
            try {
                Student student = new Student();
                student.setStudentNumber(studentNumber);
                student.setName(fullName);
                student.setEmail(email);
                student.setSex(sex);
                student.setTeacher(teacher);
                student.setCard(card);
                studentRepository.save(student);
                successCount++;

                // send enrollment email asynchronously
                sendEnrollmentEmail(email, fullName, card.getName());

            } catch (Exception e) {
                log.error("Row {} save failed: {}", rowNum, e.getMessage());
                errors.add(new ImportRowError(rowNum, studentNumber, email, "Save error: " + e.getMessage()));
                failedCount++;
            }
        }

        workbook.close();

        result.setTotalRows(dataRows);
        result.setSuccessCount(successCount);
        result.setSkippedCount(skippedCount);
        result.setFailedCount(failedCount);
        result.setErrors(errors);

        // --- log the import ---
        ImportLog importLog = new ImportLog();
        importLog.setTeacherEmail(teacher.getEmail());
        importLog.setFilename(file.getOriginalFilename());
        importLog.setTotalRows(dataRows);
        importLog.setSuccessCount(successCount);
        importLog.setSkippedCount(skippedCount);
        importLog.setFailedCount(failedCount);
        importLogRepository.save(importLog);

        return result;
    }

    // ── Template builder ──────────────────────────────────────────────────────

    public byte[] buildTemplate() throws Exception {
        try (XSSFWorkbook wb = new XSSFWorkbook()) {
            Sheet sheet = wb.createSheet("Students");

            // header style
            CellStyle headerStyle = wb.createCellStyle();
            Font font = wb.createFont();
            font.setBold(true);
            headerStyle.setFont(font);
            headerStyle.setFillForegroundColor(IndexedColors.LIGHT_CORNFLOWER_BLUE.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);

            String[] headers = {"Name", "Student Number", "Student Email", "Sex"};
            Row headerRow = sheet.createRow(0);
            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
                sheet.setColumnWidth(i, 6000);
            }

            // sample row
            Row sample = sheet.createRow(1);
            sample.createCell(0).setCellValue("Dela Cruz, Juan Santos");
            sample.createCell(1).setCellValue("2024-0001");
            sample.createCell(2).setCellValue("juan.delacruz@email.com");
            sample.createCell(3).setCellValue("Male");

            java.io.ByteArrayOutputStream out = new java.io.ByteArrayOutputStream();
            wb.write(out);
            return out.toByteArray();
        }
    }

    // ── Async email ───────────────────────────────────────────────────────────

    @Async
    public void sendEnrollmentEmail(String toEmail, String studentName, String className) {
        try {
            Thread.sleep(200); // gentle rate-limiting for Gmail
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, false);
            helper.setTo(toEmail);
            helper.setFrom("smart.attend22526@gmail.com");
            helper.setSubject("You have been enrolled in " + className + " — SmartAttend");
            helper.setText("""
                    <h2>SmartAttend — Enrollment Notice</h2>
                    <p>Hello <strong>%s</strong>,</p>
                    <p>You have been enrolled in <strong>%s</strong> on SmartAttend.</p>
                    <p>Your teacher will send your QR code before each class session.</p>
                    <br>
                    <p>— SmartAttend Team</p>
                    """.formatted(studentName, className), true);
            mailSender.send(message);
        } catch (Exception e) {
            log.error("Enrollment email failed for {}: {}", toEmail, e.getMessage());
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    /** Returns one resolved column index per required column, or null if not found. */
    private Integer[] resolveColumns(Map<String, Integer> colIndex) {
        Integer[] result = new Integer[HEADER_ALIASES.size()];
        for (int i = 0; i < HEADER_ALIASES.size(); i++) {
            for (String alias : HEADER_ALIASES.get(i)) {
                if (colIndex.containsKey(alias)) {
                    result[i] = colIndex.get(alias);
                    break;
                }
            }
        }
        return result;
    }

    /** Normalizes sex: Male/Female/M/F (case-insensitive) → "Male"/"Female", else null. */
    private String normalizeSex(String raw) {
        if (raw == null) return null;
        String v = raw.trim().toLowerCase();
        return switch (v) {
            case "male",   "m" -> "Male";
            case "female", "f" -> "Female";
            default -> null;
        };
    }

    /** Collapses multiple internal spaces into one. */
    private String collapseSpaces(String s) {
        return s == null ? "" : s.trim().replaceAll("\\s+", " ");
    }

    private Map<String, Integer> buildColumnIndex(Row headerRow) {
        Map<String, Integer> map = new HashMap<>();
        for (Cell cell : headerRow) {
            String val = getCellStringValue(cell).trim().toLowerCase();
            if (!val.isEmpty()) map.put(val, cell.getColumnIndex());
        }
        return map;
    }

    private boolean isBlankRow(Row row, int[] cols) {
        if (row == null) return true;
        for (int idx : cols) {
            Cell cell = row.getCell(idx);
            if (cell != null && cell.getCellType() != CellType.BLANK) {
                String val = getCellStringValue(cell).trim();
                if (!val.isEmpty()) return false;
            }
        }
        return true;
    }

    private String readCell(Row row, Integer colIdx) {
        if (colIdx == null || row == null) return "";
        Cell cell = row.getCell(colIdx);
        return getCellStringValue(cell);
    }

    private String getCellStringValue(Cell cell) {
        if (cell == null) return "";
        return switch (cell.getCellType()) {
            case STRING  -> cell.getStringCellValue();
            case NUMERIC -> {
                // prevent scientific notation for IDs / phone numbers
                double d = cell.getNumericCellValue();
                if (d == Math.floor(d) && !Double.isInfinite(d))
                    yield String.valueOf((long) d);
                yield String.valueOf(d);
            }
            case BOOLEAN -> String.valueOf(cell.getBooleanCellValue());
            case FORMULA -> {
                try { yield cell.getStringCellValue(); }
                catch (Exception e) { yield String.valueOf(cell.getNumericCellValue()); }
            }
            default -> "";
        };
    }

    /** Strip leading formula-injection characters and trim whitespace. */
    private String sanitize(String value) {
        if (value == null) return "";
        String v = value.trim();
        if (!v.isEmpty() && "=+-@".indexOf(v.charAt(0)) >= 0) v = "'" + v;
        return v;
    }
}
