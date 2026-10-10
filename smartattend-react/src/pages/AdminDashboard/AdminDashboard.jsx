import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { adminApi, logout } from '../../api';
import styles from './AdminDashboard.module.css';

export default function AdminDashboard() {
  const nav = useNavigate();
  const [teachers, setTeachers] = useState([]);
  const [search, setSearch]     = useState('');
  const [currentTab, setCurrentTab] = useState('all');
  const [adminName, setAdminName] = useState('');

  const load = () => adminApi.teachers().then(r => r.ok ? r.json() : []).then(setTeachers);
  
  useEffect(() => {
    load();
    loadAdmin();
  }, []);

  async function loadAdmin() {
    const res = await adminApi.me();
    if (res.ok) {
      const data = await res.json();
      setAdminName('Hi, ' + (data.name || 'Admin'));
    }
  }

  async function action(fn, label) {
    const res = await fn();
    if (res.ok) load();
    else Swal.fire({ icon: 'error', title: label + ' failed', text: await res.text() });
  }

  async function remove(id) {
    const { isConfirmed } = await Swal.fire({ 
      icon: 'warning', 
      title: 'Delete this teacher?',
      text: 'This action cannot be undone.',
      showCancelButton: true, 
      confirmButtonColor: '#dc2626', 
      confirmButtonText: 'Yes, delete'
    });
    if (isConfirmed) action(() => adminApi.delete(id), 'Delete');
  }

  async function handleLogout() { await logout(); nav('/admin'); }

  const tabTitles = { all: 'All Teachers', pending: 'Pending Approval', approved: 'Approved Teachers', banned: 'Banned Teachers' };
  const statusIcons = { pending: 'fa-clock', approved: 'fa-circle-check', banned: 'fa-ban' };

  const filtered = teachers.filter(t => {
    const matchesTab = currentTab === 'all' || t.status?.toLowerCase() === currentTab;
    const matchesSearch = t.name?.toLowerCase().includes(search.toLowerCase()) ||
                          t.email?.toLowerCase().includes(search.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const count = status => teachers.filter(t => t.status?.toLowerCase() === status).length;
  const pending = count('pending');

  const statusBadge = (s) => {
    const status = s?.toLowerCase() || 'pending';
    if (status === 'approved') return styles.approved;
    if (status === 'banned')   return styles.banned;
    return styles.pending;
  };

  const getInitials = (name) => {
    return (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.logo}>
          <div className={styles.logoIcon}><i className="fa-solid fa-shield-halved"></i></div>
          <span>SmartAttend <span className={styles.adminTag}>Admin</span></span>
        </div>
        <div className={styles.headerRight}>
          <span className={styles.adminName}>{adminName}</span>
          <button className={styles.logoutBtn} onClick={handleLogout}>
            <i className="fa-solid fa-right-from-bracket"></i> Logout
          </button>
        </div>
      </div>

      <div className={styles.dashboardBody}>
        <aside className={styles.sidebar}>
          <nav>
            <button className={`${styles.navBtn} ${currentTab === 'all' ? styles.active : ''}`} onClick={() => setCurrentTab('all')}>
              <i className="fa-solid fa-users"></i> All Teachers
            </button>
            <button className={`${styles.navBtn} ${currentTab === 'pending' ? styles.active : ''}`} onClick={() => setCurrentTab('pending')}>
              <i className="fa-solid fa-clock"></i> Pending
              <span className={styles.badge} style={{ display: pending > 0 ? '' : 'none' }}>{pending}</span>
            </button>
            <button className={`${styles.navBtn} ${currentTab === 'approved' ? styles.active : ''}`} onClick={() => setCurrentTab('approved')}>
              <i className="fa-solid fa-circle-check"></i> Approved
            </button>
            <button className={`${styles.navBtn} ${currentTab === 'banned' ? styles.active : ''}`} onClick={() => setCurrentTab('banned')}>
              <i className="fa-solid fa-ban"></i> Banned
            </button>
          </nav>
        </aside>

        <main className={styles.mainContent}>
          <div className={styles.statsRow}>
            <div className={styles.statCard}>
              <i className="fa-solid fa-users"></i>
              <div>
                <span className={styles.statValue}>{teachers.length}</span>
                <span className={styles.statLabel}>Total Teachers</span>
              </div>
            </div>
            <div className={`${styles.statCard} ${styles.pending}`}>
              <i className="fa-solid fa-clock"></i>
              <div>
                <span className={styles.statValue}>{pending}</span>
                <span className={styles.statLabel}>Pending Approval</span>
              </div>
            </div>
            <div className={`${styles.statCard} ${styles.approved}`}>
              <i className="fa-solid fa-circle-check"></i>
              <div>
                <span className={styles.statValue}>{count('approved')}</span>
                <span className={styles.statLabel}>Approved</span>
              </div>
            </div>
            <div className={`${styles.statCard} ${styles.banned}`}>
              <i className="fa-solid fa-ban"></i>
              <div>
                <span className={styles.statValue}>{count('banned')}</span>
                <span className={styles.statLabel}>Banned</span>
              </div>
            </div>
          </div>

          <div className={styles.tableCard}>
            <div className={styles.tableHeader}>
              <h2>{tabTitles[currentTab]}</h2>
              <div className={styles.searchWrap}>
                <i className="fa-solid fa-magnifying-glass"></i>
                <input type="text" placeholder="Search by name or email..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
            </div>

            <div className={styles.tableWrap}>
              <table>
                <thead>
                  <tr>
                    <th>Teacher</th>
                    <th>Email</th>
                    <th>Joined</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={5} className={styles.emptyState}><i className="fa-solid fa-inbox"></i><p>No teachers found</p></td></tr>
                  ) : filtered.map(t => {
                    const status = t.status?.toLowerCase() || 'pending';
                    const icon = statusIcons[status] || 'fa-clock';
                    const initials = getInitials(t.name);
                    const avatarHtml = t.profilePicture
                      ? <img className={styles.teacherAvatar} src={t.profilePicture} alt="" />
                      : <div className={styles.teacherInitials}>{initials}</div>;
                    
                    return (
                      <tr key={t.id}>
                        <td><div className={styles.teacherCell}>{avatarHtml}<span className={styles.teacherName}>{t.name || '—'}</span></div></td>
                        <td>{t.email}</td>
                        <td>{t.createdAt || '—'}</td>
                        <td><span className={`${styles.statusPill} ${statusBadge(t.status)}`}><i className={`fa-solid ${icon}`}></i> {status.charAt(0).toUpperCase() + status.slice(1)}</span></td>
                        <td>
                          <div className={styles.actionBtns}>
                            {status === 'pending' && (
                              <>
                                <button className={styles.btnApprove} onClick={() => action(() => adminApi.approve(t.id), 'Approve')}><i className="fa-solid fa-check"></i> Approve</button>
                                <button className={styles.btnBan} onClick={() => action(() => adminApi.ban(t.id), 'Ban')}><i className="fa-solid fa-ban"></i> Ban</button>
                              </>
                            )}
                            {status === 'approved' && (
                              <button className={styles.btnBan} onClick={() => action(() => adminApi.ban(t.id), 'Ban')}><i className="fa-solid fa-ban"></i> Ban</button>
                            )}
                            {status === 'banned' && (
                              <button className={styles.btnUnban} onClick={() => action(() => adminApi.approve(t.id), 'Unban')}><i className="fa-solid fa-rotate-left"></i> Unban</button>
                            )}
                            <button className={styles.btnDelete} onClick={() => remove(t.id)}><i className="fa-solid fa-trash"></i></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
