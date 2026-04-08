import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebase/config";
import { doc, collection, getDocs, writeBatch } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import ConfirmationModal from "../components/ConfirmationModal";

const Settings = () => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState("");

  const handleFactoryReset = async () => {
    setLoading(true);
    try {
      const batch = writeBatch(db);

      const userRef = doc(db, "users", currentUser.uid);
      const initialStats = {
        xp: 0, level: 1, str: 0, int: 0, spr: 0, cha: 0,
        streak: 0, highestStreak: 0, totalDaysConnected: 0, totalMinutes: 0,
        lastActiveDate: new Date().toDateString(), lastResetDate: new Date().toDateString(),
        actionsToday: 0,
        morningTime: 0, afternoonTime: 0, nightTime: 0,
        dayLocked: false, isProtected: false
      };
      batch.set(userRef, initialStats);
      
      const routinesSnap = await getDocs(collection(db, "users", currentUser.uid, "routines"));
      routinesSnap.forEach((doc) => batch.delete(doc.ref));

      const todosSnap = await getDocs(collection(db, "users", currentUser.uid, "todos"));
      todosSnap.forEach((doc) => batch.delete(doc.ref));

      await batch.commit();
      
      setLoading(false);
      setShowResetModal(false);
      navigate("/login");
    } catch (e) { console.error(e); setLoading(false); }
  };

  return (
    <div className="container py-4">
      <h2 className="fw-bold mb-4">Settings</h2>
      <button className="btn btn-danger w-100" onClick={() => setShowResetModal(true)}>Factory Reset</button>
      
      <ConfirmationModal 
        show={showResetModal}
        title="Factory Reset"
        message="Type 'RESET' below to confirm deletion of all data."
        onCancel={() => setShowResetModal(false)}
        onConfirm={handleFactoryReset}
        disabled={resetConfirmText !== "RESET"}
      >
        <input type="text" className="form-control mt-2" onChange={(e) => setResetConfirmText(e.target.value)} />
      </ConfirmationModal>
    </div>
  );
};

export default Settings;
