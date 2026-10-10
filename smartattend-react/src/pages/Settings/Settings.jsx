import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { teacherApi, logout } from '../../api';
import styles from './Settings.module.css';

export default function Settings() {
  const nav = useNavigate();
  const [profile, setProfile] = useState({ name: '', email: '' });
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp]         = useState('');
  const [newPw, setNewPw]     = useState('');
  const [confirmPw, setConfirmPw] = useState('');

  useEffect(() => {
    teacherApi.me().then(r => r.ok ? r.json() : null).then(d => d && setProfile(d));
  }, []);

  async function saveProfile(e) {
    e.preventDefault();
    const res = await teacherApi.updateProfile({ name: profile.name });
    Swal.fire({ icon: res.ok ? 'success' : 'error', title: res.ok ? 'Saved!' : 'Error', timer: 1500, showConfirmButton: false });
  }

  async function handleUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    const form = new FormData();
    form.append('file', file);
    const res = await teacherApi.uploadPicture(form);
    if (res.ok) {
      const base64 = await res.text();
      setProfile(p => ({ ...p, profilePicture: base64 }));
      Swal.fire({ icon: 'success', title: 'Picture updated!', timer: 1200, showConfirmButton: false });
    }
    e.target.value = '';
  }

  async function deletePicture() {
    const res = await teacherApi.deletePicture();
    if (res.ok) setProfile(p => ({ ...p, profilePicture: null }));
  }

  async function sendOtp() {
    const res = await teacherApi.sendOtp();
    if (res.ok) { setOtpSent(true); Swal.fire({ icon: 'success', title: 'OTP sent to your email!', timer: 1500, showConfirmButton: false }); }
    else Swal.fire({ icon: 'error', title: 'Error', text: await res.text() });
  }

  async function changePassword(e) {
    e.preventDefault();
    if (newPw !== confirmPw) return Swal.fire({ icon: 'error', title: 'Mismatch', text: 'Passwords do not match.' });
    const res = await teacherApi.verifyOtp({ otp, newPassword: newPw });
    if (res.ok) {
      setOtpSent(false); setOtp(''); setNewPw(''); setConfirmPw('');
      Swal.fire({ icon: 'success', title: 'Password changed!', timer: 1500, showConfirmButton: false });
    } else Swal.fire({ icon: 'error', title: 'Error', text: await res.text() });
  }

  async function handleLogout() {
    await logout();
    nav('/');
  }

  const initials = (profile.name || '?').charAt(0).toUpperCase();

  return (
    <div className={styles.page}>
      <h2>Settings</h2>

      <div className={styles.section}>
        <h3>Profile Picture</h3>
        <div className={styles.avatarRow}>
          <div className={styles.avatar}>
            {profile.profilePicture
              ? <img src={profile.profilePicture} alt="" />
              : <span>{initials}</span>}
          </div>
          <div className={styles.avatarActions}>
            <label className={styles.uploadBtn}><i className="fa-solid fa-upload" /> Upload<input type="file" accept="image/*" hidden onChange={handleUpload} /></label>
            {profile.profilePicture && <button className={styles.deleteBtn} onClick={deletePicture}><i className="fa-solid fa-trash" /> Remove</button>}
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <h3>Profile Info</h3>
        <form onSubmit={saveProfile} className={styles.form}>
          <label>Name<input value={profile.name} onChange={e => setProfile(p => ({ ...p, name: e.target.value }))} /></label>
          <label>Email<input value={profile.email} disabled /></label>
          <button type="submit" className={styles.saveBtn}>Save Changes</button>
        </form>
      </div>

      <div className={styles.section}>
        <h3>Change Password</h3>
        {!otpSent
          ? <button className={styles.otpBtn} onClick={sendOtp}><i className="fa-solid fa-envelope" /> Send OTP to Email</button>
          : (
            <form onSubmit={changePassword} className={styles.form}>
              <label>OTP Code<input placeholder="Enter OTP" value={otp} onChange={e => setOtp(e.target.value)} /></label>
              <label>New Password<input type="password" placeholder="New password" value={newPw} onChange={e => setNewPw(e.target.value)} /></label>
              <label>Confirm Password<input type="password" placeholder="Confirm password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} /></label>
              <button type="submit" className={styles.saveBtn}>Change Password</button>
            </form>
          )
        }
      </div>

      <div className={styles.section}>
        <button className={styles.logoutBtn} onClick={handleLogout}><i className="fa-solid fa-right-from-bracket" /> Logout</button>
      </div>
    </div>
  );
}
