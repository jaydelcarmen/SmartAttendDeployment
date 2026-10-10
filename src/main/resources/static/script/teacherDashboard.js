class TeacherDashboard {
    init() {
        this.loadTodayStats();
        setInterval(() => this.loadTodayStats(), 30000);

        this.loadSchedule();
        setInterval(() => this.loadSchedule(), 60000);

        this.loadProfile();
        this.loadChart();
    }

    loadProfile() {
        fetch('/teacher/me')
            .then(r => r.json())
            .then(data => {
                document.getElementById('headerName').textContent = data.name || '';
                const img      = document.getElementById('headerAvatar');
                const initials = document.getElementById('headerInitials');
                if (data.profilePicture) {
                    img.src = data.profilePicture; img.style.display = 'block'; initials.style.display = 'none';
                } else {
                    img.style.display = 'none'; initials.style.display = 'block';
                    initials.textContent = (data.name || '?').charAt(0);
                }
            })
            .catch(err => console.error('Profile error:', err));
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
                img.src = base64; img.style.display = 'block'; initials.style.display = 'none';
            })
            .catch(err => console.error('Upload error:', err));
    }

    loadSchedule() {
        fetch('/cards/today-schedule')
            .then(r => r.json())
            .then(cards => {
                const list  = document.getElementById('scheduleList');
                const dayEl = document.getElementById('scheduleDay');
                dayEl.textContent = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

                if (!cards.length) { list.innerHTML = '<li class="schedule-empty">No classes scheduled today.</li>'; return; }

                list.innerHTML = cards.map(c => {
                    const timeRange   = (c.startTime && c.endTime) ? `${this._formatLocalTime(c.startTime)} – ${this._formatLocalTime(c.endTime)}` : 'Time not set';
                    const statusLabel = { ongoing: 'Ongoing', upcoming: 'Upcoming', done: 'Done', scheduled: 'Scheduled' }[c.status] || '';
                    return `<li class="schedule-item">
                        <div class="schedule-info">
                            <span class="schedule-subject">${c.subject}</span>
                            <span class="schedule-section">${c.name}</span>
                            <span class="schedule-time">${timeRange}</span>
                        </div>
                        <span class="schedule-badge ${c.status}">${statusLabel}</span>
                    </li>`;
                }).join('');
            })
            .catch(err => console.error('Schedule error:', err));
    }

    loadTodayStats() {
        fetch('/attendance/today-stats')
            .then(r => r.json())
            .then(data => {
                document.getElementById('studentCount').textContent = data.totalStudents;
                document.getElementById('presentCount').textContent = data.present;
                document.getElementById('absentCount').textContent  = data.absent;
                document.getElementById('lateCount').textContent    = data.late;

                const tbody = document.getElementById('recentTableBody');
                if (!data.recent.length) {
                    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:#8a97a7;padding:16px">No attendance recorded today</td></tr>';
                    return;
                }
                tbody.innerHTML = data.recent.slice(-10).reverse().map(r => `
                    <tr>
                        <td>${r.name}</td>
                        <td>${r.studentNumber}</td>
                        <td>${this._formatTime(r.time)}</td>
                        <td><span class="status-pill ${r.status.toLowerCase()}">${r.status}</span></td>
                    </tr>`).join('');
            })
            .catch(err => console.error('Stats error:', err));
    }

    loadChart() {
        fetch('/attendance/chart')
            .then(r => r.json())
            .then(data => {
                new Chart(document.getElementById('attendanceChart'), {
                    type: 'bar',
                    data: {
                        labels: data.map(d => d.date),
                        datasets: [
                            { label: 'Present', data: data.map(d => d.present), backgroundColor: '#16a34a', borderRadius: 4 },
                            { label: 'Late',    data: data.map(d => d.late),    backgroundColor: '#d97706', borderRadius: 4 },
                            { label: 'Absent',  data: data.map(d => d.absent),  backgroundColor: '#dc2626', borderRadius: 4 }
                        ]
                    },
                    options: {
                        responsive: true,
                        plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false } },
                        scales: {
                            x: { grid: { display: false }, ticks: { font: { size: 11 } } },
                            y: { beginAtZero: true, ticks: { precision: 0, font: { size: 11 } }, grid: { color: '#f1f5f9' } }
                        }
                    }
                });
            })
            .catch(err => console.error('Chart error:', err));
    }

    toggleSidebar() {
        document.querySelector('.sidebar').classList.toggle('open');
        document.getElementById('hamburgerBtn').classList.toggle('open');
        document.getElementById('sidebarOverlay').classList.toggle('active');
    }

    _formatTime(isoString) {
        if (!isoString) return '-';
        return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    _formatLocalTime(timeStr) {
        if (!timeStr) return '';
        const [h, m] = timeStr.split(':');
        const d = new Date();
        d.setHours(+h, +m, 0);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
}

const teacherDashboard = new TeacherDashboard();
document.addEventListener('DOMContentLoaded', () => teacherDashboard.init());

// Global wrappers for HTML onclick attributes
function toggleSidebar()               { teacherDashboard.toggleSidebar(); }
function uploadProfilePicture(input)   { teacherDashboard.uploadProfilePicture(input); }
