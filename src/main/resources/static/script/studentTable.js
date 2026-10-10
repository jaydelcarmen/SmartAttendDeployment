class StudentTable {
    constructor() {
        this.allStudents      = [];
        this.filteredStudents = [];
        this.currentPage      = 1;
        this.studentsPerPage  = 7;
        this.cardId = new URLSearchParams(window.location.search).get('id');
        this._importErrors = [];
    }

    init() {
        this.loadStudent();

        document.getElementById('searchInput').addEventListener('keyup', () => {
            const val = document.getElementById('searchInput').value.toLowerCase();
            this.filteredStudents = this.allStudents.filter(s =>
                s.name.toLowerCase().includes(val) ||
                s.email.toLowerCase().includes(val) ||
                s.studentNumber.toString().includes(val) ||
                s.sex.toLowerCase().includes(val)
            );
            this.currentPage = 1;
            this.renderStudent();
            this.renderPaginationForStudents();
        });

        document.getElementById('studentForm').addEventListener('submit', e => {
            e.preventDefault();
            this.StudentForm();
        });

        document.addEventListener('click', e => {
            if (e.target.classList.contains('menu-btn')) {
                const menu = e.target.nextElementSibling;
                menu.style.display = menu.style.display === 'flex' ? 'none' : 'flex';
            } else {
                document.querySelectorAll('.menu-dropdown').forEach(m => m.style.display = 'none');
            }
        });
    }

    openAddStudentModal()  { document.getElementById('addStudentModal').style.display = 'block'; }
    closeAddStudentModal() { document.getElementById('addStudentModal').style.display = 'none'; }

    OpenScanner() {
        window.location.href = `/../body/scanner.html?id=${this.cardId}`;
    }

    async sendTheQrToAllStudents() {
        const result = await Swal.fire({ title: 'Send QR To All Student', text: 'Are you sure?', icon: 'warning', showCancelButton: true, cancelButtonColor: '#3085d6', confirmButtonText: 'Yes' });
        if (!result.isConfirmed) return;

        Swal.fire({ title: 'QR codes are being sent to all students...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
        try {
            const res  = await fetch(`/students/${this.cardId}/send-qrForAll`, { method: 'POST' });
            const data = await res.text();
            Swal.fire({ icon: res.ok ? 'success' : 'error', title: res.ok ? 'Success!' : "Can't send QR", text: data, allowOutsideClick: false, timer: 1500, showConfirmButton: false });
        } catch (err) {
            Swal.fire({ icon: 'error', title: 'Error', text: 'Error sending QR: ' + err });
        }
    }

    async StudentForm() {
        const form          = document.getElementById('studentForm');
        const name          = document.getElementById('StudentName').value;
        const studentNumber = document.getElementById('StudentNumber').value;
        const email         = document.getElementById('StudentEmail').value;
        const sex           = document.getElementById('StudentGender').value;

        if (!name || !studentNumber || !email || !sex)
            return Swal.fire({ icon: 'warning', title: 'Missing Fields', text: 'Please fill up fields.' });

        if (!/^[0-9]+$/.test(studentNumber))
            return Swal.fire({ icon: 'error', title: 'Input Failed', text: 'Please numbers only.' });

        try {
            const res = await fetch(`/students/${this.cardId}/add`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, studentNumber, email, sex })
            });

            if (res.ok) {
                await Swal.fire({ icon: 'success', title: 'Success', text: 'Student Added!', allowOutsideClick: false, timer: 2000, showConfirmButton: false });
                document.getElementById('addStudentModal').style.display = 'none';
                form.reset();
                this.loadStudent();
            } else {
                Swal.fire({ icon: 'error', title: 'Error', text: await res.text() });
            }
        } catch (err) {
            Swal.fire({ icon: 'error', title: 'Error', text: 'Error adding student: ' + err });
        }
    }

    async loadStudent() {
        try {
            const res = await fetch(`/students/${this.cardId}/students`);
            this.allStudents      = await res.json();
            this.filteredStudents = [...this.allStudents];
            this.renderStudent();
            this.renderPaginationForStudents();
        } catch (err) {
            Swal.fire({ icon: 'error', title: 'Error', text: 'Error loading students: ' + err });
        }
    }

    renderStudent() {
        const tbody = document.getElementById('studentTable');
        tbody.innerHTML = '';
        const start = (this.currentPage - 1) * this.studentsPerPage;
        this.filteredStudents.slice(start, start + this.studentsPerPage).forEach((student, index) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${start + index + 1}</td>
                <td>${student.name}</td>
                <td>${student.studentNumber}</td>
                <td>${student.email}</td>
                <td>${student.sex}</td>
                <td class="btn-container">
                    <button class="send-qr-btn" onclick="studentMgr.sendQR(${student.id})">Send QR</button>
                    <button class="menu-btn">⋮</button>
                    <div class="menu-dropdown">
                        <div onclick="studentMgr.renameName(${student.id}, '${student.name}')">Name</div>
                        <div onclick="studentMgr.renameStudentNumber(${student.id}, '${student.studentNumber}')">Student Number</div>
                        <div onclick="studentMgr.changeEmail(${student.id}, '${student.email}')">Email</div>
                        <div onclick="studentMgr.changeGender(${student.id}, '${student.sex}')">Gender</div>
                        <div onclick="studentMgr.deleteStudent(${student.id})">Delete</div>
                    </div>
                </td>`;
            tbody.appendChild(tr);
        });
    }

    renderPaginationForStudents() {
        const pagination = document.querySelector('.pagination');
        pagination.innerHTML = '';
        const totalPages = Math.ceil(this.allStudents.length / this.studentsPerPage);
        for (let i = 1; i <= totalPages; i++) {
            const btn = document.createElement('button');
            btn.classList.add('page-btn');
            btn.textContent = i;
            if (i === this.currentPage) btn.classList.add('active');
            btn.onclick = () => { this.currentPage = i; this.renderStudent(); this.renderPaginationForStudents(); };
            pagination.appendChild(btn);
        }
    }

    async sendQR(id) {
        Swal.fire({ title: 'Sending QR CODE...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
        try {
            const res = await fetch(`/students/${id}/send-qr`, { method: 'POST', headers: { 'Content-Type': 'application/json' } });
            if (res.ok) {
                Swal.fire({ icon: 'success', title: 'Success', allowOutsideClick: false, text: 'Send QR Successfully!', timer: 1500, showConfirmButton: false });
            } else {
                Swal.fire({ icon: 'error', title: 'Error', text: 'Error sending QR: ' + await res.text() });
            }
        } catch (err) {
            Swal.fire({ icon: 'error', title: 'Error', text: 'Error sending QR: ' + err });
        }
    }

    _updateStudent(id, payload) {
        return fetch(`/students/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
            .then(r => r.json());
    }

    renameName(id, currentName) {
        Swal.fire({ title: 'Rename Name', input: 'text', inputValue: currentName, showCancelButton: true })
            .then(result => { if (result.isConfirmed) this._updateStudent(id, { name: result.value }).then(() => Swal.fire({ icon: 'success', title: 'Rename Name', text: 'Name updated successfully', timer: 1500, showConfirmButton: false }).then(() => location.reload())); });
    }

    renameStudentNumber(id, currentStudentNumber) {
        Swal.fire({ title: 'Rename Student Number', input: 'text', inputValue: currentStudentNumber, showCancelButton: true })
            .then(result => { if (result.isConfirmed) this._updateStudent(id, { studentNumber: result.value }).then(() => Swal.fire({ icon: 'success', title: 'Rename Student Number', text: 'Student Number updated successfully', timer: 1500, showConfirmButton: false }).then(() => location.reload())); });
    }

    changeEmail(id, currentEmail) {
        Swal.fire({ title: 'Rename Email', input: 'text', inputValue: currentEmail, showCancelButton: true })
            .then(result => { if (result.isConfirmed) this._updateStudent(id, { email: result.value }).then(() => Swal.fire({ icon: 'success', title: 'Rename Email', text: 'Email updated successfully', timer: 1500, showConfirmButton: false }).then(() => location.reload())); });
    }

    changeGender(id, currentGender) {
        Swal.fire({ title: 'Rename Gender', input: 'select', inputOptions: { Male: 'Male', Female: 'Female' }, inputValue: currentGender, showCancelButton: true })
            .then(result => { if (result.isConfirmed) this._updateStudent(id, { sex: result.value }).then(() => Swal.fire({ icon: 'success', title: 'Rename Gender', text: 'Gender updated successfully', timer: 1500, showConfirmButton: false }).then(() => location.reload())); });
    }

    deleteStudent(id) {
        Swal.fire({ title: 'Delete Student', text: 'This action cannot be undone.', icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33', cancelButtonColor: '#3085d6', confirmButtonText: 'Yes, delete it' })
            .then(result => {
                if (!result.isConfirmed) return;
                fetch(`/students/delete/${id}`, { method: 'DELETE' })
                    .then(res => {
                        if (res.ok) Swal.fire({ icon: 'success', title: 'Student has been deleted.', text: 'successfully deleted.', timer: 1000, showConfirmButton: false }).then(() => this.loadStudent());
                        else Swal.fire('Error', 'Could not delete card.', 'error');
                    });
            });
    }

    // ── Import modal ──────────────────────────────────────────────────────────

    openImportModal() {
        this._importErrors = [];
        document.getElementById('importResult').style.display = 'none';
        document.getElementById('importFileName').textContent = '';
        document.getElementById('importFileInput').value = '';
        document.getElementById('importStudentModal').style.display = 'block';
        this._setupDropZone();
    }

    closeImportModal() {
        document.getElementById('importStudentModal').style.display = 'none';
    }

    _setupDropZone() {
        const zone  = document.getElementById('importDropZone');
        const input = document.getElementById('importFileInput');
        if (zone._bound) return;
        zone._bound = true;
        zone.addEventListener('click', () => input.click());
        zone.addEventListener('dragover', e => { e.preventDefault(); zone.style.background = '#e8f7fa'; });
        zone.addEventListener('dragleave', () => { zone.style.background = ''; });
        zone.addEventListener('drop', e => {
            e.preventDefault(); zone.style.background = '';
            if (e.dataTransfer.files[0]) this._setImportFile(e.dataTransfer.files[0]);
        });
        input.addEventListener('change', () => { if (input.files[0]) this._setImportFile(input.files[0]); });
    }

    _setImportFile(file) {
        const ext = file.name.split('.').pop().toLowerCase();
        if (!['xlsx', 'xls'].includes(ext))
            return Swal.fire({ icon: 'error', title: 'Invalid file', text: 'Only .xlsx or .xls files are accepted.' });
        if (file.size > 5 * 1024 * 1024)
            return Swal.fire({ icon: 'error', title: 'File too large', text: 'Maximum file size is 5 MB.' });
        document.getElementById('importFileInput')._selectedFile = file;
        document.getElementById('importFileName').textContent = `Selected: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
    }

    async submitImport() {
        const input = document.getElementById('importFileInput');
        const file  = input._selectedFile || input.files[0];
        if (!file) return Swal.fire({ icon: 'warning', title: 'No file selected', text: 'Please choose an Excel file first.' });

        const formData = new FormData();
        formData.append('file', file);
        formData.append('cardId', this.cardId);

        Swal.fire({ title: 'Importing...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

        try {
            const res  = await fetch('/students/import', { method: 'POST', body: formData });
            const text = await res.text();
            Swal.close();
            if (!res.ok) return Swal.fire({ icon: 'error', title: 'Import failed', text: text });
            const data = JSON.parse(text);
            this._importErrors = data.errors || [];
            this._showImportResult(data);
            this.loadStudent();
        } catch (err) {
            Swal.close();
            Swal.fire({ icon: 'error', title: 'Error', text: 'Could not connect to server.' });
        }
    }

    _showImportResult(data) {
        const pill = (label, val, color) =>
            `<span style="background:${color};color:#fff;border-radius:8px;padding:6px 14px;font-size:13px;font-weight:600">${label}: ${val}</span>`;

        document.getElementById('importSummary').innerHTML =
            pill('Total', data.totalRows, '#1c2a3b') +
            pill('Imported', data.successCount, '#16a34a') +
            pill('Skipped', data.skippedCount, '#d97706') +
            pill('Failed', data.failedCount, '#dc2626');

        const errWrap = document.getElementById('importErrorWrap');
        if (this._importErrors.length > 0) {
            document.getElementById('importErrorBody').innerHTML = this._importErrors.map(e => `
                <tr style="border-bottom:1px solid #f1f5f9">
                    <td style="padding:5px 8px">${e.rowNumber}</td>
                    <td style="padding:5px 8px">${e.studentNumber || '-'}</td>
                    <td style="padding:5px 8px">${e.email || '-'}</td>
                    <td style="padding:5px 8px;color:#dc2626">${e.reason}</td>
                </tr>`).join('');
            errWrap.style.display = 'block';
        } else {
            errWrap.style.display = 'none';
        }
        document.getElementById('importResult').style.display = 'block';
    }

    downloadErrorCSV() {
        if (!this._importErrors || !this._importErrors.length) return;
        const rows = [['Row', 'Student Number', 'Email', 'Reason'],
            ...this._importErrors.map(e => [e.rowNumber, e.studentNumber || '', e.email || '', e.reason])];
        const csv  = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href = url; a.download = 'import_errors.csv'; a.click();
        URL.revokeObjectURL(url);
    }
}

const studentMgr = new StudentTable();
window.onload = () => studentMgr.init();

// Global wrappers for HTML onclick attributes
function openAddStudentModal()    { studentMgr.openAddStudentModal(); }
function closeAddStudentModal()   { studentMgr.closeAddStudentModal(); }
function OpenScanner()            { studentMgr.OpenScanner(); }
function sendTheQrToAllStudents() { studentMgr.sendTheQrToAllStudents(); }
