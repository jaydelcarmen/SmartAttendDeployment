export default function Logo() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <img src="/assets/SmartAttend-LOGO.jpg" alt="SmartAttend" style={{ width: 50, height: 38, objectFit: 'contain' }} />
      <span style={{ fontWeight: 700, fontSize: 18 }}>SmartAttend</span>
    </div>
  );
}
