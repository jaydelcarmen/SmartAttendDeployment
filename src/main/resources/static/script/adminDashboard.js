class AdminDashboard {
    constructor() {
        this.allTeachers = [];
        this.currentTab = 'all';
        this.tabTitles = { all: 'All Teachers', pending: 'Pending Approval', approved: 'Approved Teachers', banned: 'Banned Teachers' };
        this.statusIcons = { pending: 'fa-clock', approved: 'fa-circle-check', banned: 'fa-ban' };
    }

    async init() {
        await this.loadAdmin();
        await this.loadTeachers();
    }

    async loadAdmin() {
        const res = await fetch('/admin/me');
        if (!res.ok) { window.location.replace('/body/login.html'); return; }
        const data = await res.json();
        document.getElementById('adminName').textContent = 'Hi, ' + (data.name || 'Admin');
    }

    async loadTeachers() {
        const res = await fetch('/admin/teachers');
        if (!res.ok) return;
        this.allTeachers = await res.json();
        this.updateStats();
        this.renderTable();
    }

    updateStats() {
        const count = status => this.allTeachers.filter(t => t.status === status).length;
        const pending = count('pending');
        document.getElementById('statTotal').textContent    = this.allTeachers.length;
        document.getElementById('statPending').textContent  = pending;
        document.getElementById('statApproved').textContent = count('approved');
        document.getElementById('statBanned').textContent   = count('banned');
        const badge = document.getElementById('pendingBadge');
        badge.textContent = pending;
        badge.style.display = pending > 0 ? '' : 'none';
    }

    showTab(tab, btn) {
        this.currentTab = tab;
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById('tableTitle').textContent = this.tabTitles[tab];
        document.getElementById('searchInput').value = '';
        this.renderTable();
    }

    renderTable() {
        const search = document.getElementById('searchInput').value.toLowerCase();
        let filtered = this.currentTab === 'all'
            ? this.allTeachers
            : this.allTeachers.filter(t => t.status === this.currentTab);

        if (search) filtered = filtered.filter(t =>
            (t.name || '').toLowerCase().includes(search) ||
            (t.email || '').toLowerCase().includes(search)
        );

        const tbody = document.getElementById('teacherTableBody');
        const empty = document.getElementById('emptyState');
        tbody.innerHTML = '';

        if (filtered.length === 0) { empty.style.display = 'block'; return; }
        empty.style.display = 'none';
        filtered.forEach(t => tbody.appendChild(this.buildRow(t)));
    }

    buildRow(t) {
        const initials = (t.name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
        const avatarHtml = t.profilePicture
            ? `<img class="teacher-avatar" src="${t.profilePicture}" alt="">`
            : `<div class="teacher-initials">${initials}</div>`;

        const status = t.status || 'pending';
        const icon = this.statusIcons[status] || 'fa-clock';
        const actions = this.buildActions(t);

        const row = document.createElement('tr');
        row.innerHTML = `
            <td><div class="teacher-cell">${avatarHtml}<span class="teacher-name">${t.name || '—'}</span></div></td>
            <td>${t.email}</td>
            <td>${t.createdAt || '—'}</td>
            <td><span class="status-pill ${status}"><i class="fa-solid ${icon}"></i> ${this.capitalize(status)}</span></td>
            <td><div class="action-btns">${actions}</div></td>`;
        return row;
    }

    buildActions(t) {
        const del = `<button class="btn-delete" onclick="dashboard.deleteTeacher(${t.id})"><i class="fa-solid fa-trash"></i></button>`;
        if (t.status === 'pending') return `
            <button class="btn-approve" onclick="dashboard.approveTeacher(${t.id})"><i class="fa-solid fa-check"></i> Approve</button>
            <button class="btn-ban" onclick="dashboard.banTeacher(${t.id})"><i class="fa-solid fa-ban"></i> Ban</button>${del}`;
        if (t.status === 'approved') return `
            <button class="btn-ban" onclick="dashboard.banTeacher(${t.id})"><i class="fa-solid fa-ban"></i> Ban</button>${del}`;
        if (t.status === 'banned') return `
            <button class="btn-unban" onclick="dashboard.approveTeacher(${t.id})"><i class="fa-solid fa-rotate-left"></i> Unban</button>${del}`;
        return del;
    }

    async approveTeacher(id) {
        const res = await fetch(`/admin/teachers/${id}/approve`, { method: 'PUT' });
        if (res.ok) { await this.loadTeachers(); this.toast('Teacher approved!', 'success'); }
    }

    async banTeacher(id) {
        const result = await Swal.fire({
            icon: 'warning', title: 'Ban this teacher?',
            text: 'They will no longer be able to log in.',
            showCancelButton: true, confirmButtonColor: '#d97706', confirmButtonText: 'Yes, ban'
        });
        if (!result.isConfirmed) return;
        const res = await fetch(`/admin/teachers/${id}/ban`, { method: 'PUT' });
        if (res.ok) { await this.loadTeachers(); this.toast('Teacher banned.', 'warning'); }
    }

    async deleteTeacher(id) {
        const result = await Swal.fire({
            icon: 'warning', title: 'Delete this teacher?',
            text: 'This action cannot be undone.',
            showCancelButton: true, confirmButtonColor: '#dc2626', confirmButtonText: 'Yes, delete'
        });
        if (!result.isConfirmed) return;
        const res = await fetch(`/admin/teachers/${id}`, { method: 'DELETE' });
        if (res.ok) { await this.loadTeachers(); this.toast('Teacher deleted.', 'error'); }
    }

    async logout() {
        await fetch('/logout', { method: 'POST' }).catch(() => {});
        window.location.replace('/body/login.html');
    }

    toast(msg, icon) {
        Swal.fire({ icon, title: msg, timer: 1600, showConfirmButton: false, toast: true, position: 'top-end' });
    }

    capitalize(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''; }
}

const dashboard = new AdminDashboard();
window.onload = () => dashboard.init();

// Global wrappers for HTML onclick attributes
function showTab(tab)            { dashboard.showTab(tab, event.currentTarget); }
function renderTable()           { dashboard.renderTable(); }
function logoutAdmin()           { dashboard.logout(); }
