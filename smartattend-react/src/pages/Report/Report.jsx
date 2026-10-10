import { useEffect, useState } from 'react';
import { attendanceApi } from '../../api';
import styles from './Report.module.css';

export default function Report() {
  const [cards, setCards]   = useState([]);
  const [rows, setRows]     = useState([]);
  const [filters, setFilters] = useState({ cardId: '', date: '', status: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    attendanceApi.cards().then(r => r.ok ? r.json() : []).then(setCards);
  }, []);

  async function search() {
    setLoading(true);
    const params = {};
    if (filters.cardId) params.cardId = filters.cardId;
    if (filters.date)   params.date   = filters.date;
    if (filters.status) params.status = filters.status;
    const res = await attendanceApi.reportAll(params);
    const data = res.ok ? await res.json() : [];
    setRows(data);
    setLoading(false);
  }

  useEffect(() => { search(); }, []);

  return (
    <div className={styles.page}>
      <h2>Attendance Report</h2>

      <div className={styles.filters}>
        <select value={filters.cardId} onChange={e => setFilters(f => ({ ...f, cardId: e.target.value }))}>
          <option value="">All Classes</option>
          {cards.map(c => <option key={c.id} value={c.id}>{c.subjectName} – {c.section}</option>)}
        </select>
        <input type="date" value={filters.date} onChange={e => setFilters(f => ({ ...f, date: e.target.value }))} />
        <select value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}>
          <option value="">All Status</option>
          <option value="PRESENT">Present</option>
          <option value="ABSENT">Absent</option>
          <option value="LATE">Late</option>
        </select>
        <button className={styles.searchBtn} onClick={search}><i className="fa-solid fa-magnifying-glass" /> Search</button>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr><th>#</th><th>Student ID</th><th>Name</th><th>Subject</th><th>Date</th><th>Time</th><th>Status</th></tr>
          </thead>
          <tbody>
            {loading
              ? <tr><td colSpan={7} className={styles.empty}>Loading…</td></tr>
              : rows.length === 0
                ? <tr><td colSpan={7} className={styles.empty}>No records found.</td></tr>
                : rows.map((r, i) => (
                  <tr key={i}>
                    <td>{i + 1}</td>
                    <td>{r.studentId}</td>
                    <td>{r.studentName}</td>
                    <td>{r.subjectName}</td>
                    <td>{r.date}</td>
                    <td>{r.time}</td>
                    <td><span className={`${styles.badge} ${styles[r.status?.toLowerCase()]}`}>{r.status}</span></td>
                  </tr>
                ))
            }
          </tbody>
        </table>
      </div>
    </div>
  );
}
