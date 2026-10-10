import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import Swal from 'sweetalert2';
import { attendanceApi, cardsApi } from '../../api';
import styles from './Scanner.module.css';

export default function Scanner() {
  const [cards, setCards]     = useState([]);
  const [cardId, setCardId]   = useState('');
  const [scanning, setScanning] = useState(false);
  const [lastScan, setLastScan] = useState(null);
  const scannerRef = useRef(null);
  const html5Ref   = useRef(null);

  useEffect(() => {
    cardsApi.myCards().then(r => r.ok ? r.json() : []).then(d => { setCards(d); if (d.length) setCardId(String(d[0].id)); });
    return () => { html5Ref.current?.stop().catch(() => {}); };
  }, []);

  async function startScan() {
    if (!cardId) return Swal.fire({ icon: 'warning', title: 'Select a class first.' });
    const qr = new Html5Qrcode('qr-reader');
    html5Ref.current = qr;
    setScanning(true);
    await qr.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: 250 },
      async (text) => {
        await qr.stop();
        setScanning(false);
        const res = await attendanceApi.scan({ qrToken: text, cardId: Number(cardId) });
        const msg = res.ok ? await res.text() : await res.text();
        setLastScan({ ok: res.ok, msg });
        if (!res.ok) Swal.fire({ icon: 'error', title: 'Scan Failed', text: msg });
      },
      () => {}
    ).catch(() => setScanning(false));
  }

  async function stopScan() {
    await html5Ref.current?.stop().catch(() => {});
    setScanning(false);
  }

  return (
    <div className={styles.page}>
      <h2>QR Scanner</h2>

      <div className={styles.controls}>
        <select value={cardId} onChange={e => setCardId(e.target.value)} disabled={scanning}>
          {cards.map(c => <option key={c.id} value={c.id}>{c.subjectName} – {c.section}</option>)}
        </select>
        {scanning
          ? <button className={styles.stopBtn} onClick={stopScan}><i className="fa-solid fa-stop" /> Stop</button>
          : <button className={styles.startBtn} onClick={startScan}><i className="fa-solid fa-camera" /> Start Scan</button>
        }
      </div>

      <div className={styles.scanBox}>
        <div id="qr-reader" ref={scannerRef} className={styles.reader} />
        {!scanning && (
          <div className={styles.placeholder}>
            <i className="fa-solid fa-qrcode" />
            <p>Camera will appear here</p>
          </div>
        )}
      </div>

      {lastScan && (
        <div className={`${styles.result} ${lastScan.ok ? styles.ok : styles.err}`}>
          <i className={`fa-solid ${lastScan.ok ? 'fa-circle-check' : 'fa-circle-xmark'}`} />
          {lastScan.msg}
        </div>
      )}
    </div>
  );
}
