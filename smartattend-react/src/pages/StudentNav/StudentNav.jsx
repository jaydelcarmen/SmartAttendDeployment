import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { cardsApi } from '../../api';
import styles from './StudentNav.module.css';

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const EMPTY = { subjectName: '', section: '', room: '', days: [], startTime: '', endTime: '' };

export default function StudentNav() {
  const nav = useNavigate();
  const [cards, setCards]   = useState([]);
  const [modal, setModal]   = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm]     = useState(EMPTY);

  const load = () => cardsApi.myCards().then(r => r.ok ? r.json() : []).then(setCards);
  useEffect(() => { load(); }, []);

  function openAdd()       { setEditing(null); setForm(EMPTY); setModal(true); }
  function openEdit(card)  { setEditing(card.id); setForm({ subjectName: card.subjectName, section: card.section, room: card.room, days: card.days || [], startTime: card.startTime, endTime: card.endTime }); setModal(true); }

  function toggleDay(d) {
    setForm(f => ({ ...f, days: f.days.includes(d) ? f.days.filter(x => x !== d) : [...f.days, d] }));
  }

  async function save() {
    if (!form.subjectName.trim()) return;
    const res = editing ? await cardsApi.update(editing, form) : await cardsApi.add(form);
    if (res.ok) { setModal(false); load(); }
    else Swal.fire({ icon: 'error', title: 'Error', text: await res.text() });
  }

  async function remove(id) {
    const { isConfirmed } = await Swal.fire({ title: 'Delete card?', icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444' });
    if (!isConfirmed) return;
    const res = await cardsApi.delete(id);
    if (res.ok) load();
    else Swal.fire({ icon: 'error', title: 'Error', text: await res.text() });
  }

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <h2>My Classes</h2>
        <button className={styles.addBtn} onClick={openAdd}><i className="fa-solid fa-plus" /> Add Class</button>
      </div>

      {cards.length === 0
        ? <p className={styles.empty}>No classes yet. Click "Add Class" to get started.</p>
        : (
          <div className={styles.grid}>
            {cards.map(card => (
              <div key={card.id} className={styles.card} onClick={() => nav(`/students/${card.id}`)}>
                <div className={styles.cardHeader}>
                  <span className={styles.subject}>{card.subjectName}</span>
                  <div className={styles.actions} onClick={e => e.stopPropagation()}>
                    <button onClick={() => openEdit(card)}><i className="fa-solid fa-pen" /></button>
                    <button onClick={() => remove(card.id)}><i className="fa-solid fa-trash" /></button>
                  </div>
                </div>
                <p className={styles.meta}>{card.section} · {card.room}</p>
                <p className={styles.meta}>{(card.days || []).join(', ')}</p>
                <p className={styles.meta}>{card.startTime} – {card.endTime}</p>
              </div>
            ))}
          </div>
        )
      }

      {modal && (
        <div className={styles.modalBg}>
          <div className={styles.modal}>
            <span className={styles.close} onClick={() => setModal(false)}>&times;</span>
            <h3>{editing ? 'Edit Class' : 'Add Class'}</h3>
            <input placeholder="Subject Name" value={form.subjectName} onChange={e => setForm(f => ({ ...f, subjectName: e.target.value }))} />
            <input placeholder="Section"      value={form.section}     onChange={e => setForm(f => ({ ...f, section: e.target.value }))} />
            <input placeholder="Room"         value={form.room}        onChange={e => setForm(f => ({ ...f, room: e.target.value }))} />
            <div className={styles.days}>
              {DAYS.map(d => (
                <label key={d} className={`${styles.dayChip} ${form.days.includes(d) ? styles.dayOn : ''}`}>
                  <input type="checkbox" checked={form.days.includes(d)} onChange={() => toggleDay(d)} hidden />
                  {d.slice(0, 3)}
                </label>
              ))}
            </div>
            <div className={styles.timeRow}>
              <input type="time" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} />
              <span>–</span>
              <input type="time" value={form.endTime}   onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))} />
            </div>
            <button className={styles.saveBtn} onClick={save}>Save</button>
          </div>
        </div>
      )}
    </div>
  );
}
