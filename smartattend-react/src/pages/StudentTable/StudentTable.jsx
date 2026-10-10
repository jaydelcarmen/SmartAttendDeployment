import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { studentsApi } from '../../api';
import styles from './StudentTable.module.css';

const EMPTY = { studentId: '', name: '', email: '', gender: '' };

export default function StudentTable() {
  const { cardId } = useParams();
  const nav = useNavigate();
  const [students, setStudents] = useState([]);
  const [modal, setModal]       = useState(false);
  const [importModal, setImportModal] = useState(false);
  const [editing, setEditing]   = useState(null);
  const [form, setForm]         = useState(EMPTY);
  const [search, setSearch]     = useState('');
  const [sending, setSending]   = useState(null);

  const load = () => studentsApi.list(cardId).then(r => r.ok ? r.json() : []).then(setStudents);
  useEffect(() => { load(); }, [cardId]);

  function openAdd()      { setEditing(null); setForm(EMPTY); setModal(true); }
  function openEdit(s)    { setEditing(s.id); setForm({ studentId: s.studentId, name: s.name, email: s.email, gender: s.gender || '' }); setModal(true); }
  function openImport()    { setImportModal(true); }

  async function save() {
    if (!form.name.trim() || !form.studentId.trim()) return;
    const res = editing ? await studentsApi.update(editing, form) : await studentsApi.add(cardId, form);
    if (res.ok) { setModal(false); load(); }
    else Swal.fire({ icon: 'error', title: 'Error', text: await res.text() });
  }

  async function remove(id) {
    const { isConfirmed } = await Swal.fire({ title: 'Remove student?', icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444' });
    if (!isConfirmed) return;
    const res = await studentsApi.delete(id);
    if (res.ok) load();
  }

  async function sendQr(id) {
    setSending(id);
    const res = await studentsApi.sendQr(id);
    setSending(null);
    Swal.fire({ icon: res.ok ? 'success' : 'error', title: res.ok ? 'QR Sent!' : 'Error', timer: 1500, showConfirmButton: false });
  }

  async function sendAll() {
    const res = await studentsApi.sendQrAll(cardId);
    Swal.fire({ icon: res.ok ? 'success' : 'error', title: res.ok ? 'QR Sent to All!' : 'Error', timer: 1500, showConfirmButton: false });
  }

  async function handleImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    const form = new FormData();
    form.append('file', file);
    const res = await studentsApi.import(form);
    if (res.ok) { load(); Swal.fire({ icon: 'success', title: 'Imported!', timer: 1500, showConfirmButton: false }); }
    else Swal.fire({ icon: 'error', title: 'Import Failed', text: await res.text() });
    e.target.value = '';
  }

  const filtered = students.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.studentId.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <button className={styles.backBtn} onClick={() => nav('/students')}><i className="fa-solid fa-arrow-left" /></button>
        <h2>Students</h2>
      </div>

      <section className={styles.toolbar}>
        <div className={styles.weekCard} onClick={openAdd}>
          <div className={styles.weekIcon}>
            <i className="fa-solid fa-plus plus-icon"></i>
          </div>
          <span className={styles.iconText}>Add Student</span>
        </div>

        <div className={styles.weekCard} onClick={openImport}>
          <div className={styles.weekIcon} style={{ background: '#0893A7' }}>
            <i className="fa-solid fa-file-excel"></i>
          </div>
          <span className={styles.iconText}>Import Students</span>
        </div>

        <div className={styles.filterSearch}>
          <button className={styles.sendBtn} onClick={sendAll}>
            <i className="fa-solid fa-paper-plane"></i> Send QR to all
          </button>
          <button className={styles.sendBtn} onClick={() => nav('/scanner')}>
            <i className="fa-solid fa-qrcode"></i> Scanner
          </button>

          <div className={styles.searchGroup}>
            <input type="text" placeholder="Search" value={search} onChange={e => setSearch(e.target.value)} />
            <button className={styles.searchBtn}>
              <i className="fa-solid fa-magnifying-glass"></i>
            </button>
          </div>
        </div>
      </section>

      <section className={styles.tableSection}>
        <div className={styles.tableContainer}>
          <table className={styles.studentTable}>
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Student ID</th>
                <th>Email</th>
                <th>Gender</th>
                <th>Generate</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0
                ? <tr><td colSpan={6} className={styles.empty}>No students found.</td></tr>
                : filtered.map((s, i) => (
                  <tr key={s.id}>
                    <td>{i + 1}</td>
                    <td>{s.name}</td>
                    <td>{s.studentId}</td>
                    <td>{s.email}</td>
                    <td>{s.gender || '—'}</td>
                    <td>
                      <div className={styles.rowActions}>
                        <button onClick={() => sendQr(s.id)} disabled={sending === s.id} title="Send QR"><i className="fa-solid fa-qrcode" /></button>
                        <button onClick={() => openEdit(s)} title="Edit"><i className="fa-solid fa-pen" /></button>
                        <button onClick={() => remove(s.id)} title="Delete"><i className="fa-solid fa-trash" /></button>
                      </div>
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      </section>

      {modal && (
        <div className={styles.modalBg}>
          <div className={styles.modal}>
            <span className={styles.close} onClick={() => setModal(false)}>&times;</span>
            <h2>Students Information</h2>
            <p>Enter Students Information needed.</p>
            <form className={styles.formGrid} onSubmit={e => { e.preventDefault(); save(); }}>
              <input type="text" placeholder="Student Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              <input type="text" placeholder="Student Number" value={form.studentId} onChange={e => setForm(f => ({ ...f, studentId: e.target.value }))} />
              <input type="email" placeholder="Student Email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              <select value={form.gender} onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}>
                <option value="" disabled selected>Select Sex</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
              <button type="submit" className={styles.addBtn}>Submit</button>
            </form>
          </div>
        </div>
      )}

      {importModal && (
        <div className={styles.modalBg}>
          <div className={styles.modal} style={{ maxWidth: '560px' }}>
            <span className={styles.close} onClick={() => setImportModal(false)}>&times;</span>
            <h2>Import Students</h2>
            <p>Upload an Excel file (.xlsx) to bulk-add students to this class.</p>

            <div className={styles.dropZone}>
              <i className="fa-solid fa-cloud-arrow-up"></i>
              <p>Drag & drop your file here</p>
              <p>or click to browse — .xlsx only, max 5 MB</p>
              <input type="file" accept=".xlsx,.xls" hidden onChange={handleImport} />
            </div>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '16px' }}>
              <a href={studentsApi.template()} download style={{ fontSize: '13px', color: '#0F6577', textDecoration: 'underline' }}>
                <i className="fa-solid fa-download"></i> Download Template
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
