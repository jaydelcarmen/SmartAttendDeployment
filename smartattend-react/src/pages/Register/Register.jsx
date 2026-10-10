import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Swal from 'sweetalert2';
import { teacherApi } from '../../api';
import styles from './Register.module.css';

export default function Register() {
  const nav = useNavigate();
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [showCf, setShowCf]     = useState(false);

  async function handleRegister(e) {
    e.preventDefault();
    if (password !== confirm) return Swal.fire({ icon: 'error', title: 'Mismatch', text: 'Passwords do not match.' });
    const res = await teacherApi.register({ name, email, password });
    if (res.ok) {
      Swal.fire({ icon: 'success', title: 'Registered!', text: 'Your account is pending approval.', timer: 2000, showConfirmButton: false });
      nav('/');
    } else {
      Swal.fire({ icon: 'error', title: 'Error', text: await res.text() });
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.left}>
        <img src="/assets/shield.png" alt="shield" className={styles.shield} />
        <h1>SmartAttend</h1>
        <p className={styles.welcome}>Create your <span>SmartAttend</span></p>
        <p className={styles.desc}>Join and manage attendance easily.</p>
      </div>

      <div className={styles.right}>
        <h2>Register</h2>
        <form onSubmit={handleRegister}>
          <input type="text" placeholder="Username" value={name} onChange={e => setName(e.target.value)} required />
          <input type="email" placeholder="Email Address" value={email} onChange={e => setEmail(e.target.value)} required />
          <div className={styles.pwWrap}>
            <input type={showPw ? 'text' : 'password'} placeholder="Password" minLength={6} value={password} onChange={e => setPassword(e.target.value)} required />
            <span className={styles.eye} onClick={() => setShowPw(v => !v)}><i className={`fas ${showPw ? 'fa-eye-slash' : 'fa-eye'}`} /></span>
          </div>
          <div className={styles.pwWrap}>
            <input type={showCf ? 'text' : 'password'} placeholder="Confirm Password" minLength={6} value={confirm} onChange={e => setConfirm(e.target.value)} required />
            <span className={styles.eye} onClick={() => setShowCf(v => !v)}><i className={`fas ${showCf ? 'fa-eye-slash' : 'fa-eye'}`} /></span>
          </div>
          <button type="submit">Register</button>
        </form>
        <p>Have an account? <Link to="/">Sign in</Link></p>
      </div>
    </div>
  );
}
