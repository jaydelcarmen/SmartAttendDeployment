import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { adminApi } from '../../api';
import styles from './AdminLogin.module.css';

export default function AdminLogin() {
  const nav = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    const res = await adminApi.login({ username, password });
    if (res.ok) nav('/admin/dashboard');
    else Swal.fire({ icon: 'error', title: 'Login Failed', text: await res.text() });
  }

  return (
    <div className={styles.page}>
      <div className={styles.left}>
        <img src="/assets/shield.png" alt="shield" className={styles.shield} />
        <h1>SmartAttend</h1>
        <p className={styles.welcome}>Admin <span>Portal</span></p>
        <p className={styles.desc}>Manage teachers and system access.</p>
      </div>
      <div className={styles.right}>
        <h2>Admin Login</h2>
        <form onSubmit={handleLogin}>
          <input placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} required />
          <div className={styles.pwWrap}>
            <input type={showPw ? 'text' : 'password'} placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
            <span className={styles.eye} onClick={() => setShowPw(v => !v)}>
              <i className={`fas ${showPw ? 'fa-eye-slash' : 'fa-eye'}`} />
            </span>
          </div>
          <button type="submit">Login</button>
        </form>
      </div>
    </div>
  );
}
