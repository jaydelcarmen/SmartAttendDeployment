class ReportPage {
    constructor() {
        this.reportData = [];
    }

    init() {
        document.getElementById('dateFilter').value = this.localDateStr(new Date());
        fetch('/attendance/cards')
            .then(r => r.json())
            .then(cards => {
                const sel = document.getElementById('classFilter');
                cards.forEach(c => {
                    const opt = document.createElement('option');
                    opt.value = c.id;
                    opt.textContent = c.name;
                    sel.appendChild(opt);
                });
            })
            .catch(err => console.error('Cards error:', err));

        this.loadReport();
        this.loadProfile();
    }

    loadProfile() {
        fetch('/teacher/me')
            .then(r => r.json())
            .then(data => {
                document.getElementById('headerName').textContent = data.name || '';
                const img      = document.getElementById('headerAvatar');
                const initials = document.getElementById('headerInitials');
                if (data.profilePicture) {
                    img.src = data.profilePicture;
                    img.style.display = 'block';
                    initials.style.display = 'none';
                } else {
                    img.style.display = 'none';
                    initials.style.display = 'block';
                    initials.textContent = (data.name || '?').charAt(0);
                }
            });
    }

    uploadProfilePicture(input) {
        const file = input.files[0];
        if (!file) return;
        const form = new FormData();
        form.append('file', file);
        fetch('/teacher/profile-picture', { method: 'POST', body: form })
            .then(r => r.text())
            .then(base64 => {
                const img      = document.getElementById('headerAvatar');
                const initials = document.getElementById('headerInitials');
                img.src = base64;
                img.style.display = 'block';
                initials.style.display = 'none';
            });
    }

    loadReport() {
        const date   = document.getElementById('dateFilter').value;
        const cardId = document.getElementById('classFilter').value;
        const params = new URLSearchParams();
        if (date)   params.append('date', date);
        if (cardId) params.append('cardId', cardId);

        fetch('/attendance/report-all?' + params.toString())
            .then(r => r.json())
            .then(data => {
                this.reportData = data;
                this.renderTable(data);
                this.renderSummary(data);
                document.getElementById('reportTitle').textContent    = 'Attendance Report';
                document.getElementById('reportSubtitle').textContent = date || new Date().toLocaleDateString();
            })
            .catch(err => console.error('Report error:', err));
    }

    renderTable(data) {
        const tbody = document.getElementById('reportTableBody');
        if (!data.length) {
            tbody.innerHTML = '<tr><td colspan="6" class="empty-msg">No records found.</td></tr>';
            return;
        }
        tbody.innerHTML = data.map(r => `
            <tr>
                <td>${r.className || '-'}</td>
                <td>${r.name}</td>
                <td>${r.studentNumber}</td>
                <td>${r.email}</td>
                <td>${this.formatTime(r.time)}</td>
                <td><span class="status-pill ${this.statusClass(r.status)}">${r.status}</span></td>
            </tr>`).join('');
    }

    renderSummary(data) {
        const section = document.getElementById('summarySection');
        if (!data.length) { section.style.display = 'none'; return; }
        document.getElementById('sumPresent').textContent = data.filter(r => r.status === 'Present').length;
        document.getElementById('sumLate').textContent    = data.filter(r => r.status === 'Late').length;
        document.getElementById('sumAbsent').textContent  = data.filter(r => r.status === 'Absent').length;
        document.getElementById('sumTotal').textContent   = data.length;
        section.style.display = 'flex';
    }

    downloadCSV() {
        if (!this.reportData.length) { alert('No data to download. Load a report first.'); return; }
        const date   = document.getElementById('dateFilter').value || this.localDateStr(new Date());
        const header = ['Class', 'Student Name', 'Student No.', 'Email', 'Time In', 'Status'];
        const rows   = this.reportData.map(r => [
            `"${r.className || ''}"`, `"${r.name}"`, `"${r.studentNumber}"`,
            `"${r.email}"`, `"${this.formatTime(r.time)}"`, `"${r.status}"`
        ].join(','));
        const csv  = [header.join(','), ...rows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href = url;
        a.download = `attendance-report-${date}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }

    toggleSidebar() {
        document.querySelector('.sidebar').classList.toggle('open');
        document.getElementById('hamburgerBtn').classList.toggle('open');
        document.getElementById('sidebarOverlay').classList.toggle('active');
    }

    formatTime(isoString) {
        if (!isoString) return '-';
        return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    statusClass(status) {
        return status ? status.toLowerCase() : '';
    }

    localDateStr(date) {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }
}

const reportPage = new ReportPage();
document.addEventListener('DOMContentLoaded', () => reportPage.init());

// Global wrappers for HTML onclick attributes
function loadReport()                  { reportPage.loadReport(); }
function downloadCSV()                 { reportPage.downloadCSV(); }
function toggleSidebar()               { reportPage.toggleSidebar(); }
function uploadProfilePicture(input)   { reportPage.uploadProfilePicture(input); }
