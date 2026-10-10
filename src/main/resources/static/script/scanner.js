class ScannerPage {
    constructor() {
        this.cardId   = new URLSearchParams(window.location.search).get('id');
        this.beep     = new Audio('../assets/beepsmooth.wav');
        this.errorSfx = new Audio('../assets/error.wav');
        this.scanner  = null;
        this.isRunning    = false;
        this.isProcessing = false;
    }

    init() {
        this.loadStudent();
        this.setDateRange();
        this.scheduleDailyUpdate();
        document.getElementById('searchInput').addEventListener('input', () => this.filterTable());
        document.querySelector('.search-btn').addEventListener('click', () => this.filterTable());
    }

    studentTable() {
        window.location.href = `/../body/studentTable.html?id=${this.cardId}`;
    }

    filterTable() {
        const query = document.getElementById('searchInput').value.toLowerCase();
        document.querySelectorAll('#studentTable tr').forEach(row => {
            row.style.display = row.textContent.toLowerCase().includes(query) ? '' : 'none';
        });
    }

    openCamera() {
        if (this.isRunning) {
            this.scanner.stop().then(() => {
                this.scanner = null;
                this.isRunning = false;
                const reader = document.getElementById('reader');
                reader.innerHTML = `<div class="camera-icon"><i class="fa-solid fa-camera"></i></div><p class="webcam-text">Live Webcam - Point QR code here</p>`;
                reader.onclick = () => this.openCamera();
            }).catch(err => console.error('Stop failed', err));
            return;
        }

        this.scanner = new Html5Qrcode('reader');
        this.scanner.start(
            { facingMode: 'environment' },
            { fps: 10, qrbox: 450 },
            decodedText => this._onScanSuccess(decodedText),
            () => {}
        ).then(() => { this.isRunning = true; })
         .catch(err => console.error('Camera start failed', err));
    }

    async _onScanSuccess(qrCode) {
        if (this.isProcessing) return;
        this.isProcessing = true;
        try {
            const res    = await fetch('/attendance/scan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ qrcode: qrCode, cardId: this.cardId }) });
            const result = await res.text();
            if (res.ok) {
                this.beep.volume = 1.0;
                this.beep.play();
                await Swal.fire({ icon: 'success', title: 'Scanned', text: result, timer: 1500, showConfirmButton: false });
                this.loadStudent();
            } else {
                this.errorSfx.play();
                Swal.fire({ icon: 'error', title: 'Error', text: result, timer: 1500, showConfirmButton: false });
            }
        } catch (err) {
            Swal.fire({ title: 'Error', text: 'Unable to connect to the server: ' + err.message });
        } finally {
            setTimeout(() => { this.isProcessing = false; }, 3000);
        }
    }

    async loadStudent() {
        try {
            const res  = await fetch(`/attendance/scanned/${this.cardId}`);
            const data = await res.json();
            const tbody = document.getElementById('studentTable');
            tbody.innerHTML = '';
            data.forEach((student, index) => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${index + 1}</td>
                    <td>${student.name}</td>
                    <td>${student.studentNumber}</td>
                    <td>${student.email}</td>
                    <td>${new Date(student.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                    <td>${student.status}</td>`;
                tbody.appendChild(tr);
            });
        } catch (err) {
            Swal.fire({ icon: 'error', title: 'Error', text: 'Error loading students: ' + err });
        }
    }

    async exportReport(format) {
        this.toggleExportMenu();
        try {
            const res  = await fetch(`/attendance/report/${this.cardId}`);
            const data = await res.json();
            const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

            if (format === 'csv') {
                const rows = [
                    ['ID', 'Name', 'Student Number', 'Email', 'Time', 'Status'],
                    ...data.map((s, i) => [i + 1, s.name, s.studentNumber, s.email, s.time ? new Date(s.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-', s.status])
                ];
                const csv  = rows.map(r => r.map(cell => `"${cell}"`).join(',')).join('\n');
                const blob = new Blob([`Attendance Report - ${today}\n\n` + csv], { type: 'text/csv' });
                const url  = URL.createObjectURL(blob);
                const a    = document.createElement('a');
                a.href = url;
                a.download = `attendance_report_${new Date().toISOString().slice(0, 10)}.csv`;
                a.click();
                URL.revokeObjectURL(url);
            } else {
                this._exportPng(data, today);
            }
        } catch (err) {
            Swal.fire({ icon: 'error', title: 'Export Failed', text: err.message });
        }
    }

    _exportPng(data, today) {
        const rowH = 36, headerH = 60, colW = [40, 200, 150, 260, 100, 100];
        const totalW = colW.reduce((a, b) => a + b, 0) + 40;
        const totalH = headerH + 44 + (data.length + 1) * rowH + 30;
        const pad = 20;

        const canvas = document.createElement('canvas');
        canvas.width = totalW; canvas.height = totalH;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#f4f8fb'; ctx.fillRect(0, 0, totalW, totalH);
        ctx.fillStyle = '#0F6577'; ctx.fillRect(0, 0, totalW, headerH);
        ctx.fillStyle = '#ffffff'; ctx.font = 'bold 20px Poppins, sans-serif';
        ctx.fillText('SmartAttend - Attendance Report', pad, 28);
        ctx.font = '13px Poppins, sans-serif'; ctx.fillText(today, pad, 48);

        ctx.fillStyle = '#ffffff';
        ctx.roundRect(pad, headerH + 12, totalW - pad * 2, (data.length + 1) * rowH + rowH + 10, 10);
        ctx.fill();

        const cols = ['ID', 'Name', 'Student Number', 'Email', 'Time', 'Status'];
        let y = headerH + 12;
        ctx.fillStyle = '#222a35'; ctx.fillRect(pad, y, totalW - pad * 2, rowH);
        ctx.fillStyle = '#ffffff'; ctx.font = 'bold 13px Poppins, sans-serif';
        let x = pad + 10;
        cols.forEach((col, i) => { ctx.fillText(col, x, y + 23); x += colW[i]; });
        y += rowH;

        ctx.font = '12px Poppins, sans-serif';
        data.forEach((s, idx) => {
            ctx.fillStyle = idx % 2 === 0 ? '#ffffff' : '#f6f8fb';
            ctx.fillRect(pad, y, totalW - pad * 2, rowH);
            const statusColor = s.status === 'Present' ? '#16a34a' : s.status === 'Late' ? '#d97706' : '#dc2626';
            const cells = [String(idx + 1), s.name, s.studentNumber, s.email, s.time ? new Date(s.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-', s.status];
            x = pad + 10;
            cells.forEach((cell, i) => {
                ctx.fillStyle = i === 5 ? statusColor : '#1c2a3b';
                if (i === 5) ctx.font = 'bold 12px Poppins, sans-serif';
                ctx.fillText(cell, x, y + 23);
                ctx.font = '12px Poppins, sans-serif';
                x += colW[i];
            });
            y += rowH;
        });

        const a = document.createElement('a');
        a.href = canvas.toDataURL('image/png');
        a.download = `attendance_report_${new Date().toISOString().slice(0, 10)}.png`;
        a.click();
    }

    toggleExportMenu() {
        document.getElementById('exportMenu').classList.toggle('show');
    }

    setDateRange() {
        const today = this._getPHTime();
        const end   = new Date(today);
        end.setDate(today.getDate() + 10);
        document.getElementById('dateNow').textContent = `${this._formatDate(today)} - ${this._formatDate(end)}`;
    }

    scheduleDailyUpdate() {
        const now = this._getPHTime();
        const nextMidnight = new Date(now);
        nextMidnight.setHours(24, 0, 0, 0);
        setTimeout(() => {
            this.setDateRange();
            setInterval(() => this.setDateRange(), 24 * 60 * 60 * 1000);
        }, nextMidnight - now);
    }

    _getPHTime() {
        return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
    }

    _formatDate(date) {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
}

const scannerPage = new ScannerPage();
window.onload = () => scannerPage.init();

// Global wrappers for HTML onclick attributes
function studentTable()            { scannerPage.studentTable(); }
function openCamera()              { scannerPage.openCamera(); }
function exportReport(format)      { scannerPage.exportReport(format); }
function toggleExportMenu()        { scannerPage.toggleExportMenu(); }
