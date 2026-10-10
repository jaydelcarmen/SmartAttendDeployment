import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import { teacherApi } from '../api';
import styles from './Layout.module.css';

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    teacherApi.me()
      .then(r => r.ok ? r.json() : null)
      .then(data => data && setProfile(data))
      .catch(() => {});
  }, []);

  return (
    <div className={styles.root}>
      <Header
        profile={profile}
        onMenuClick={() => setSidebarOpen(o => !o)}
        onProfileUpdate={setProfile}
      />
      <div className={styles.body}>
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className={styles.main}><Outlet /></main>
      </div>
    </div>
  );
}
