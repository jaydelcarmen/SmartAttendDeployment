import { useRef } from 'react';
import Logo from './Logo';
import { teacherApi } from '../api';
import styles from './Header.module.css';

export default function Header({ profile, onMenuClick, onProfileUpdate }) {
  const fileRef = useRef();

  async function handleUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    const form = new FormData();
    form.append('file', file);
    const res = await teacherApi.uploadPicture(form);
    if (res.ok) {
      const base64 = await res.text();
      onProfileUpdate?.({ ...profile, profilePicture: base64 });
    }
  }

  const initials = (profile?.name || '?').charAt(0).toUpperCase();

  return (
    <header className={styles.header}>
      <button className={styles.hamburger} onClick={onMenuClick}>
        <span /><span /><span />
      </button>
      <Logo />
      <div className={styles.profileWrap}>
        <label className={styles.avatarWrap} title="Change profile picture">
          {profile?.profilePicture
            ? <img src={profile.profilePicture} alt="" className={styles.avatar} />
            : <span className={styles.initials}>{initials}</span>}
          <input type="file" accept="image/*" ref={fileRef} style={{ display: 'none' }} onChange={handleUpload} />
        </label>
        <span className={styles.name}>{profile?.name || ''}</span>
      </div>
    </header>
  );
}
