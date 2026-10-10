import { NavLink } from 'react-router-dom';
import styles from './Sidebar.module.css';

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: 'fa-solid fa-chart-line' },
  { to: '/students',  label: 'Students',  icon: 'fa-solid fa-user-graduate' },
  { to: '/scanner',   label: 'Scanner',   icon: 'fa-solid fa-qrcode' },
  { to: '/report',    label: 'Reports',   icon: 'fa-solid fa-file-lines' },
  { to: '/settings',  label: 'Settings',  icon: 'fa-solid fa-gear' },
];

export default function Sidebar({ open, onClose }) {
  return (
    <>
      {open && <div className={styles.overlay} onClick={onClose} />}
      <aside className={`${styles.sidebar} ${open ? styles.open : ''}`}>
        <ul>
          {NAV.map(({ to, label, icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
                onClick={onClose}
              >
                <i className={icon} />
                <span>{label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </aside>
    </>
  );
}
