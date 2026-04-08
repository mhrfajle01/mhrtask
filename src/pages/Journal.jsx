import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebase/config";
import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  query, 
  onSnapshot,
  orderBy,
  serverTimestamp
} from "firebase/firestore";

const Journal = () => {
  const { currentUser, addXP } = useAuth();
  const [entries, setEntries] = useState([]);
  const [newEntry, setNewEntry] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!currentUser) return;

    const q = query(
      collection(db, "users", currentUser.uid, "journal"),
      orderBy("date", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setEntries(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => unsubscribe();
  }, [currentUser]);

  const addEntry = async (e) => {
    e.preventDefault();
    if (!newEntry.trim()) return;

    setLoading(true);
    try {
      await addDoc(collection(db, "users", currentUser.uid, "journal"), {
        text: newEntry,
        date: serverTimestamp()
      });
      await addXP(15, 'spr');
      setNewEntry("");
    } catch (error) {
      console.error("Error adding journal entry:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "...";
    const date = timestamp.toDate();
    return date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="container py-4 mb-5">
      <h2 className="fw-bold mb-4 text-purple">Daily Journal</h2>

      {/* Write Entry */}
      <div className="card border-0 shadow-sm rounded-4 p-4 mb-4" style={{ background: "#f3e5f5" }}>
        <form onSubmit={addEntry}>
          <div className="mb-3">
            <textarea
              className="form-control border-0 bg-white"
              rows="4"
              placeholder="How was your day? Write something..."
              value={newEntry}
              onChange={(e) => setNewEntry(e.target.value)}
              required
            ></textarea>
          </div>
          <button disabled={loading} type="submit" className="btn btn-primary w-100 rounded-pill shadow-sm">
            Save Entry (+15 XP)
          </button>
        </form>
      </div>

      {/* Previous Entries */}
      <h5 className="fw-bold mb-3 px-1">Previous Notes</h5>
      {entries.length === 0 ? (
        <div className="text-center text-muted py-5">
          <i className="bi bi-journal fs-1 mb-3 d-block opacity-25"></i>
          No entries yet. Start writing today!
        </div>
      ) : (
        <div className="d-flex flex-column gap-3">
          {entries.map(entry => (
            <div key={entry.id} className="card border-0 shadow-sm rounded-4 p-3 bg-white">
              <div className="d-flex justify-content-between align-items-start mb-2">
                <small className="text-primary fw-bold">
                  <i className="bi bi-clock me-1"></i>
                  {formatDate(entry.date)}
                </small>
              </div>
              <p className="mb-0 text-secondary" style={{ whiteSpace: "pre-wrap" }}>
                {entry.text}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Journal;
