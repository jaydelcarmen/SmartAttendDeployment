import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Swal from 'sweetalert2';
import { teacherApi } from '../../api';
import styles from './Login.module.css';

export default function Login() {
  const nav = useNavigate();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [forgotOpen, setForgotOpen]   = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [changeOpen, setChangeOpen]   = useState(false);
  const [newPw, setNewPw]             = useState('');
  const [confirmPw, setConfirmPw]     = useState('');
  const [showNewPw, setShowNewPw]     = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [resetEmail, setResetEmail]     = useState('');

  async function handleLogin(e) {
    e.preventDefault();
    if (email === 'open@admin') {
      openAdminPasscode();
      return;
    }
    const res = await teacherApi.login({ email, password });
    if (res.ok) {
      const data = await res.json();
      localStorage.setItem('teacher', JSON.stringify(data));
      await Swal.fire({ icon: 'success', title: 'Login Successful', text: 'Welcome to SmartAttend!', timer: 2000, showConfirmButton: false, allowOutsideClick: false });
      nav('/dashboard');
    } else {
      if (res.status === 403) return Swal.fire({ icon: 'error', title: 'Account Banned', text: 'Your account has been banned. Please contact the administrator.', confirmButtonColor: '#0F6577' });
      Swal.fire({ icon: 'error', title: 'Login Failed', text: await res.text() });
    }
  }

  async function sendOtp() {
    if (!forgotEmail) return Swal.fire({ icon: 'warning', title: 'Enter Email', text: 'Please enter email' });
    
    Swal.fire({ title: 'Sending OTP...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    
    try {
      const res = await teacherApi.forgotPassword({ email: forgotEmail });
      const data = await res.text();
      Swal.close();
      
      if (!res.ok) return Swal.fire({ icon: 'error', title: 'Failed to access token', text: data });
      
      setResetEmail(forgotEmail);
      setForgotOpen(false);
      
      const otpResult = await Swal.fire({
        title: '<i class="fa-solid fa-envelope" style="color:#0F6577"></i> Verify Your Identity',
        html: `<p style="font-size:13px;color:#64748b;margin:0 0 16px">${data}</p>
               <input id="swal-otp" class="swal2-input" placeholder="Enter 6-digit OTP" maxlength="6" style="letter-spacing:6px;font-size:18px;text-align:center">`,
        showCancelButton: true, confirmButtonText: 'Verify', confirmButtonColor: '#0F6577', focusConfirm: false,
        preConfirm: () => {
          const val = document.getElementById('swal-otp').value.trim();
          if (!val || val.length !== 6) { Swal.showValidationMessage('Please enter the 6-digit OTP'); return false; }
          return val;
        }
      });
      
      if (!otpResult.isConfirmed) return;
      
      const verifyRes = await teacherApi.verifyOtp({ email: resetEmail, otp: otpResult.value });
      const verifyData = await verifyRes.text();
      
      if (!verifyRes.ok) return Swal.fire({ icon: 'error', title: 'Verify OTP', text: verifyData });
      
      await Swal.fire({ icon: 'success', title: 'OTP Verified', text: verifyData, timer: 2000, showConfirmButton: false });
      setChangeOpen(true);
    } catch (err) {
      Swal.close();
      Swal.fire({ icon: 'error', title: 'Server Error', text: 'Unable to connect to server' });
    }
  }

  async function submitNewPassword() {
    if (!newPw) return Swal.fire({ icon: 'warning', title: 'Enter New Password', text: 'Please enter new password' });
    if (confirmPw !== newPw) return Swal.fire({ icon: 'error', title: 'Invalid Password', text: 'Passwords do not match' });
    
    try {
      const res = await teacherApi.submitNewPass({ email: resetEmail, newPassword: newPw });
      const data = await res.text();
      
      if (!res.ok) return Swal.fire({ icon: 'error', title: 'Error Encountered', text: data });
      
      await Swal.fire({ icon: 'success', title: 'Password reset successful', text: data, timer: 2000, showConfirmButton: false });
      setChangeOpen(false);
      setNewPw('');
      setConfirmPw('');
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Server Error', text: 'Unable to connect to server' });
    }
  }

  async function openAdminPasscode() {
    Swal.fire({
      title: '<i class="fa-solid fa-shield-halved" style="color:#0F6577"></i> Admin Access',
      input: 'password', inputPlaceholder: 'Enter passcode', inputAttributes: { autocomplete: 'off' },
      showCancelButton: true, confirmButtonText: 'Enter', confirmButtonColor: '#0F6577', cancelButtonColor: '#aaa',
      inputValidator: v => { if (!v) return 'Please enter the passcode'; }
    }).then(result => {
      if (!result.isConfirmed) return;
      if (result.value === 'smartattend@admin') {
        sessionStorage.setItem('adminGate', 'granted');
        nav('/admin-login');
      } else {
        Swal.fire({ icon: 'error', title: 'Access Denied', text: 'Incorrect passcode.', timer: 1800, showConfirmButton: false });
      }
    });
  }

  return (
    <div className={styles.page}>
      <div className={styles.left}>
        <img src="/assets/shield.png" alt="shield" className={styles.shield} />
        <h1>SmartAttend</h1>
        <p className={styles.welcome}>Welcome to <span>SmartAttend</span></p>
        <p className={styles.desc}>Smart and simple attendance management.</p>
      </div>

      <div className={styles.right}>
        <h2>Login</h2>
        <form onSubmit={handleLogin}>
          <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
          <div className={styles.pwWrap}>
            <input type={showPw ? 'text' : 'password'} placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
            <span className={styles.eye} onClick={() => setShowPw(v => !v)}>
              <i className={`fas ${showPw ? 'fa-eye-slash' : 'fa-eye'}`} />
            </span>
          </div>
          <p className={styles.forgot} onClick={() => setForgotOpen(true)}>Forgot Password?</p>
          <button type="submit">Login</button>
        </form>
        <p>Don't have an account? <Link to="/register">Register</Link></p>
      </div>

      {forgotOpen && (
        <div className={styles.modalBg}>
          <div className={styles.modal}>
            <span className={styles.close} onClick={() => setForgotOpen(false)}>&times;</span>
            <h2>Forget password?</h2>
            <p>Enter your email to receive an verification code.</p>
            <input type="email" placeholder="Enter Address" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} />
            <button className={styles.forgetBtn} onClick={sendOtp}>Send OTP</button>
          </div>
        </div>
      )}

      {changeOpen && (
        <div className={styles.modalBg}>
          <div className={styles.modal}>
            <span className={styles.close} onClick={() => setChangeOpen(false)}>&times;</span>
            <h2>Set New Password</h2>
            <p>Create a new password.</p>
            <div className={styles.pwWrap}>
              <input type={showNewPw ? 'text' : 'password'} placeholder="Enter New Password" value={newPw} onChange={e => setNewPw(e.target.value)} />
              <span className={styles.eye} onClick={() => setShowNewPw(v => !v)}>
                <i className={`fas ${showNewPw ? 'fa-eye-slash' : 'fa-eye'}`} />
              </span>
            </div>
            <div className={styles.pwWrap}>
              <input type={showConfirmPw ? 'text' : 'password'} placeholder="Confirm New Password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} />
              <span className={styles.eye} onClick={() => setShowConfirmPw(v => !v)}>
                <i className={`fas ${showConfirmPw ? 'fa-eye-slash' : 'fa-eye'}`} />
              </span>
            </div>
            <button className={styles.forgetBtn} onClick={submitNewPassword}>Submit</button>
          </div>
        </div>
      )}
    </div>
  );
}
