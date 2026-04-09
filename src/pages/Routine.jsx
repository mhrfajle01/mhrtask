import { useState, useEffect, useMemo, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebase/config";
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  onSnapshot, 
  serverTimestamp,
  writeBatch,
  getDocs,
  orderBy
} from "firebase/firestore";
import confetti from "canvas-confetti";
import playSound from "../utils/sfx";
import ConfirmationModal from "../components/ConfirmationModal";

const Routine = () => {
  const { currentUser, addXP, userData } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [activeTab, setActiveTab] = useState("morning");
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState("");
  const [deleteTask, setDeleteTask] = useState(null);
  const [processing, setProcessing] = useState(false);

  // Import States
  const [showImportModal, setShowImportModal] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const fileInputRef = useRef(null);

  // Smart Sync States
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [historyTasks, setHistoryTasks] = useState([]);
  const [selectedSyncIds, setSelectedSyncIds] = useState([]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showFocusPortal, setShowFocusPortal] = useState(false);
  const [activeTask, setActiveTask] = useState(null);
  const [formData, setFormData] = useState({ title: "", taskTime: "", statType: "str", difficulty: "medium" });

  const difficulties = {
    easy: { label: 'Common', xp: 10, color: 'secondary' },
    medium: { label: 'Rare', xp: 20, color: 'primary' },
    hard: { label: 'Epic', xp: 40, color: 'warning' }
  };

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const hour = now.getHours();
      let endHour = hour >= 18 || hour < 3 ? 3 : hour >= 12 ? 18 : 12;
      const deadline = new Date();
      deadline.setHours(endHour, 0, 0, 0);
      if (endHour === 3 && hour >= 18) deadline.setDate(deadline.getDate() + 1);
      const diff = deadline - now;
      const mins = Math.floor(diff / 1000 / 60);
      setTimeLeft(mins > 60 ? `${Math.floor(mins/60)}h ${mins%60}m` : `${mins}m`);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    const q = query(collection(db, "users", currentUser.uid, "routines"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allTasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTasks(allTasks.sort((a, b) => (a.taskTime || "00:00").localeCompare(b.taskTime || "00:00")));
    });
    return () => unsubscribe();
  }, [currentUser]);

  const handleBulkImport = async () => {
    if (!bulkText.trim()) return;
    setLoading(true);
    try {
      const lines = bulkText.split('\n');
      const batch = writeBatch(db);
      let count = 0;
      lines.forEach(line => {
        const match = line.match(/^(\d{1,2}:\d{2})\s*-\s*(.+?)\s*\((\w+)\)$/i);
        if (match) {
          const [_, time, title, attr] = match;
          const statType = ['str', 'int', 'spr', 'cha'].includes(attr.toLowerCase()) ? attr.toLowerCase() : 'str';
          const newRef = doc(collection(db, "users", currentUser.uid, "routines"));
          batch.set(newRef, { title: title.trim(), taskTime: time, statType, difficulty: "medium", timeOfDay: activeTab, completed: false, createdAt: serverTimestamp() });
          count++;
        }
      });
      if (count > 0) { await batch.commit(); playSound('complete'); setShowImportModal(false); setBulkText(""); }
      else { alert("Invalid format! Use: 07:30 - Yoga (STR)"); }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const handleFileImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        setLoading(true);
        const batch = writeBatch(db);
        let data = file.name.endsWith('.json') ? JSON.parse(event.target.result) : [];
        if (file.name.endsWith('.csv')) {
          const lines = event.target.result.split('\n');
          const headers = lines[0].split(',');
          data = lines.slice(1).map(line => {
            const values = line.split(',');
            return headers.reduce((obj, h, i) => ({ ...obj, [h.trim()]: values[i]?.trim() }), {});
          });
        }
        data.forEach(item => {
          if (!item.title) return;
          const newRef = doc(collection(db, "users", currentUser.uid, "routines"));
          batch.set(newRef, { title: item.title, taskTime: item.taskTime || "00:00", statType: item.statType || "str", difficulty: item.difficulty || "medium", timeOfDay: item.timeOfDay || activeTab, completed: false, createdAt: serverTimestamp() });
        });
        await batch.commit(); playSound('complete'); setShowImportModal(false);
      } catch (err) { alert("Check file format!"); } finally { setLoading(false); }
    };
    reader.readAsText(file);
  };

  // SMART SYNC LOGIC
  const openSmartSync = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, "users", currentUser.uid, "routines"));
      const uniqueTasks = [];
      const titles = new Set();
      snap.docs.forEach(d => {
        const data = d.data();
        if (!titles.has(data.title)) {
          titles.add(data.title);
          uniqueTasks.push({ id: d.id, ...data });
        }
      });
      setHistoryTasks(uniqueTasks);
      setShowSyncModal(true);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const executeSmartSync = async () => {
    if (selectedSyncIds.length === 0) return;
    setLoading(true);
    try {
      const batch = writeBatch(db);
      selectedSyncIds.forEach(id => {
        const sourceTask = historyTasks.find(t => t.id === id);
        if (sourceTask) {
          const newRef = doc(collection(db, "users", currentUser.uid, "routines"));
          batch.set(newRef, { ...sourceTask, completed: false, createdAt: serverTimestamp(), timeOfDay: activeTab });
        }
      });
      await batch.commit();
      playSound('fanfare');
      setShowSyncModal(false);
      setSelectedSyncIds([]);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const toggleSyncSelection = (id) => {
    setSelectedSyncIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleOpenAdd = () => {
    playSound('click');
    setFormData({ title: "", taskTime: "", statType: "str", difficulty: "medium" });
    setActiveTask(null);
    setShowAddModal(true);
  };

  const toggleComplete = async (task) => {
    if (processing) return;
    setProcessing(true);
    try {
      const taskRef = doc(db, "users", currentUser.uid, "routines", task.id);
      const newStatus = !task.completed;
      const xpReward = difficulties[task.difficulty || 'medium'].xp;
      await updateDoc(taskRef, { completed: newStatus });
      await addXP(newStatus ? xpReward : -xpReward, task.statType);
      if (newStatus) {
        playSound('fanfare');
        confetti({ particleCount: 80, spread: 100, origin: { y: 0.8 } });
      }
      if (showFocusPortal) setShowFocusPortal(false);
    } catch (e) { console.error(e); } finally { setTimeout(() => setProcessing(false), 500); }
  };

  const PhaseGuardian = ({ type }) => {
    const colors = { morning: '#ffc107', afternoon: '#fd7e14', night: '#6610f2' };
    const color = colors[type];
    return (
      <div className="text-center mb-4 animate-float" style={{ minHeight: '120px' }}>
        <svg width="60" height="60" viewBox="0 0 100 100" style={{ filter: 'drop-shadow(0 5px 15px rgba(0,0,0,0.1))' }}>
          <defs><radialGradient id={`grad-${type}`} cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor={color} stopOpacity="0.8" /><stop offset="100%" stopColor={color} stopOpacity="0" /></radialGradient></defs>
          <circle cx="50" cy="50" r="40" fill={`url(#grad-${type})`}><animate attributeName="r" values="35;45;35" dur="3s" repeatCount="indefinite" /></circle>
          <circle cx="50" cy="50" r="15" fill={color} /><circle cx="42" cy="45" r="3" fill="white" /><circle cx="58" cy="45" r="3" fill="white" /><path d="M 40 60 Q 50 70 60 60" stroke="white" fill="none" strokeWidth="3" />
        </svg>
        <div className="mt-2"><div className="small fw-bold" style={{ color, letterSpacing: '2px', textTransform: 'uppercase' }}>{type} Guardian</div></div>
      </div>
    );
  };

  const MashButton = ({ task, large = false }) => {
    const [taps, setTaps] = useState(0);
    const [isBlooming, setIsBlooming] = useState(false);
    const maxTaps = 6;
    const size = large ? 120 : 50;
    const radius = large ? 50 : 20;
    const stroke = large ? 8 : 4;
    const dash = 2 * Math.PI * radius;
    const handleTap = (e) => {
      e.preventDefault(); if (task.completed) { toggleComplete(task); return; }
      const newTaps = taps + 1; playSound('charge');
      if ("vibrate" in navigator) navigator.vibrate([10]);
      setIsBlooming(true); setTimeout(() => setIsBlooming(false), 100);
      if (newTaps >= maxTaps) { if ("vibrate" in navigator) navigator.vibrate([100]); toggleComplete(task); setTaps(0); } else setTaps(newTaps);
    };
    return (
      <div className="position-relative d-inline-block" style={{ width: size, height: size, touchAction: 'manipulation', transition: 'transform 0.1s', transform: isBlooming ? 'scale(1.2)' : 'scale(1)' }} onClick={handleTap}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="#eee" strokeWidth={stroke} />
          <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke={task.completed ? '#198754' : '#0d6efd'} strokeWidth={stroke} strokeDasharray={dash} strokeDashoffset={dash - (dash * taps) / maxTaps} style={{ transition: 'stroke-dashoffset 0.1s linear' }} />
        </svg>
        <div className="position-absolute top-50 start-50 translate-middle"><i className={`bi ${task.completed ? 'bi-check-all text-success' : 'bi-lightning-fill text-primary'} ${large ? 'fs-1' : 'fs-5'}`}></i></div>
      </div>
    );
  };

  const FocusPortalOverlay = ({ activeTask, onClose }) => {
    useEffect(() => { const interval = setInterval(() => playSound('pulse'), 1500); return () => clearInterval(interval); }, []);
    return (
      <div className="h-100 d-flex flex-column align-items-center justify-content-center text-white p-4 animate-breathing">
        <button className="btn btn-link text-white position-absolute top-0 end-0 p-4" onClick={onClose}><i className="bi bi-x-lg fs-2"></i></button>
        <div className="text-center mb-5"><span className="badge rounded-pill bg-primary px-3 mb-3 text-uppercase">{activeTask.statType} Mission</span><h1 className="display-4 fw-bold mb-2">{activeTask.title}</h1></div>
        <div className="card bg-white bg-opacity-10 border-white border-opacity-20 rounded-5 p-5 text-center mb-5 shadow-lg"><MashButton task={activeTask} large={true} /></div>
      </div>
    );
  };

  const filteredTasks = tasks.filter(t => t.timeOfDay === activeTab);

  return (
    <div className="container py-4 mb-5">
      <div className="d-flex justify-content-between align-items-center mb-4 px-2">
        <h2 className="fw-bold m-0 text-primary">Routine</h2>
        <div className="d-flex gap-2">
          <button className="btn btn-light btn-sm rounded-pill px-3 fw-bold border shadow-sm" onClick={() => setShowImportModal(true)}><i className="bi bi-box-arrow-in-down me-1"></i> Import</button>
          <div className="badge bg-danger p-2 shadow-sm animate-pulse">ENDS IN {timeLeft}</div>
        </div>
      </div>

      <PhaseGuardian type={activeTab} />

      <div className="d-flex bg-white rounded-4 p-1 shadow-sm mb-4">
        {['morning', 'afternoon', 'night'].map(phase => (
          <button key={phase} onClick={() => { setActiveTab(phase); playSound('tab'); }}
            className={`btn flex-grow-1 border-0 rounded-3 py-2 text-capitalize fw-bold ${activeTab === phase ? 'bg-primary text-white shadow-sm' : 'text-muted'}`}>{phase}</button>
        ))}
      </div>

      <div className="d-flex flex-column gap-3">
        {filteredTasks.length === 0 ? (
          <div className="text-center py-5 bg-light rounded-4 border border-dashed">
            <i className="bi bi-journal-x fs-1 opacity-25"></i>
            <p className="mt-2 fw-bold text-muted">No quests for this phase.</p>
            <button className="btn btn-sm btn-primary rounded-pill px-4 mt-2 shadow-sm" onClick={openSmartSync}>
              <i className="bi bi-magic me-2"></i>Choose from History
            </button>
          </div>
        ) : 
          filteredTasks.map(task => (
            <div key={task.id} className={`card border-0 shadow-sm rounded-4 ${task.completed ? 'bg-light grayscale' : 'glass-card'}`}
              style={{ borderLeft: `6px solid ${task.statType === 'str' ? '#dc3545' : task.statType === 'int' ? '#0dcaf0' : task.statType === 'spr' ? '#198754' : '#ffc107'}` }}>
              <div className="card-body p-3 d-flex align-items-center">
                <MashButton task={task} />
                <div className="ms-3 flex-grow-1" onClick={() => !task.completed && setActiveTask(task) || setShowFocusPortal(true)}>
                  <div className="fw-bold">{task.title}</div>
                  <div className="small text-muted fw-bold"><i className="bi bi-clock me-1"></i>{task.taskTime} • {task.difficulty?.toUpperCase()}</div>
                </div>
                <button className="btn btn-link text-danger p-0 ms-2" onClick={(e) => { e.stopPropagation(); setDeleteTask(task); }}><i className="bi bi-trash"></i></button>
              </div>
            </div>
          ))}
      </div>

      {/* SYNC MODAL */}
      {showSyncModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 1200 }}>
          <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content border-0 rounded-4 shadow-lg">
              <div className="modal-header border-0 pb-0">
                <h5 className="fw-bold"><i className="bi bi-magic me-2 text-primary"></i>Smart Sync History</h5>
                <button type="button" className="btn-close" onClick={() => setShowSyncModal(false)}></button>
              </div>
              <div className="modal-body">
                <p className="small text-muted mb-3">Select previous quests to add to your <strong>{activeTab}</strong> routine.</p>
                <div className="d-flex flex-column gap-2">
                  {historyTasks.length === 0 ? <p className="text-center opacity-50 py-3">No history found.</p> : 
                    historyTasks.map(t => (
                      <div key={t.id} onClick={() => toggleSyncSelection(t.id)} className={`card border-2 p-2 rounded-3 cursor-pointer transition-all ${selectedSyncIds.includes(t.id) ? 'border-primary bg-primary bg-opacity-10' : 'border-light'}`}>
                        <div className="d-flex justify-content-between align-items-center px-2">
                          <div>
                            <div className="fw-bold small">{t.title}</div>
                            <div className="text-muted" style={{ fontSize: '0.7rem' }}>{t.taskTime} • {t.statType.toUpperCase()}</div>
                          </div>
                          {selectedSyncIds.includes(t.id) && <i className="bi bi-check-circle-fill text-primary"></i>}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
              <div className="modal-footer border-0">
                <button disabled={selectedSyncIds.length === 0 || loading} className="btn btn-primary w-100 rounded-pill fw-bold" onClick={executeSmartSync}>
                  {loading ? 'Cloning...' : `Import ${selectedSyncIds.length} Quests`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* IMPORT CENTER MODAL */}
      {showImportModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1100 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 rounded-4 shadow-lg">
              <div className="modal-header border-0 pb-0">
                <h5 className="fw-bold"><i className="bi bi-box-arrow-in-down me-2"></i>Import Center</h5>
                <button type="button" className="btn-close" onClick={() => setShowImportModal(false)}></button>
              </div>
              <div className="modal-body">
                <div className="mb-4">
                  <label className="form-label small fw-bold text-primary">FILE IMPORT (.JSON / .CSV)</label>
                  <button className="btn btn-outline-primary w-100 rounded-pill py-2 fw-bold shadow-sm" onClick={() => fileInputRef.current.click()}><i className="bi bi-file-earmark-arrow-up me-2"></i>Upload Backup File</button>
                  <input type="file" ref={fileInputRef} className="d-none" accept=".json,.csv" onChange={handleFileImport} />
                </div>
                <div className="mb-0">
                  <label className="form-label small fw-bold text-primary">BULK TEXT ADD</label>
                  <textarea className="form-control bg-light border-0 rounded-4 p-3" rows="5" placeholder="07:30 - Yoga (STR)&#10;09:00 - Coding (INT)" value={bulkText} onChange={e => setBulkText(e.target.value)}></textarea>
                  <button disabled={loading || !bulkText.trim()} className="btn btn-dark w-100 rounded-pill py-2 mt-3 fw-bold" onClick={handleBulkImport}>Initialize Bulk Quests</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmationModal show={!!deleteTask} title="Delete Quest" message="Are you sure?" onCancel={() => setDeleteTask(null)} onConfirm={async () => { await deleteDoc(doc(db, "users", currentUser.uid, "routines", deleteTask.id)); setDeleteTask(null); }} />
      <button onClick={handleOpenAdd} className="btn btn-primary rounded-circle shadow-lg position-fixed" style={{ width: '60px', height: '60px', bottom: '85px', right: '20px', zIndex: 1050, fontSize: '24px' }}><i className="bi bi-plus-lg"></i></button>
      {showFocusPortal && activeTask && (<div className="modal show d-block p-0" style={{ backgroundColor: '#000', zIndex: 2000 }}><FocusPortalOverlay activeTask={activeTask} onClose={() => setShowFocusPortal(false)} /></div>)}
      {showAddModal && (<div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1060 }}><div className="modal-dialog modal-dialog-centered"><div className="modal-content border-0 rounded-4 shadow"><div className="modal-header border-0 pb-0"><h5 className="fw-bold">New {activeTab.toUpperCase()} Quest</h5><button type="button" className="btn-close" onClick={() => setShowAddModal(false)}></button></div><form onSubmit={(e) => { e.preventDefault(); saveTask(e); }}><div className="modal-body"><div className="mb-3"><label className="form-label small fw-bold">Quest Name</label><input type="text" className="form-control bg-light border-0" onChange={e => setFormData({...formData, title: e.target.value})} required /></div><div className="row g-2 mb-3"><div className="col-6"><label className="form-label small fw-bold">Time</label><input type="time" className="form-control bg-light border-0" onChange={e => setFormData({...formData, taskTime: e.target.value})} required /></div><div className="col-6"><label className="form-label small fw-bold">Attribute</label><select className="form-select bg-light border-0" onChange={e => setFormData({...formData, statType: e.target.value})}><option value="str">💪 STR</option><option value="int">🧠 INT</option><option value="spr">✨ SPR</option><option value="cha">🎭 CHA</option></select></div></div><div className="d-flex gap-2">{Object.entries(difficulties).map(([k, v]) => (<button key={k} type="button" onClick={() => setFormData({...formData, difficulty: k})} className={`btn flex-grow-1 py-2 border-0 rounded-3 ${formData.difficulty === k ? `bg-${v.color} text-white` : 'bg-light text-muted'}`}><div className="fw-bold small">{v.label}</div></button>))}</div></div><div className="modal-footer border-0 pt-0"><button type="submit" className="btn btn-primary w-100 py-2 rounded-3 fw-bold">Initialize Quest</button></div></form></div></div></div>)}
    </div>
  );
};

export default Routine;
