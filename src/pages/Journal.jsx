import { useState, useEffect, useMemo, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebase/config";
import { 
  collection, 
  addDoc, 
  deleteDoc, 
  doc, 
  query, 
  onSnapshot,
  orderBy,
  serverTimestamp
} from "firebase/firestore";
import ConfirmationModal from "../components/ConfirmationModal";
import { CSSTransition, TransitionGroup } from "react-transition-group";

const moods = [
  { emoji: "😊", label: "Happy", color: "#FFFAEB", accent: "#FDE68A", dark: "#92400E" },
  { emoji: "😐", label: "Neutral", color: "#F9FAFB", accent: "#E5E7EB", dark: "#374151" },
  { emoji: "😔", label: "Sad", color: "#EFF6FF", accent: "#DBEAFE", dark: "#1E40AF" },
  { emoji: "🚀", label: "Productive", color: "#F0FDF4", accent: "#DCFCE7", dark: "#166534" },
  { emoji: "😴", label: "Tired", color: "#F5F3FF", accent: "#EDE9FE", dark: "#5B21B6" }
];

const prompts = [
  "What was the highlight of your day? / আপনার দিনের সবচেয়ে ভালো দিক কী ছিল?",
  "What is one thing you're grateful for today? / আজ আপনি কোন একটি বিষয়ের জন্য কৃতজ্ঞ?",
  "Did you face any challenges today? / আজ আপনি কি কোনো চ্যালেঞ্জের মুখোমুখি হয়েছেন?",
  "What is a goal you want to achieve tomorrow? / আগামীকাল আপনি কোন লক্ষ্য অর্জন করতে চান?",
  "Describe a moment that made you smile. / এমন একটি মুহূর্ত বর্ণনা করুন যা আপনাকে হাসিয়েছে।",
  "What did you learn about yourself today? / আজ আপনি নিজের সম্পর্কে কী শিখেছেন?",
  "Who made a positive impact on your day? / আজ আপনার জীবনে কে ইতিবাচক প্রভাব ফেলেছে?",
  "If you could redo one part of today, what would it be? / আপনি যদি আজকের কোনো অংশ পুনরায় করতে পারতেন, তবে সেটি কী হতো?"
];

// Helper Component for Entry Cards
const JournalEntryCard = ({ entry, formatDate, setDeleteId, moods }) => {
  const nodeRef = useRef(null);
  const entryTheme = moods.find(m => m.emoji === entry.mood) || moods[1];
  
  return (
    <CSSTransition nodeRef={nodeRef} timeout={300} classNames="fade">
      <div ref={nodeRef} className="card border-0 shadow-sm rounded-4 overflow-hidden" style={{ borderLeft: `5px solid ${entryTheme.accent}` }}>
        <div className="card-body p-3">
          <div className="d-flex justify-content-between align-items-start mb-2">
            <div className="d-flex align-items-center gap-2">
              <span className="fs-4">{entry.mood}</span>
              <div>
                <small className="text-primary fw-bold d-block">{formatDate(entry.date)}</small>
              </div>
            </div>
            <button className="btn btn-link text-muted p-0 opacity-25" onClick={() => setDeleteId(entry.id)}>
              <i className="bi bi-trash3"></i>
            </button>
          </div>
          <p className="mb-0 opacity-75" style={{ whiteSpace: "pre-wrap", lineHeight: '1.6', fontSize: entry.isBangla ? '1.1rem' : '0.95rem', fontFamily: entry.isBangla ? "'Hind Siliguri', sans-serif" : 'inherit' }}>
            {entry.text}
          </p>
        </div>
      </div>
    </CSSTransition>
  );
};

const Journal = () => {
  const { currentUser, userData, addXP } = useAuth();
  const [entries, setEntries] = useState([]);
  const [newEntry, setNewEntry] = useState(() => localStorage.getItem("journalDraft") || "");
  const [selectedMood, setSelectedMood] = useState("😊");
  const [selectedTags, setSelectedTags] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteId, setDeleteId] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isBangla, setIsBangla] = useState(false);
  
  // Ebook State
  const [showEbook, setShowEbook] = useState(false);
  const [currentPage, setCurrentPage] = useState(-1); // -1 is Cover
  const [ebookTheme, setEbookTheme] = useState('manuscript'); // manuscript, midnight, clean
  const [fontSize, setFontSize] = useState(1.2);
  const [showChapters, setShowChapters] = useState(false);
  
  const recognitionRef = useRef(null);
  const touchStart = useRef(0);

  const handleTouchStart = (e) => { touchStart.current = e.touches[0].clientX; };
  const handleTouchEnd = (e) => {
    const diff = touchStart.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 70) {
      if (diff > 0 && currentPage < entries.length - 1) setCurrentPage(p => p + 1);
      else if (diff < 0 && currentPage > -1) setCurrentPage(p => p - 1);
    }
  };

  useEffect(() => {
    localStorage.setItem("journalDraft", newEntry);
  }, [newEntry]);

  useEffect(() => {
    if (!currentUser) return;
    const q = query(collection(db, "users", currentUser.uid, "journal"), orderBy("date", "asc"));
    return onSnapshot(q, (snapshot) => {
      setEntries(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
  }, [currentUser]);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = isBangla ? 'bn-BD' : 'en-US';
      recognitionRef.current.onresult = (e) => setNewEntry(Array.from(e.results).map(r => r[0].transcript).join(''));
      recognitionRef.current.onend = () => setIsRecording(false);
    }
  }, [isBangla]);

  const toggleRecording = () => {
    if (isRecording) recognitionRef.current.stop();
    else { recognitionRef.current.start(); setIsRecording(true); }
  };

  const shufflePrompt = () => {
    const randomPrompt = prompts[Math.floor(Math.random() * prompts.length)];
    const text = isBangla ? randomPrompt.split(" / ")[1] : randomPrompt.split(" / ")[0];
    setNewEntry(prev => prev ? prev + "\n\n" + text : text + "\n");
  };

  const addEntry = async (e) => {
    e.preventDefault();
    if (!newEntry.trim()) return;
    setLoading(true);
    try {
      const wordCount = newEntry.trim().split(/\s+/).length;
      await addDoc(collection(db, "users", currentUser.uid, "journal"), {
        text: newEntry, mood: selectedMood, tags: selectedTags, wordCount, isBangla, date: serverTimestamp()
      });
      await addXP(15 + (wordCount > 50 ? 10 : 0), 'spr');
      setNewEntry(""); localStorage.removeItem("journalDraft"); setSelectedMood("😊"); setSelectedTags([]);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const formatDate = (ts, lang = isBangla) => {
    if (!ts) return "Just now";
    return ts.toDate().toLocaleDateString(lang ? 'bn-BD' : 'en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const chapters = useMemo(() => {
    const groups = {};
    entries.forEach((e, idx) => {
      if (!e.date) return;
      const monthYear = e.date.toDate().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      if (!groups[monthYear]) groups[monthYear] = [];
      groups[monthYear].push({ ...e, originalIndex: idx });
    });
    return Object.entries(groups);
  }, [entries]);

  const themes = {
    manuscript: { bg: '#F4EBD0', text: '#3E2723', font: 'serif', paper: 'url("https://www.transparenttextures.com/patterns/old-mathematics.png")' },
    midnight: { bg: '#1A1A2E', text: '#E94560', font: 'sans-serif', paper: 'none' },
    clean: { bg: '#FFFFFF', text: '#1F2937', font: 'sans-serif', paper: 'none' }
  };

  const currentTheme = themes[ebookTheme];

  return (
    <div className="container py-4 mb-5" style={{ fontFamily: isBangla ? "'Hind Siliguri', sans-serif" : "inherit" }}>
      <div className="d-flex justify-content-between align-items-center mb-4 px-2">
        <h2 className="fw-bold m-0">{isBangla ? 'ডায়েরি' : 'Journal'}</h2>
        <div className="d-flex gap-2">
          <button className={`btn btn-sm rounded-pill px-3 fw-bold ${isBangla ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => setIsBangla(!isBangla)}>
            {isBangla ? 'English' : 'বাংলা'}
          </button>
          <button className="btn btn-dark btn-sm rounded-pill px-3 fw-bold shadow-sm" onClick={() => { setShowEbook(true); setCurrentPage(-1); }}>
            <i className="bi bi-journal-bookmark-fill me-2"></i>Ebook
          </button>
        </div>
      </div>

      {/* Stats / Heatmap */}
      <div className="card border-0 shadow-sm rounded-4 p-3 mb-4 bg-white">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <small className="text-muted fw-bold text-uppercase" style={{ fontSize: '0.65rem' }}>Mood Flow</small>
          <small className="text-primary fw-bold" style={{ fontSize: '0.7rem' }}>{entries.length} Memories</small>
        </div>
        <div className="d-flex justify-content-between gap-1">
          {[...Array(7)].map((_, i) => {
            const d = new Date(); d.setDate(d.getDate() - (6 - i));
            const entry = entries.find(e => e.date?.toDate().toDateString() === d.toDateString());
            return (
              <div key={i} className="text-center flex-grow-1">
                <div className={`rounded-3 mb-1 d-flex align-items-center justify-content-center border ${entry ? 'bg-light shadow-sm' : 'bg-light opacity-25 border-dashed'}`} style={{ height: '35px' }}>
                  {entry?.mood || ""}
                </div>
                <div style={{ fontSize: '0.55rem' }} className="text-muted opacity-50">{d.toLocaleDateString('en-US', { weekday: 'short' })}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Writing Section */}
      <div className="card border-0 shadow-sm rounded-4 p-4 mb-4 transition-all" style={{ background: moods.find(m => m.emoji === selectedMood)?.color || '#fff' }}>
        <form onSubmit={addEntry}>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div className="d-flex gap-2">
              {moods.map(m => (
                <button key={m.label} type="button" onClick={() => setSelectedMood(m.emoji)} className={`btn btn-sm rounded-circle p-0 transition-all ${selectedMood === m.emoji ? 'bg-white shadow-sm scale-110' : 'opacity-30'}`} style={{ width: '38px', height: '38px', fontSize: '1.2rem' }}>{m.emoji}</button>
              ))}
            </div>
            <button type="button" onClick={shufflePrompt} className="btn btn-link p-0 text-decoration-none small fw-bold text-dark opacity-50"><i className="bi bi-stars me-1"></i>Prompt</button>
          </div>
          <div className="position-relative mb-3">
            <textarea className="form-control border-0 rounded-4 p-3 shadow-sm bg-white bg-opacity-70" rows="5" placeholder={isBangla ? "আজকের দিনটি কেমন কাটল?..." : "Reflect on your day..."} value={newEntry} onChange={(e) => setNewEntry(e.target.value)} required style={{ resize: 'none' }}></textarea>
            <button type="button" onClick={toggleRecording} className={`btn btn-sm rounded-circle position-absolute bottom-0 end-0 m-2 ${isRecording ? 'btn-danger animate-pulse' : 'btn-light opacity-75'}`} style={{ width: '35px', height: '35px' }}><i className={`bi ${isRecording ? 'bi-mic-fill' : 'bi-mic'}`}></i></button>
          </div>
          <button disabled={loading} type="submit" className="btn btn-dark w-100 rounded-pill py-2 fw-bold shadow-sm">{loading ? 'Saving...' : 'Finalize Entry'}</button>
        </form>
      </div>

      {/* Search & List */}
      <div className="input-group shadow-sm rounded-pill overflow-hidden mb-4 bg-white border">
        <span className="input-group-text border-0 bg-transparent ps-3"><i className="bi bi-search text-muted"></i></span>
        <input type="text" className="form-control border-0 shadow-none" placeholder="Search memories..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
      </div>

      <TransitionGroup className="d-flex flex-column gap-3">
        {[...entries].reverse().filter(e => e.text.toLowerCase().includes(searchTerm.toLowerCase())).map(entry => (
          <JournalEntryCard key={entry.id} entry={entry} formatDate={formatDate} setDeleteId={setDeleteId} moods={moods} />
        ))}
      </TransitionGroup>

      {/* EBOOK MODAL */}
      {showEbook && (
        <div 
          className="fixed-top w-100 h-100 d-flex flex-column animate__animated animate__fadeIn" 
          style={{ backgroundColor: currentTheme.bg, color: currentTheme.text, zIndex: 2000 }}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Reader Header */}

          <div className="p-3 d-flex justify-content-between align-items-center border-bottom border-dark border-opacity-10 shadow-sm" style={{ backgroundColor: 'rgba(0,0,0,0.05)' }}>
            <button className="btn btn-link text-inherit p-0" onClick={() => setShowChapters(!showChapters)}><i className="bi bi-list fs-4"></i></button>
            <div className="d-flex align-items-center gap-3">
              <div className="btn-group btn-group-sm">
                {Object.keys(themes).map(t => (
                  <button key={t} className={`btn btn-outline-dark ${ebookTheme === t ? 'active' : ''}`} onClick={() => setEbookTheme(t)}>{t.charAt(0).toUpperCase()}</button>
                ))}
              </div>
              <div className="d-flex gap-2">
                <button className="btn btn-link text-inherit p-0" onClick={() => setFontSize(Math.max(0.8, fontSize - 0.1))}><i className="bi bi-dash-circle"></i></button>
                <button className="btn btn-link text-inherit p-0" onClick={() => setFontSize(Math.min(2, fontSize + 0.1))}><i className="bi bi-plus-circle"></i></button>
              </div>
              <button className="btn btn-link text-inherit p-0" onClick={() => setShowEbook(false)}><i className="bi bi-x-lg fs-4"></i></button>
            </div>
          </div>

          <div className="flex-grow-1 position-relative d-flex">
            {/* Chapters Sidebar */}
            {showChapters && (
              <div className="h-100 bg-black bg-opacity-10 border-end p-4 overflow-y-auto" style={{ width: '280px' }}>
                <h6 className="fw-bold text-uppercase small mb-4">Table of Contents</h6>
                <div className="d-flex flex-column gap-3">
                  <div className="cursor-pointer fw-bold small" onClick={() => { setCurrentPage(-1); setShowChapters(false); }}>Book Cover</div>
                  {chapters.map(([month, group]) => (
                    <div key={month}>
                      <div className="text-muted small fw-bold mb-2">{month}</div>
                      {group.map((e, i) => (
                        <div key={e.id} className="small ps-2 py-1 hover-bg-light cursor-pointer opacity-75 border-start" onClick={() => { setCurrentPage(e.originalIndex); setShowChapters(false); }}>
                          {formatDate(e.date, false).split(',')[0]} {e.mood}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Page Content */}
            <div className="flex-grow-1 d-flex flex-column justify-content-center align-items-center p-4 overflow-y-auto" style={{ backgroundImage: currentTheme.paper }}>
              <div className="animate__animated animate__fadeIn" style={{ maxWidth: '700px', width: '100%', fontSize: `${fontSize}rem`, fontFamily: currentTheme.font }}>
                {currentPage === -1 ? (
                  /* COVER PAGE */
                  <div className="text-center py-5 d-flex flex-column justify-content-center" style={{ minHeight: '60vh' }}>
                    <div className="mb-4">
                      <span className="display-1">📔</span>
                    </div>
                    <h1 className="display-4 fw-bold mb-3">{userData?.name || 'Chronicles'}</h1>
                    <div className="h5 opacity-50 italic mb-5">Life Journey through {new Date().getFullYear()}</div>
                    <div className="d-flex justify-content-center gap-4 mt-5">
                      <div className="text-center">
                        <div className="h3 fw-bold m-0">{entries.length}</div>
                        <small className="text-uppercase opacity-50">Chapters</small>
                      </div>
                      <div className="vr opacity-25"></div>
                      <div className="text-center">
                        <div className="h3 fw-bold m-0">{entries.reduce((acc, e) => acc + (e.wordCount || 0), 0)}</div>
                        <small className="text-uppercase opacity-50">Words</small>
                      </div>
                    </div>
                  </div>
                ) : entries[currentPage] ? (
                  /* JOURNAL PAGE */
                  <div className="bg-white rounded-4 shadow-lg p-5 text-dark" style={{ minHeight: '70vh', border: '1px solid rgba(0,0,0,0.05)' }}>
                    <div className="text-center mb-5">
                      <div className="display-4 mb-3">{entries[currentPage].mood}</div>
                      <h6 className="text-uppercase fw-bold letter-spacing-2 opacity-50">{formatDate(entries[currentPage].date, entries[currentPage].isBangla)}</h6>
                      <div className="mx-auto mt-4 bg-dark opacity-10" style={{ height: '2px', width: '50px' }}></div>
                    </div>
                    <p style={{ lineHeight: '1.8', textAlign: 'justify', whiteSpace: 'pre-wrap', fontFamily: entries[currentPage].isBangla ? "'Hind Siliguri', sans-serif" : 'inherit' }}>
                      {entries[currentPage].text}
                    </p>
                    {entries[currentPage].tags?.length > 0 && (
                      <div className="mt-5 pt-4 border-top d-flex gap-2">
                        {entries[currentPage].tags.map(t => <span key={t} className="badge bg-light text-muted border px-3 py-2 rounded-pill small">{t}</span>)}
                      </div>
                    )}
                    <div className="text-center mt-5 pt-5 opacity-25 small">— Page {currentPage + 1} of {entries.length} —</div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {/* Reader Footer Controls */}
          <div className="p-4 pb-5 d-flex justify-content-between align-items-center position-relative" style={{ backgroundColor: 'rgba(0,0,0,0.05)', zIndex: 10 }}>
            <button 
              className="btn btn-outline-dark rounded-circle shadow-sm" 
              style={{ width: '45px', height: '45px' }}
              disabled={currentPage === -1} 
              onClick={(e) => { e.stopPropagation(); setCurrentPage(prev => prev - 1); }}
            >
              <i className="bi bi-arrow-left"></i>
            </button>
            <div className="small opacity-50 fw-bold">{currentPage === -1 ? 'BOOK COVER' : `PAGE ${currentPage + 1}`}</div>
            <button 
              className="btn btn-outline-dark rounded-circle shadow-sm" 
              style={{ width: '45px', height: '45px' }}
              disabled={currentPage === entries.length - 1} 
              onClick={(e) => { e.stopPropagation(); setCurrentPage(prev => prev + 1); }}
            >
              <i className="bi bi-arrow-right"></i>
            </button>
          </div>
        </div>
      )}

      <ConfirmationModal show={!!deleteId} title="Delete Record" message="Are you sure? This memory will be permanently removed." onCancel={() => setDeleteId(null)} onConfirm={async () => { await deleteDoc(doc(db, "users", currentUser.uid, "journal", deleteId)); setDeleteId(null); }} />
    </div>
  );
};

export default Journal;
