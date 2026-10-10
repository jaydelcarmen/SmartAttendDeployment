const BASE = '';

async function req(url, opts = {}) {
  const res = await fetch(BASE + url, opts);
  return res;
}

// ── Teacher ───────────────────────────────────────────────────────────────────
export const teacherApi = {
  me:              ()           => req('/teacher/me'),
  updateProfile:   (body)       => req('/teacher/update-profile', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  uploadPicture:   (form)       => req('/teacher/profile-picture', { method: 'POST', body: form }),
  deletePicture:   ()           => req('/teacher/profile-picture', { method: 'DELETE' }),
  sendOtp:         ()           => req('/teacher/send-change-password-otp', { method: 'POST' }),
  verifyOtp:       (body)       => req('/teacher/verify-otp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  login:           (body)       => req('/teacher/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  register:        (body)       => req('/teacher/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  forgotPassword:  (body)       => req('/teacher/forgot-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  submitNewPass:   (body)       => req('/teacher/reset-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
};

// ── Cards ─────────────────────────────────────────────────────────────────────
export const cardsApi = {
  myCards:         ()           => req('/cards/my-cards'),
  todaySchedule:   ()           => req('/cards/today-schedule'),
  add:             (body)       => req('/cards/add', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  update:          (id, body)   => req(`/cards/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  delete:          (id)         => req(`/cards/delete/${id}`, { method: 'DELETE' }),
};

// ── Students ──────────────────────────────────────────────────────────────────
export const studentsApi = {
  list:            (cardId)     => req(`/students/${cardId}/students`),
  add:             (cardId, b)  => req(`/students/${cardId}/add`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) }),
  update:          (id, body)   => req(`/students/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  delete:          (id)         => req(`/students/delete/${id}`, { method: 'DELETE' }),
  sendQr:          (id)         => req(`/students/${id}/send-qr`, { method: 'POST' }),
  sendQrAll:       (cardId)     => req(`/students/${cardId}/send-qrForAll`, { method: 'POST' }),
  import:          (form)       => req('/students/import', { method: 'POST', body: form }),
  template:        ()           => '/students/import/template',
};

// ── Attendance ────────────────────────────────────────────────────────────────
export const attendanceApi = {
  todayStats:      ()           => req('/attendance/today-stats'),
  chart:           ()           => req('/attendance/chart'),
  cards:           ()           => req('/attendance/cards'),
  reportAll:       (params)     => req('/attendance/report-all?' + new URLSearchParams(params).toString()),
  scan:            (body)       => req('/attendance/scan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  list:            (cardId)     => req(`/attendance/${cardId}/list`),
};

// ── Admin ─────────────────────────────────────────────────────────────────────
export const adminApi = {
  login:           (body)       => req('/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  teachers:        ()           => req('/admin/teachers'),
  approve:         (id)         => req(`/admin/teachers/${id}/approve`, { method: 'POST' }),
  ban:             (id)         => req(`/admin/teachers/${id}/ban`, { method: 'POST' }),
  unban:           (id)         => req(`/admin/teachers/${id}/unban`, { method: 'POST' }),
  delete:          (id)         => req(`/admin/teachers/${id}`, { method: 'DELETE' }),
};

export const logout = () => req('/logout', { method: 'POST', credentials: 'include' });
