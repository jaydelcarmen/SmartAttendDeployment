import { useEffect, useState } from 'react';
import { attendanceApi } from '../../api';
import styles from './TeacherDashboard.module.css';

export default function TeacherDashboard() {
  const [stats, setStats] = useState(null);
  const [chart, setChart] = useState([]);

  useEffect(() => {
    attendanceApi.todayStats().then(r => r.ok ? r.json() : null).then(d => d && setStats(d));
    attendanceApi.chart().then(r => r.ok ? r.json() : null).then(d => d && setChart(d));
  }, []);

  const max = chart.length ? Math.max(...chart.map(c => c.present + c.absent), 1) : 1;

  return (
    <div className={styles.page}>
      <h2>Dashboard</h2>

      <div className={styles.cards}>
        {[
          { label: 'Present Today',  value: stats?.present  ?? '—', icon: 'fa-solid fa-user-check',  color: '#22c55e' },
          { label: 'Absent Today',   value: stats?.absent   ?? '—', icon: 'fa-solid fa-user-xmark',  color: '#ef4444' },
          { label: 'Total Students', value: stats?.total    ?? '—', icon: 'fa-solid fa-users',        color: '#3b82f6' },
          { label: 'Active Classes', value: stats?.classes  ?? '—', icon: 'fa-solid fa-chalkboard',  color: '#f59e0b' },
        ].map(c => (
          <div key={c.label} className={styles.card}>
            <div className={styles.cardIcon} style={{ background: c.color + '1a', color: c.color }}>
              <i className={c.icon} />
            </div>
            <div>
              <p className={styles.cardVal}>{c.value}</p>
              <p className={styles.cardLabel}>{c.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className={styles.chartBox}>
        <h3>Weekly Attendance</h3>
        {chart.length === 0
          ? <p className={styles.empty}>No data yet.</p>
          : (
            <div className={styles.chart}>
              {chart.map((row, i) => (
                <div key={i} className={styles.barGroup}>
                  <div className={styles.bars}>
                    <div className={styles.barPresent} style={{ height: `${(row.present / max) * 140}px` }} title={`Present: ${row.present}`} />
                    <div className={styles.barAbsent}  style={{ height: `${(row.absent  / max) * 140}px` }} title={`Absent: ${row.absent}`} />
                  </div>
                  <span className={styles.barLabel}>{row.day}</span>
                </div>
              ))}
            </div>
          )
        }
        <div className={styles.legend}>
          <span><span className={styles.dotPresent} /> Present</span>
          <span><span className={styles.dotAbsent}  /> Absent</span>
        </div>
      </div>
    </div>
  );
}
